import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import PasswordInput from '../components/PasswordInput';
import { API_BASE_URL, getAssetUrl } from '../config/api';
import {
  createWorkModule,
  createWorkTeam,
  deleteWorkModule,
  deleteWorkTeam,
  getWorkStructure,
} from '../services/businessApi';

Modal.setAppElement('#root');

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  position: '',
  department: 'Sales',
  officeModule: 'Sales',
  team: 'Sales Team',
  crmRole: 'employee',
  permissions: '',
  image: null,
};

const avatarClasses = ['bg-blue-600', 'bg-violet-600', 'bg-rose-600', 'bg-teal-600', 'bg-amber-500', 'bg-emerald-600'];

const filterOptions = [
  { id: 'all', label: 'All Employees' },
  { id: 'managers', label: 'Managers' },
  { id: 'recent', label: 'Recent Login' },
  { id: 'missing-contact', label: 'Missing Contact' },
];

const crmRoleOptions = [
  ['employee', 'Employee'],
  ['sales_manager', 'Sales Manager'],
  ['marketing_manager', 'Marketing Manager'],
  ['accounts_manager', 'Accounts Manager'],
  ['project_manager', 'Project Manager'],
  ['client_viewer', 'Client Viewer'],
];

const getInitials = (name = '') => (
  name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'EM'
);

const getAvatarClass = (name = '') => avatarClasses[(name.charCodeAt(0) || 0) % avatarClasses.length];

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
});

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-xs font-bold text-slate-600';
const iconButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 hover:text-blue-700';
const iconClass = 'h-4 w-4 fill-none stroke-current';

const formatDate = (value) => {
  if (!value) return 'Never';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const isRecentLogin = (employee) => {
  if (!employee.lastLoginAt) return false;
  const diffMs = Date.now() - new Date(employee.lastLoginAt).getTime();
  return diffMs <= 7 * 24 * 60 * 60 * 1000;
};

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [pageMessage, setPageMessage] = useState('');
  const [pageError, setPageError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [structure, setStructure] = useState({ modules: [], teams: [] });
  const [structureModal, setStructureModal] = useState(null);
  const [structureForm, setStructureForm] = useState({ name: '', moduleName: 'Sales' });
  const [isStructureSaving, setIsStructureSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setPageError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/employees`, {
        headers: getAuthHeaders(),
      });
      setEmployees(response.data);
    } catch (requestError) {
      setPageError(requestError.response?.data?.message || 'Unable to load employees');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStructure = useCallback(async () => {
    try {
      const response = await getWorkStructure();
      setStructure({
        modules: response.modules || [],
        teams: response.teams || [],
      });
    } catch (requestError) {
      setPageError(requestError.response?.data?.message || 'Unable to load office modules');
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchStructure();
  }, [fetchEmployees, fetchStructure]);

  const moduleOptions = useMemo(() => (
    structure.modules.length ? structure.modules.map((item) => item.name) : ['Sales']
  ), [structure.modules]);

  const teamOptions = useMemo(() => (
    structure.teams.filter((team) => team.moduleName === formData.officeModule)
  ), [formData.officeModule, structure.teams]);

  const stats = useMemo(() => ({
    total: employees.length,
    managers: employees.filter((employee) => String(employee.position || '').toLowerCase().includes('manager')).length,
    withPhone: employees.filter((employee) => employee.phone).length,
    recentLogin: employees.filter(isRecentLogin).length,
    modules: structure.modules.length || new Set(employees.map((employee) => employee.officeModule || employee.department).filter(Boolean)).size,
    teams: structure.teams.length || new Set(employees.map((employee) => employee.team).filter(Boolean)).size,
  }), [employees, structure.modules.length, structure.teams.length]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch = !normalizedSearch || [
        employee.name,
        employee.email,
        employee.phone,
        employee.address,
        employee.position,
        employee.department,
        employee.officeModule,
        employee.team,
        employee.crmRole,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      const matchesFilter = activeFilter === 'all'
        || (activeFilter === 'managers' && String(employee.position || '').toLowerCase().includes('manager'))
        || (activeFilter === 'recent' && isRecentLogin(employee))
        || (activeFilter === 'missing-contact' && (!employee.phone || !employee.address));

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, employees, searchTerm]);

  const openModal = (employee = null) => {
    setSuccess('');
    setError('');
    if (employee) {
      setIsEditing(true);
      setEditingEmployeeId(employee._id);
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        password: '',
        phone: employee.phone || '',
        address: employee.address || '',
        position: employee.position || '',
        department: employee.officeModule || employee.department || moduleOptions[0] || 'Sales',
        officeModule: employee.officeModule || employee.department || moduleOptions[0] || 'Sales',
        team: employee.team || '',
        crmRole: employee.crmRole || 'employee',
        permissions: (employee.permissions || []).join(','),
        image: null,
      });
      setImagePreview(getAssetUrl(employee.imageUrl));
    } else {
      setIsEditing(false);
      setEditingEmployeeId(null);
      const defaultModule = moduleOptions[0] || emptyForm.officeModule;
      const defaultTeam = structure.teams.find((team) => team.moduleName === defaultModule)?.name || '';
      setFormData({ ...emptyForm, department: defaultModule, officeModule: defaultModule, team: defaultTeam });
      setImagePreview(null);
    }
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setImagePreview(null);
    setSuccess('');
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'officeModule') {
      const firstTeam = structure.teams.find((team) => team.moduleName === value)?.name || '';
      setFormData((previous) => ({
        ...previous,
        officeModule: value,
        department: value,
        team: firstTeam,
      }));
    } else {
      setFormData((previous) => ({ ...previous, [name]: value }));
    }
    setSuccess('');
    setError('');
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0] || null;
    setFormData((previous) => ({ ...previous, image: file }));
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setSuccess('');
    setError('');

    const data = new FormData();
    Object.entries({ ...formData, department: formData.officeModule }).forEach(([key, value]) => {
      if (value === null || value === '') return;
      data.append(key, value);
    });

    try {
      const config = { headers: getAuthHeaders() };
      const response = isEditing
        ? await axios.put(`${API_BASE_URL}/api/employees/${editingEmployeeId}`, data, config)
        : await axios.post(`${API_BASE_URL}/api/employees/register`, data, config);

      setSuccess(response.data.message);
      setPageMessage(response.data.message);
      await fetchEmployees();
      window.setTimeout(closeModal, 450);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const openStructureModal = (type) => {
    const defaultModule = moduleOptions[0] || 'Sales';
    setStructureForm({ name: '', moduleName: defaultModule });
    setStructureModal(type);
    setPageMessage('');
    setPageError('');
  };

  const closeStructureModal = () => {
    setStructureModal(null);
    setStructureForm({ name: '', moduleName: moduleOptions[0] || 'Sales' });
  };

  const submitStructure = async (event) => {
    event.preventDefault();
    setIsStructureSaving(true);
    setPageMessage('');
    setPageError('');

    try {
      const response = structureModal === 'module'
        ? await createWorkModule(structureForm.name)
        : await createWorkTeam({ name: structureForm.name, moduleName: structureForm.moduleName });

      setStructure({ modules: response.modules || [], teams: response.teams || [] });
      setPageMessage(response.message);
      closeStructureModal();
    } catch (requestError) {
      setPageError(requestError.response?.data?.message || 'Unable to save office structure');
    } finally {
      setIsStructureSaving(false);
    }
  };

  const removeStructureItem = async (type, item) => {
    const copy = type === 'module'
      ? `Remove ${item.name}? Its teams will also be removed from the master list.`
      : `Remove ${item.name}?`;
    if (!window.confirm(copy)) return;

    setPageMessage('');
    setPageError('');
    try {
      const response = type === 'module'
        ? await deleteWorkModule(item._id)
        : await deleteWorkTeam(item._id);
      setStructure({ modules: response.modules || [], teams: response.teams || [] });
      setPageMessage(response.message);
    } catch (requestError) {
      setPageError(requestError.response?.data?.message || 'Unable to remove office structure item');
    }
  };

  const handleDelete = async (employee) => {
    setPageMessage('');
    setPageError('');

    if (!window.confirm(`Delete ${employee.name}? This employee profile will be removed.`)) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/employees/${employee._id}`, {
        headers: getAuthHeaders(),
      });
      setEmployees((previous) => previous.filter((currentEmployee) => currentEmployee._id !== employee._id));
      setPageMessage(response.data.message);
    } catch (requestError) {
      setPageError(requestError.response?.data?.message || 'Failed to delete employee');
    }
  };

  const downloadCsv = () => {
    const headings = ['Name', 'Module', 'Team', 'Designation', 'Email', 'Phone', 'Address', 'Last Login', 'Created'];
    const rows = filteredEmployees.map((employee) => [
      employee.name,
      employee.officeModule || employee.department,
      employee.team,
      employee.position,
      employee.email,
      employee.phone,
      employee.address,
      formatDate(employee.lastLoginAt),
      formatDate(employee.createdAt),
    ]);
    const csv = [headings, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employees.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
              <circle cx="9.5" cy="7" r="4" />
              <path d="M20 8v6" />
              <path d="M23 11h-6" />
            </svg>
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-500">Team management</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-950">Employees</h1>
              <select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
                className="rounded-full border border-transparent bg-transparent py-1 pl-2 pr-7 text-sm font-bold text-blue-700 outline-none hover:border-slate-300"
              >
                {filterOptions.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
              </select>
            </div>
            <p className="mt-4 text-xs font-medium text-slate-500">
              {filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'} - Sorted by latest created - Updated a few seconds ago
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          <svg viewBox="0 0 24 24" className={iconClass} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Add Employee
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total Employees', stats.total],
          ['Managers', stats.managers],
          ['Recent Login', stats.recentLogin],
          ['Modules', stats.modules],
          ['Teams', stats.teams],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      {(pageMessage || pageError) && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${pageError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {pageError || pageMessage}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-md border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-300 px-4 py-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">Office Modules</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Create or remove CRM work modules.</p>
            </div>
            <button type="button" onClick={() => openStructureModal('module')} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700">
              Add Module
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {structure.modules.map((moduleItem) => (
              <div key={moduleItem._id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{moduleItem.name}</p>
                  <p className="text-xs font-medium text-slate-500">
                    {structure.teams.filter((team) => team.moduleName === moduleItem.name).length} teams
                  </p>
                </div>
                <button type="button" onClick={() => removeStructureItem('module', moduleItem)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100" title="Remove module">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6 18 20H6L5 6" />
                  </svg>
                </button>
              </div>
            ))}
            {structure.modules.length === 0 && (
              <p className="px-4 py-8 text-center text-sm font-semibold text-slate-500">No modules found.</p>
            )}
          </div>
        </article>

        <article className="rounded-md border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-300 px-4 py-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">Teams</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Teams are grouped under modules and used for workload tracking.</p>
            </div>
            <button type="button" onClick={() => openStructureModal('team')} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700">
              Add Team
            </button>
          </div>
          <div className="grid gap-2 p-4 md:grid-cols-2">
            {structure.teams.map((team) => (
              <div key={team._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{team.name}</p>
                  <p className="truncate text-xs font-medium text-blue-700">{team.moduleName}</p>
                </div>
                <button type="button" onClick={() => removeStructureItem('team', team)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition hover:bg-red-50" title="Remove team">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6 18 20H6L5 6" />
                  </svg>
                </button>
              </div>
            ))}
            {structure.teams.length === 0 && (
              <p className="col-span-full px-4 py-8 text-center text-sm font-semibold text-slate-500">No teams found.</p>
            )}
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-300 bg-white px-4 py-3 xl:flex-row xl:items-center xl:justify-end">
          <label className="relative block w-full xl:w-80">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <svg viewBox="0 0 24 24" className={iconClass} strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search this list..."
              className="h-9 w-full rounded-lg border border-slate-400 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" title="Refresh" onClick={fetchEmployees} className={iconButtonClass}>
              <svg viewBox="0 0 24 24" className={iconClass} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                <path d="M3 21v-5h5" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
            <button type="button" title="Export employees" onClick={downloadCsv} className={iconButtonClass}>
              <svg viewBox="0 0 24 24" className={iconClass} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M4 21h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[86rem] w-full table-fixed border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="w-64 border-b border-r border-slate-300 px-4 py-2 font-bold">Employee Name</th>
                <th className="w-36 border-b border-r border-slate-300 px-4 py-2 font-bold">Module</th>
                <th className="w-36 border-b border-r border-slate-300 px-4 py-2 font-bold">Team</th>
                <th className="w-40 border-b border-r border-slate-300 px-4 py-2 font-bold">Designation</th>
                <th className="w-40 border-b border-r border-slate-300 px-4 py-2 font-bold">CRM Role</th>
                <th className="w-64 border-b border-r border-slate-300 px-4 py-2 font-bold">Email</th>
                <th className="w-36 border-b border-r border-slate-300 px-4 py-2 font-bold">Phone</th>
                <th className="w-48 border-b border-r border-slate-300 px-4 py-2 font-bold">Address</th>
                <th className="w-40 border-b border-r border-slate-300 px-4 py-2 font-bold">Last Login</th>
                <th className="w-28 border-b border-slate-300 px-4 py-2 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee._id} className="bg-white transition hover:bg-blue-50/40">
                  <td className="border-b border-r border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      {employee.imageUrl ? (
                        <img src={getAssetUrl(employee.imageUrl)} alt={employee.name} className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
                      ) : (
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarClass(employee.name)}`}>
                          {getInitials(employee.name)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-blue-700">{employee.name}</span>
                        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{employee.position || 'Team member'}</span>
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-r border-slate-200 px-4 py-3">
                    <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                      {employee.officeModule || employee.department || 'Sales'}
                    </span>
                  </td>
                  <td className="border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-700">{employee.team || '-'}</td>
                  <td className="border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-700">{employee.position || 'Team member'}</td>
                  <td className="border-b border-r border-slate-200 px-4 py-3">
                    <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                      {crmRoleOptions.find(([value]) => value === employee.crmRole)?.[1] || employee.crmRole || 'Employee'}
                    </span>
                  </td>
                  <td className="border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-700">{employee.email || '-'}</td>
                  <td className="border-b border-r border-slate-200 px-4 py-3 text-slate-600">{employee.phone || '-'}</td>
                  <td className="border-b border-r border-slate-200 px-4 py-3 text-slate-600">{employee.address || '-'}</td>
                  <td className="border-b border-r border-slate-200 px-4 py-3 text-slate-600">{formatDate(employee.lastLoginAt)}</td>
                  <td className="border-b border-slate-200 px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openModal(employee)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => handleDelete(employee)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6 18 20H6L5 6" />
                          <path d="M10 11v5" />
                          <path d="M14 11v5" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="10" className="h-[28rem] px-4 py-20 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <span className="flex h-28 w-28 items-center justify-center rounded-full bg-indigo-100 text-indigo-500">
                        <svg viewBox="0 0 24 24" className="h-16 w-16 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                          <circle cx="9.5" cy="7" r="4" />
                          <path d="M20 8v6" />
                          <path d="M23 11h-6" />
                        </svg>
                      </span>
                      <h2 className="mt-6 text-xl font-semibold text-slate-700">Build your sales team</h2>
                      <p className="mt-3 text-sm text-slate-500">Add employees so client rows can be assigned and tracked cleanly.</p>
                      <button type="button" onClick={() => openModal()} className="mt-5 rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
                        Add Employee
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td colSpan="10" className="px-4 py-16 text-center text-sm font-semibold text-slate-500">
                    Loading employees...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel={isEditing ? 'Edit Employee' : 'Register Employee'}
        overlayClassName="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Team profile</p>
            <h2 className="text-lg font-bold text-slate-950">
              {isEditing ? 'Edit employee' : 'New employee'}
            </h2>
          </div>
          <button type="button" onClick={closeModal} className={iconButtonClass} aria-label="Close employee form">
            <svg viewBox="0 0 24 24" className={iconClass} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <label htmlFor="employee-image" className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50/50">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">+</span>
            )}
            <span>
              <span className="block text-sm font-bold text-slate-800">
                {imagePreview ? 'Change profile photo' : 'Upload profile photo'}
              </span>
              <span className="mt-1 block text-xs font-medium text-slate-500">PNG or JPG, optional</span>
            </span>
            <input id="employee-image" type="file" name="image" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Name</span>
                <input className={inputClass} type="text" name="name" placeholder="Full name" value={formData.name} onChange={handleChange} required />
              </label>
              <label>
                <span className={labelClass}>Office module</span>
                <select className={inputClass} name="officeModule" value={formData.officeModule} onChange={handleChange}>
                  {moduleOptions.map((moduleName) => <option key={moduleName}>{moduleName}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Team</span>
                <select className={inputClass} name="team" value={formData.team} onChange={handleChange}>
                  <option value="">Select team</option>
                  {teamOptions.map((team) => <option key={team._id} value={team.name}>{team.name}</option>)}
                </select>
              </label>
              <label>
                <span className={labelClass}>Designation</span>
                <input className={inputClass} type="text" name="position" placeholder="e.g. Sales Manager" value={formData.position} onChange={handleChange} required />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>CRM Role</span>
                <select className={inputClass} name="crmRole" value={formData.crmRole} onChange={handleChange}>
                  {crmRoleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                <span className={labelClass}>Email</span>
                <input className={inputClass} type="email" name="email" placeholder="name@company.com" value={formData.email} onChange={handleChange} required />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Password</span>
                <PasswordInput className={inputClass} name="password" placeholder={isEditing ? 'Leave blank to keep current password' : 'Minimum 8 characters'} value={formData.password} onChange={handleChange} required={!isEditing} minLength={8} />
              </label>
              <label>
                <span className={labelClass}>Phone</span>
                <input className={inputClass} type="text" name="phone" placeholder="+91 ..." value={formData.phone} onChange={handleChange} required />
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Address</span>
              <input className={inputClass} type="text" name="address" placeholder="City, State" value={formData.address} onChange={handleChange} required />
            </label>
            <label className="block">
              <span className={labelClass}>Custom module permissions</span>
              <input className={inputClass} type="text" name="permissions" placeholder="Optional: sales,marketing,documents" value={formData.permissions} onChange={handleChange} />
            </label>

            {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{success}</p>}
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300">
                {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Add employee'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(structureModal)}
        onRequestClose={closeStructureModal}
        contentLabel={structureModal === 'module' ? 'Add Module' : 'Add Team'}
        overlayClassName="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Office structure</p>
            <h2 className="text-lg font-bold text-slate-950">
              {structureModal === 'module' ? 'Add module' : 'Add team'}
            </h2>
          </div>
          <button type="button" onClick={closeStructureModal} className={iconButtonClass} aria-label="Close office structure form">
            <svg viewBox="0 0 24 24" className={iconClass} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submitStructure} className="space-y-4 p-5">
          {structureModal === 'team' && (
            <label className="block">
              <span className={labelClass}>Module</span>
              <select
                className={inputClass}
                value={structureForm.moduleName}
                onChange={(event) => setStructureForm((previous) => ({ ...previous, moduleName: event.target.value }))}
              >
                {moduleOptions.map((moduleName) => <option key={moduleName}>{moduleName}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className={labelClass}>{structureModal === 'module' ? 'Module name' : 'Team name'}</span>
            <input
              className={inputClass}
              value={structureForm.name}
              onChange={(event) => setStructureForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder={structureModal === 'module' ? 'e.g. Customer Success' : 'e.g. Onboarding Team'}
              required
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={closeStructureModal} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={isStructureSaving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300">
              {isStructureSaving ? 'Saving...' : structureModal === 'module' ? 'Add Module' : 'Add Team'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Employees;
