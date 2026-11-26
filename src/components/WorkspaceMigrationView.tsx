import {
  AlertTriangle,
  CloudUpload,
  Loader2,
  LogOut,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  CloudHydrationPhase,
  MigrationCandidate,
} from '../utils/supabaseSync';
import { DayspaceMark } from './DayspaceMark';

interface WorkspaceMigrationViewProps {
  userEmail: string;
  phase: Exclude<CloudHydrationPhase, 'idle' | 'ready'>;
  error: string | null;
  candidate: MigrationCandidate | null;
  submitting: boolean;
  onRetry: () => void;
  onConfirmImport: () => Promise<boolean>;
  onConfirmStartFresh: () => Promise<boolean>;
  onSignOut: () => Promise<void>;
}

export function WorkspaceMigrationView({
  userEmail,
  phase,
  error,
  candidate,
  submitting,
  onRetry,
  onConfirmImport,
  onConfirmStartFresh,
  onSignOut,
}: WorkspaceMigrationViewProps) {
  const photoCount =
    candidate?.state.journalEntries.reduce(
      (sum, entry) => sum + (entry.photos?.length ?? 0),
      0
    ) ?? 0;

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#1C241E] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E5E1D8] p-6 sm:p-8 shadow-[0_4px_24px_rgba(28,36,30,0.05)]">
        <div className="flex items-center justify-between gap-3 pb-5 border-b border-[#EAE6DC]">
          <div className="flex items-center gap-3 min-w-0">
            <DayspaceMark className="w-8 h-8 shrink-0" />
            <div className="min-w-0">
              <span className="block font-serif text-lg font-semibold text-[#1C241E] leading-tight">
                DAYSPACE
              </span>
              <span className="block text-xs text-[#58645B] truncate">
                {userEmail}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onSignOut()}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] text-xs font-medium text-[#4B574E] hover:bg-[#F3EFE6] disabled:opacity-60 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>

        {phase === 'loading' && (
          <div className="py-10 text-center space-y-3">
            <Loader2 className="w-7 h-7 text-[#1E3F31] animate-spin mx-auto" />
            <h1 className="font-serif text-xl font-medium text-[#1C241E]">
              Opening your workspace...
            </h1>
            <p className="text-sm text-[#58645B]">
              Checking your encrypted cloud workspace safely.
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="pt-6 space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBF0EE] text-[#9A3B30]">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h1 className="font-serif text-xl font-medium text-[#1C241E]">
                  Could not load your cloud workspace
                </h1>
                <p className="mt-1 text-sm text-[#58645B] leading-relaxed">
                  To protect your existing data, DAYSPACE paused before opening
                  or writing to your cloud workspace.
                </p>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] px-3.5 py-2.5 text-xs text-[#9A3B30]"
              >
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry loading workspace</span>
              </button>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="px-4 py-2.5 rounded-xl border border-[#DDD8CD] bg-white text-sm font-medium text-[#4B574E] hover:bg-[#F3EFE6] transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        {phase === 'needs-migration-choice' && candidate && (
          <div className="pt-6 space-y-5">
            <div>
              <h1 className="font-serif text-2xl font-medium text-[#1C241E]">
                Existing local DAYSPACE data found
              </h1>
              <p className="mt-1.5 text-sm text-[#58645B] leading-relaxed">
                {candidate.source === 'legacy-local'
                  ? 'This browser has an existing local DAYSPACE workspace, and this account does not have cloud data yet. Choose how you would like to set up this account:'
                  : 'We found unsynced offline data stored for this account. Choose how you would like to continue:'}
              </p>
            </div>

            <div className="rounded-xl bg-[#FBF9F4] border border-[#EAE6DC] p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-[#58645B]">Tasks</p>
                <p className="font-mono tabular-nums text-base font-semibold text-[#1C241E]">
                  {candidate.state.tasks.length}
                </p>
              </div>
              <div>
                <p className="text-[#58645B]">Habits</p>
                <p className="font-mono tabular-nums text-base font-semibold text-[#1C241E]">
                  {candidate.state.habits.length}
                </p>
              </div>
              <div>
                <p className="text-[#58645B]">Journal &amp; photos</p>
                <p className="font-mono tabular-nums text-base font-semibold text-[#1C241E]">
                  {candidate.state.journalEntries.length}{' '}
                  <span className="text-xs font-normal text-[#58645B]">
                    ({photoCount} {photoCount === 1 ? 'photo' : 'photos'})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[#58645B]">Digital wallets</p>
                <p className="font-mono tabular-nums text-base font-semibold text-[#1C241E]">
                  {candidate.state.wallets.length}
                </p>
              </div>
              <div>
                <p className="text-[#58645B]">Transactions</p>
                <p className="font-mono tabular-nums text-base font-semibold text-[#1C241E]">
                  {candidate.state.transactions.length}
                </p>
              </div>
              <div>
                <p className="text-[#58645B]">Events</p>
                <p className="font-mono tabular-nums text-base font-semibold text-[#1C241E]">
                  {candidate.state.events.length}
                </p>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-[#E7C2BC] bg-[#FBF0EE] px-3.5 py-2.5 text-xs text-[#9A3B30]"
              >
                {error}
              </p>
            )}

            <div className="space-y-3 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void onConfirmImport()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1E3F31] text-white text-sm font-medium hover:bg-[#152E24] disabled:opacity-60 transition-colors"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>Import existing local workspace into this account</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void onConfirmStartFresh()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#DDD8CD] bg-white text-sm font-medium text-[#1C241E] hover:bg-[#F3EFE6] disabled:opacity-60 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#5C7C66]" />
                <span>Start with a fresh workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
