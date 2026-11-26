import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { SupabaseEnvDiagnostic } from '../lib/supabase';
import {
  AuthFormMode,
  validateAuthEmail,
  validateAuthPassword,
  validateConfirmPassword,
} from '../utils/authValidation';
import { DayspaceMark } from './DayspaceMark';

interface AuthViewProps {
  configured: boolean;
  envDiagnostic: SupabaseEnvDiagnostic;
  submitting: boolean;
  authError: string | null;
  authNotice: string | null;
  pendingVerificationEmail: string | null;
  isPasswordRecovery: boolean;
  recoveryEmail?: string | null;
  onSignIn: (email: string, password: string) => Promise<boolean>;
  onSignUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<boolean>;
  onResendVerification: (email: string) => Promise<boolean>;
  onRequestPasswordReset: (email: string) => Promise<boolean>;
  onUpdatePassword: (newPassword: string) => Promise<boolean>;
  onDismissRecovery: () => void;
  onClearMessages: () => void;
  onClearPendingVerification: () => void;
}

export function AuthView({
  configured,
  envDiagnostic,
  submitting,
  authError,
  authNotice,
  pendingVerificationEmail,
  isPasswordRecovery,
  recoveryEmail,
  onSignIn,
  onSignUp,
  onResendVerification,
  onRequestPasswordReset,
  onUpdatePassword,
  onDismissRecovery,
  onClearMessages,
  onClearPendingVerification,
}: AuthViewProps) {
  const [mode, setMode] = useState<AuthFormMode>(
    isPasswordRecovery ? 'recovery' : 'signin'
  );
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isPasswordRecovery) {
      setMode('recovery');
      setPassword('');
      setConfirmPassword('');
      setFormError(null);
    } else if (mode === 'recovery') {
      setMode('signin');
    }
  }, [isPasswordRecovery, mode]);

  const switchMode = (nextMode: AuthFormMode) => {
    setMode(nextMode);
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClearMessages();
    if (nextMode !== 'signin') {
      onClearPendingVerification();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (mode === 'recovery') {
      const pwError = validateAuthPassword(password, 6);
      if (pwError) {
        setFormError(pwError);
        return;
      }
      const matchError = validateConfirmPassword(password, confirmPassword);
      if (matchError) {
        setFormError(matchError);
        return;
      }
      const ok = await onUpdatePassword(password);
      if (ok) {
        setPassword('');
        setConfirmPassword('');
      }
      return;
    }

    const emailError = validateAuthEmail(email);
    if (emailError) {
      setFormError(emailError);
      return;
    }

    if (mode === 'forgot-password') {
      await onRequestPasswordReset(email.trim());
      return;
    }

    if (mode === 'signin') {
      if (!password) {
        setFormError('Please enter your password.');
        return;
      }
      const ok = await onSignIn(email.trim(), password);
      if (ok) {
        setPassword('');
      }
      return;
    }

    // Signup
    const pwError = validateAuthPassword(password, 6);
    if (pwError) {
      setFormError(pwError);
      return;
    }
    const matchError = validateConfirmPassword(password, confirmPassword);
    if (matchError) {
      setFormError(matchError);
      return;
    }
    const ok = await onSignUp(email.trim(), password, displayName.trim());
    if (ok) {
      setPassword('');
      setConfirmPassword('');
    }
  };

  const visibleError = formError || authError;

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#1C241E] flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-12">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_440px] gap-10 lg:gap-14 items-center">
        {/* Brand & Sanctuary Introduction */}
        <section className="space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-3">
            <DayspaceMark className="w-10 h-10 shrink-0" />
            <div className="text-left">
              <span className="block font-serif text-xl font-semibold tracking-tight text-[#1C241E]">
                DAYSPACE
              </span>
              <span className="block text-xs text-[#58645B]">
                Your life, beautifully organized.
              </span>
            </div>
          </div>

          <div className="space-y-3 max-w-lg mx-auto lg:mx-0">
            <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#1C241E] leading-[1.15] text-balance">
              A calm, private space for every part of your day.
            </h1>
            <p className="text-sm sm:text-base text-[#58645B] leading-relaxed">
              Sign in to access your tasks, daily habits, focus timer, personal
              journal, calendar, and IDR wallets—kept isolated and synced to
              your account.
            </p>
          </div>

          <div className="hidden sm:grid grid-cols-2 gap-4 max-w-lg mx-auto lg:mx-0 pt-2 text-left">
            <div className="flex items-start gap-3">
              <CalendarCheck2 className="w-4 h-4 text-[#5C7C66] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1C241E]">
                  Tasks &amp; Habits
                </p>
                <p className="text-xs text-[#58645B]">
                  Daily routines, priorities, and focus sessions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BookOpen className="w-4 h-4 text-[#5C7C66] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1C241E]">
                  Private Journal
                </p>
                <p className="text-xs text-[#58645B]">
                  Reflections, moods, and scrapbook photo memories
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wallet className="w-4 h-4 text-[#5C7C66] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1C241E]">
                  Digital Wallets
                </p>
                <p className="text-xs text-[#58645B]">
                  IDR balances, transfers, savings goals, and CSV import
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-[#5C7C66] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1C241E]">
                  Account Isolation
                </p>
                <p className="text-xs text-[#58645B]">
                  Protected workspace access with row-level security
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Authentication Surface */}
        <section
          aria-label="DAYSPACE authentication"
          className="w-full max-w-md mx-auto rounded-2xl bg-white border border-[#E5E1D8] p-6 sm:p-8 shadow-[0_4px_24px_rgba(28,36,30,0.05)]"
        >
          {!configured && (
            <div
              role="status"
              className="mb-5 rounded-xl bg-[#FAF6EE] border border-[#E6DEC8] p-3.5 text-xs text-[#58645B] leading-relaxed"
            >
              <p className="font-medium text-[#1C241E]">
                Authentication requires Supabase configuration
              </p>
              <p className="mt-1">
                Set <span className="font-mono text-[#1C241E]">VITE_SUPABASE_URL</span>{' '}
                and{' '}
                <span className="font-mono text-[#1C241E]">
                  VITE_SUPABASE_PUBLISHABLE_KEY
                </span>{' '}
                to enable account sign-in.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                <span>
                  URL:{' '}
                  <strong className="text-[#1C241E]">
                    {String(envDiagnostic.hasValidUrl)}
                  </strong>
                </span>
                <span>
                  Key:{' '}
                  <strong className="text-[#1C241E]">
                    {String(envDiagnostic.hasPublishableKey)}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {mode === 'recovery' ? (
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF3EE] text-[#1E3F31]">
                  <KeyRound className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="font-serif text-xl font-medium text-[#1C241E]">
                    Reset your password
                  </h2>
                  {recoveryEmail && (
                    <p className="text-xs text-[#58645B] truncate">
                      {recoveryEmail}
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="auth-recovery-password"
                    className="block text-xs font-medium text-[#1C241E] mb-1.5"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-recovery-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] pl-3.5 pr-10 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-[#58645B] hover:text-[#1C241E]"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-recovery-confirm"
                    className="block text-xs font-medium text-[#1C241E] mb-1.5"
                  >
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-recovery-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="Re-enter your new password"
                      className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] pl-3.5 pr-10 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                      aria-pressed={showConfirmPassword}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-[#58645B] hover:text-[#1C241E]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {visibleError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] px-3.5 py-2.5 text-xs text-[#9A3B30]"
                  >
                    {visibleError}
                  </p>
                )}

                {authNotice && (
                  <p
                    role="status"
                    className="rounded-xl border border-[#C6DEC9] bg-[#EDF3EE] px-3.5 py-2.5 text-xs text-[#1E3F31]"
                  >
                    {authNotice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] disabled:opacity-60 transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {submitting ? 'Updating password...' : 'Save new password'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDismissRecovery();
                    switchMode('signin');
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[#58645B] hover:text-[#1C241E] py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to sign in</span>
                </button>
              </form>
            </div>
          ) : pendingVerificationEmail && mode === 'signup' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF3EE] text-[#1E3F31] shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-serif text-xl font-medium text-[#1C241E]">
                    Verify your email
                  </h2>
                  <p className="text-xs text-[#58645B] truncate">
                    {pendingVerificationEmail}
                  </p>
                </div>
              </div>

              <p className="text-sm text-[#4B574E] leading-relaxed">
                We sent a confirmation link to{' '}
                <strong className="text-[#1C241E]">
                  {pendingVerificationEmail}
                </strong>
                . Open the link in your inbox to verify your address, then sign
                in to enter your workspace.
              </p>

              {visibleError && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] px-3.5 py-2.5 text-xs text-[#9A3B30]"
                >
                  {visibleError}
                </p>
              )}

              {authNotice && (
                <p
                  role="status"
                  className="rounded-xl border border-[#C6DEC9] bg-[#EDF3EE] px-3.5 py-2.5 text-xs text-[#1E3F31]"
                >
                  {authNotice}
                </p>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    void onResendVerification(pendingVerificationEmail)
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] disabled:opacity-60 transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Resend verification email</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearPendingVerification();
                    switchMode('signin');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] text-sm font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : mode === 'forgot-password' ? (
            <div>
              <h2 className="font-serif text-2xl font-medium text-[#1C241E]">
                Forgot password
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#58645B] leading-relaxed">
                Enter your account email and we will send a password reset
                link.
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="auth-reset-email"
                    className="block text-xs font-medium text-[#1C241E] mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7D8880] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-reset-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] pl-10 pr-3.5 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {visibleError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] px-3.5 py-2.5 text-xs text-[#9A3B30]"
                  >
                    {visibleError}
                  </p>
                )}

                {authNotice && (
                  <p
                    role="status"
                    className="rounded-xl border border-[#C6DEC9] bg-[#EDF3EE] px-3.5 py-2.5 text-xs text-[#1E3F31]"
                  >
                    {authNotice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] disabled:opacity-60 transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {submitting ? 'Sending link...' : 'Send reset link'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[#58645B] hover:text-[#1C241E] py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to sign in</span>
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="grid grid-cols-2 p-1 rounded-xl bg-[#F5F2EA] border border-[#EAE6DC]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  onClick={() => switchMode('signin')}
                  className={`py-2 rounded-lg text-xs sm:text-sm font-medium ${
                    mode === 'signin'
                      ? 'bg-[#1E3F31] text-white shadow-xs'
                      : 'bg-transparent text-[#4B574E] hover:text-[#1C241E]'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => switchMode('signup')}
                  className={`py-2 rounded-lg text-xs sm:text-sm font-medium ${
                    mode === 'signup'
                      ? 'bg-[#1E3F31] text-white shadow-xs'
                      : 'bg-transparent text-[#4B574E] hover:text-[#1C241E]'
                  }`}
                >
                  Create account
                </button>
              </div>

              <div className="mt-5">
                <h2 className="font-serif text-2xl font-medium text-[#1C241E]">
                  {mode === 'signin' ? 'Welcome back' : 'Create your space'}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#58645B]">
                  {mode === 'signin'
                    ? 'Sign in to open your private DAYSPACE workspace.'
                    : 'Set up your personal account to save and sync your data.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-display-name"
                      className="block text-xs font-medium text-[#1C241E] mb-1.5"
                    >
                      Your name{' '}
                      <span className="font-normal text-[#7D8880]">
                        (optional)
                      </span>
                    </label>
                    <input
                      id="auth-display-name"
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="How should DAYSPACE greet you?"
                      className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-[#1C241E] mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7D8880] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] pl-10 pr-3.5 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-[#1C241E]"
                    >
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot-password')}
                        className="text-xs font-medium text-[#1E3F31] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7D8880] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={
                        mode === 'signin' ? 'current-password' : 'new-password'
                      }
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder={
                        mode === 'signin'
                          ? 'Enter your password'
                          : 'At least 6 characters'
                      }
                      className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] pl-10 pr-10 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-[#58645B] hover:text-[#1C241E]"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-confirm-password"
                      className="block text-xs font-medium text-[#1C241E] mb-1.5"
                    >
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#7D8880] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        placeholder="Re-enter your password"
                        className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] pl-10 pr-10 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((prev) => !prev)
                        }
                        aria-label={
                          showConfirmPassword
                            ? 'Hide confirm password'
                            : 'Show confirm password'
                        }
                        aria-pressed={showConfirmPassword}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-[#58645B] hover:text-[#1C241E]"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {visibleError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] px-3.5 py-2.5 text-xs text-[#9A3B30]"
                  >
                    {visibleError}
                  </p>
                )}

                {pendingVerificationEmail && mode === 'signin' && (
                  <div className="rounded-xl border border-[#E6DEC8] bg-[#FAF6EE] px-3.5 py-2.5 text-xs text-[#4B574E] flex items-center justify-between gap-2">
                    <span className="truncate">
                      Need a new verification link?
                    </span>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        void onResendVerification(pendingVerificationEmail)
                      }
                      className="font-medium text-[#1E3F31] hover:underline whitespace-nowrap shrink-0"
                    >
                      Resend email
                    </button>
                  </div>
                )}

                {authNotice && (
                  <p
                    role="status"
                    className="rounded-xl border border-[#C6DEC9] bg-[#EDF3EE] px-3.5 py-2.5 text-xs text-[#1E3F31]"
                  >
                    {authNotice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] disabled:opacity-60 transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {submitting
                      ? mode === 'signin'
                        ? 'Signing in...'
                        : 'Creating account...'
                      : mode === 'signin'
                      ? 'Sign in'
                      : 'Create account'}
                  </span>
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
