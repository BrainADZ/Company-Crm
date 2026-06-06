import NotificationBell from './NotificationBell';
import UserProfileMenu from './UserProfileMenu';

const WorkspaceTopbar = ({ title, role, showSearch = true }) => (
  <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
    <h1 className="min-w-0 truncate text-lg font-semibold text-slate-950">{title}</h1>

    <div className="ml-auto flex items-center gap-2">
      {showSearch && <label className="relative hidden sm:block">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Search records"
          className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 lg:w-72"
        />
      </label>}

      {showSearch && <button
        type="button"
        title="Search records"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 sm:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>}

      <NotificationBell role={role} />
      <UserProfileMenu role={role} />
    </div>
  </header>
);

export default WorkspaceTopbar;
