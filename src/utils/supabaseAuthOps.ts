import type { SupabaseClient, User } from '@supabase/supabase-js';
import { validateAuthEmail, validateAuthPassword } from './authValidation';

export type SupabaseAuthClient = Pick<
  SupabaseClient['auth'],
  | 'getSession'
  | 'signInWithPassword'
  | 'signUp'
  | 'resend'
  | 'resetPasswordForEmail'
  | 'updateUser'
  | 'signOut'
>;

export interface AuthActionResult {
  ok: boolean;
  user?: User | null;
  requiresEmailVerification?: boolean;
  pendingEmail?: string;
  notice?: string;
  error?: string;
}

export function normalizeSupabaseAuthError(message: string): string {
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

export async function restoreAuthSession(
  authClient: Pick<SupabaseAuthClient, 'getSession'>
): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await authClient.getSession();
    if (error) {
      return {
        user: null,
        error: normalizeSupabaseAuthError(error.message),
      };
    }
    return {
      user: data.session?.user ?? null,
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      error:
        err instanceof Error ? err.message : 'Unable to check auth session.',
    };
  }
}

export async function signInWithEmailPassword(
  authClient: Pick<SupabaseAuthClient, 'signInWithPassword'>,
  email: string,
  password: string
): Promise<AuthActionResult> {
  const cleanEmail = email.trim();
  const emailError = validateAuthEmail(cleanEmail);
  if (emailError) return { ok: false, error: emailError };
  if (!password) return { ok: false, error: 'Please enter your password.' };

  try {
    const { data, error } = await authClient.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) {
      const needsVerification = error.message
        .toLowerCase()
        .includes('email not confirmed');
      return {
        ok: false,
        requiresEmailVerification: needsVerification,
        pendingEmail: needsVerification ? cleanEmail : undefined,
        error: normalizeSupabaseAuthError(error.message),
      };
    }
    return {
      ok: true,
      user: data.session?.user ?? data.user ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Sign-in failed. Please try again.',
    };
  }
}

export async function registerWithEmailPassword(
  authClient: Pick<SupabaseAuthClient, 'signUp'>,
  email: string,
  password: string,
  options?: { displayName?: string; emailRedirectTo?: string }
): Promise<AuthActionResult> {
  const cleanEmail = email.trim();
  const emailError = validateAuthEmail(cleanEmail);
  if (emailError) return { ok: false, error: emailError };

  const passwordError = validateAuthPassword(password, 6);
  if (passwordError) return { ok: false, error: passwordError };

  try {
    const cleanName = options?.displayName?.trim();
    const { data, error } = await authClient.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: options?.emailRedirectTo,
        ...(cleanName ? { data: { full_name: cleanName } } : {}),
      },
    });
    if (error) {
      return { ok: false, error: normalizeSupabaseAuthError(error.message) };
    }
    if (data.session) {
      return {
        ok: true,
        user: data.session.user,
        requiresEmailVerification: false,
        notice: 'Account created. Opening your DAYSPACE workspace...',
      };
    }
    return {
      ok: true,
      user: data.user ?? null,
      requiresEmailVerification: true,
      pendingEmail: cleanEmail,
      notice: `Confirmation link sent to ${cleanEmail}. Check your inbox (and spam folder) to verify your account before signing in.`,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Could not create account. Please try again.',
    };
  }
}

export async function resendSignupVerification(
  authClient: Pick<SupabaseAuthClient, 'resend'>,
  email: string,
  emailRedirectTo?: string
): Promise<AuthActionResult> {
  const cleanEmail = email.trim();
  const emailError = validateAuthEmail(cleanEmail);
  if (emailError) return { ok: false, error: emailError };

  try {
    const { error } = await authClient.resend({
      type: 'signup',
      email: cleanEmail,
      options: { emailRedirectTo },
    });
    if (error) {
      return { ok: false, error: normalizeSupabaseAuthError(error.message) };
    }
    return {
      ok: true,
      notice: `Verification email sent again to ${cleanEmail}. Please open the link in your inbox.`,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to resend verification email right now.',
    };
  }
}

export async function requestAccountPasswordReset(
  authClient: Pick<SupabaseAuthClient, 'resetPasswordForEmail'>,
  email: string,
  redirectTo?: string
): Promise<AuthActionResult> {
  const cleanEmail = email.trim();
  const emailError = validateAuthEmail(cleanEmail);
  if (emailError) return { ok: false, error: emailError };

  try {
    const { error } = await authClient.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });
    if (error) {
      return { ok: false, error: normalizeSupabaseAuthError(error.message) };
    }
    return {
      ok: true,
      notice: `If an account exists for ${cleanEmail}, a password reset link has been sent. Open the link in your email to set a new password.`,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to send password reset email right now.',
    };
  }
}

export async function updateAccountPassword(
  authClient: Pick<SupabaseAuthClient, 'updateUser'>,
  newPassword: string
): Promise<AuthActionResult> {
  const passwordError = validateAuthPassword(newPassword, 6);
  if (passwordError) return { ok: false, error: passwordError };

  try {
    const { data, error } = await authClient.updateUser({
      password: newPassword,
    });
    if (error) {
      return { ok: false, error: normalizeSupabaseAuthError(error.message) };
    }
    return {
      ok: true,
      user: data.user ?? null,
      notice: 'Your password has been updated.',
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to update password right now.',
    };
  }
}

export async function signOutAccount(
  authClient: Pick<SupabaseAuthClient, 'signOut'>
): Promise<AuthActionResult> {
  try {
    const { error } = await authClient.signOut();
    if (error) {
      return { ok: false, error: normalizeSupabaseAuthError(error.message) };
    }
    return {
      ok: true,
      user: null,
      notice: 'You have been signed out safely.',
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : 'Unable to sign out right now.',
    };
  }
}
