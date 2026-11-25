import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialDayspaceState } from '../data/seed';
import { JournalMood, JournalPhoto } from '../types/dayspace';
import {
  calculateScaledDimensions,
  formatStorageQuotaMessage,
  isQuotaExceededError,
  isSupportedJournalImageFile,
  MAX_JOURNAL_PHOTOS,
  sanitizeJournalPhotos,
} from './journalPhotos';
import {
  createEmptyDayspaceState,
  DAYSPACE_STORAGE_KEY,
  exportDayspaceBackup,
  loadDayspaceState,
  parseDayspaceBackup,
  saveDayspaceState,
} from './storage';
import { resolveInitialCloudSync } from './supabaseSync';

const SAMPLE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

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

function makePhoto(index: number): JournalPhoto {
  return {
    id: `photo-${index}`,
    dataUrl: SAMPLE_DATA_URL,
    name: `memory-${index}.webp`,
    width: 800,
    height: 600,
    addedAt: '2026-11-25T10:00:00.000Z',
  };
}

test('isSupportedJournalImageFile accepts JPG, JPEG, PNG, WEBP and rejects unsupported formats', () => {
  assert.equal(
    isSupportedJournalImageFile({ type: 'image/jpeg', name: 'walk.jpg' }),
    true
  );
  assert.equal(
    isSupportedJournalImageFile({ type: 'image/jpg', name: 'walk.jpeg' }),
    true
  );
  assert.equal(
    isSupportedJournalImageFile({ type: 'image/png', name: 'sketch.png' }),
    true
  );
  assert.equal(
    isSupportedJournalImageFile({ type: 'image/webp', name: 'coffee.webp' }),
    true
  );
  // Extension fallback when browser omits MIME type
  assert.equal(
    isSupportedJournalImageFile({ type: '', name: 'SUNSET.JPEG' }),
    true
  );
  // Reject unsupported types
  assert.equal(
    isSupportedJournalImageFile({ type: 'image/gif', name: 'anim.gif' }),
    false
  );
  assert.equal(
    isSupportedJournalImageFile({ type: 'image/svg+xml', name: 'icon.svg' }),
    false
  );
  assert.equal(
    isSupportedJournalImageFile({ type: 'application/pdf', name: 'doc.pdf' }),
    false
  );
});

test('calculateScaledDimensions resizes proportionally without upscaling small images', () => {
  assert.deepEqual(calculateScaledDimensions(2400, 1200, 1200), {
    width: 1200,
    height: 600,
  });
  assert.deepEqual(calculateScaledDimensions(900, 1800, 1200), {
    width: 600,
    height: 1200,
  });
  // Do not upscale smaller images
  assert.deepEqual(calculateScaledDimensions(640, 480, 1200), {
    width: 640,
    height: 480,
  });
  // Handle invalid inputs gracefully
  assert.deepEqual(calculateScaledDimensions(0, -10, 1200), {
    width: 1,
    height: 1,
  });
});

test('sanitizeJournalPhotos validates data URLs, drops invalid items, and caps at 5 photos', () => {
  const raw = [
    makePhoto(1),
    { id: 'bad-url', dataUrl: 'https://example.com/evil.png' },
    { id: '', dataUrl: SAMPLE_DATA_URL },
    'not-an-object',
    makePhoto(2),
    makePhoto(3),
    makePhoto(4),
    makePhoto(5),
    makePhoto(6), // exceeds MAX_JOURNAL_PHOTOS (5)
  ];

  const sanitized = sanitizeJournalPhotos(raw);
  assert.equal(sanitized.length, MAX_JOURNAL_PHOTOS);
  assert.deepEqual(
    sanitized.map((p) => p.id),
    ['photo-1', 'photo-2', 'photo-3', 'photo-4', 'photo-5']
  );
  assert.equal(sanitized[0].width, 800);
  assert.equal(sanitized[0].height, 600);
});

test('isQuotaExceededError and formatStorageQuotaMessage detect storage limit errors', () => {
  const err = new Error('QuotaExceededError: storage full');
  assert.equal(isQuotaExceededError(err), true);
  assert.equal(isQuotaExceededError(new Error('Network timeout')), false);
  assert.match(formatStorageQuotaMessage(), /Storage limit reached/i);
  assert.match(
    formatStorageQuotaMessage('QuotaExceededError custom'),
    /QuotaExceededError custom/
  );
});

test('Journal photos persist across LocalStorage save/load, JSON backup export/import, and cloud sync', () => {
  const storage = createMemoryStorage();
  const state = createInitialDayspaceState();
  const existingEntryCount = state.journalEntries.length;

  const entryWithPhotos = {
    id: 'j-photos-1',
    date: '2026-11-25',
    title: 'Botanical garden morning',
    mood: JournalMood.Grateful,
    gratitude: ['Sunlight through leaves', 'Slow coffee'],
    body: 'Took snapshots along the sage path.',
    tags: ['Nature', 'Morning'],
    photos: [makePhoto(1), makePhoto(2)],
    createdAt: '2026-11-25T09:00:00.000Z',
    updatedAt: '2026-11-25T09:10:00.000Z',
  };

  state.journalEntries = [entryWithPhotos, ...state.journalEntries];

  // 1. LocalStorage round-trip preserves new photos and existing entries
  const saveRes = saveDayspaceState(state, storage);
  assert.equal(saveRes.ok, true);
  const loaded = loadDayspaceState(storage);
  assert.equal(loaded.journalEntries.length, existingEntryCount + 1);
  assert.equal(loaded.journalEntries[0].photos?.length, 2);
  assert.equal(loaded.journalEntries[0].photos?.[0].name, 'memory-1.webp');
  assert.equal(loaded.journalEntries[1].photos, undefined);

  // 2. JSON backup export and restore preserves photos cleanly
  const backupJson = exportDayspaceBackup(loaded);
  const restored = parseDayspaceBackup(backupJson);
  assert.equal(restored.ok, true);
  if (restored.ok) {
    assert.equal(restored.state.journalEntries[0].photos?.length, 2);
    assert.equal(
      restored.state.journalEntries[0].photos?.[1].id,
      'photo-2'
    );
  }

  // 3. Supabase cloud sync resolution preserves photos when restoring cloud state
  const emptyLocal = createEmptyDayspaceState('Clara');
  const syncFromCloud = resolveInitialCloudSync(emptyLocal, loaded);
  assert.equal(syncFromCloud.shouldUploadLocal, false);
  assert.equal(syncFromCloud.stateToUse.journalEntries[0].photos?.length, 2);

  // And never overwrites local photo entries if cloud is empty
  const syncWhenCloudEmpty = resolveInitialCloudSync(loaded, emptyLocal);
  assert.equal(syncWhenCloudEmpty.shouldUploadLocal, true);
  assert.equal(syncWhenCloudEmpty.stateToUse.journalEntries[0].photos?.length, 2);
});

test('saveDayspaceState surfaces quota errors cleanly without corrupting existing storage', () => {
  const initial = createInitialDayspaceState();
  const backing = createMemoryStorage({
    [DAYSPACE_STORAGE_KEY]: JSON.stringify(initial),
  });
  const quotaStorage = {
    ...backing,
    setItem() {
      const err = new Error('The quota has been exceeded.');
      err.name = 'QuotaExceededError';
      throw err;
    },
  } as Storage;

  const result = saveDayspaceState(initial, quotaStorage);
  assert.equal(result.ok, false);
  assert.match(result.error || '', /Storage limit exceeded|QuotaExceededError/i);
  // Existing saved data remains intact
  assert.equal(
    loadDayspaceState(backing).journalEntries.length,
    initial.journalEntries.length
  );
});
