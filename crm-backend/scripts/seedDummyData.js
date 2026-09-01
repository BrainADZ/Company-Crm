require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const BusinessUnit = require('../models/BusinessUnit');
const ClientDataset = require('../models/ClientDataset');
const Department = require('../models/Department');
const OrganizationTeam = require('../models/OrganizationTeam');
const RolePermission = require('../models/RolePermission');
const User = require('../models/User');
const UserAccessAssignment = require('../models/UserAccessAssignment');
const { ensureAccessFoundation } = require('../services/organizationAccessService');

const EMPLOYEE_COUNT = 40;
const SALES_ROW_COUNT = 40;
const SEED_SOURCE = 'Demo Seed';
const SEED_NOTE = 'Demo sales employee created by seed:dummy';
const DEMO_EMAIL_DOMAIN = 'demo.crm.test';

const SALES_STATUSES = [
  'Pending',
  'Contacted',
  'Follow Up',
  'Interested',
  'Not Interested',
  'Converted',
  'Not Reachable',
];

const EMPLOYEE_NAMES = [
  'Aarav Sharma',
  'Vivaan Gupta',
  'Aditya Verma',
  'Arjun Singh',
  'Sai Kumar',
  'Reyansh Patel',
  'Krish Mehta',
  'Ishaan Yadav',
  'Rohan Joshi',
  'Karan Malhotra',
  'Aanya Kapoor',
  'Diya Nair',
  'Ananya Iyer',
  'Meera Rao',
  'Kavya Reddy',
  'Nisha Bansal',
  'Pooja Chawla',
  'Sneha Mishra',
  'Riya Jain',
  'Neha Saxena',
  'Rahul Khanna',
  'Amit Tiwari',
  'Sandeep Roy',
  'Nitin Arora',
  'Manish Kulkarni',
  'Deepak Saini',
  'Varun Bhatia',
  'Mohit Agarwal',
  'Harsh Vardhan',
  'Gaurav Sethi',
  'Simran Kaur',
  'Priya Menon',
  'Shreya Das',
  'Tanvi Goyal',
  'Isha Thakur',
  'Sakshi Dubey',
  'Anjali Puri',
  'Ritu Anand',
  'Komal Gill',
  'Muskan Ali',
];

const CONTACT_NAMES = [
  'Abhishek Jain',
  'Bhavna Arora',
  'Chirag Bhat',
  'Divya Sood',
  'Eshan Kapoor',
  'Farah Khan',
  'Gautam Sinha',
  'Himani Bose',
  'Imran Sheikh',
  'Juhi Prasad',
  'Kabir Anand',
  'Lavanya Pillai',
  'Madhav Goyal',
  'Navya Desai',
  'Omkar Patil',
  'Palak Suri',
  'Qasim Rizvi',
  'Radhika Sen',
  'Sahil Chopra',
  'Trisha Dutta',
  'Uday Batra',
  'Vani Krishnan',
  'Wasim Mirza',
  'Yash Malhotra',
  'Zoya Merchant',
  'Akash Oberoi',
  'Bhumika Shah',
  'Chetan Rao',
  'Deepti Nanda',
  'Ekta Kohli',
  'Firoz Alam',
  'Garima Negi',
  'Harshit Goel',
  'Ishita Roy',
  'Jatin Sethi',
  'Kirti Menon',
  'Lakshya Arora',
  'Mitali Jain',
  'Nakul Bansal',
  'Ojasvi Mehra',
];

const COMPANY_NAMES = [
  'Aarohi Retail',
  'BluePeak Technologies',
  'Cedar Foods',
  'Dazzle Interiors',
  'EcoNova Energy',
  'FinEdge Advisors',
  'GreenLeaf Organics',
  'Horizon Healthcare',
  'Indus Motors',
  'JewelCraft India',
  'Kinetic Logistics',
  'Lotus Hospitality',
  'MetroBuild Projects',
  'Nimbus EdTech',
  'Orbit Telecom',
  'PrimeWorks Consulting',
  'QuickKart Commerce',
  'Riverstone Realty',
  'Sunrise Textiles',
  'Terra Agro',
  'UrbanNest Living',
  'Vertex Automation',
  'WellSpring Wellness',
  'Xeno Digital',
  'YellowBrick Studios',
  'Zenith Appliances',
  'Aspire Finance',
  'BrightPath Learning',
  'CloudNine Travel',
  'DreamSpace Furniture',
  'EverGlow Cosmetics',
  'FreshBasket Foods',
  'GrandArc Architects',
  'HighStreet Fashion',
  'Insight Analytics',
  'JoyRide Mobility',
  'Keystone Manufacturing',
  'LuxeLine Hotels',
  'Moonlight Media',
  'NextGen Robotics',
];

const LOCATIONS = [
  ['Delhi', 'Delhi'],
  ['Gurugram', 'Haryana'],
  ['Noida', 'Uttar Pradesh'],
  ['Mumbai', 'Maharashtra'],
  ['Bengaluru', 'Karnataka'],
  ['Hyderabad', 'Telangana'],
  ['Pune', 'Maharashtra'],
  ['Jaipur', 'Rajasthan'],
  ['Ahmedabad', 'Gujarat'],
  ['Kolkata', 'West Bengal'],
  ['Chennai', 'Tamil Nadu'],
  ['Lucknow', 'Uttar Pradesh'],
];

const REQUIREMENTS = [
  'Digital marketing campaign',
  'Corporate event management',
  'Exhibition booth design',
  'Product launch campaign',
  'Lead generation support',
  'Social media management',
  'Brand identity refresh',
  'Annual conference production',
];

const LEAD_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Campaign', 'Event', 'Cold Call'];

const REMARKS = {
  Pending: 'Initial outreach is scheduled.',
  Contacted: 'Introductory call completed; requirement noted.',
  'Follow Up': 'Client requested another discussion with the sales team.',
  Interested: 'Requirement confirmed; proposal preparation is in progress.',
  'Not Interested': 'No active requirement at present.',
  Converted: 'Deal closed successfully and handed over for onboarding.',
  'Not Reachable': 'Call was unanswered; another attempt is required.',
};

const DATASET_SPECS = [
  {
    unitSlug: 'marketing',
    teamName: 'Marketing Sales Team',
    name: 'Demo Marketing Sales Pipeline',
    label: 'Marketing Prospects',
    priority: 'High',
    salesStage: 'Qualification',
  },
  {
    unitSlug: 'live',
    teamName: 'Live Sales Team',
    name: 'Demo Live Sales Pipeline',
    label: 'Event Enquiries',
    priority: 'Medium',
    salesStage: 'Discovery',
  },
  {
    unitSlug: 'exhibition',
    teamName: 'Exhibits Sales Team',
    name: 'Demo Exhibition Sales Pipeline',
    label: 'Exhibition Prospects',
    priority: 'High',
    salesStage: 'Proposal',
  },
];

const SALES_COLUMNS = [
  'Account Name',
  'Contact Name',
  'Phone',
  'Email',
  'Website',
  'Billing City',
  'Billing State/Province',
  'Requirement',
  'Lead Source',
  'Status',
  'Remark',
  'Employee',
];

const pad = (value, length) => String(value).padStart(length, '0');

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const addDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const toDateInput = (date) => date.toISOString().slice(0, 10);

const getContextIndex = (employeeIndex) =>
  employeeIndex < DATASET_SPECS.length ? employeeIndex : employeeIndex % DATASET_SPECS.length;

const activateRequiredSalesRoles = async () => {
  await RolePermission.updateMany(
    { roleKey: { $in: ['sales_manager', 'sales_executive'] } },
    { $set: { active: true, legacy: false } },
  );
};

const requireSeedDependencies = async () => {
  const [salesDepartment, businessUnits, teams, roles] = await Promise.all([
    Department.findOne({ slug: 'sales', status: 'active' }),
    BusinessUnit.find({
      slug: { $in: DATASET_SPECS.map((item) => item.unitSlug) },
      status: 'active',
    }),
    OrganizationTeam.find({
      name: { $in: DATASET_SPECS.map((item) => item.teamName) },
      status: 'active',
    }),
    RolePermission.find({
      roleKey: { $in: ['sales_manager', 'sales_executive'] },
      active: true,
      legacy: { $ne: true },
    }),
  ]);

  const unitBySlug = new Map(businessUnits.map((unit) => [unit.slug, unit]));
  const teamByName = new Map(teams.map((team) => [team.name, team]));
  const roleByKey = new Map(roles.map((role) => [role.roleKey, role]));
  const missing = [];

  if (!salesDepartment) missing.push('Sales department');
  DATASET_SPECS.forEach((spec) => {
    if (!unitBySlug.has(spec.unitSlug)) missing.push(`${spec.unitSlug} Business Unit`);
    if (!teamByName.has(spec.teamName)) missing.push(spec.teamName);
  });
  ['sales_manager', 'sales_executive'].forEach((roleKey) => {
    if (!roleByKey.has(roleKey)) missing.push(roleKey);
  });

  if (missing.length) throw new Error(`Seed prerequisites are missing: ${missing.join(', ')}`);

  DATASET_SPECS.forEach((spec) => {
    const team = teamByName.get(spec.teamName);
    if (String(team.departmentId) !== String(salesDepartment._id)) {
      throw new Error(`${spec.teamName} is not attached to the Sales department`);
    }
  });

  return { salesDepartment, unitBySlug, teamByName, roleByKey };
};

const seedEmployees = async (dependencies, passwordHash, seedActor) => {
  const employees = [];

  for (let index = 0; index < EMPLOYEE_COUNT; index += 1) {
    const sequence = index + 1;
    const contextIndex = getContextIndex(index);
    const spec = DATASET_SPECS[contextIndex];
    const unit = dependencies.unitBySlug.get(spec.unitSlug);
    const team = dependencies.teamByName.get(spec.teamName);
    const isManager = index < DATASET_SPECS.length;
    const roleKey = isManager ? 'sales_manager' : 'sales_executive';
    const role = dependencies.roleByKey.get(roleKey);
    const email = `sales${pad(sequence, 3)}@${DEMO_EMAIL_DOMAIN}`;

    const employee = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: EMPLOYEE_NAMES[index],
          password: passwordHash,
          role: 'employee',
          userType: 'employee',
          roleKey,
          crmRole: roleKey,
          communities: [unit.legacyCommunityKey],
          primaryCommunity: unit.legacyCommunityKey,
          accountStatus: 'active',
          isDeleted: false,
          deletedAt: null,
          accessAssignmentsInitialized: true,
          department: dependencies.salesDepartment.name,
          officeModule: dependencies.salesDepartment.name,
          team: team.name,
          employeeId: `DEMO-SALES-${pad(sequence, 3)}`,
          employmentType: index % 10 === 0 && !isManager ? 'intern' : 'full_time',
          joiningDate: new Date(Date.UTC(2024 + (index % 2), index % 12, (index % 24) + 1)),
          workLocation: LOCATIONS[index % LOCATIONS.length][0],
          notes: SEED_NOTE,
          emergencyContact: `+9181000${pad(sequence, 5)}`,
          phone: `+9191000${pad(sequence, 5)}`,
          mobile: `+9191000${pad(sequence, 5)}`,
          address: `${sequence + 10}, Demo Business Park`,
          city: LOCATIONS[index % LOCATIONS.length][0],
          stateProvince: LOCATIONS[index % LOCATIONS.length][1],
          postalCode: `${110001 + index}`,
          country: 'India',
          position: isManager
            ? 'Sales Manager'
            : index % 10 === 0
              ? 'Sales Intern'
              : 'Sales Executive',
          permissions: [],
          legacyPermissions: [],
          passwordChangedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const assignment = await UserAccessAssignment.findOneAndUpdate(
      { userId: employee._id, isPrimary: true },
      {
        $set: {
          roleId: role._id,
          businessUnitIds: [unit._id],
          departmentId: dependencies.salesDepartment._id,
          teamIds: [team._id],
          dataScope: role.defaultDataScope,
          modulePermissionOverrides: [],
          isPrimary: true,
          status: 'active',
          startDate: new Date(),
          endDate: null,
          createdBy: seedActor?._id || null,
          updatedBy: seedActor?._id || null,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    await UserAccessAssignment.updateMany(
      { userId: employee._id, _id: { $ne: assignment._id }, status: 'active' },
      {
        $set: {
          status: 'inactive',
          endDate: new Date(),
          updatedBy: seedActor?._id || null,
        },
      },
    );

    employees.push({ employee, contextIndex, isManager });
  }

  const managerByContext = new Map(
    employees
      .filter((entry) => entry.isManager)
      .map((entry) => [entry.contextIndex, entry.employee]),
  );

  await Promise.all(
    employees.map(({ employee, contextIndex, isManager }) =>
      User.updateOne(
        { _id: employee._id },
        { $set: { reportingManager: isManager ? null : managerByContext.get(contextIndex)._id } },
      ),
    ),
  );

  return employees;
};

const buildLead = (index, employee) => {
  const sequence = index + 1;
  const companyName = COMPANY_NAMES[index];
  const companySlug = slugify(companyName);
  const location = LOCATIONS[index % LOCATIONS.length];
  const status = SALES_STATUSES[index % SALES_STATUSES.length];

  return {
    status,
    row: [
      companyName,
      CONTACT_NAMES[index],
      `+9188000${pad(sequence, 5)}`,
      `contact${pad(sequence, 2)}@${companySlug}.example`,
      `https://www.${companySlug}.example`,
      location[0],
      location[1],
      REQUIREMENTS[index % REQUIREMENTS.length],
      LEAD_SOURCES[index % LEAD_SOURCES.length],
      status,
      REMARKS[status],
      employee.name,
    ],
  };
};

const seedSalesDatasets = async (dependencies, employees) => {
  const now = new Date();
  const datasets = [];

  for (const [contextIndex, spec] of DATASET_SPECS.entries()) {
    const unit = dependencies.unitBySlug.get(spec.unitSlug);
    const contextEmployees = employees.filter((entry) => entry.contextIndex === contextIndex);
    const manager = contextEmployees.find((entry) => entry.isManager).employee;
    const leadIndexes = Array.from({ length: SALES_ROW_COUNT }, (_, index) => index).filter(
      (index) => index % DATASET_SPECS.length === contextIndex,
    );
    const leads = leadIndexes.map((leadIndex, localIndex) => ({
      ...buildLead(leadIndex, contextEmployees[localIndex].employee),
      employee: contextEmployees[localIndex].employee,
    }));
    const rows = leads.map((lead) => lead.row);
    const rowAssignments = leads.map((lead, rowIndex) => ({
      rowIndex,
      employee: lead.employee._id,
      employeeName: lead.employee.name,
      assignedBy: manager._id,
      assignedAt: addDays(now, -(rowIndex + 1)),
    }));
    const rowFollowUps = leads.flatMap((lead, rowIndex) =>
      lead.status === 'Follow Up'
        ? [
            {
              rowIndex,
              followUpDate: toDateInput(addDays(now, (rowIndex % 7) + 1)),
              updatedBy: manager._id,
              updatedByName: manager.name,
              updatedAt: now,
            },
          ]
        : [],
    );

    const dataset = await ClientDataset.findOneAndUpdate(
      { name: spec.name, source: SEED_SOURCE, communityKey: spec.unitSlug },
      {
        $set: {
          businessUnitId: unit._id,
          communityKey: spec.unitSlug,
          tableFormat: spec.unitSlug,
          officeModule: dependencies.salesDepartment.name,
          team: spec.teamName,
          name: spec.name,
          year: String(now.getUTCFullYear()),
          label: spec.label,
          priority: spec.priority,
          source: SEED_SOURCE,
          ownerAlias: manager.name,
          salesStage: spec.salesStage,
          originalFileName: 'Generated by scripts/seedDummyData.js',
          columns: SALES_COLUMNS,
          rows,
          rowAssignments,
          rowFollowUps,
          rowLogs: [],
          rowCount: rows.length,
          uploadedBy: manager._id,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    datasets.push(dataset);
  }

  return datasets;
};

const verifySeed = async (employees, datasets) => {
  const employeeIds = new Set(employees.map(({ employee }) => String(employee._id)));
  const activeAssignments = await UserAccessAssignment.find({
    userId: { $in: [...employeeIds] },
    status: 'active',
  }).lean();
  const seededDatasets = await ClientDataset.find({
    _id: { $in: datasets.map((item) => item._id) },
  })
    .sort({ name: 1 })
    .lean();
  const foundStatuses = new Set();
  let salesRows = 0;
  let salesAssignments = 0;

  if (employees.length !== EMPLOYEE_COUNT) {
    throw new Error(`Expected ${EMPLOYEE_COUNT} employees, found ${employees.length}`);
  }
  if (activeAssignments.length !== EMPLOYEE_COUNT) {
    throw new Error(
      `Expected ${EMPLOYEE_COUNT} active employee assignments, found ${activeAssignments.length}`,
    );
  }

  seededDatasets.forEach((dataset) => {
    const statusIndex = dataset.columns.indexOf('Status');
    const employeeIndex = dataset.columns.indexOf('Employee');

    if (statusIndex === -1 || employeeIndex === -1) {
      throw new Error(`${dataset.name} is missing Sales work columns`);
    }
    if (dataset.rowCount !== dataset.rows.length) {
      throw new Error(`${dataset.name} rowCount does not match its rows`);
    }
    if (dataset.rowAssignments.length !== dataset.rows.length) {
      throw new Error(`${dataset.name} does not have exactly one assignment per Sales row`);
    }

    dataset.rows.forEach((row, rowIndex) => {
      const status = row[statusIndex];
      const assignment = dataset.rowAssignments.find((item) => item.rowIndex === rowIndex);
      foundStatuses.add(status);
      if (!SALES_STATUSES.includes(status)) {
        throw new Error(`${dataset.name} contains invalid status ${status}`);
      }
      if (!assignment || !employeeIds.has(String(assignment.employee))) {
        throw new Error(`${dataset.name} row ${rowIndex + 1} has an invalid employee assignment`);
      }
      if (row[employeeIndex] !== assignment.employeeName) {
        throw new Error(`${dataset.name} row ${rowIndex + 1} employee name is inconsistent`);
      }
    });

    salesRows += dataset.rows.length;
    salesAssignments += dataset.rowAssignments.length;
  });

  if (salesRows !== SALES_ROW_COUNT || salesAssignments !== SALES_ROW_COUNT) {
    throw new Error(
      `Expected ${SALES_ROW_COUNT} Sales rows and assignments, found ${salesRows}/${salesAssignments}`,
    );
  }
  if (SALES_STATUSES.some((status) => !foundStatuses.has(status))) {
    throw new Error('Not every supported Sales status is represented in the dummy data');
  }

  return {
    employeeCount: employees.length,
    managerCount: employees.filter((entry) => entry.isManager).length,
    executiveCount: employees.filter((entry) => !entry.isManager).length,
    datasetCount: seededDatasets.length,
    salesRows,
    statusCounts: SALES_STATUSES.map((status) => [
      status,
      seededDatasets.reduce((total, dataset) => {
        const statusIndex = dataset.columns.indexOf('Status');
        return total + dataset.rows.filter((row) => row[statusIndex] === status).length;
      }, 0),
    ]),
  };
};

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  const demoPassword = String(process.env.DUMMY_EMPLOYEE_PASSWORD || 'Demo@12345');

  if (!mongoUri) throw new Error('MONGODB_URI is required in crm-backend/.env');
  if (demoPassword.length < 8) {
    throw new Error('DUMMY_EMPLOYEE_PASSWORD must be at least 8 characters');
  }
  if (EMPLOYEE_NAMES.length !== EMPLOYEE_COUNT || CONTACT_NAMES.length !== SALES_ROW_COUNT) {
    throw new Error('Dummy source arrays do not match their configured record counts');
  }

  await mongoose.connect(mongoUri);
  await ensureAccessFoundation();
  await activateRequiredSalesRoles();

  const dependencies = await requireSeedDependencies();
  const seedActor = await User.findOne({ roleKey: 'super_admin', isDeleted: { $ne: true } });
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const employees = await seedEmployees(dependencies, passwordHash, seedActor);
  const datasets = await seedSalesDatasets(dependencies, employees);
  const result = await verifySeed(employees, datasets);

  console.log('Dummy CRM seed completed successfully.');
  console.log(
    `Employees: ${result.employeeCount} (${result.managerCount} managers, ${result.executiveCount} executives)`,
  );
  console.log(`Sales data: ${result.salesRows} leads across ${result.datasetCount} datasets`);
  console.log(
    `Statuses: ${result.statusCounts.map(([status, count]) => `${status}=${count}`).join(', ')}`,
  );
  console.log(`Demo login: sales001@${DEMO_EMAIL_DOMAIN}`);
  console.log(
    process.env.DUMMY_EMPLOYEE_PASSWORD
      ? 'Password: value from DUMMY_EMPLOYEE_PASSWORD'
      : 'Password: Demo@12345',
  );
};

run()
  .catch((error) => {
    console.error(`Dummy CRM seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
