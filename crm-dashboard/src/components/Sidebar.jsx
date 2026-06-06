import { Link, useLocation } from 'react-router-dom';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    exact: true,
    icon: <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" />,
  },
  {
    to: '/dashboard/clients',
    label: 'Clients',
    icon: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87m-2-11.96a4 4 0 0 1 0 7.75" />,
  },
  {
    to: '/dashboard/employees',
    label: 'Employees',
    icon: <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m4-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  },
  {
    to: '/dashboard/tasks',
    label: 'Tasks',
    icon: <path d="M9 11 12 14 22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
  },
  {
    to: '/dashboard/whatsapp',
    label: 'WhatsApp',
    icon: (
      <>
        <path d="M21 11.5a8.5 8.5 0 0 1-12.56 7.46L4 20l1.12-4.25A8.5 8.5 0 1 1 21 11.5Z" />
        <path d="M9.5 8.5c.2 3.2 2.1 5.1 5.2 5.9l1.05-1.2a.8.8 0 0 1 .9-.2l1.45.6" />
      </>
    ),
  },
];

const Sidebar = () => {
  const location = useLocation();

  const isActive = (item) => (
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-20 flex-col bg-[#173d8f] text-white shadow-xl lg:w-64">
      <Link to="/dashboard" className="flex h-16 items-center gap-3 border-b border-white/10 px-4 lg:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-white" strokeWidth="2">
            <path d="M8 8.5a4 4 0 0 1 6.8-2.8l3.5 3.5a4 4 0 1 1-5.6 5.6L11.4 13" />
            <path d="M16 15.5a4 4 0 0 1-6.8 2.8l-3.5-3.5a4 4 0 1 1 5.6-5.6l1.3 1.8" />
          </svg>
        </span>
        <span className="hidden lg:block">
          <span className="block text-base font-semibold">Company CRM</span>
          <span className="mt-0.5 block text-xs text-blue-200">Admin workspace</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="hidden px-3 pb-2 text-xs font-medium text-blue-200/70 lg:block">
          Workspace
        </p>
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={`flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition lg:justify-start ${
                isActive(item)
                  ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/10'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center justify-center gap-3 rounded-lg bg-white/10 p-2 lg:justify-start">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-blue-800">
            A
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-sm font-semibold">Administrator</span>
            <span className="block truncate text-xs text-blue-200">CRM Admin</span>
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
