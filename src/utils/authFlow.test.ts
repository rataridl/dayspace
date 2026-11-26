import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createInitialDayspaceState } from '../data/seed';
import {
  JournalMood,
  TransactionType,
  WalletType,
} from '../types/dayspace';
import {
  deriveProfileNameFromUser,
  parseAuthUrlFeedback,
  validateAuthEmail,
  validateAuthPassword,
  validateConfirmPassword,
} from './authValidation';
import {
  clearUserDayspaceStorage,
  createEmptyDayspaceState,
  DAYSPACE_STORAGE_KEY,
  exportDayspaceBackup,
  getUserStorageKey,
  isLegacyLocalMigrated,
  loadLegacyLocalState,
  loadUserDayspaceState,
  markLegacyLocalMigrated,
  parseDayspaceBackup,
  saveDayspaceState,
  saveUserDayspaceState,
} from './storage';
import {
  fetchCloudWorkspace,
  resolveAuthenticatedWorkspaceLoad,
  saveCloudWorkspace,
} from './supabaseSync';

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

/**
 * Simulates Postgres + Supabase RLS (`auth.uid() = user_id`) for `dayspace_workspaces`.
 */
function createRlsMockSupabaseClient(
  initialRows: Record<string, { data: unknown; updated_at: string }> = {},
  initialSessionUserId: string | null = null
): {
  client: Pick<SupabaseClient, 'from'>;
  setSessionUser: (uid: string | null) => void;
  setNetworkDown: (down: boolean) => void;
  getRawRows: () => Map<string, { data: unknown; updated_at: string }>;
} {
  const rows = new Map<string, { data: unknown; updated_at: string }>(
    Object.entries(initialRows)
  );
  let activeUid = initialSessionUserId;
  let networkDown = false;

  const client: Pick<SupabaseClient, 'from'> = {
    from(table: string) {
      assert.equal(table, 'dayspace_workspaces');
      return {
        select() {
          return {
            eq(column: string, targetUid: string) {
              assert.equal(column, 'user_id');
              return {
                async maybeSingle() {
                  if (networkDown) {
                    return {
                      data: null,
                      error: { message: 'Failed to fetch (network unavailable)' },
                    };
                  }
                  if (!activeUid) {
                    return {
                      data: null,
                      error: { message: 'JWT required: unauthenticated read denied by RLS' },
                    };
                  }
                  // RLS filter `auth.uid() = user_id`
                  if (activeUid !== targetUid) {
                    return { data: null, error: null };
                  }
                  const row = rows.get(targetUid) ?? null;
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        async upsert(payload: { user_id: string; data: unknown; updated_at: string }) {
          if (networkDown) {
            return {
              error: { message: 'Failed to fetch (network unavailable)' },
            };
          }
          if (!activeUid || activeUid !== payload.user_id) {
            return {
              error: {
                message:
                  'new row violates row-level security policy for table "dayspace_workspaces"',
              },
            };
          }
          rows.set(payload.user_id, {
            data: structuredClone(payload.data),
            updated_at: payload.updated_at,
          });
          return { error: null };
        },
      } as unknown as ReturnType<SupabaseClient['from']>;
    },
  };

  return {
    client,
    setSessionUser: (uid) => {
      activeUid = uid;
    },
    setNetworkDown: (down) => {
      networkDown = down;
    },
    getRawRows: () => rows,
  };
}

test('auth validation and redirect URL feedback helpers validate inputs and parse recovery/verification states', () => {
  assert.ok(validateAuthEmail(''));
  assert.ok(validateAuthEmail('not-an-email'));
  assert.equal(validateAuthEmail('  clara@dayspace.app '), null);

  assert.ok(validateAuthPassword('', 6));
  assert.ok(validateAuthPassword('12345', 6));
  assert.equal(validateAuthPassword('secret123', 6), null);

  assert.ok(validateConfirmPassword('secret123', ''));
  assert.ok(validateConfirmPassword('secret123', 'mismatch'));
  assert.equal(validateConfirmPassword('secret123', 'secret123'), null);

  assert.equal(
    deriveProfileNameFromUser('clara.w@example.com', { full_name: 'Clara Wijaya' }),
    'Clara Wijaya'
  );
  assert.equal(deriveProfileNameFromUser('budi_santoso@example.com', null), 'Budi Santoso');

  const recovery = parseAuthUrlFeedback(
    'https://rataridl.github.io/dayspace/#access_token=abc&type=recovery'
  );
  assert.equal(recovery?.kind, 'recovery');

  const expired = parseAuthUrlFeedback(
    'https://rataridl.github.io/dayspace/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
  );
  assert.equal(expired?.kind, 'error');
  assert.match(expired?.message || '', /expired/i);

  const verified = parseAuthUrlFeedback(
    'https://rataridl.github.io/dayspace/?type=signup'
  );
  assert.equal(verified?.kind, 'success');
});

test('user-namespaced LocalStorage strictly isolates User A and User B on the same browser', () => {
  const storage = createMemoryStorage();
  const userA = createEmptyDayspaceState('Clara');
  userA.tasks = [
    {
      id: 't-a',
      title: 'Private Task A',
      category: userA.tasks[0]?.category ?? ('Personal' as never),
      priority: userA.tasks[0]?.priority ?? ('medium' as never),
      dueDate: '2026-11-26',
      completed: false,
      createdAt: '2026-11-26T00:00:00Z',
    },
  ];
  userA.journalEntries = [
    {
      id: 'j-a',
      date: '2026-11-26',
      title: 'Morning reflection',
      mood: JournalMood.Calm,
      gratitude: ['Coffee'],
      body: 'Quiet morning.',
      tags: ['Morning'],
      photos: [
        {
          id: 'p-1',
          dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          name: 'coffee.jpg',
          addedAt: '2026-11-26T00:00:00Z',
        },
      ],
      createdAt: '2026-11-26T00:00:00Z',
      updatedAt: '2026-11-26T00:00:00Z',
    },
  ];

  const userB = createEmptyDayspaceState('Raka');
  userB.wallets = [
    {
      id: 'w-b',
      name: 'GoPay',
      type: WalletType.GoPay,
      balance: 350000,
      color: '#2F7D4E',
      icon: 'smartphone',
      createdAt: '2026-11-26T00:00:00Z',
      updatedAt: '2026-11-26T00:00:00Z',
    },
  ];

  assert.equal(saveUserDayspaceState('uid-a', userA, storage).ok, true);
  assert.equal(saveUserDayspaceState('uid-b', userB, storage).ok, true);

  assert.notEqual(getUserStorageKey('uid-a'), getUserStorageKey('uid-b'));

  // Verify User A cannot leak into User B and vice versa
  const loadedA = loadUserDayspaceState('uid-a', storage);
  const loadedB = loadUserDayspaceState('uid-b', storage);
  assert.equal(loadedA?.tasks[0]?.title, 'Private Task A');
  assert.equal(loadedA?.journalEntries[0]?.photos?.length, 1);
  assert.equal(loadedA?.wallets.length, 0);

  assert.equal(loadedB?.tasks.length, 0);
  assert.equal(loadedB?.journalEntries.length, 0);
  assert.equal(loadedB?.wallets[0]?.balance, 350000);

  // Never wrote to legacy global key
  assert.equal(storage.getItem(DAYSPACE_STORAGE_KEY), null);

  // Clearing User A cache does not affect User B
  clearUserDayspaceStorage('uid-a', storage);
  assert.equal(loadUserDayspaceState('uid-a', storage), null);
  assert.equal(loadUserDayspaceState('uid-b', storage)?.wallets[0]?.name, 'GoPay');
});

test('legacy local data detection preserves existing data cleanly and prevents re-offering to another account after migration', () => {
  const storage = createMemoryStorage();
  // Clean browser -> null (no fabricated seed migration prompt)
  assert.equal(loadLegacyLocalState(storage), null);

  // Populate pre-auth legacy workspace
  const legacy = createInitialDayspaceState();
  legacy.profile.name = 'Existing Local User';
  saveDayspaceState(legacy, storage);

  const detected = loadLegacyLocalState(storage);
  assert.ok(detected);
  assert.equal(detected?.profile.name, 'Existing Local User');
  assert.ok((detected?.wallets.length ?? 0) > 0);

  // User A confirms importing legacy data
  assert.equal(isLegacyLocalMigrated(storage), false);
  markLegacyLocalMigrated('uid-a', 'imported', storage);
  assert.equal(isLegacyLocalMigrated(storage), true);

  // Subsequent new account (User B) on same browser does not get prompted with User A's legacy data
  assert.equal(loadLegacyLocalState(storage), null);
  // Original raw key backup still intact on disk
  assert.ok(storage.getItem(DAYSPACE_STORAGE_KEY));
});

test('resolveAuthenticatedWorkspaceLoad handles Case A, Case B, Case C, Case D, and clean signup accurately', () => {
  const existingCloud = createInitialDayspaceState();
  existingCloud.profile.name = 'Cloud Clara';

  const legacy = createEmptyDayspaceState('Old Local');
  legacy.transactions = [
    {
      id: 'tx-legacy',
      type: TransactionType.Expense,
      title: 'Kopi Susu',
      amount: 25000,
      category: 'Dining',
      date: '2026-11-26',
      createdAt: '2026-11-26T00:00:00Z',
    },
  ];

  // Case A: Account with existing cloud data -> always loads cloud (ignores unrelated local/legacy)
  const caseA = resolveAuthenticatedWorkspaceLoad({
    cloudResult: {
      ok: true,
      data: existingCloud,
      updatedAt: '2026-11-26T01:00:00Z',
    },
    userLocalState: null,
    legacyLocalState: legacy,
    defaultName: 'Clara',
  });
  assert.equal(caseA.phase, 'ready');
  if (caseA.phase === 'ready') {
    assert.equal(caseA.source, 'cloud');
    assert.equal(caseA.state.profile.name, 'Cloud Clara');
    assert.equal(caseA.shouldSyncInitialToCloud, false);
  }

  // Case B: New account with no cloud row + meaningful legacy local data -> explicit migration choice
  const caseB = resolveAuthenticatedWorkspaceLoad({
    cloudResult: { ok: true, data: null, updatedAt: null },
    userLocalState: null,
    legacyLocalState: legacy,
    defaultName: 'Clara',
  });
  assert.equal(caseB.phase, 'needs-migration-choice');
  if (caseB.phase === 'needs-migration-choice') {
    assert.equal(caseB.candidateSource, 'legacy-local');
    assert.equal(caseB.candidateState.transactions[0]?.amount, 25000);
  }

  // Case C: Existing account with empty cloud data + meaningful account-local cache -> prompt choice
  const accountCache = createEmptyDayspaceState('Offline User');
  accountCache.wallets = [
    {
      id: 'w-cache',
      name: 'DANA',
      type: WalletType.Dana,
      balance: 150000,
      color: '#2E6F95',
      icon: 'smartphone',
      createdAt: '2026-11-26T00:00:00Z',
      updatedAt: '2026-11-26T00:00:00Z',
    },
  ];
  const caseC = resolveAuthenticatedWorkspaceLoad({
    cloudResult: {
      ok: true,
      data: createEmptyDayspaceState('Empty Cloud'),
      updatedAt: '2026-11-26T01:00:00Z',
    },
    userLocalState: accountCache,
    legacyLocalState: legacy,
    defaultName: 'Offline User',
  });
  assert.equal(caseC.phase, 'needs-migration-choice');
  if (caseC.phase === 'needs-migration-choice') {
    assert.equal(caseC.candidateSource, 'account-local');
    assert.equal(caseC.candidateState.wallets[0]?.balance, 150000);
  }

  // Case D: Cloud fetch error -> stop on error safely with retry (never overwrite!)
  const caseD = resolveAuthenticatedWorkspaceLoad({
    cloudResult: { ok: false, error: 'Network timeout' },
    userLocalState: null,
    legacyLocalState: legacy,
    defaultName: 'Clara',
  });
  assert.equal(caseD.phase, 'error');
  if (caseD.phase === 'error') {
    assert.match(caseD.error, /Network timeout/);
  }

  // Brand-new account with clean browser & no local data -> clean isolated workspace
  const freshUser = resolveAuthenticatedWorkspaceLoad({
    cloudResult: { ok: true, data: null, updatedAt: null },
    userLocalState: null,
    legacyLocalState: null,
    defaultName: 'New User',
  });
  assert.equal(freshUser.phase, 'ready');
  if (freshUser.phase === 'ready') {
    assert.equal(freshUser.source, 'fresh');
    assert.equal(freshUser.state.profile.name, 'New User');
    assert.equal(freshUser.state.tasks.length, 0);
    assert.equal(freshUser.shouldSyncInitialToCloud, true);
  }
});

test('multi-user cloud sync + RLS isolation preserves User A data across logout/User B session/re-login', async () => {
  const mock = createRlsMockSupabaseClient();

  // Unauthenticated read or write is denied by RLS
  const unauthRead = await fetchCloudWorkspace(mock.client, 'user-a');
  assert.equal(unauthRead.ok, false);
  const unauthWrite = await saveCloudWorkspace(
    mock.client,
    'user-a',
    createEmptyDayspaceState('Hacker')
  );
  assert.equal(unauthWrite.ok, false);

  // User A signs in and saves workspace with journal photo + wallet
  mock.setSessionUser('user-a');
  const stateA = createEmptyDayspaceState('Alice');
  stateA.wallets = [
    {
      id: 'w-a',
      name: 'BCA',
      type: WalletType.Bank,
      balance: 2500000,
      color: '#1E3F31',
      icon: 'landmark',
      createdAt: '2026-11-26T00:00:00Z',
      updatedAt: '2026-11-26T00:00:00Z',
    },
  ];
  stateA.journalEntries = [
    {
      id: 'j-a',
      date: '2026-11-26',
      title: 'Sunny walk',
      mood: JournalMood.Grateful,
      gratitude: ['Fresh air'],
      body: 'Peaceful afternoon.',
      tags: ['Walk'],
      photos: [
        {
          id: 'photo-1',
          dataUrl: 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4',
          name: 'park.webp',
          addedAt: '2026-11-26T00:00:00Z',
        },
      ],
      createdAt: '2026-11-26T00:00:00Z',
      updatedAt: '2026-11-26T00:00:00Z',
    },
  ];

  const saveAResult = await saveCloudWorkspace(mock.client, 'user-a', stateA);
  assert.equal(saveAResult.ok, true);

  // User A logs out, User B logs in
  mock.setSessionUser('user-b');
  // User B cannot read User A's cloud data
  const crossRead = await fetchCloudWorkspace(mock.client, 'user-a');
  assert.equal(crossRead.data, null);
  // User B cannot overwrite User A's cloud data
  const crossWrite = await saveCloudWorkspace(
    mock.client,
    'user-a',
    createEmptyDayspaceState('Malicious')
  );
  assert.equal(crossWrite.ok, false);

  // User B saves their own workspace
  const stateB = createEmptyDayspaceState('Bob');
  assert.equal((await saveCloudWorkspace(mock.client, 'user-b', stateB)).ok, true);

  // Network outage during User A login -> error prevents overwriting cloud
  mock.setSessionUser('user-a');
  mock.setNetworkDown(true);
  const outageFetch = await fetchCloudWorkspace(mock.client, 'user-a');
  const outageResolution = resolveAuthenticatedWorkspaceLoad({
    cloudResult: outageFetch,
    userLocalState: null,
    legacyLocalState: null,
    defaultName: 'Alice',
  });
  assert.equal(outageResolution.phase, 'error');

  // Network recovers -> User A retries & restores full workspace + JSON backup round-trip
  mock.setNetworkDown(false);
  const retryFetch = await fetchCloudWorkspace(mock.client, 'user-a');
  const recovered = resolveAuthenticatedWorkspaceLoad({
    cloudResult: retryFetch,
    userLocalState: null,
    legacyLocalState: null,
    defaultName: 'Alice',
  });
  assert.equal(recovered.phase, 'ready');
  if (recovered.phase === 'ready') {
    assert.equal(recovered.state.wallets[0]?.balance, 2500000);
    assert.equal(recovered.state.journalEntries[0]?.photos?.length, 1);

    const backupJson = exportDayspaceBackup(recovered.state);
    const parsedBackup = parseDayspaceBackup(backupJson);
    assert.equal(parsedBackup.ok, true);
    if (parsedBackup.ok) {
      assert.equal(parsedBackup.state.wallets[0]?.balance, 2500000);
      assert.equal(parsedBackup.state.journalEntries[0]?.photos?.[0]?.id, 'photo-1');
    }
  }
});
