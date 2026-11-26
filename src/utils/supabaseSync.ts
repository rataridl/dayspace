import type { SupabaseClient } from '@supabase/supabase-js';
import { DAYSPACE_WORKSPACES_TABLE } from '../lib/supabase';
import { DayspaceState } from '../types/dayspace';
import { createEmptyDayspaceState, sanitizeDayspaceState } from './storage';

export type CloudSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export type CloudHydrationPhase =
  | 'idle'
  | 'loading'
  | 'needs-migration-choice'
  | 'ready'
  | 'error';

export type MigrationCandidateSource = 'account-local' | 'legacy-local';

export interface MigrationCandidate {
  source: MigrationCandidateSource;
  state: DayspaceState;
}

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

export type AuthenticatedWorkspaceLoadResolution =
  | {
      phase: 'error';
      error: string;
      offlineFallbackState: DayspaceState | null;
    }
  | {
      phase: 'needs-migration-choice';
      candidateSource: MigrationCandidateSource;
      candidateState: DayspaceState;
    }
  | {
      phase: 'ready';
      state: DayspaceState;
      lastSyncedAt: string | null;
      source: 'cloud' | 'fresh';
      shouldSyncInitialToCloud: boolean;
    };

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
 * Legacy helper retained for backward compatibility and tests.
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

  if (
    !hasMeaningfulWorkspaceData(sanitizedCloud) &&
    hasMeaningfulWorkspaceData(localState)
  ) {
    return {
      stateToUse: localState,
      shouldUploadLocal: true,
    };
  }

  if (
    !hasMeaningfulWorkspaceData(sanitizedCloud) &&
    !hasMeaningfulWorkspaceData(localState)
  ) {
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

/**
 * Strict multi-user workspace resolver upon login:
 * - Case A: Existing cloud workspace with data -> loads cloud workspace cleanly.
 * - Case B/C: Missing or empty cloud workspace + existing meaningful local data ->
 *   requires explicit user confirmation before migrating or starting fresh.
 * - Case D: Cloud fetch failure -> stops safely on error with Retry (never overwrites).
 */
export function resolveAuthenticatedWorkspaceLoad(params: {
  cloudResult: CloudWorkspaceFetchResult;
  userLocalState: DayspaceState | null;
  legacyLocalState: DayspaceState | null;
  defaultName: string;
}): AuthenticatedWorkspaceLoadResolution {
  const { cloudResult, userLocalState, legacyLocalState, defaultName } = params;

  if (!cloudResult.ok) {
    return {
      phase: 'error',
      error:
        cloudResult.error ||
        'Unable to reach your DAYSPACE cloud workspace. Your saved data has not been changed.',
      offlineFallbackState: userLocalState,
    };
  }

  const hasCloudObject =
    cloudResult.data !== null &&
    cloudResult.data !== undefined &&
    typeof cloudResult.data === 'object' &&
    !Array.isArray(cloudResult.data);

  const baseline = createEmptyDayspaceState(defaultName);
  const sanitizedCloud = hasCloudObject
    ? sanitizeDayspaceState(cloudResult.data, baseline)
    : null;

  // Case A: Account already has saved cloud workspace data
  if (sanitizedCloud && hasMeaningfulWorkspaceData(sanitizedCloud)) {
    return {
      phase: 'ready',
      state: sanitizedCloud,
      lastSyncedAt: cloudResult.updatedAt ?? null,
      source: 'cloud',
      shouldSyncInitialToCloud: false,
    };
  }

  // Case C: Account has no meaningful cloud data yet, but account-scoped offline cache exists
  if (userLocalState && hasMeaningfulWorkspaceData(userLocalState)) {
    return {
      phase: 'needs-migration-choice',
      candidateSource: 'account-local',
      candidateState: userLocalState,
    };
  }

  // Case B / C: Account has no meaningful cloud data yet, and unclaimed pre-auth local workspace exists
  if (legacyLocalState && hasMeaningfulWorkspaceData(legacyLocalState)) {
    return {
      phase: 'needs-migration-choice',
      candidateSource: 'legacy-local',
      candidateState: legacyLocalState,
    };
  }

  // Brand-new account or clean empty workspace with no pending local data
  const state = userLocalState ?? sanitizedCloud ?? baseline;
  return {
    phase: 'ready',
    state,
    lastSyncedAt: cloudResult.updatedAt ?? null,
    source: hasCloudObject ? 'cloud' : 'fresh',
    shouldSyncInitialToCloud: !hasCloudObject,
  };
}

export async function fetchCloudWorkspace(
  client: Pick<SupabaseClient, 'from'>,
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
  client: Pick<SupabaseClient, 'from'>,
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
