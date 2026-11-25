import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  Download,
  LogOut,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DayspaceState, UserProfile } from '../types/dayspace';
import { getTodayDateKey } from '../utils/productivity';
import { exportDayspaceBackup, parseDayspaceBackup } from '../utils/storage';
import type { CloudSyncStatus } from '../utils/supabaseSync';

interface SettingsViewProps {
  workspaceState: DayspaceState;
  storageError?: string | null;
  onSaveProfile: (profile: UserProfile) => void;
  onResetDemoData: () => void;
  onImportWorkspaceState: (nextState: DayspaceState) => void;
  onClearAllData: () => void;
  supabaseAuth: {
    user: User | null;
    loading: boolean;
    submitting: boolean;
    configured: boolean;
    authError: string | null;
    authNotice: string | null;
    onSignIn: (email: string, password: string) => Promise<boolean>;
    onSignUp: (email: string, password: string) => Promise<boolean>;
    onSignOut: () => Promise<void>;
    onClearMessages: () => void;
  };
  cloudSync: {
    status: CloudSyncStatus;
    error: string | null;
    lastSyncedAt: string | null;
    onSyncNow: () => Promise<void>;
  };
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Not synced yet';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Recently';
  return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function SettingsView({
  workspaceState,
  storageError,
  onSaveProfile,
  onResetDemoData,
  onImportWorkspaceState,
  onClearAllData,
  supabaseAuth,
  cloudSync,
}: SettingsViewProps) {
  const { profile } = workspaceState;

  const [name, setName] = useState(profile.name);
  const [focusNote, setFocusNote] = useState(profile.dailyFocusNote);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [nameError, setNameError] = useState('');
  const [backupNotice, setBackupNotice] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);

  // Supabase auth form state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authFormError, setAuthFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(profile.name);
    setFocusNote(profile.dailyFocusNote);
  }, [profile.name, profile.dailyFocusNote]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Please enter your display name.');
      return;
    }
    onSaveProfile({
      name: name.trim(),
      dailyFocusNote: focusNote.trim(),
    });
    setNameError('');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthFormError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setAuthFormError('Password must be at least 6 characters.');
      return;
    }
    setAuthFormError('');
    const ok =
      authMode === 'signin'
        ? await supabaseAuth.onSignIn(cleanEmail, password)
        : await supabaseAuth.onSignUp(cleanEmail, password);
    if (ok) {
      setPassword('');
    }
  };

  const handleExportBackup = () => {
    try {
      const json = exportDayspaceBackup(workspaceState);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `dayspace-backup-${getTodayDateKey()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setBackupNotice({
        kind: 'success',
        message: 'Backup downloaded as a JSON file.',
      });
    } catch {
      setBackupNotice({
        kind: 'error',
        message: 'Unable to create a backup file in this browser.',
      });
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsed = parseDayspaceBackup(rawText);
      if (!parsed.ok) {
        setBackupNotice({
          kind: 'error',
          message: parsed.error,
        });
        return;
      }
      onImportWorkspaceState(parsed.state);
      setConfirmReset(false);
      setBackupNotice({
        kind: 'success',
        message: 'Workspace data imported and saved locally.',
      });
    } catch {
      setBackupNotice({
        kind: 'error',
        message: 'Could not read the selected backup file.',
      });
    }
  };

  const handleConfirmClearAll = () => {
    onClearAllData();
    setClearModalOpen(false);
    setConfirmReset(false);
    setBackupNotice({
      kind: 'success',
      message: 'All workspace data has been cleared.',
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1C241E]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#58645B]">
          Customize your personal greeting, optional cloud sync, and local
          workspace data.
        </p>
      </header>

      <section className="rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]">
        <h2 className="font-serif text-xl font-medium text-[#1C241E]">
          Personalization
        </h2>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="settings-display-name"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Your name
            </label>
            <input
              id="settings-display-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError('');
                if (savedNotice) setSavedNotice(false);
              }}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
            {nameError && (
              <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="settings-focus-note"
              className="block text-sm font-medium text-[#1C241E] mb-1.5"
            >
              Daily focus intention
            </label>
            <input
              id="settings-focus-note"
              type="text"
              value={focusNote}
              onChange={(e) => {
                setFocusNote(e.target.value);
                if (savedNotice) setSavedNotice(false);
              }}
              placeholder="What matters most in your routine?"
              className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3.5 py-2.5 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors whitespace-nowrap"
            >
              Save preferences
            </button>
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1E3F31]">
                <Check className="w-4 h-4" />
                Saved
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Optional Supabase Cloud Sync */}
      <section className="rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-medium text-[#1C241E]">
              Cloud Sync (Optional)
            </h2>
            <p className="mt-1 text-sm text-[#58645B]">
              Sign in with Supabase to sync your workspace across devices.
              DAYSPACE always keeps working locally without an account.
            </p>
          </div>
          {supabaseAuth.configured ? (
            <Cloud className="w-5 h-5 text-[#5C7C66] shrink-0 mt-1" />
          ) : (
            <CloudOff className="w-5 h-5 text-[#7D8880] shrink-0 mt-1" />
          )}
        </div>

        {!supabaseAuth.configured ? (
          <div className="mt-4 rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-4 text-xs text-[#58645B] leading-relaxed">
            <p className="font-medium text-[#1C241E]">
              Running in LocalStorage mode
            </p>
            <p className="mt-1">
              Add <span className="font-mono text-[#1C241E]">VITE_SUPABASE_URL</span>{' '}
              and{' '}
              <span className="font-mono text-[#1C241E]">
                VITE_SUPABASE_PUBLISHABLE_KEY
              </span>{' '}
              to your environment to enable optional account sign-in and cloud
              sync.
            </p>
          </div>
        ) : supabaseAuth.loading ? (
          <p className="mt-4 text-xs text-[#58645B]">
            Checking cloud session...
          </p>
        ) : supabaseAuth.user ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[#58645B]">Signed in as</p>
                <p className="text-sm font-medium text-[#1C241E] truncate">
                  {supabaseAuth.user.email}
                </p>
                <p className="mt-1 text-xs text-[#5C7C66] font-mono tabular-nums">
                  {cloudSync.status === 'syncing'
                    ? 'Syncing workspace...'
                    : cloudSync.status === 'error'
                    ? 'Cloud sync paused (saved locally)'
                    : `Synced · ${formatSyncTime(cloudSync.lastSyncedAt)}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void cloudSync.onSyncNow()}
                  disabled={cloudSync.status === 'syncing'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DDD8CD] bg-white text-xs font-medium text-[#1C241E] hover:bg-[#F3EFE6] disabled:opacity-60 transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[#5C7C66] ${
                      cloudSync.status === 'syncing' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Sync now</span>
                </button>
                <button
                  type="button"
                  onClick={() => void supabaseAuth.onSignOut()}
                  disabled={supabaseAuth.submitting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DDD8CD] bg-white text-xs font-medium text-[#4B574E] hover:bg-[#F3EFE6] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>

            {cloudSync.error && (
              <p
                role="alert"
                className="rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] px-3.5 py-2.5 text-xs text-[#9A3B30]"
              >
                Cloud sync note: {cloudSync.error}. Your changes remain safely
                saved in LocalStorage.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <div
              role="tablist"
              aria-label="Account mode"
              className="inline-flex p-1 rounded-xl bg-[#F5F2EA] border border-[#EAE6DC]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signin'}
                onClick={() => {
                  setAuthMode('signin');
                  setAuthFormError('');
                  supabaseAuth.onClearMessages();
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  authMode === 'signin'
                    ? 'bg-[#1E3F31] text-white'
                    : 'text-[#4B574E] hover:text-[#1C241E]'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signup'}
                onClick={() => {
                  setAuthMode('signup');
                  setAuthFormError('');
                  supabaseAuth.onClearMessages();
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  authMode === 'signup'
                    ? 'bg-[#1E3F31] text-white'
                    : 'text-[#4B574E] hover:text-[#1C241E]'
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="supabase-auth-email"
                    className="block text-xs font-medium text-[#1C241E] mb-1"
                  >
                    Email address
                  </label>
                  <input
                    id="supabase-auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (authFormError) setAuthFormError('');
                    }}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="supabase-auth-password"
                    className="block text-xs font-medium text-[#1C241E] mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="supabase-auth-password"
                    type="password"
                    autoComplete={
                      authMode === 'signin'
                        ? 'current-password'
                        : 'new-password'
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (authFormError) setAuthFormError('');
                    }}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] px-3 py-2 text-sm text-[#1C241E] focus:border-[#1E3F31] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {(authFormError || supabaseAuth.authError) && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] px-3.5 py-2 text-xs text-[#9A3B30]"
                >
                  {authFormError || supabaseAuth.authError}
                </p>
              )}

              {supabaseAuth.authNotice && (
                <p
                  role="status"
                  className="rounded-xl border border-[#C6DEC9] bg-[#EDF3EE] px-3.5 py-2 text-xs text-[#1E3F31]"
                >
                  {supabaseAuth.authNotice}
                </p>
              )}

              <button
                type="submit"
                disabled={supabaseAuth.submitting}
                className="px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-xs sm:text-sm font-medium hover:bg-[#152E24] disabled:opacity-60 transition-colors"
              >
                {supabaseAuth.submitting
                  ? 'Please wait...'
                  : authMode === 'signin'
                  ? 'Sign in & sync'
                  : 'Create account'}
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-[0_2px_14px_rgba(28,36,30,0.03)]">
        <h2 className="font-serif text-xl font-medium text-[#1C241E]">
          Workspace data &amp; backups
        </h2>
        <p className="mt-1 text-sm text-[#58645B]">
          All tasks, habits, events, journal entries, finances, and focus
          sessions are saved automatically in your browser.
        </p>

        <p className="mt-3 text-xs text-[#6A786D]">
          <span className="font-mono tabular-nums font-medium text-[#1C241E]">
            {workspaceState.tasks.length}
          </span>{' '}
          tasks ·{' '}
          <span className="font-mono tabular-nums font-medium text-[#1C241E]">
            {workspaceState.habits.length}
          </span>{' '}
          habits ·{' '}
          <span className="font-mono tabular-nums font-medium text-[#1C241E]">
            {workspaceState.events.length}
          </span>{' '}
          events ·{' '}
          <span className="font-mono tabular-nums font-medium text-[#1C241E]">
            {workspaceState.journalEntries.length}
          </span>{' '}
          journal entries ·{' '}
          <span className="font-mono tabular-nums font-medium text-[#1C241E]">
            {workspaceState.transactions.length}
          </span>{' '}
          transactions ·{' '}
          <span className="font-mono tabular-nums font-medium text-[#1C241E]">
            {workspaceState.pomodoroSessions.length}
          </span>{' '}
          focus sessions
        </p>

        {storageError && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] px-3.5 py-2.5 text-xs text-[#9A3B30]"
          >
            Local storage warning: {storageError}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] text-sm font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-[#5C7C66]" />
            <span>Import JSON backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            aria-label="Import JSON backup file"
            onChange={handleFileChange}
            className="hidden"
          />

          {!confirmReset && (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DDD8CD] bg-white text-sm font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4 text-[#58645B]" />
              <span>Restore starter workspace</span>
            </button>
          )}
        </div>

        {backupNotice && (
          <div
            role={backupNotice.kind === 'error' ? 'alert' : 'status'}
            className={`mt-4 rounded-xl border px-3.5 py-2.5 text-xs font-medium flex items-center justify-between gap-2 ${
              backupNotice.kind === 'success'
                ? 'bg-[#EDF3EE] border-[#C6DEC9] text-[#1E3F31]'
                : 'bg-[#FBF0EE] border-[#E7C2BC] text-[#9A3B30]'
            }`}
          >
            <span>{backupNotice.message}</span>
            <button
              type="button"
              onClick={() => setBackupNotice(null)}
              aria-label="Dismiss notice"
              className="p-0.5 rounded hover:bg-black/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {confirmReset && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF6EE] border border-[#E6DEC8]">
            <span className="text-sm text-[#1C241E]">
              Replace current local data with starter items?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetDemoData();
                  setConfirmReset(false);
                  setBackupNotice({
                    kind: 'success',
                    message: 'Starter workspace restored.',
                  });
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#1E3F31] text-white text-xs font-medium hover:bg-[#152E24]"
              >
                Confirm restore
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#58645B] hover:bg-[#EFECE4]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-[#EFECE4] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-[#1C241E]">
              Clear all app data
            </h3>
            <p className="text-xs text-[#6A786D]">
              Remove all saved tasks, habits, events, journal entries, finances,
              and focus sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] text-xs font-medium text-[#9A3B30] hover:bg-[#F6E1DD] transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear all data</span>
          </button>
        </div>
      </section>

      {clearModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C241E]/40 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-data-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setClearModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E1D8] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBF0EE] text-[#9A3B30]">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h2
                    id="clear-data-dialog-title"
                    className="font-serif text-lg font-semibold text-[#1C241E]"
                  >
                    Clear all app data?
                  </h2>
                  <p className="text-xs text-[#58645B]">
                    This action removes all locally stored workspace items.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                aria-label="Close confirmation dialog"
                className="p-1.5 rounded-lg text-[#58645B] hover:bg-[#F3EFE6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-4 text-sm text-[#4B574E] leading-relaxed">
              Every task, habit check-in, calendar event, journal entry,
              transaction, savings goal, and focus session will be erased from
              browser storage. Export a JSON backup first if you want a copy.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#DDD8CD] bg-white text-xs sm:text-sm font-medium text-[#344038] hover:bg-[#F3EFE6]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-4 py-2 rounded-xl bg-[#9A3B30] text-white text-xs sm:text-sm font-medium hover:bg-[#7F2E24]"
              >
                Yes, clear all data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
