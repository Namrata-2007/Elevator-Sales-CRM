import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, UserRole } from '../types/crm.ts';
import {
  api,
  getStoredToken,
  getStoredSessionId,
  persistAuthSession,
  clearAuthSession,
} from '../lib/api.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

export function formatAuthError(err: any): string {
  if (!err) return 'Authentication failed. Please verify your credentials and try again.';

  const code: string = err.code || '';
  const rawMessage: string = err.message || String(err);

  let friendly = rawMessage;

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      friendly = 'Invalid email address or password. Please verify your credentials.';
      break;
    case 'auth/user-not-found':
      friendly = 'No user account found with this email address.';
      break;
    case 'auth/invalid-email':
      friendly = 'Please enter a valid email address.';
      break;
    case 'auth/user-disabled':
      friendly = 'This account has been disabled. Please contact your system administrator.';
      break;
    case 'auth/too-many-requests':
      friendly = 'Too many unsuccessful login attempts. Please wait a few minutes and try again.';
      break;
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      friendly = 'Google sign-in popup was closed before completing authentication.';
      break;
    case 'auth/popup-blocked':
      friendly = 'Sign-in popup was blocked by the browser. Please allow popups for this site and try again.';
      break;
    case 'auth/unauthorized-domain':
      friendly = `This preview domain (${window.location.hostname}) is not authorized in Firebase Console > Authentication > Settings > Authorized domains. Please use Email & Password sign-in or add the domain.`;
      break;
    case 'auth/network-request-failed':
      friendly = 'Network error while contacting the authentication service. Please check your connection.';
      break;
    default:
      break;
  }

  if (import.meta.env.DEV && code && !friendly.includes(code)) {
    return `${friendly} (${code})`;
  }

  return friendly;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  clearAuthError: () => void;
  sessionExpiredMessage: string | null;
  clearSessionMessage: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ redirectTab: string }>;
  loginWithGoogle: (rememberMe?: boolean) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  trackPage: (moduleName: string, pagePath: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [sessionId, setSessionId] = useState<string | null>(() => getStoredSessionId());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const lastActiveTimestamp = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);
  const isManualAuthInFlightRef = useRef<boolean>(false);
  const isLoggingOutRef = useRef<boolean>(false);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const clearSessionMessage = useCallback(() => setSessionExpiredMessage(null), []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Bootstrap existing stored session + subscribe to Firebase onAuthStateChanged listener
  useEffect(() => {
    let initialCheckComplete = false;

    const bootstrapStoredSession = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        return false;
      }

      try {
        const res = await api.getMe();
        if (!isMountedRef.current) return true;
        setUser(res.user);
        setToken(storedToken);
        if (res.sessionId) {
          setSessionId(res.sessionId);
        }
        return true;
      } catch (err: any) {
        console.warn('Stored session invalid or expired:', err?.message || err);
        clearAuthSession();
        if (isMountedRef.current) {
          setToken(null);
          setSessionId(null);
          setUser(null);
          const msg = String(err?.message || '').toLowerCase();
          if (msg.includes('expired') || msg.includes('revoked')) {
            setSessionExpiredMessage('Your previous session has expired. Please sign in to continue.');
          }
        }
        return false;
      }
    };

    const unsubscribe = onAuthStateChanged(
      auth,
      async (fbUser) => {
        try {
          if (isManualAuthInFlightRef.current || isLoggingOutRef.current) {
            return;
          }

          if (!initialCheckComplete) {
            const restored = await bootstrapStoredSession();
            initialCheckComplete = true;
            if (restored) {
              if (isMountedRef.current) setIsLoading(false);
              return;
            }
          }

          if (fbUser && !getStoredToken()) {
            const idToken = await fbUser.getIdToken();
            persistAuthSession(idToken, '', true);
            const res = await api.syncGoogle();
            if (!isMountedRef.current) return;

            const finalSessionId = res.sessionId || '';
            const finalToken = res.token || idToken;
            persistAuthSession(finalToken, finalSessionId, true);

            setToken(finalToken);
            setSessionId(finalSessionId);
            setUser(res.user);
            setAuthError(null);
          }
        } catch (err: any) {
          console.warn('Auth state listener sync error:', err?.message || err);
          clearAuthSession();
          if (isMountedRef.current) {
            setToken(null);
            setSessionId(null);
            setUser(null);
            setAuthError(formatAuthError(err));
          }
        } finally {
          initialCheckComplete = true;
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }
      },
      (listenerErr) => {
        console.error('Firebase onAuthStateChanged error:', listenerErr);
        if (isMountedRef.current) {
          setAuthError(formatAuthError(listenerErr));
          setIsLoading(false);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // User activity interaction listeners
  useEffect(() => {
    const handleUserInteraction = () => {
      lastActiveTimestamp.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('scroll', handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
    };
  }, []);

  const logout = useCallback(async (reason: string = 'User Logout') => {
    isLoggingOutRef.current = true;
    try {
      const currentToken = getStoredToken();
      if (currentToken) {
        await api.logout(reason).catch((err) => {
          console.warn('Backend logout warning:', err?.message || err);
        });
      }
      if (auth.currentUser) {
        await fbSignOut(auth).catch((err) => {
          console.warn('Firebase signOut warning:', err?.message || err);
        });
      }
    } finally {
      clearAuthSession();
      if (isMountedRef.current) {
        setToken(null);
        setSessionId(null);
        setUser(null);
      }
      isLoggingOutRef.current = false;
    }
  }, []);

  // Background Heartbeat Runner (every 30 seconds)
  useEffect(() => {
    if (!user || !token) return;

    const interval = setInterval(async () => {
      try {
        const now = Date.now();
        const isVisible = document.visibilityState === 'visible';
        const isRecentInteraction = now - lastActiveTimestamp.current < 60000;
        const addedActive = isVisible && isRecentInteraction ? 30 : 0;

        const res = await api.heartbeat({
          activeSeconds: addedActive,
          currentModule: 'CRM',
          pagePath: window.location.pathname,
        });

        if (res.status === 'Expired' || res.status === 'Revoked') {
          await logout('Session Expired');
          if (isMountedRef.current) {
            setSessionExpiredMessage(
              'Your session has expired due to 15 minutes of inactivity. Please sign in again.'
            );
          }
        }
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('401') || msg.toLowerCase().includes('expired') || msg.includes('Revoked')) {
          await logout('Session Expired');
          if (isMountedRef.current) {
            setSessionExpiredMessage(
              'Your session has expired or was revoked. Please sign in again.'
            );
          }
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, token, logout]);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<{ redirectTab: string }> => {
    isManualAuthInFlightRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);
    setSessionExpiredMessage(null);

    try {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        throw new Error('Please enter your email address.');
      }
      if (!password) {
        throw new Error('Please enter your password.');
      }

      try {
        const res = await api.login({ email: cleanEmail, password, rememberMe });
        persistAuthSession(res.token, res.sessionId, rememberMe);
        if (isMountedRef.current) {
          setToken(res.token);
          setSessionId(res.sessionId);
          setUser(res.user);
          setAuthError(null);
        }
        return { redirectTab: res.redirectTab || 'dashboard' };
      } catch (backendErr: any) {
        const backendMsg = String(backendErr?.message || '');
        // Do not fallback if account is explicitly locked or deactivated in CRM database
        if (
          backendMsg.toLowerCase().includes('locked') ||
          backendMsg.toLowerCase().includes('deactivated')
        ) {
          throw backendErr;
        }

        // Optional fallback for accounts provisioned directly in Firebase Email/Password Auth
        try {
          const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          const idToken = await credential.user.getIdToken();
          persistAuthSession(idToken, '', rememberMe);
          const syncRes = await api.syncGoogle();
          const finalSessionId = syncRes.sessionId || '';
          const finalToken = syncRes.token || idToken;
          persistAuthSession(finalToken, finalSessionId, rememberMe);

          if (isMountedRef.current) {
            setToken(finalToken);
            setSessionId(finalSessionId);
            setUser(syncRes.user);
            setAuthError(null);
          }
          return { redirectTab: syncRes.redirectTab || 'dashboard' };
        } catch (fbErr: any) {
          const fbCode = String(fbErr?.code || '');
          // Preserve specific CRM backend message unless Firebase returned a specific account status error
          if (
            backendMsg &&
            (fbCode === 'auth/operation-not-allowed' ||
              fbCode === 'auth/user-not-found' ||
              fbCode === 'auth/invalid-credential' ||
              fbCode === 'auth/wrong-password')
          ) {
            throw backendErr;
          }
          throw fbErr;
        }
      }
    } catch (error: any) {
      const formatted = formatAuthError(error);
      console.error('Authentication error:', error);
      if (isMountedRef.current) {
        setAuthError(formatted);
      }
      throw new Error(formatted);
    } finally {
      isManualAuthInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsAuthenticating(false);
      }
    }
  };

  const loginWithGoogle = async (rememberMe: boolean = true): Promise<void> => {
    isManualAuthInFlightRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);
    setSessionExpiredMessage(null);

    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      persistAuthSession(idToken, '', rememberMe);
      const res = await api.syncGoogle();
      const finalSessionId = res.sessionId || '';
      const finalToken = res.token || idToken;
      persistAuthSession(finalToken, finalSessionId, rememberMe);

      if (isMountedRef.current) {
        setToken(finalToken);
        setSessionId(finalSessionId);
        setUser(res.user);
        setAuthError(null);
      }
    } catch (error: any) {
      const formatted = formatAuthError(error);
      console.error('Google sign-in error:', error);
      clearAuthSession();
      if (isMountedRef.current) {
        setAuthError(formatted);
      }
      throw new Error(formatted);
    } finally {
      isManualAuthInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsAuthenticating(false);
      }
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const res = await api.getMe();
      if (isMountedRef.current) {
        setUser(res.user);
      }
    } catch (err: any) {
      console.warn('Failed to refresh user:', err?.message || err);
    }
  };

  const trackPage = async (moduleName: string, pagePath: string): Promise<void> => {
    if (!user) return;
    try {
      await api.trackActivity({
        eventType: 'Page View',
        moduleName,
        pagePath,
        actionName: `Viewed ${moduleName}`,
      });
    } catch {
      // Non-blocking telemetry
    }
  };

  const switchRole = async (role: UserRole): Promise<void> => {
    const useLocal = Boolean(localStorage.getItem('elevator_crm_token'));
    const res = await api.switchRole(role);
    persistAuthSession(res.token, res.sessionId, useLocal);
    if (isMountedRef.current) {
      setToken(res.token);
      setSessionId(res.sessionId);
      setUser(res.user);
      setAuthError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        sessionId,
        isLoading,
        isAuthenticating,
        authError,
        clearAuthError,
        sessionExpiredMessage,
        clearSessionMessage,
        login,
        loginWithGoogle,
        switchRole,
        logout,
        refreshUser,
        trackPage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
