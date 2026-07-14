const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sales', label: 'Sales CRM' },
  { key: 'communication', label: 'Communication Hub' },
  { key: 'marketing', label: 'Marketing Hub' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'projects', label: 'Project Management' },
  { key: 'documents', label: 'Documents' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'users', label: 'User Management' },
  { key: 'permissions', label: 'Permissions' },
  { key: 'settings', label: 'Settings' },
];

const UNIVERSAL_COMMUNITIES = [
  { key: 'live', name: 'Live', universal: true, locked: true },
  { key: 'marketing', name: 'Marketing', universal: true, locked: true },
  { key: 'exhibition', name: 'Exhibition', universal: true, locked: true },
];

const DEFAULT_ROLES = [
  { roleKey: 'super_admin', roleLabel: 'Super Admin', modules: MODULES.map((module) => module.key), locked: true },
  { roleKey: 'sales_manager', roleLabel: 'Sales Manager', modules: ['dashboard', 'sales', 'communication', 'accounting', 'documents', 'tasks', 'settings'] },
  { roleKey: 'marketing_manager', roleLabel: 'Marketing Manager', modules: ['dashboard', 'marketing', 'communication', 'documents', 'settings'] },
  { roleKey: 'accounts_manager', roleLabel: 'Accounts Manager', modules: ['dashboard', 'accounting', 'documents', 'settings'] },
  { roleKey: 'project_manager', roleLabel: 'Project Manager', modules: ['dashboard', 'projects', 'documents', 'communication', 'tasks', 'settings'] },
  { roleKey: 'employee', roleLabel: 'Employee', modules: ['dashboard', 'sales', 'tasks', 'documents', 'settings'] },
  { roleKey: 'client_viewer', roleLabel: 'Client Viewer', modules: ['dashboard', 'projects', 'documents'] },
];

const CRM_ROLE_KEYS = DEFAULT_ROLES.map((role) => role.roleKey);
const COMMUNITY_KEYS = UNIVERSAL_COMMUNITIES.map((community) => community.key);

module.exports = { MODULES, UNIVERSAL_COMMUNITIES, DEFAULT_ROLES, CRM_ROLE_KEYS, COMMUNITY_KEYS };
