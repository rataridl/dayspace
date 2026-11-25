import { FormEvent, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { UserProfile } from '../types/dayspace';

interface SettingsViewProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onResetDemoData: () => void;
}

export function SettingsView({
  profile,
  onSaveProfile,
  onResetDemoData,
}: SettingsViewProps) {
  const [name, setName] = useState(profile.name);
  const [focusNote, setFocusNote] = useState(profile.dailyFocusNote);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [nameError, setNameError] = useState('');

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

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-[#1C241E]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#58645B]">
          Customize your personal greeting and daily focus workspace.
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
          Workspace data
        </h2>
        <p className="mt-1 text-sm text-[#58645B]">
          All tasks, habits, events, and preferences are stored locally in your
          browser. You can restore the starter workspace anytime.
        </p>

        <div className="mt-4">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DDD8CD] bg-[#FBF9F4] text-sm font-medium text-[#1C241E] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4 text-[#58645B]" />
              <span>Restore starter workspace</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-[#FAF6EE] border border-[#E6DEC8]">
              <span className="text-sm text-[#1C241E]">
                Replace current local data with starter items?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetDemoData();
                    setName('Clara');
                    setFocusNote('Protect quiet morning hours for deep creative work.');
                    setConfirmReset(false);
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
        </div>
      </section>
    </div>
  );
}
