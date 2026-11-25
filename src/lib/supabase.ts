import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DAYSPACE_WORKSPACES_TABLE = 'dayspace_workspaces';

function readViteEnv(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'): string {
  try {
    const meta = import.meta as unknown as {
      env?: Record<string, string | undefined>;
    };
    return (meta?.env?.[key] ?? '').trim();
  } catch {
    return '';
  }
}

const supabaseUrl = readViteEnv('VITE_SUPABASE_URL');
const supabasePublishableKey = readViteEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured: boolean =
  isValidHttpUrl(supabaseUrl) &&
  supabasePublishableKey.length > 0 &&
  !supabasePublishableKey.startsWith('MY_');

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
