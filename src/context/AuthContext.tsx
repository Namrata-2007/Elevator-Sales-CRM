import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types/crm.ts';
import { api } from '../lib/api.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut as fbSignOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  isLoading: boolean;
  sessionExpiredMessage: string | null;
  clearSessionMessage: () => void;
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<{ redirectTab: string }>;
  loginWithGoogle: () => Promise<void>;
  loginWithRole: (role: UserRole) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  trackPage: (moduleName: string, pagePath: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('elevator_crm_token'));
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem('elevator_crm_session_id'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  // Active interaction tracker
  const lastActiveTimestamp = useRef<number>(Date.now());
  const activeSecondsAccumulator = useRef<number>(0);

  const clearSessionMessage = () => setSessionExpiredMessage(null);

  const initAuth = async () => {
    setIsLoading(true);
    const storedToken = localStorage.getItem('elevator_crm_token');
    if (storedToken) {
      try {
        const res = await api.getMe();
        setUser(res.user);
        if (res.sessionId) {
          setSessionId(res.sessionId);
          localStorage.setItem('elevator_crm_session_id', res.sessionId);
        }
      } catch (err: any) {
        console.warn('Stored session invalid or expired:', err.message);
        localStorage.removeItem('elevator_crm_token');
        localStorage.removeItem('elevator_crm_session_id');
        setToken(null);
        setSessionId(null);
        setUser(null);
        if (err.message && err.message.toLowerCase().includes('expired')) {
          setSessionExpiredMessage('Your previous session has expired. Please sign in to continue.');
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();
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

  // Background Heartbeat Runner (every 30 seconds)
  useEffect(() => {
    if (!user || !token) return;

    const interval = setInterval(async () => {
      try {
        const now = Date.now();
        const isVisible = document.visibilityState === 'visible';
        const isRecentInteraction = now - lastActiveTimestamp.current < 60000;

        let addedActive = 0;
        if (isVisible && isRecentInteraction) {
          addedActive = 30;
        }

        const res = await api.heartbeat({
          activeSeconds: addedActive,
          currentModule: 'CRM',
          pagePath: window.location.pathname,
        });

        if (res.status === 'Expired' || res.status === 'Revoked') {
          await logout('Session Expired');
          setSessionExpiredMessage('Your session has expired due to 15 minutes of inactivity. Please sign in again.');
        }
      } catch (err: any) {
        if (err.message && (err.message.includes('401') || err.message.includes('expired') || err.message.includes('Revoked'))) {
          await logout('Session Expired');
          setSessionExpiredMessage('Your session has expired or was revoked. Please sign in again.');
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, token]);

  const login = async (email: string, password?: string, rememberMe?: boolean) => {
    setIsLoading(true);
    setSessionExpiredMessage(null);
    try {
      const res = await api.login({ email, password, rememberMe });
      localStorage.setItem('elevator_crm_token', res.token);
      localStorage.setItem('elevator_crm_session_id', res.sessionId);
      setToken(res.token);
      setSessionId(res.sessionId);
      setUser(res.user);
      return { redirectTab: res.redirectTab || 'dashboard' };
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setSessionExpiredMessage(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      localStorage.setItem('elevator_crm_token', idToken);
      setToken(idToken);
      const res = await api.syncGoogle();
      setUser(res.user);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithRole = async (role: UserRole) => {
    setIsLoading(true);
    setSessionExpiredMessage(null);
    try {
      const res = await api.login({ role });
      localStorage.setItem('elevator_crm_token', res.token);
      localStorage.setItem('elevator_crm_session_id', res.sessionId);
      setToken(res.token);
      setSessionId(res.sessionId);
      setUser(res.user);
    } catch (error: any) {
      console.error('Role login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (reason: string = 'User Logout') => {
    try {
      if (token) {
        await api.logout(reason).catch(() => {});
      }
      await fbSignOut(auth).catch(() => {});
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('elevator_crm_token');
      localStorage.removeItem('elevator_crm_session_id');
      setToken(null);
      setSessionId(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      // ignore
    }
  };

  const trackPage = async (moduleName: string, pagePath: string) => {
    if (!user) return;
    try {
      await api.trackActivity({
        eventType: 'Page View',
        moduleName,
        pagePath,
        actionName: `Viewed ${moduleName}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        sessionId,
        isLoading,
        sessionExpiredMessage,
        clearSessionMessage,
        login,
        loginWithGoogle,
        loginWithRole,
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
