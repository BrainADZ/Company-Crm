import { useLocation } from 'react-router-dom';
import WorkspaceTopbar from './WorkspaceTopbar';

const getPageTitle = (pathname) => {
  if (pathname === '/dashboard') return 'Dashboard';

  if (pathname.startsWith('/dashboard/clients/')) return 'Client Data';
  if (pathname.startsWith('/dashboard/clients')) return 'Clients';

  if (pathname.startsWith('/dashboard/employees')) return 'Employees';
  if (pathname.startsWith('/dashboard/tasks')) return 'Tasks';
  if (pathname.startsWith('/dashboard/whatsapp')) return 'WhatsApp Demo';
  if (pathname.startsWith('/dashboard/settings')) return 'Settings';

  return 'CRM Admin';
};

const Navbar = () => {
  const location = useLocation();

  const title = getPageTitle(location.pathname);

  const showSearch =
    location.pathname !== '/dashboard' &&
    !location.pathname.startsWith('/dashboard/settings');

  return (
    <WorkspaceTopbar
      title={title}
      role="admin"
      showSearch={showSearch}
    />
  );
};

export default Navbar;