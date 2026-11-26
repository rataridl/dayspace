import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthChangeEvent, User } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  supabase,
  supabaseEnvDiagnostic,
} from '../lib/supabase';
import { parseAuthUrlFeedback } from '../utils/authValidation';
import {
  registerWithEmailPassword,
  requestAccountPasswordReset,
  resendSignupVerification,
  restoreAuthSession,
  signInWithEmailPassword,
  signOutAccount,
  updateAccountPassword,
} from '../utils/supabaseAuthOps';

function getRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const base =
      typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.BASE_URL || '/'
        : '/';
    return new URL(base, window.location.origin).toString();
  } catch {
    return window.location.origin;
  }
}

function cleanAuthHashIfNeeded(): void {
  if (typeof window === 'undefined') return;
  try {
    const hash = window.location.hash;
    if (
      hash &&
      (hash.includes('access_token=') ||
        hash.includes('type=recovery') ||
        hash.includes('type=signup') ||
        hash.includes('error='))
    ) {
      window.history.replaceState(
        null,
        document.title,
        window.location.pathname + window.location.search
      );
    }
  } catch {
    // Ignore history API errors in restricted environments
  }
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  const hadAuthenticatedSessionRef = useRef(false);
  const intentionalSignOutRef = useRef(false);

  useEffect(() => {
    const syncUrlFeedback = () => {
      if (typeof window === 'undefined') return;
      const feedback = parseAuthUrlFeedback(window.location.href);
      if (feedback?.kind === 'error') {
        setAuthError(feedback.message);
      } else if (feedback?.kind === 'recovery') {
        setIsPasswordRecovery(true);
        setAuthNotice(feedback.message);
      } else if (feedback?.kind === 'success') {
        setAuthNotice(feedback.message);
      }
    };

    syncUrlFeedback();

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', syncUrlFeedback);
    }

    if (!supabase) {
      setLoading(false);
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('hashchange', syncUrlFeedback);
        }
      };
    }

    const client = supabase;
    let mounted = true;

    restoreAuthSession(client.auth).then(({ user: sessionUser, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthError(error);
      }
      hadAuthenticatedSessionRef.current = Boolean(sessionUser);
      setUser(sessionUser);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        if (!mounted) return;
        const nextUser = session?.user ?? null;

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          setAuthError(null);
          setAuthNotice('Choose a new password for your DAYSPACE account.');
        } else if (event === 'SIGNED_IN' && nextUser) {
          setPendingVerificationEmail(null);
        } else if (event === 'SIGNED_OUT') {
          const wasSignedIn = hadAuthenticatedSessionRef.current;
          const wasIntentional = intentionalSignOutRef.current;
          intentionalSignOutRef.current = false;
          setIsPasswordRecovery(false);
          if (wasSignedIn && !wasIntentional) {
            setAuthNotice(
              'Your session expired or was signed out. Please sign in again to access your workspace.'
            );
          }
        }

        hadAuthenticatedSessionRef.current = Boolean(nextUser);
        setUser(nextUser);
        setLoading(false);
      }
    );

    const handleSessionRefreshCheck = () => {
      if (document.visibilityState === 'hidden') return;
      void restoreAuthSession(client.auth).then(({ user: sessionUser, error }) => {
        if (!mounted) return;
        if (error && hadAuthenticatedSessionRef.current) {
          setAuthError(
            'Your session could not be refreshed. Please sign in again.'
          );
          hadAuthenticatedSessionRef.current = false;
          setUser(null);
          return;
        }
        if (!sessionUser && hadAuthenticatedSessionRef.current) {
          setAuthNotice(
            'Your session expired or was signed out. Please sign in again.'
          );
        }
        hadAuthenticatedSessionRef.current = Boolean(sessionUser);
        setUser(sessionUser);
      });
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (!e.key || e.key.includes('auth-token')) {
        handleSessionRefreshCheck();
      }
    };

    window.addEventListener('focus', handleSessionRefreshCheck);
    document.addEventListener('visibilitychange', handleSessionRefreshCheck);
    window.addEventListener('storage', handleStorageSync);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('hashchange', syncUrlFeedback);
      window.removeEventListener('focus', handleSessionRefreshCheck);
      document.removeEventListener('visibilitychange', handleSessionRefreshCheck);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  const clearAuthMessages = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const clearPendingVerification = useCallback(() => {
    setPendingVerificationEmail(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setAuthError('Supabase authentication is not configured in this environment.');
      return false;
    }

    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const result = await signInWithEmailPassword(
        supabase.auth,
        email,
        password
      );
      if (!result.ok) {
        if (result.requiresEmailVerification && result.pendingEmail) {
          setPendingVerificationEmail(result.pendingEmail);
        }
        setAuthError(result.error || 'Sign-in failed.');
        return false;
      }
      setPendingVerificationEmail(null);
      setIsPasswordRecovery(false);
      cleanAuthHashIfNeeded();
      return true;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!supabase) {
        setAuthError(
          'Supabase authentication is not configured in this environment.'
        );
        return false;
      }

      setSubmitting(true);
      setAuthError(null);
      setAuthNotice(null);

      try {
        const result = await registerWithEmailPassword(
          supabase.auth,
          email,
          password,
          {
            displayName,
            emailRedirectTo: getRedirectUrl(),
          }
        );
        if (!result.ok) {
          setAuthError(result.error || 'Could not create account.');
          return false;
        }
        setPendingVerificationEmail(
          result.requiresEmailVerification ? result.pendingEmail ?? null : null
        );
        setAuthNotice(result.notice || null);
        return true;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const resendVerificationEmail = useCallback(async (email: string) => {
    if (!supabase) {
      setAuthError(
        'Supabase authentication is not configured in this environment.'
      );
      return false;
    }

    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const result = await resendSignupVerification(
        supabase.auth,
        email,
        getRedirectUrl()
      );
      if (!result.ok) {
        setAuthError(
          result.error || 'Unable to resend verification email right now.'
        );
        return false;
      }
      setAuthNotice(result.notice || null);
      return true;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) {
      setAuthError(
        'Supabase authentication is not configured in this environment.'
      );
      return false;
    }

    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const result = await requestAccountPasswordReset(
        supabase.auth,
        email,
        getRedirectUrl()
      );
      if (!result.ok) {
        setAuthError(
          result.error || 'Unable to send password reset email right now.'
        );
        return false;
      }
      setAuthNotice(result.notice || null);
      return true;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) {
      setAuthError(
        'Supabase authentication is not configured in this environment.'
      );
      return false;
    }

    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const result = await updateAccountPassword(supabase.auth, newPassword);
      if (!result.ok) {
        setAuthError(result.error || 'Unable to update password right now.');
        return false;
      }
      setIsPasswordRecovery(false);
      cleanAuthHashIfNeeded();
      setAuthNotice(result.notice || 'Your password has been updated.');
      return true;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const dismissRecoveryMode = useCallback(() => {
    setIsPasswordRecovery(false);
    setAuthError(null);
    setAuthNotice(null);
    cleanAuthHashIfNeeded();
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);
    intentionalSignOutRef.current = true;
    try {
      const result = await signOutAccount(supabase.auth);
      if (!result.ok) {
        intentionalSignOutRef.current = false;
        setAuthError(result.error || 'Unable to sign out right now.');
      } else {
        hadAuthenticatedSessionRef.current = false;
        setIsPasswordRecovery(false);
        setPendingVerificationEmail(null);
        setUser(null);
        cleanAuthHashIfNeeded();
        setAuthNotice(result.notice || 'You have been signed out safely.');
      }
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    user,
    loading,
    submitting,
    configured: isSupabaseConfigured,
    envDiagnostic: supabaseEnvDiagnostic,
    authError,
    authNotice,
    pendingVerificationEmail,
    isPasswordRecovery,
    signIn,
    signUp,
    resendVerificationEmail,
    requestPasswordReset,
    updatePassword,
    dismissRecoveryMode,
    signOut,
    clearAuthMessages,
    clearPendingVerification,
  };
}
