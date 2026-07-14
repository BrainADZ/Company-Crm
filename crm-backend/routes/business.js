const express = require('express');
const ClientDataset = require('../models/ClientDataset');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const BusinessCampaign = require('../models/BusinessCampaign');
const FinanceRecord = require('../models/FinanceRecord');
const BusinessProject = require('../models/BusinessProject');
const BusinessProjectTask = require('../models/BusinessProjectTask');
const DocumentRecord = require('../models/DocumentRecord');
const CommunicationLog = require('../models/CommunicationLog');
const RolePermission = require('../models/RolePermission');
const OfficeStructure = require('../models/OfficeStructure');
const Community = require('../models/Community');
const authMiddleware = require('../middleware/authMiddleware');
const { MODULES, UNIVERSAL_COMMUNITIES, DEFAULT_ROLES, COMMUNITY_KEYS } = require('../config/accessControl');

const router = express.Router();

const projectStages = [
  'Requirement Received',
  'SOW Drafting',
  'SOW Approved',
  'WBS Created',
  'Design Phase',
  'Development Phase',
  'Testing Phase',
  'Client Review',
  'Changes Requested',
  'Final Delivery',
  'Closed',
];

const taskStatuses = ['Backlog', 'To Do', 'In Progress', 'Review', 'Complete'];

const defaultOfficeModules = ['Sales', 'Marketing', 'Accounts', 'Projects', 'Operations', 'Support'];

const defaultOfficeTeams = [
  { name: 'Sales Team', moduleName: 'Sales' },
  { name: 'Lead Generation', moduleName: 'Sales' },
  { name: 'Performance Marketing', moduleName: 'Marketing' },
  { name: 'Content Team', moduleName: 'Marketing' },
  { name: 'Billing Team', moduleName: 'Accounts' },
  { name: 'Delivery Team', moduleName: 'Projects' },
  { name: 'Engineering Team', moduleName: 'Projects' },
  { name: 'Operations Team', moduleName: 'Operations' },
  { name: 'Support Team', moduleName: 'Support' },
];

const defaultCampaigns = [
  { name: 'Google Search SaaS Leads', channel: 'Google Ads', spend: 185000, impressions: 920000, clicks: 18400, leads: 248, conversions: 31, roi: 3.8, cpl: 746, ctr: 2.0, status: 'Active', owner: 'Marketing' },
  { name: 'Meta Retargeting Hospitals', channel: 'Meta Ads', spend: 125000, impressions: 640000, clicks: 12800, leads: 172, conversions: 19, roi: 3.1, cpl: 727, ctr: 2.0, status: 'Active', owner: 'Marketing' },
  { name: 'LinkedIn Enterprise Demo', channel: 'LinkedIn', spend: 95000, impressions: 140000, clicks: 4200, leads: 58, conversions: 8, roi: 2.4, cpl: 1638, ctr: 3.0, status: 'Active', owner: 'Marketing' },
];

const defaultFinance = [
  { type: 'quotation', code: 'QT-1001', client: 'Fortis Healthcare', amount: 1250000, gst: 225000, discount: 50000, paid: 0, issueDate: '2026-06-08', dueDate: '2026-06-22', status: 'Sent', owner: 'Sales' },
  { type: 'quotation', code: 'QT-1002', client: 'Hyatt Centric', amount: 760000, gst: 136800, discount: 25000, paid: 0, issueDate: '2026-06-10', dueDate: '2026-06-24', status: 'Revised', owner: 'Sales' },
  { type: 'invoice', code: 'INV-9001', client: 'Hyatt Centric', amount: 420000, gst: 75600, discount: 0, paid: 495600, dueDate: '2026-06-18', status: 'Paid', owner: 'Accounts' },
  { type: 'invoice', code: 'INV-9002', client: 'Fortis Healthcare', amount: 650000, gst: 117000, discount: 0, paid: 200000, dueDate: '2026-06-20', status: 'Partially Paid', owner: 'Accounts' },
  { type: 'invoice', code: 'INV-9003', client: 'Sodexo India', amount: 380000, gst: 68400, discount: 0, paid: 0, dueDate: '2026-06-09', status: 'Overdue', owner: 'Accounts' },
];

const defaultProjects = [
  {
    name: 'Fortis Business OS MVP',
    client: 'Fortis Healthcare',
    owner: 'Project Manager',
    ownerEmail: 'project@demo.com',
    assignedTeam: [{ name: 'Project Manager', email: 'project@demo.com' }, { name: 'Sales Manager', email: 'sales@demo.com' }],
    visibilityUsers: ['admin@company.com', 'project@demo.com', 'sales@demo.com'],
    documentAccessUsers: ['admin@company.com', 'project@demo.com'],
    deadline: '2026-07-20',
    priority: 'High',
    stage: 'SOW Drafting',
    health: 'At Risk',
    progress: 22,
    notes: 'Scope needs approval from senior stakeholders.',
  },
  {
    name: 'Hyatt CMS Expansion',
    client: 'Hyatt Centric',
    owner: 'Project Manager',
    ownerEmail: 'project@demo.com',
    assignedTeam: [{ name: 'Project Manager', email: 'project@demo.com' }],
    visibilityUsers: ['admin@company.com', 'project@demo.com'],
    documentAccessUsers: ['admin@company.com', 'project@demo.com'],
    deadline: '2026-07-05',
    priority: 'Medium',
    stage: 'Development Phase',
    health: 'Healthy',
    progress: 58,
    notes: 'CMS and branch reporting are progressing well.',
  },
];

const defaultDocuments = [
  { name: 'Fortis SOW Draft', type: 'SOW', project: 'Fortis Business OS MVP', owner: 'Project Manager', access: 'Internal', uploadedAt: '2026-06-10' },
  { name: 'Hyatt Quotation v2', type: 'Quotation', project: 'Hyatt CMS Expansion', owner: 'Sales Manager', access: 'Client View', uploadedAt: '2026-06-10' },
  { name: 'Project WBS Template', type: 'WBS', project: 'All Projects', owner: 'Project Manager', access: 'Internal', uploadedAt: '2026-06-06' },
];

const defaultCommunications = [
  { clientName: 'Fortis Healthcare', contact: 'Procurement Head', channel: 'Email', type: 'Proposal', message: 'Proposal introduction shared with software overview.', status: 'Sent', owner: 'Sales Manager' },
  { clientName: 'Hyatt Centric', contact: 'IT Manager', channel: 'WhatsApp', type: 'Follow-up', message: 'Commercial clarification shared.', status: 'Sent', owner: 'Sales Manager' },
];

const requireAdmin = (req, res, next) => {
  if (req.user.crmRole !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied: Super Admin only' });
  }
  return next();
};

const hasModuleAccess = async (user, moduleKey) => {
  if (user.crmRole === 'super_admin') return true;
  if ((user.permissions || []).includes(moduleKey)) return true;
  const role = await RolePermission.findOne({ roleKey: user.crmRole }).select('modules');
  return Boolean(role?.modules?.includes(moduleKey));
};

const requireModule = (moduleKey) => async (req, res, next) => {
  if (await hasModuleAccess(req.user, moduleKey)) return next();
  return res.status(403).json({ message: `Access denied: ${moduleKey} permission required` });
};

const normalizeCell = (cell) => {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return cell.toISOString();
  return String(cell).trim();
};

const normalizeColumnName = (column) => normalizeCell(column).toLowerCase();

const getColumnIndex = (columns, names) => {
  const lowered = names.map((name) => name.toLowerCase());
  return columns.findIndex((column) => lowered.includes(normalizeColumnName(column)));
};

const getCellValue = (columns, row, names) => {
  const index = getColumnIndex(columns, names);
  return index === -1 ? '' : normalizeCell(row[index]);
};

const addWorkColumnsAfterWebsite = (columns = [], rows = []) => {
  const normalizedColumns = columns.map((column, index) => normalizeCell(column) || `Column ${index + 1}`);
  const existing = new Set(normalizedColumns.map(normalizeColumnName));
  const columnsToAdd = ['Status', 'Remark', 'Employee'].filter((column) => !existing.has(column.toLowerCase()));
  const normalizedRows = rows.map((row) => normalizedColumns.map((column, index) => normalizeCell(row[index])));

  if (!columnsToAdd.length) return { columns: normalizedColumns, rows: normalizedRows };

  const websiteIndex = normalizedColumns.findIndex((column) => normalizeColumnName(column) === 'website');
  const insertIndex = websiteIndex === -1 ? normalizedColumns.length : websiteIndex + 1;

  return {
    columns: [...normalizedColumns.slice(0, insertIndex), ...columnsToAdd, ...normalizedColumns.slice(insertIndex)],
    rows: normalizedRows.map((row) => [
      ...row.slice(0, insertIndex),
      ...columnsToAdd.map(() => ''),
      ...row.slice(insertIndex),
    ]),
  };
};

const toCurrencyNumber = (value) => Number(value || 0);

const formatCodePrefix = (type) => (type === 'invoice' ? 'INV' : 'QT');

const ensureDefaults = async (createdBy) => {
  await Promise.all(DEFAULT_ROLES.map((role) => RolePermission.updateOne(
    { roleKey: role.roleKey },
    { $setOnInsert: role },
    { upsert: true },
  )));
  await RolePermission.deleteOne({ roleKey: 'admin' });

  await Promise.all(UNIVERSAL_COMMUNITIES.map((community) => Community.updateOne(
    { key: community.key },
    { $set: { ...community, active: true }, $setOnInsert: { createdBy } },
    { upsert: true },
  )));

  await User.updateMany(
    { role: 'admin', $or: [{ crmRole: { $ne: 'super_admin' } }, { communities: { $not: { $all: COMMUNITY_KEYS } } }] },
    { $set: { crmRole: 'super_admin', communities: COMMUNITY_KEYS } },
  );

  if (await OfficeStructure.countDocuments() === 0) {
    await OfficeStructure.insertMany([
      ...defaultOfficeModules.map((name) => ({ type: 'module', name, createdBy })),
      ...defaultOfficeTeams.map((team) => ({ type: 'team', ...team, createdBy })),
    ]);
  }

  if (await BusinessCampaign.countDocuments() === 0) {
    await BusinessCampaign.insertMany(defaultCampaigns.map((item) => ({ ...item, createdBy })));
  }

  if (await FinanceRecord.countDocuments() === 0) {
    await FinanceRecord.insertMany(defaultFinance.map((item) => ({ ...item, createdBy })));
  }

  if (await BusinessProject.countDocuments() === 0) {
    const projects = await BusinessProject.insertMany(defaultProjects.map((item) => ({ ...item, createdBy })));
    const [fortis, hyatt] = projects;
    await BusinessProjectTask.insertMany([
      { project: fortis._id, projectName: fortis.name, name: 'Prepare final SOW', assignee: 'Project Manager', assigneeEmail: 'project@demo.com', team: 'Delivery', due: '2026-06-26', status: 'In Progress', progress: 70, priority: 'High', createdBy },
      { project: fortis._id, projectName: fortis.name, name: 'Confirm integration APIs', assignee: 'Sales Manager', assigneeEmail: 'sales@demo.com', team: 'Engineering', due: '2026-06-28', status: 'To Do', progress: 10, priority: 'High', dependency: 'Prepare final SOW', createdBy },
      { project: hyatt._id, projectName: hyatt.name, name: 'Branch dashboard build', assignee: 'Project Manager', assigneeEmail: 'project@demo.com', team: 'Engineering', due: '2026-06-24', status: 'In Progress', progress: 45, priority: 'Medium', createdBy },
      { project: hyatt._id, projectName: hyatt.name, name: 'Client review deck', assignee: 'Sales Manager', assigneeEmail: 'sales@demo.com', team: 'Delivery', due: '2026-06-30', status: 'Review', progress: 80, priority: 'Medium', milestone: true, createdBy },
    ]);
  }

  if (await DocumentRecord.countDocuments() === 0) {
    await DocumentRecord.insertMany(defaultDocuments.map((item) => ({ ...item, createdBy })));
  }

  if (await CommunicationLog.countDocuments() === 0) {
    await CommunicationLog.insertMany(defaultCommunications.map((item) => ({ ...item, createdBy })));
  }
};

const getWorkStructure = async () => {
  const [modules, teams] = await Promise.all([
    OfficeStructure.find({ type: 'module' }).sort({ name: 1 }),
    OfficeStructure.find({ type: 'team' }).sort({ moduleName: 1, name: 1 }),
  ]);

  return { modules, teams };
};

const buildAssignedTaskQuery = (employee) => ({
  $or: [
    { assigneeEmail: employee.email },
    { assignee: employee.name },
  ],
});

const getDatasetSummary = (dataset) => {
  const { columns, rows } = addWorkColumnsAfterWebsite(dataset.columns || [], dataset.rows || []);
  const statusIndex = getColumnIndex(columns, ['Status']);
  const employeeIndex = getColumnIndex(columns, ['Employee']);
  const counts = rows.reduce((accumulator, row, rowIndex) => {
    const status = statusIndex === -1 ? '' : normalizeCell(row[statusIndex]);
    const assigned = (dataset.rowAssignments || []).some((assignment) => Number(assignment.rowIndex) === rowIndex)
      || (employeeIndex !== -1 && normalizeCell(row[employeeIndex]));

    if (assigned) accumulator.assigned += 1;
    if (status === 'Converted') accumulator.converted += 1;
    if (status === 'Interested') accumulator.interested += 1;
    if (status === 'Follow Up') accumulator.followUps += 1;
    if (status === 'Pending' || !status) accumulator.pending += 1;
    return accumulator;
  }, {
    total: rows.length,
    assigned: 0,
    pending: 0,
    followUps: 0,
    interested: 0,
    converted: 0,
  });

  return {
    ...counts,
    unassigned: Math.max(counts.total - counts.assigned, 0),
    conversionRate: counts.total ? Math.round((counts.converted / counts.total) * 100) : 0,
  };
};

const buildSummary = async () => {
  const [
    employees,
    datasets,
    meetings,
    campaigns,
    finance,
    projects,
    projectTasks,
    documents,
    communications,
  ] = await Promise.all([
    User.find({ role: 'employee' }).select('name email position lastLoginAt'),
    ClientDataset.find(),
    Meeting.find(),
    BusinessCampaign.find().sort({ updatedAt: -1 }),
    FinanceRecord.find().sort({ updatedAt: -1 }),
    BusinessProject.find().sort({ updatedAt: -1 }),
    BusinessProjectTask.find().sort({ due: 1 }),
    DocumentRecord.find().sort({ updatedAt: -1 }),
    CommunicationLog.find().sort({ createdAt: -1 }),
  ]);

  const sales = datasets.reduce((accumulator, dataset) => {
    const current = getDatasetSummary(dataset);
    Object.keys(current).forEach((key) => {
      accumulator[key] = (accumulator[key] || 0) + current[key];
    });
    return accumulator;
  }, {
    total: 0,
    assigned: 0,
    pending: 0,
    followUps: 0,
    interested: 0,
    converted: 0,
    unassigned: 0,
  });
  sales.conversionRate = sales.total ? Math.round((sales.converted / sales.total) * 100) : 0;

  const marketingSpend = campaigns.reduce((sum, item) => sum + toCurrencyNumber(item.spend), 0);
  const marketingLeads = campaigns.reduce((sum, item) => sum + toCurrencyNumber(item.leads), 0);
  const marketingConversions = campaigns.reduce((sum, item) => sum + toCurrencyNumber(item.conversions), 0);
  const avgRoi = campaigns.length ? campaigns.reduce((sum, item) => sum + toCurrencyNumber(item.roi), 0) / campaigns.length : 0;

  const invoices = finance.filter((item) => item.type === 'invoice');
  const quotations = finance.filter((item) => item.type === 'quotation');
  const today = new Date().toISOString().slice(0, 10);
  const accounting = invoices.reduce((accumulator, invoice) => {
    const gross = toCurrencyNumber(invoice.amount) + toCurrencyNumber(invoice.gst) - toCurrencyNumber(invoice.discount);
    const pending = Math.max(gross - toCurrencyNumber(invoice.paid), 0);
    accumulator.invoiceValue += gross;
    accumulator.paid += toCurrencyNumber(invoice.paid);
    accumulator.pending += pending;
    if (pending > 0 && invoice.dueDate && invoice.dueDate < today) accumulator.overdue += pending;
    return accumulator;
  }, {
    invoiceValue: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    quotations: quotations.length,
    invoices: invoices.length,
  });

  const activeProjects = projects.filter((project) => project.stage !== 'Closed').length;
  const overdueTasks = projectTasks.filter((task) => task.due && task.due < today && task.status !== 'Complete').length;
  const completedTasks = projectTasks.filter((task) => task.status === 'Complete').length;

  return {
    employees: employees.length,
    datasets: datasets.length,
    meetings: meetings.length,
    sales,
    marketing: {
      campaigns: campaigns.length,
      spend: marketingSpend,
      leads: marketingLeads,
      conversions: marketingConversions,
      avgRoi,
    },
    accounting,
    projects: {
      total: projects.length,
      active: activeProjects,
      tasks: projectTasks.length,
      overdueTasks,
      completedTasks,
      completionRate: projectTasks.length ? Math.round((completedTasks / projectTasks.length) * 100) : 0,
    },
    documents: documents.length,
    communications: communications.length,
    recent: {
      campaigns: campaigns.slice(0, 5),
      finance: finance.slice(0, 6),
      projects: projects.slice(0, 5),
      tasks: projectTasks.slice(0, 8),
      documents: documents.slice(0, 5),
      communications: communications.slice(0, 5),
    },
  };
};

const resourceConfig = {
  campaigns: {
    model: BusinessCampaign,
    sort: { updatedAt: -1 },
  },
  finance: {
    model: FinanceRecord,
    sort: { updatedAt: -1 },
    beforeCreate: async (payload) => {
      const type = payload.type === 'invoice' ? 'invoice' : 'quotation';
      if (payload.code) return { ...payload, type };
      const count = await FinanceRecord.countDocuments({ type });
      return { ...payload, type, code: `${formatCodePrefix(type)}-${String(1000 + count + 1)}` };
    },
  },
  projects: {
    model: BusinessProject,
    sort: { updatedAt: -1 },
  },
  'project-tasks': {
    model: BusinessProjectTask,
    sort: { due: 1, updatedAt: -1 },
    beforeCreate: async (payload) => {
      if (!payload.project) return payload;
      const project = await BusinessProject.findById(payload.project);
      return {
        ...payload,
        projectName: payload.projectName || project?.name || '',
      };
    },
  },
  documents: {
    model: DocumentRecord,
    sort: { updatedAt: -1 },
  },
  communications: {
    model: CommunicationLog,
    sort: { createdAt: -1 },
  },
};

router.use(authMiddleware);

router.get('/summary', requireModule('dashboard'), async (req, res) => {
  try {
    await ensureDefaults(req.user.id);
    const summary = await buildSummary();
    return res.json(summary);
  } catch (error) {
    console.error('Error building business summary:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.get('/permissions', requireAdmin, async (req, res) => {
  try {
    await ensureDefaults(req.user.id);
    const [roles, communities, superAdmins] = await Promise.all([
      RolePermission.find().sort({ locked: -1, roleLabel: 1 }),
      Community.find({ active: true }).sort({ createdAt: 1 }),
      User.find({ role: 'admin', crmRole: 'super_admin' }).select('name email crmRole communities'),
    ]);
    return res.json({ modules: MODULES, roles, communities, superAdmins });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/permissions/:roleKey', requireAdmin, async (req, res) => {
  try {
    await ensureDefaults(req.user.id);
    const allowedModuleKeys = new Set(MODULES.map((module) => module.key));
    const modules = Array.isArray(req.body.modules)
      ? req.body.modules.filter((moduleKey) => allowedModuleKeys.has(moduleKey))
      : [];

    const role = await RolePermission.findOne({ roleKey: req.params.roleKey });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (role.locked) return res.status(400).json({ message: 'Locked roles cannot be changed' });

    role.modules = modules;
    await role.save();
    return res.json({ message: 'Permissions updated', role });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.get('/work-structure', async (req, res) => {
  try {
    await ensureDefaults(req.user.id);
    return res.json(await getWorkStructure());
  } catch (error) {
    console.error('Error fetching work structure:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/work-structure/modules', requireAdmin, async (req, res) => {
  try {
    await ensureDefaults(req.user.id);
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Module name is required' });

    await OfficeStructure.create({ type: 'module', name, createdBy: req.user.id });
    return res.status(201).json({ message: 'Module added', ...(await getWorkStructure()) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Module already exists' });
    console.error('Error creating module:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/work-structure/teams', requireAdmin, async (req, res) => {
  try {
    await ensureDefaults(req.user.id);
    const name = String(req.body.name || '').trim();
    const moduleName = String(req.body.moduleName || '').trim();
    if (!name || !moduleName) return res.status(400).json({ message: 'Team name and module are required' });

    const moduleExists = await OfficeStructure.exists({ type: 'module', name: moduleName });
    if (!moduleExists) return res.status(400).json({ message: 'Selected module does not exist' });

    await OfficeStructure.create({ type: 'team', name, moduleName, createdBy: req.user.id });
    return res.status(201).json({ message: 'Team added', ...(await getWorkStructure()) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Team already exists in this module' });
    console.error('Error creating team:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.delete('/work-structure/modules/:id', requireAdmin, async (req, res) => {
  try {
    await ensureDefaults(req.user.id);
    const moduleItem = await OfficeStructure.findOneAndDelete({ _id: req.params.id, type: 'module' });
    if (!moduleItem) return res.status(404).json({ message: 'Module not found' });

    await OfficeStructure.deleteMany({ type: 'team', moduleName: moduleItem.name });
    return res.json({ message: 'Module removed', ...(await getWorkStructure()) });
  } catch (error) {
    console.error('Error deleting module:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.delete('/work-structure/teams/:id', requireAdmin, async (req, res) => {
  try {
    await ensureDefaults(req.user.id);
    const teamItem = await OfficeStructure.findOneAndDelete({ _id: req.params.id, type: 'team' });
    if (!teamItem) return res.status(404).json({ message: 'Team not found' });

    return res.json({ message: 'Team removed', ...(await getWorkStructure()) });
  } catch (error) {
    console.error('Error deleting team:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.get('/:resource', async (req, res) => {
  try {
    const config = resourceConfig[req.params.resource];
    if (!config) return res.status(404).json({ message: 'Resource not found' });

    const resourceModules = {
      campaigns: 'marketing',
      finance: 'accounting',
      projects: 'projects',
      'project-tasks': 'tasks',
      documents: 'documents',
      communications: 'communication',
    };
    if (!(await hasModuleAccess(req.user, resourceModules[req.params.resource]))) {
      return res.status(403).json({ message: 'Access denied: Module permission required' });
    }

    await ensureDefaults(req.user.id);
    let query = {};
    if (req.params.resource === 'project-tasks' && req.user.role === 'employee') {
      const employee = await User.findById(req.user.id).select('name email');
      if (!employee) return res.status(404).json({ message: 'Employee not found' });
      query = buildAssignedTaskQuery(employee);
    }

    const items = await config.model.find(query).sort(config.sort);
    return res.json(items);
  } catch (error) {
    console.error(`Error fetching ${req.params.resource}:`, error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:resource', requireAdmin, async (req, res) => {
  try {
    const config = resourceConfig[req.params.resource];
    if (!config) return res.status(404).json({ message: 'Resource not found' });

    await ensureDefaults(req.user.id);
    const payload = config.beforeCreate ? await config.beforeCreate(req.body) : req.body;
    const item = await config.model.create({ ...payload, createdBy: req.user.id });
    return res.status(201).json({ message: 'Record created successfully', item });
  } catch (error) {
    console.error(`Error creating ${req.params.resource}:`, error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.patch('/:resource/:id', async (req, res) => {
  try {
    const config = resourceConfig[req.params.resource];
    if (!config) return res.status(404).json({ message: 'Resource not found' });

    await ensureDefaults(req.user.id);

    if (req.user.role !== 'admin') {
      if (req.params.resource !== 'project-tasks' || req.user.role !== 'employee') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
      }

      const employee = await User.findById(req.user.id).select('name email');
      if (!employee) return res.status(404).json({ message: 'Employee not found' });

      const payload = {};
      if (req.body.status !== undefined) {
        if (!taskStatuses.includes(req.body.status)) {
          return res.status(400).json({ message: 'Invalid task status' });
        }
        payload.status = req.body.status;
        if (req.body.status === 'Complete' && req.body.progress === undefined) payload.progress = 100;
      }
      if (req.body.progress !== undefined) {
        payload.progress = Math.max(0, Math.min(100, Number(req.body.progress) || 0));
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ message: 'No allowed fields to update' });
      }

      const item = await BusinessProjectTask.findOneAndUpdate({
        _id: req.params.id,
        ...buildAssignedTaskQuery(employee),
      }, payload, {
        new: true,
        runValidators: true,
      });

      if (!item) return res.status(404).json({ message: 'Task not found' });
      return res.json({ message: 'Task updated successfully', item });
    }

    const payload = config.beforeCreate ? await config.beforeCreate(req.body) : req.body;
    const item = await config.model.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!item) return res.status(404).json({ message: 'Record not found' });
    return res.json({ message: 'Record updated successfully', item });
  } catch (error) {
    console.error(`Error updating ${req.params.resource}:`, error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.delete('/:resource/:id', requireAdmin, async (req, res) => {
  try {
    const config = resourceConfig[req.params.resource];
    if (!config) return res.status(404).json({ message: 'Resource not found' });

    await ensureDefaults(req.user.id);
    const item = await config.model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Record not found' });
    return res.json({ message: 'Record deleted successfully', id: req.params.id });
  } catch (error) {
    console.error(`Error deleting ${req.params.resource}:`, error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
