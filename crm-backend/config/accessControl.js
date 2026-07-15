const ACTIONS = ['view', 'create', 'update', 'delete', 'assign', 'approve', 'reject', 'comment', 'upload', 'download', 'export', 'manage', 'reopen', 'close'];
const SCOPES = ['all', 'community', 'department', 'team', 'assigned', 'self', 'linked', 'none'];
const USER_TYPES = ['employee', 'client', 'vendor', 'contractor'];
const ACCOUNT_STATUSES = ['invited', 'active', 'suspended', 'inactive'];

const PERMISSION_RESOURCES = [
  'dashboard', 'business_os', 'sales_crm', 'leads', 'clients', 'communication', 'marketing', 'campaigns',
  'accounting', 'quotations', 'invoices', 'payments', 'expenses', 'projects', 'tasks', 'team_workload',
  'daily_reports', 'attendance', 'documents', 'employees', 'users', 'teams', 'meetings', 'permissions',
  'roles', 'settings', 'whatsapp', 'vendors', 'reports', 'audit_logs', 'employee_salary', 'reimbursements',
  'financial_profitability', 'password_reset', 'user_activation', 'permission_management',
];

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', resources: ['dashboard'] },
  { key: 'sales', label: 'Sales CRM', resources: ['sales_crm', 'leads', 'clients'] },
  { key: 'communication', label: 'Communication Hub', resources: ['communication', 'meetings', 'whatsapp'] },
  { key: 'marketing', label: 'Marketing Hub', resources: ['marketing', 'campaigns'] },
  { key: 'accounting', label: 'Accounting', resources: ['accounting', 'quotations', 'invoices', 'payments', 'expenses'] },
  { key: 'projects', label: 'Project Management', resources: ['projects', 'team_workload'] },
  { key: 'documents', label: 'Documents', resources: ['documents'] },
  { key: 'tasks', label: 'Tasks', resources: ['tasks', 'daily_reports', 'attendance'] },
  { key: 'users', label: 'User Management', resources: ['employees', 'users', 'teams', 'vendors'] },
  { key: 'permissions', label: 'Permissions', resources: ['permissions', 'roles', 'permission_management', 'audit_logs'] },
  { key: 'settings', label: 'Settings', resources: ['settings', 'password_reset', 'user_activation'] },
];

const UNIVERSAL_COMMUNITIES = [
  { key: 'marketing', name: 'BrainAdz Marketing', universal: true, locked: true },
  { key: 'exhibition', name: 'BrainAdz Exhibitions', universal: true, locked: true },
  { key: 'live', name: 'BrainAdz Live', universal: true, locked: true },
];

const all = (resource) => ({ resource, actions: [...ACTIONS], scope: 'all' });
const permission = (resource, actions, scope) => ({ resource, actions, scope });
const view = (resource, scope) => permission(resource, ['view'], scope);

const ROLE_TEMPLATES = [
  { roleKey: 'super_admin', roleLabel: 'Super Admin', description: 'Locked full company access.', allowedUserTypes: USER_TYPES, defaultScope: 'all', locked: true, permissions: PERMISSION_RESOURCES.map(all) },
  { roleKey: 'company_admin', roleLabel: 'Company Admin', description: 'Operational administration within assigned communities.', allowedUserTypes: ['employee'], defaultScope: 'community', permissions: PERMISSION_RESOURCES.filter((r) => !['employee_salary'].includes(r)).map((r) => permission(r, ACTIONS, 'community')) },
  { roleKey: 'hr_manager', roleLabel: 'HR Manager', description: 'Employee lifecycle and HR reporting.', allowedUserTypes: ['employee'], defaultScope: 'community', permissions: ['dashboard', 'employees', 'users', 'documents', 'attendance', 'daily_reports', 'meetings', 'reports', 'user_activation', 'password_reset'].map((r) => permission(r, ACTIONS.filter((a) => a !== 'delete'), 'community')) },
  { roleKey: 'department_manager', roleLabel: 'Department Manager', description: 'Own department management.', allowedUserTypes: ['employee'], defaultScope: 'department', permissions: ['dashboard', 'employees', 'projects', 'tasks', 'team_workload', 'daily_reports', 'documents', 'meetings', 'reports'].map((r) => permission(r, ACTIONS.filter((a) => !['delete', 'manage'].includes(a)), 'department')) },
  { roleKey: 'team_lead', roleLabel: 'Team Lead', description: 'Own team work coordination.', allowedUserTypes: ['employee'], defaultScope: 'team', permissions: ['dashboard', 'employees', 'projects', 'tasks', 'team_workload', 'daily_reports', 'documents', 'meetings'].map((r) => permission(r, ['view', 'create', 'update', 'assign', 'approve', 'reject', 'comment', 'upload', 'download'], 'team')) },
  { roleKey: 'project_manager', roleLabel: 'Project Manager', description: 'Assigned project delivery.', allowedUserTypes: ['employee', 'contractor'], defaultScope: 'community', permissions: ['dashboard', 'projects', 'tasks', 'team_workload', 'documents', 'clients', 'communication', 'meetings'].map((r) => permission(r, ACTIONS.filter((a) => a !== 'delete'), 'community')) },
  { roleKey: 'sales_manager', roleLabel: 'Sales Manager', description: 'Sales team and pipeline management.', allowedUserTypes: ['employee'], defaultScope: 'community', permissions: ['dashboard', 'sales_crm', 'leads', 'clients', 'communication', 'meetings', 'quotations', 'reports', 'tasks', 'documents'].map((r) => permission(r, ACTIONS.filter((a) => a !== 'delete'), 'community')) },
  { roleKey: 'sales_executive', roleLabel: 'Sales Executive', description: 'Assigned sales records.', allowedUserTypes: ['employee'], defaultScope: 'assigned', permissions: [permission('dashboard', ['view'], 'self'), permission('leads', ['view', 'update', 'comment'], 'assigned'), permission('clients', ['view', 'update', 'comment'], 'assigned'), permission('communication', ['view', 'create', 'update'], 'assigned'), permission('meetings', ['view', 'create', 'update'], 'assigned'), permission('tasks', ['view', 'update', 'comment'], 'assigned'), permission('daily_reports', ['view', 'create', 'update'], 'self')] },
  { roleKey: 'marketing_manager', roleLabel: 'Marketing Manager', description: 'Marketing team and campaign management.', allowedUserTypes: ['employee'], defaultScope: 'community', permissions: ['dashboard', 'marketing', 'campaigns', 'tasks', 'documents', 'daily_reports', 'reports', 'communication'].map((r) => permission(r, ACTIONS.filter((a) => a !== 'delete'), 'community')) },
  { roleKey: 'marketing_executive', roleLabel: 'Marketing Executive', description: 'Assigned marketing work.', allowedUserTypes: ['employee', 'contractor'], defaultScope: 'assigned', permissions: ['dashboard', 'marketing', 'campaigns', 'tasks', 'documents', 'daily_reports'].map((r) => permission(r, ['view', 'update', 'comment', 'upload', 'download'], 'assigned')) },
  { roleKey: 'accounts_manager', roleLabel: 'Accounts Manager', description: 'Community financial operations and approvals.', allowedUserTypes: ['employee'], defaultScope: 'community', permissions: ['dashboard', 'accounting', 'quotations', 'invoices', 'payments', 'expenses', 'reimbursements', 'clients', 'projects', 'reports'].map((r) => permission(r, ACTIONS, 'community')) },
  { roleKey: 'accountant', roleLabel: 'Accountant', description: 'Accounting entry preparation.', allowedUserTypes: ['employee', 'contractor'], defaultScope: 'community', permissions: ['dashboard', 'accounting', 'quotations', 'invoices', 'payments', 'expenses', 'clients', 'projects', 'reports'].map((r) => permission(r, ['view', 'create', 'update', 'comment', 'export'], 'community')) },
  { roleKey: 'operations_exhibition_manager', roleLabel: 'Operations / Exhibition Manager', description: 'Exhibition and operational delivery.', allowedUserTypes: ['employee'], defaultScope: 'community', permissions: ['dashboard', 'projects', 'tasks', 'vendors', 'documents', 'team_workload', 'daily_reports', 'reports'].map((r) => permission(r, ACTIONS.filter((a) => a !== 'delete'), 'community')) },
  { roleKey: 'operations_executive', roleLabel: 'Operations Executive', description: 'Assigned operational work.', allowedUserTypes: ['employee', 'contractor'], defaultScope: 'assigned', permissions: ['dashboard', 'projects', 'tasks', 'documents', 'daily_reports'].map((r) => permission(r, ['view', 'update', 'comment', 'upload', 'download'], 'assigned')) },
  { roleKey: 'employee', roleLabel: 'Employee', description: 'Self and assigned work only.', allowedUserTypes: ['employee'], defaultScope: 'assigned', permissions: [view('dashboard', 'self'), view('projects', 'assigned'), permission('tasks', ['view', 'update', 'comment'], 'assigned'), permission('daily_reports', ['view', 'create', 'update'], 'self'), permission('documents', ['view', 'upload', 'download'], 'assigned'), view('meetings', 'self'), view('settings', 'self')] },
  { roleKey: 'client_viewer', roleLabel: 'Client Viewer', description: 'Linked client records only.', allowedUserTypes: ['client'], defaultScope: 'linked', permissions: [view('dashboard', 'self'), permission('projects', ['view', 'comment', 'approve'], 'linked'), permission('documents', ['view', 'download', 'comment', 'approve'], 'linked'), view('invoices', 'linked'), permission('meetings', ['view', 'comment'], 'linked'), view('settings', 'self')] },
  { roleKey: 'vendor_contractor', roleLabel: 'Vendor / Contractor', description: 'Linked and assigned delivery work.', allowedUserTypes: ['vendor', 'contractor'], defaultScope: 'assigned', permissions: [view('dashboard', 'self'), view('projects', 'linked'), permission('tasks', ['view', 'update', 'comment', 'upload'], 'assigned'), permission('documents', ['view', 'upload', 'download'], 'linked'), view('payments', 'linked'), view('settings', 'self')] },
  { roleKey: 'custom_role', roleLabel: 'Custom Role', description: 'Base template for custom roles.', allowedUserTypes: USER_TYPES, defaultScope: 'none', permissions: [], active: true },
];

const DEFAULT_ROLES = ROLE_TEMPLATES;
const CRM_ROLE_KEYS = ROLE_TEMPLATES.map((role) => role.roleKey);
const COMMUNITY_KEYS = UNIVERSAL_COMMUNITIES.map((community) => community.key);

module.exports = { ACTIONS, SCOPES, USER_TYPES, ACCOUNT_STATUSES, PERMISSION_RESOURCES, MODULES, UNIVERSAL_COMMUNITIES, ROLE_TEMPLATES, DEFAULT_ROLES, CRM_ROLE_KEYS, COMMUNITY_KEYS };
