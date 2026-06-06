import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import EmployeeLayout from './components/EmployeeLayout';
import Clients from './pages/Clients';
import ClientDatasetDetail from './pages/ClientDatasetDetail';
import Employees from './pages/Employees';
import Login from './pages/Login';
import EmployeeLogin from './pages/employee-login.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeTasks from './pages/EmployeeTask'; // Import EmployeeTasks
import EmployeeDatasets from './pages/EmployeeDatasets';
import PrivateRoute from './components/PrivateRoute';
import AdminTasks from './pages/AdminTasks';
import LoginSelectionPage from './pages/LoginSelectionPage'; // Ensure this import is correct
import AdminDashboardHome from './pages/AdminDashboardHome';
import WhatsAppDemo from './pages/WhatsAppDemo';
import { getAuthenticatedRole } from './utils/auth';

const App = () => {
  const authenticatedRole = getAuthenticatedRole();

  return (
    <Router>
      <Routes>
        {/* Default route to handle login redirection */}
        <Route
          path="/"
          element={
            authenticatedRole === 'admin' ? (
              <Navigate to="/dashboard" replace />
            ) : authenticatedRole === 'employee' ? (
              <Navigate to="/employee-dashboard" replace />
            ) : (
              <LoginSelectionPage />
            )
          }
        />

        {/* Admin Login */}
        <Route path="/login" element={<Login />} />

        {/* Employee Login */}
        <Route path="/employee-login" element={<EmployeeLogin />} />

        {/* Admin Dashboard Routes */}
        <Route path="/dashboard" element={<PrivateRoute role="admin"><DashboardLayout /></PrivateRoute>}>
          <Route index element={<AdminDashboardHome />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:datasetId" element={<ClientDatasetDetail />} />
          <Route path="employees" element={<Employees />} />
          <Route path="tasks" element={<AdminTasks />} />
          <Route path="whatsapp" element={<WhatsAppDemo />} />
          <Route path="assign-clients" element={<Navigate to="/dashboard/tasks" replace />} />
        </Route>

        {/* Employee Dashboard Routes */}
        <Route path="/employee-dashboard" element={<PrivateRoute role="employee"><EmployeeLayout /></PrivateRoute>}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="tasks" element={<EmployeeTasks />} />
          <Route path="datasets" element={<EmployeeDatasets />} />
          <Route path="datasets/:datasetId" element={<ClientDatasetDetail />} />
        </Route>

        {/* Catch-all Route for Undefined Paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
