import { useLocation } from 'react-router-dom';
import WorkspaceTopbar from './WorkspaceTopbar';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/dashboard/clients': 'Clients',
  '/dashboard/employees': 'Employees',
  '/dashboard/tasks': 'Tasks',
  '/dashboard/whatsapp': 'WhatsApp Demo',
};

const Navbar = () => {
  const location = useLocation();
  const title = location.pathname.startsWith('/dashboard/clients/')
    ? 'Client Data'
    : pageTitles[location.pathname] || 'CRM Admin';

  return (
    <WorkspaceTopbar
      title={title}
      role="admin"
      showSearch={location.pathname !== '/dashboard'}
    />
  );
};

export default Navbar;
