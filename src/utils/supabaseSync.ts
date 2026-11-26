import type { SupabaseClient } from '@supabase/supabase-js';
import { DAYSPACE_WORKSPACES_TABLE } from '../lib/supabase';
import { DayspaceState } from '../types/dayspace';
import { createEmptyDayspaceState, sanitizeDayspaceState } from './storage';

export type CloudSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export interface CloudWorkspaceFetchResult {
  ok: boolean;
  data?: unknown | null;
  updatedAt?: string | null;
  error?: string;
}

export interface CloudWorkspaceSaveResult {
  ok: boolean;
  updatedAt?: string;
  error?: string;
}

export function hasMeaningfulWorkspaceData(state: DayspaceState): boolean {
  return (
    state.tasks.length > 0 ||
    state.habits.length > 0 ||
    state.events.length > 0 ||
    state.journalEntries.length > 0 ||
    state.wallets.length > 0 ||
    state.transactions.length > 0 ||
    state.savingsGoals.length > 0 ||
    state.pomodoroSessions.length > 0
  );
}

/**
 * Resolves initial cloud vs. local state upon sign-in without ever overwriting
 * existing local user data with an empty or missing cloud workspace.
 */
export function resolveInitialCloudSync(
  localState: DayspaceState,
  cloudRowData: unknown | null | undefined
): {
  stateToUse: DayspaceState;
  shouldUploadLocal: boolean;
} {
  if (
    cloudRowData === null ||
    cloudRowData === undefined ||
    typeof cloudRowData !== 'object' ||
    Array.isArray(cloudRowData)
  ) {
    return {
      stateToUse: localState,
      shouldUploadLocal: true,
    };
  }

  const sanitizedCloud = sanitizeDayspaceState(
    cloudRowData,
    createEmptyDayspaceState(localState.profile.name)
  );

  if (!hasMeaningfulWorkspaceData(sanitizedCloud) && hasMeaningfulWorkspaceData(localState)) {
    return {
      stateToUse: localState,
      shouldUploadLocal: true,
    };
  }

  if (!hasMeaningfulWorkspaceData(sanitizedCloud) && !hasMeaningfulWorkspaceData(localState)) {
    return {
      stateToUse: localState,
      shouldUploadLocal: false,
    };
  }

  return {
    stateToUse: sanitizedCloud,
    shouldUploadLocal: false,
  };
}

export async function fetchCloudWorkspace(
  client: SupabaseClient,
  userId: string
): Promise<CloudWorkspaceFetchResult> {
  try {
    const { data, error } = await client
      .from(DAYSPACE_WORKSPACES_TABLE)
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: data?.data ?? null,
      updatedAt: typeof data?.updated_at === 'string' ? data.updated_at : null,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to reach Supabase cloud storage.',
    };
  }
}

export async function saveCloudWorkspace(
  client: SupabaseClient,
  userId: string,
  state: DayspaceState
): Promise<CloudWorkspaceSaveResult> {
  const updatedAt = new Date().toISOString();
  try {
    const { error } = await client.from(DAYSPACE_WORKSPACES_TABLE).upsert(
      {
        user_id: userId,
        data: state,
        updated_at: updatedAt,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, updatedAt };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to save workspace to Supabase.',
    };
  }
}
