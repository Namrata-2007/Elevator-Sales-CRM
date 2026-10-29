import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Shield,
  ArrowRight,
  KeyRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { api } from '../../lib/api.ts';

const REGISTERED_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@apexelevators.com' },
  { role: 'Sales Manager', email: 'manager@apexelevators.com' },
  { role: 'Sales Executive', email: 'vikram@apexelevators.com' },
  { role: 'Telecaller', email: 'neha@apexelevators.com' },
  { role: 'Technical Engineer', email: 'karthik@apexelevators.com' },
  { role: 'Commercial Bids', email: 'meera@apexelevators.com' },
  { role: 'Managing Director', email: 'sanjay.director@apexelevators.com' },
];

export const LoginView: React.FC = () => {
  const {
    login,
    loginWithGoogle,
    isAuthenticating,
    authError,
    clearAuthError,
    sessionExpiredMessage,
    clearSessionMessage,
  } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Forgot Password Modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const displayedError = localError || authError;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submittingForm || isAuthenticating) return;

    setLocalError(null);
    clearAuthError();
    clearSessionMessage();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setSubmittingForm(true);
    try {
      await login(trimmedEmail, password, rememberMe);
      showToast('Authenticated successfully. Loading workspace...', 'success');
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading || isAuthenticating) return;

    setGoogleLoading(true);
    setLocalError(null);
    clearAuthError();
    clearSessionMessage();

    try {
      await loginWithGoogle(rememberMe);
      showToast('Signed in with Google Workspace successfully.', 'success');
    } catch (err: any) {
      setLocalError(err?.message || 'Google Workspace sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSelectAccountEmail = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setLocalError(null);
    clearAuthError();
    clearSessionMessage();
  };

  const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotError(null);

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      if (res.verificationCode) {
        setVerificationCode(res.verificationCode);
      }
      setForgotStep(2);
      showToast('Verification PIN generated for password reset.', 'success');
    } catch (err: any) {
      setForgotError(err?.message || 'Failed to initiate password reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotError(null);

    if (!verificationCode.trim() || !newPassword) {
      setForgotError('Please enter both the verification PIN and a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    setForgotLoading(true);
    try {
      await api.resetPassword({
        email: forgotEmail.trim(),
        verificationCode: verificationCode.trim(),
        newPassword,
      });
      setForgotSuccess('Your password has been updated. You can now sign in with your new password.');
      setEmail(forgotEmail.trim());
      setPassword('');
      setLocalError(null);
      clearAuthError();
      setTimeout(() => {
        setForgotModalOpen(false);
        setForgotStep(1);
        setForgotSuccess(null);
        setNewPassword('');
        setVerificationCode('');
      }, 1800);
    } catch (err: any) {
      setForgotError(err?.message || 'Password reset failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  const isBusy = submittingForm || googleLoading || isAuthenticating;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-7 text-center bg-slate-50 border-b border-slate-200">
            <div className="w-12 h-12 mx-auto rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm mb-3.5">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Elevator Sales CRM
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Apex Elevators &amp; Escalators Enterprise Portal
            </p>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Session Expired Notice */}
            {sessionExpiredMessage && (
              <div
                role="status"
                className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">Session Expired</span>
                  <span>{sessionExpiredMessage}</span>
                </div>
              </div>
            )}

            {/* Authentication Error Banner */}
            {displayedError && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <div className="font-semibold text-rose-950">Sign-in failed</div>
                  <div className="text-rose-800 leading-relaxed break-words">{displayedError}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    clearAuthError();
                  }}
                  className="text-rose-400 hover:text-rose-700 p-0.5"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              <div>
                <label htmlFor="crm-login-email" className="block font-semibold text-slate-700 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="crm-login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    autoFocus
                    disabled={isBusy}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (localError) setLocalError(null);
                      if (authError) clearAuthError();
                    }}
                    placeholder="name@apexelevators.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs sm:text-sm text-slate-900 bg-white disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="crm-login-password" className="font-semibold text-slate-700">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModalOpen(true);
                      setForgotEmail(email);
                      setForgotError(null);
                      setForgotSuccess(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="crm-login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    disabled={isBusy}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError(null);
                      if (authError) clearAuthError();
                    }}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs sm:text-sm text-slate-900 bg-white disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isBusy}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer focus:ring-blue-600"
                  />
                  <span className="text-slate-600 text-xs font-medium">Remember session on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {submittingForm ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to CRM</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center py-0.5">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-medium text-slate-400 absolute">
                Or continue with
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {googleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleLoading ? 'Connecting to Google...' : 'Sign in with Google Workspace'}</span>
            </button>

            {/* Directory of Registered Role Emails (No hardcoded passwords) */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Registered Role Accounts
                </span>
                <span className="text-[11px] text-slate-400">Select email to populate</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {REGISTERED_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.email}
                    type="button"
                    onClick={() => handleSelectAccountEmail(acct.email)}
                    className={`p-2 text-left rounded-lg border transition-colors ${
                      email === acct.email
                        ? 'border-blue-500 bg-blue-50/70'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[11px] font-semibold text-slate-800 truncate">{acct.role}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{acct.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Role permissions are verified from your database account record. Login activity and session status are audited.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Reset Account Password</h2>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">Password Updated</div>
                <p>{forgotSuccess}</p>
              </div>
            ) : forgotStep === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-3.5 text-xs">
                <p className="text-slate-600">
                  Enter your registered CRM email address to generate a password reset verification PIN.
                </p>
                <div>
                  <label htmlFor="forgot-email" className="block font-semibold text-slate-700 mb-1">
                    Registered Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@apexelevators.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-3.5 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl"
                  >
                    {forgotLoading ? 'Sending...' : 'Continue'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-3.5 text-xs">
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  Development verification PIN: <strong className="font-mono">{verificationCode}</strong>
                </div>
                <div>
                  <label htmlFor="reset-pin" className="block font-semibold text-slate-700 mb-1">
                    Verification PIN
                  </label>
                  <input
                    id="reset-pin"
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit PIN"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-center tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="reset-new-password" className="block font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="px-3.5 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl"
                  >
                    {forgotLoading ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
