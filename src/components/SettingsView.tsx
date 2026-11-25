import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DayspaceState, UserProfile } from '../types/dayspace';
import { getTodayDateKey } from '../utils/productivity';
import { exportDayspaceBackup, parseDayspaceBackup } from '../utils/storage';

interface SettingsViewProps {
  workspaceState: DayspaceState;
  storageError?: string | null;
  onSaveProfile: (profile: UserProfile) => void;
  onResetDemoData: () => void;
  onImportWorkspaceState: (nextState: DayspaceState) => void;
  onClearAllData: () => void;
}

export function SettingsView({
  workspaceState,
  storageError,
  onSaveProfile,
  onResetDemoData,
  onImportWorkspaceState,
  onClearAllData,
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
          Customize your personal greeting and manage your local workspace data.
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
