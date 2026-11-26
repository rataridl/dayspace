import {
  BookOpen,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Sprout,
  Timer,
  Wallet,
  X,
} from 'lucide-react';
import { NavigationView } from '../types/dayspace';
import { DayspaceMark } from './DayspaceMark';

interface SidebarProps {
  activeView: NavigationView;
  onNavigate: (view: NavigationView) => void;
  userName: string;
  userEmail?: string | null;
  taskCountRemaining: number;
  activeTimerLabel?: string;
  mobileOpen: boolean;
  onSetMobileOpen: (open: boolean) => void;
  onQuickAddTask: () => void;
}

const NAV_ITEMS: {
  id: NavigationView;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: NavigationView.Dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { id: NavigationView.Tasks, label: 'Tasks', icon: CheckSquare },
  { id: NavigationView.Habits, label: 'Habits', icon: Sprout },
  { id: NavigationView.Focus, label: 'Focus', icon: Timer },
  { id: NavigationView.Journal, label: 'Journal', icon: BookOpen },
  { id: NavigationView.Finance, label: 'Finance', icon: Wallet },
  { id: NavigationView.Calendar, label: 'Calendar', icon: Calendar },
  { id: NavigationView.Settings, label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeView,
  onNavigate,
  userName,
  userEmail,
  taskCountRemaining,
  activeTimerLabel,
  mobileOpen,
  onSetMobileOpen,
  onQuickAddTask,
}: SidebarProps) {
  const handleNavClick = (view: NavigationView) => {
    onNavigate(view);
    onSetMobileOpen(false);
  };

  const navList = (
    <nav aria-label="Main navigation" className="flex-1 px-4 py-6 space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap ${
              isActive
                ? 'bg-[#1E3F31] text-white shadow-[0_2px_8px_rgba(30,63,49,0.18)]'
                : 'text-[#4B574E] hover:bg-[#EFECE4] hover:text-[#1C241E]'
            }`}
          >
            <span className="flex items-center gap-3">
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#C6DEC9]' : 'text-[#6A786D]'
                }`}
              />
              <span>{item.label}</span>
            </span>
            {item.id === NavigationView.Tasks && taskCountRemaining > 0 && (
              <span
                className={`font-mono text-xs tabular-nums ${
                  isActive ? 'text-[#C6DEC9]' : 'text-[#6A786D]'
                }`}
              >
                {taskCountRemaining}
              </span>
            )}
            {item.id === NavigationView.Focus && activeTimerLabel && (
              <span
                data-testid="sidebar-focus-countdown"
                className={`font-mono text-xs tabular-nums ${
                  isActive ? 'text-[#C6DEC9]' : 'text-[#1E3F31] font-semibold'
                }`}
              >
                {activeTimerLabel}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const brandBlock = (
    <div className="px-5 pt-6 pb-5 border-b border-[#EAE6DC]">
      <div className="flex items-center gap-3">
        <DayspaceMark className="w-9 h-9 shrink-0" />
        <div className="min-w-0">
          <span className="block font-serif text-lg font-semibold tracking-tight text-[#1C241E] leading-tight">
            DAYSPACE
          </span>
          <span className="block text-[11.5px] leading-snug text-[#58645B] whitespace-nowrap">
            Your life, beautifully organized.
          </span>
        </div>
      </div>
    </div>
  );

  const profileFooter = (
    <div className="p-4 border-t border-[#EAE6DC]">
      <button
        type="button"
        onClick={() => handleNavClick(NavigationView.Settings)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#EFECE4] transition-colors"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCE6DD] text-sm font-semibold text-[#1E3F31]">
          {(userName.trim()[0] || 'D').toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-[#1C241E] truncate">
            {userName.trim() || 'Personal Space'}
          </span>
          <span className="block text-xs text-[#58645B] truncate">
            {userEmail || 'Personalize workspace'}
          </span>
        </span>
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile Compact Header Bar (<= 56px, well under 15% mobile sticky cap) */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-[#FBF9F4]/95 backdrop-blur-sm border-b border-[#E5E1D8] px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onSetMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#1C241E] hover:bg-[#EFECE4] transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <DayspaceMark className="w-7 h-7 shrink-0" />
            <span className="font-serif text-base font-semibold tracking-tight text-[#1C241E] whitespace-nowrap">
              DAYSPACE
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onQuickAddTask}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E3F31] text-white text-xs font-medium hover:bg-[#152E24] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add task</span>
        </button>
      </header>

      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[272px] lg:flex-col bg-white border-r border-[#E5E1D8]">
        {brandBlock}
        {navList}
        {profileFooter}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 flex bg-[#1C241E]/35 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          onClick={(e) => {
            if (e.target === e.currentTarget) onSetMobileOpen(false);
          }}
        >
          <aside className="w-[272px] max-w-[85vw] h-full bg-white border-r border-[#E5E1D8] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#EAE6DC]">
              <div className="flex items-center gap-2.5 min-w-0">
                <DayspaceMark className="w-8 h-8 shrink-0" />
                <div className="min-w-0">
                  <span className="block font-serif text-base font-semibold text-[#1C241E]">
                    DAYSPACE
                  </span>
                  <span className="block text-[11px] text-[#58645B] truncate">
                    Your life, beautifully organized.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSetMobileOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#58645B] hover:bg-[#F3EFE6] hover:text-[#1C241E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {navList}
            {profileFooter}
          </aside>
        </div>
      )}
    </>
  );
}
