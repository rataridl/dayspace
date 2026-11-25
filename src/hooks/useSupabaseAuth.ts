import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function getRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const meta = import.meta as unknown as { env?: { BASE_URL?: string } };
    const base = meta?.env?.BASE_URL || '/';
    return new URL(base, window.location.origin).toString();
  } catch {
    return window.location.origin;
  }
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
        }
        setUser(data.session?.user ?? null);
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const clearAuthMessages = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setAuthError('Supabase is not configured yet.');
      return false;
    }
    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setAuthError(error.message);
        return false;
      }
      setAuthNotice('Signed in. Cloud sync is now active.');
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

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setAuthError('Supabase is not configured yet.');
      return false;
    }
    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });
      if (error) {
        setAuthError(error.message);
        return false;
      }
      if (data.session) {
        setAuthNotice('Account created and signed in.');
      } else {
        setAuthNotice(
          'Account created! Please check your email inbox to confirm your address before signing in.'
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
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthNotice('Signed out. DAYSPACE continues saving locally.');
      }
    } catch (err) {
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
    authError,
    authNotice,
    signIn,
    signUp,
    signOut,
    clearAuthMessages,
  };
}
