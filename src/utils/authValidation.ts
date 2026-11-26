export type AuthFormMode = 'signin' | 'signup' | 'forgot-password' | 'recovery';

export interface AuthUrlFeedback {
  kind: 'error' | 'success' | 'recovery';
  message: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthEmail(email: string): string | null {
  const clean = email.trim();
  if (!clean) {
    return 'Please enter your email address.';
  }
  if (!EMAIL_PATTERN.test(clean)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function validateAuthPassword(
  password: string,
  minLength = 6
): string | null {
  if (!password) {
    return 'Please enter your password.';
  }
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters.`;
  }
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}

export function deriveProfileNameFromUser(
  email?: string | null,
  metadata?: Record<string, unknown> | null
): string {
  const metaName =
    metadata && typeof metadata.full_name === 'string'
      ? metadata.full_name.trim()
      : '';
  if (metaName) return metaName;

  if (email && email.includes('@')) {
    const localPart = email.split('@')[0]?.trim() || '';
    if (localPart) {
      const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
      if (cleaned) {
        return cleaned
          .split(/\s+/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
      }
    }
  }

  return 'Personal Space';
}

export function parseAuthUrlFeedback(href: string): AuthUrlFeedback | null {
  if (!href) return null;
  try {
    const url = new URL(href);
    const searchParams = url.searchParams;
    const hashRaw = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hashRaw);

    const errorCode =
      searchParams.get('error_code') || hashParams.get('error_code');
    const errorDescription =
      searchParams.get('error_description') ||
      hashParams.get('error_description') ||
      searchParams.get('error') ||
      hashParams.get('error');

    if (errorDescription) {
      const normalized = errorDescription.replace(/\+/g, ' ').trim();
      if (errorCode === 'otp_expired') {
        return {
          kind: 'error',
          message:
            'Your verification or reset link has expired. Please request a new email below.',
        };
      }
      return {
        kind: 'error',
        message: normalized,
      };
    }

    const type = searchParams.get('type') || hashParams.get('type');
    if (type === 'recovery') {
      return {
        kind: 'recovery',
        message: 'Set a new password for your DAYSPACE account below.',
      };
    }
    if (type === 'signup' || type === 'email' || type === 'email_change') {
      return {
        kind: 'success',
        message: 'Email verified. Welcome to DAYSPACE!',
      };
    }
    return null;
  } catch {
    return null;
  }
}
