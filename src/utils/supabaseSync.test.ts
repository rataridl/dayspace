import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialDayspaceState } from '../data/seed';
import { evaluateSupabaseEnv, normalizeEnvValue } from '../lib/supabase';
import { createEmptyDayspaceState } from './storage';
import {
  hasMeaningfulWorkspaceData,
  resolveInitialCloudSync,
} from './supabaseSync';

test('hasMeaningfulWorkspaceData distinguishes empty from populated workspaces', () => {
  const empty = createEmptyDayspaceState('Clara');
  assert.equal(hasMeaningfulWorkspaceData(empty), false);

  const populated = createInitialDayspaceState();
  assert.equal(hasMeaningfulWorkspaceData(populated), true);
});

test('resolveInitialCloudSync never overwrites local data with missing or empty cloud data', () => {
  const local = createInitialDayspaceState();
  local.profile.name = 'Clara';

  // Cloud row missing -> preserve local & request upload
  const missingCloud = resolveInitialCloudSync(local, null);
  assert.equal(missingCloud.stateToUse, local);
  assert.equal(missingCloud.shouldUploadLocal, true);

  // Cloud row has empty arrays -> preserve local & request upload
  const emptyCloud = resolveInitialCloudSync(local, createEmptyDayspaceState('Clara'));
  assert.equal(emptyCloud.stateToUse, local);
  assert.equal(emptyCloud.shouldUploadLocal, true);

  // Malformed cloud row -> preserve local safely
  const malformedCloud = resolveInitialCloudSync(local, 'corrupted');
  assert.equal(malformedCloud.stateToUse, local);
  assert.equal(malformedCloud.shouldUploadLocal, true);
});

test('resolveInitialCloudSync restores valid non-empty cloud data cleanly', () => {
  const local = createEmptyDayspaceState('Clara');
  const cloud = createInitialDayspaceState();
  cloud.profile.name = 'Elena';

  const resolved = resolveInitialCloudSync(local, cloud);
  assert.equal(resolved.shouldUploadLocal, false);
  assert.equal(resolved.stateToUse.profile.name, 'Elena');
  assert.equal(resolved.stateToUse.tasks.length, cloud.tasks.length);
});

test('evaluateSupabaseEnv handles missing, quoted, placeholder, and valid env values', () => {
  assert.equal(normalizeEnvValue('  "https://abc.supabase.co"  '), 'https://abc.supabase.co');

  const missing = evaluateSupabaseEnv(undefined, '');
  assert.deepEqual(missing.diagnostic, {
    hasUrl: false,
    hasValidUrl: false,
    hasPublishableKey: false,
    isConfigured: false,
  });

  const placeholder = evaluateSupabaseEnv(
    'https://YOUR-PROJECT-ID.supabase.co',
    'YOUR_SUPABASE_PUBLISHABLE_KEY'
  );
  assert.equal(placeholder.diagnostic.isConfigured, false);

  const valid = evaluateSupabaseEnv(
    '"https://example-project.supabase.co"',
    'sb_publishable_123456'
  );
  assert.deepEqual(valid.diagnostic, {
    hasUrl: true,
    hasValidUrl: true,
    hasPublishableKey: true,
    isConfigured: true,
  });
  assert.equal(valid.url, 'https://example-project.supabase.co');
  assert.equal(valid.publishableKey, 'sb_publishable_123456');
});
