import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DAYSPACE_WORKSPACES_TABLE = 'dayspace_workspaces';

export interface SupabaseEnvDiagnostic {
  hasUrl: boolean;
  hasValidUrl: boolean;
  hasPublishableKey: boolean;
  isConfigured: boolean;
}

export function normalizeEnvValue(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function evaluateSupabaseEnv(
  rawUrl: unknown,
  rawKey: unknown
): {
  url: string;
  publishableKey: string;
  diagnostic: SupabaseEnvDiagnostic;
} {
  const url = normalizeEnvValue(rawUrl);
  const publishableKey = normalizeEnvValue(rawKey);
  const hasUrl = url.length > 0;
  const hasValidUrl =
    isValidHttpUrl(url) && !url.includes('YOUR-PROJECT-ID');
  const hasPublishableKey =
    publishableKey.length > 0 &&
    !publishableKey.startsWith('MY_') &&
    publishableKey !== 'YOUR_SUPABASE_PUBLISHABLE_KEY';

  return {
    url,
    publishableKey,
    diagnostic: {
      hasUrl,
      hasValidUrl,
      hasPublishableKey,
      isConfigured: hasValidUrl && hasPublishableKey,
    },
  };
}

// Vite only statically replaces direct `import.meta.env.VITE_*` property accesses
// during production builds (`vite build`). Never use dynamic key indexing here.
const rawSupabaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL
    : undefined;
const rawSupabasePublishableKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    : undefined;

const evaluated = evaluateSupabaseEnv(
  rawSupabaseUrl,
  rawSupabasePublishableKey
);

const supabaseUrl = evaluated.url;
const supabasePublishableKey = evaluated.publishableKey;

export const supabaseEnvDiagnostic: SupabaseEnvDiagnostic = evaluated.diagnostic;

export const isSupabaseConfigured: boolean = supabaseEnvDiagnostic.isConfigured;

if (typeof window !== 'undefined') {
  console.info('[DAYSPACE] Supabase env check:', {
    VITE_SUPABASE_URL: supabaseEnvDiagnostic.hasUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: supabaseEnvDiagnostic.hasPublishableKey,
    isConfigured: supabaseEnvDiagnostic.isConfigured,
  });
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
