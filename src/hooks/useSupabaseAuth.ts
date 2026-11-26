import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthChangeEvent, User } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  supabase,
  supabaseEnvDiagnostic,
} from '../lib/supabase';
import {
  parseAuthUrlFeedback,
  validateAuthEmail,
  validateAuthPassword,
} from '../utils/authValidation';

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

function normalizeAuthErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email address before signing in. You can resend the confirmation email below.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts right now. Please wait a moment and try again.';
  }
  return message;
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

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setAuthError(normalizeAuthErrorMessage(error.message));
        }
        const sessionUser = data.session?.user ?? null;
        hadAuthenticatedSessionRef.current = Boolean(sessionUser);
        setUser(sessionUser);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setAuthError(
          err instanceof Error ? err.message : 'Unable to check auth session.'
        );
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

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      void client.auth.getSession().then(({ data, error }) => {
        if (!mounted) return;
        if (error && hadAuthenticatedSessionRef.current) {
          setAuthError(
            'Your session could not be refreshed. Please sign in again.'
          );
          hadAuthenticatedSessionRef.current = false;
          setUser(null);
          return;
        }
        const sessionUser = data.session?.user ?? null;
        if (!sessionUser && hadAuthenticatedSessionRef.current) {
          setAuthNotice(
            'Your session expired or was signed out. Please sign in again.'
          );
        }
        hadAuthenticatedSessionRef.current = Boolean(sessionUser);
        setUser(sessionUser);
      });
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('hashchange', syncUrlFeedback);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
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
    const cleanEmail = email.trim();
    const emailError = validateAuthEmail(cleanEmail);
    if (emailError) {
      setAuthError(emailError);
      return false;
    }
    if (!password) {
      setAuthError('Please enter your password.');
      return false;
    }
    if (!supabase) {
      setAuthError('Supabase authentication is not configured in this environment.');
      return false;
    }

    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setPendingVerificationEmail(cleanEmail);
        }
        setAuthError(normalizeAuthErrorMessage(error.message));
        return false;
      }
      setPendingVerificationEmail(null);
      setIsPasswordRecovery(false);
      return true;
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const cleanEmail = email.trim();
      const emailError = validateAuthEmail(cleanEmail);
      if (emailError) {
        setAuthError(emailError);
        return false;
      }
      const passwordError = validateAuthPassword(password, 6);
      if (passwordError) {
        setAuthError(passwordError);
        return false;
      }
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
        const cleanName = displayName?.trim();
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
            ...(cleanName ? { data: { full_name: cleanName } } : {}),
          },
        });
        if (error) {
          setAuthError(normalizeAuthErrorMessage(error.message));
          return false;
        }
        if (data.session) {
          setPendingVerificationEmail(null);
          setAuthNotice('Account created. Opening your DAYSPACE workspace...');
        } else {
          setPendingVerificationEmail(cleanEmail);
          setAuthNotice(
            `Confirmation link sent to ${cleanEmail}. Check your inbox (and spam folder) to verify your account before signing in.`
          );
        }
        return true;
      } catch (err) {
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Could not create account. Please try again.'
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const resendVerificationEmail = useCallback(async (email: string) => {
    const cleanEmail = email.trim();
    const emailError = validateAuthEmail(cleanEmail);
    if (emailError) {
      setAuthError(emailError);
      return false;
    }
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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });
      if (error) {
        setAuthError(normalizeAuthErrorMessage(error.message));
        return false;
      }
      setAuthNotice(
        `Verification email sent again to ${cleanEmail}. Please open the link in your inbox.`
      );
      return true;
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Unable to resend verification email right now.'
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const cleanEmail = email.trim();
    const emailError = validateAuthEmail(cleanEmail);
    if (emailError) {
      setAuthError(emailError);
      return false;
    }
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
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getRedirectUrl(),
      });
      if (error) {
        setAuthError(normalizeAuthErrorMessage(error.message));
        return false;
      }
      setAuthNotice(
        `If an account exists for ${cleanEmail}, a password reset link has been sent. Open the link in your email to set a new password.`
      );
      return true;
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Unable to send password reset email right now.'
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const passwordError = validateAuthPassword(newPassword, 6);
    if (passwordError) {
      setAuthError(passwordError);
      return false;
    }
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        setAuthError(normalizeAuthErrorMessage(error.message));
        return false;
      }
      setIsPasswordRecovery(false);
      setAuthNotice('Your password has been updated.');
      return true;
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Unable to update password right now.'
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const dismissRecoveryMode = useCallback(() => {
    setIsPasswordRecovery(false);
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);
    intentionalSignOutRef.current = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        intentionalSignOutRef.current = false;
        setAuthError(normalizeAuthErrorMessage(error.message));
      } else {
        hadAuthenticatedSessionRef.current = false;
        setIsPasswordRecovery(false);
        setPendingVerificationEmail(null);
        setUser(null);
        setAuthNotice('You have been signed out safely.');
      }
    } catch (err) {
      intentionalSignOutRef.current = false;
      setAuthError(
        err instanceof Error ? err.message : 'Unable to sign out right now.'
      );
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
