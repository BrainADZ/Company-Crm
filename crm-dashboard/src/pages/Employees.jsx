import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import {
  BriefcaseBusiness, ChevronRight, Edit3, Plus, Search, ShieldCheck,
  Trash2, UserPlus, Users, X,
} from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { API_BASE_URL, getAssetUrl } from '../config/api';
import {
  createWorkDesignation, createWorkTeam, deleteWorkDesignation, deleteWorkTeam, getBusinessPermissions, getWorkStructure,
} from '../services/businessApi';

Modal.setAppElement('#root');

const COMMUNITIES = [
  { key: 'live', label: 'Live', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'marketing', label: 'Marketing', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'exhibition', label: 'Exhibition', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const blankForm = {
  name: '', email: '', password: '', phone: '', address: '', team: '', position: '',
  crmRole: 'employee', communities: [], image: null,
};

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken')}` });
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-xs font-bold text-slate-600';
const initials = (name = '') => name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'EM';
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : 'Never';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [activeView, setActiveView] = useState('employees');
  const [structure, setStructure] = useState({ teams: [], designations: [] });
  const [roles, setRoles] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [communityFilter, setCommunityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [message, setMessage] = useState('');

  const [employeeModal, setEmployeeModal] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const [structureModal, setStructureModal] = useState('');
  const [structureName, setStructureName] = useState('');
  const [structureSaving, setStructureSaving] = useState(false);
  const selectAllRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const [employeeResponse, structureResponse, permissionResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/employees`, { headers: headers() }),
        getWorkStructure(),
        getBusinessPermissions(),
      ]);
      setEmployees(employeeResponse.data || []);
      const nextStructure = {
        teams: structureResponse.teams || [],
        designations: structureResponse.designations || [],
      };
      setStructure(nextStructure);
      setRoles((permissionResponse.roles || []).filter((role) => role.roleKey !== 'super_admin' && role.active !== false));
      setSelectedTeam((current) => current || nextStructure.teams[0]?.name || '');
    } catch (error) {
      setPageError(error.response?.data?.message || 'Unable to load team management');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = form.communities.length > 0 && form.communities.length < COMMUNITIES.length;
  }, [form.communities]);

  const selectedDesignations = useMemo(() => structure.designations.filter((item) => item.teamName === selectedTeam), [selectedTeam, structure.designations]);
  const formDesignations = useMemo(() => structure.designations.filter((item) => item.teamName === form.team), [form.team, structure.designations]);
  const getRoleLabel = useCallback((key) => roles.find((role) => role.roleKey === key)?.roleLabel || key || 'Employee', [roles]);
  const filtered = useMemo(() => employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [employee.name, employee.email, employee.phone, employee.team, employee.position, getRoleLabel(employee.roleKey || employee.crmRole)].some((value) => String(value || '').toLowerCase().includes(query));
    return matchesSearch
      && (teamFilter === 'all' || employee.team === teamFilter)
      && (roleFilter === 'all' || (employee.roleKey || employee.crmRole) === roleFilter)
      && (communityFilter === 'all' || employee.communities?.includes(communityFilter));
  }), [communityFilter, employees, getRoleLabel, roleFilter, search, teamFilter]);

  const openEmployee = (employee = null) => {
    setFormError('');
    if (employee) {
      setEditingId(employee._id);
      setForm({
        ...blankForm,
        name: employee.name || '', email: employee.email || '', phone: String(employee.phone || '').replace(/^\+91/, ''),
        address: employee.address || '', team: employee.team || '', position: employee.position || '',
        crmRole: employee.roleKey || employee.crmRole || 'employee', communities: employee.communities || [],
      });
      setImagePreview(getAssetUrl(employee.imageUrl));
    } else {
      const team = structure.teams[0]?.name || '';
      const position = structure.designations.find((item) => item.teamName === team)?.name || '';
      setEditingId('');
      setForm({ ...blankForm, team, position });
      setImagePreview('');
    }
    setEmployeeModal(true);
  };

  const changeTeam = (team) => {
    const position = structure.designations.find((item) => item.teamName === team)?.name || '';
    setForm((current) => ({ ...current, team, position }));
  };

  const toggleCommunity = (key) => setForm((current) => ({
    ...current,
    communities: current.communities.includes(key) ? current.communities.filter((item) => item !== key) : [...current.communities, key],
  }));

  const submitEmployee = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.communities.length) { setFormError('Select at least one community.'); return; }
    if (!/^\d{10}$/.test(form.phone)) { setFormError('Enter exactly 10 phone digits after +91.'); return; }
    setSaving(true);
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'image' && !value) return;
      if (key === 'password' && editingId && !value) return;
      data.append(key, Array.isArray(value) ? value.join(',') : value);
    });
    data.set('phone', `+91${form.phone}`);
    try {
      const response = editingId
        ? await axios.put(`${API_BASE_URL}/api/employees/${editingId}`, data, { headers: headers() })
        : await axios.post(`${API_BASE_URL}/api/employees/register`, data, { headers: headers() });
      setMessage(response.data.message);
      setEmployeeModal(false);
      await load();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Unable to save employee');
    } finally { setSaving(false); }
  };

  const submitStructure = async (event) => {
    event.preventDefault();
    setStructureSaving(true);
    setPageError('');
    try {
      const response = structureModal === 'team'
        ? await createWorkTeam({ name: structureName })
        : await createWorkDesignation({ name: structureName, teamName: selectedTeam });
      setStructure({ teams: response.teams || [], designations: response.designations || [] });
      if (structureModal === 'team') setSelectedTeam(structureName.trim());
      setMessage(response.message);
      setStructureModal('');
      setStructureName('');
    } catch (error) {
      setPageError(error.response?.data?.message || 'Unable to update team structure');
    } finally { setStructureSaving(false); }
  };

  const removeTeam = async (team) => {
    if (!window.confirm(`Remove ${team.name} and its designations?`)) return;
    try {
      const response = await deleteWorkTeam(team._id);
      setStructure({ teams: response.teams || [], designations: response.designations || [] });
      setSelectedTeam(response.teams?.[0]?.name || '');
      setMessage(response.message);
    } catch (error) { setPageError(error.response?.data?.message || 'Unable to remove team'); }
  };

  const removeDesignation = async (designation) => {
    if (!window.confirm(`Remove ${designation.name} from ${designation.teamName}?`)) return;
    try {
      const response = await deleteWorkDesignation(designation._id);
      setStructure({ teams: response.teams || [], designations: response.designations || [] });
      setMessage(response.message);
    } catch (error) { setPageError(error.response?.data?.message || 'Unable to remove designation'); }
  };

  const deactivate = async (employee) => {
    if (!window.confirm(`Deactivate ${employee.name}? Their business records will remain safe.`)) return;
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/employees/${employee._id}`, { headers: headers() });
      setMessage(response.data.message);
      await load();
    } catch (error) { setPageError(error.response?.data?.message || 'Unable to deactivate employee'); }
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white"><Users size={20} /></span>
          <div>
            <p className="text-xs font-bold text-slate-500">People & access</p>
            <h1 className="text-2xl font-bold text-slate-950">Employees</h1>
            <p className="mt-1 text-sm text-slate-500">Manage employees, teams, designations and permission roles in one place.</p>
          </div>
        </div>
        <button type="button" onClick={() => openEmployee()} className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
          <UserPlus size={17} /> Add Employee
        </button>
      </section>

      {(message || pageError) && (
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-semibold ${pageError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          <span>{pageError || message}</span><button type="button" onClick={() => { setMessage(''); setPageError(''); }}><X size={16} /></button>
        </div>
      )}

      <section className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <button type="button" onClick={() => setActiveView('employees')} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold ${activeView === 'employees' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Users size={16} /> Employees <span className={`rounded-full px-2 py-0.5 text-xs ${activeView === 'employees' ? 'bg-white/20' : 'bg-slate-100'}`}>{employees.length}</span>
        </button>
        <button type="button" onClick={() => setActiveView('structure')} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold ${activeView === 'structure' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          <BriefcaseBusiness size={16} /> Teams & Designations <span className={`rounded-full px-2 py-0.5 text-xs ${activeView === 'structure' ? 'bg-white/20' : 'bg-slate-100'}`}>{structure.teams.length}</span>
        </button>
        <span className="ml-auto hidden items-center gap-2 px-3 text-xs font-semibold text-slate-500 sm:flex"><ShieldCheck size={14} /> {roles.length + 1} permission roles</span>
      </section>

      {activeView === 'structure' && <section className="grid overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm lg:grid-cols-[18rem_1fr]">
        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div><h2 className="font-bold text-slate-950">Teams</h2><p className="text-xs text-slate-500">Company work groups</p></div>
            <button type="button" onClick={() => { setStructureModal('team'); setStructureName(''); }} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Plus size={14} /> Add Team</button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {structure.teams.map((team) => (
              <div key={team._id} className={`group flex items-center rounded-lg ${selectedTeam === team.name ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                <button type="button" onClick={() => setSelectedTeam(team.name)} className="flex min-w-0 flex-1 items-center justify-between px-3 py-2.5 text-left text-sm font-bold">
                  <span className="truncate">{team.name}</span><ChevronRight size={15} />
                </button>
                <button type="button" onClick={() => removeTeam(team)} className="mr-2 hidden h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-50 group-hover:flex" title="Remove team"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div><h2 className="font-bold text-slate-950">{selectedTeam || 'Select a team'} Designations</h2><p className="text-xs text-slate-500">Positions available inside this team</p></div>
            <button type="button" disabled={!selectedTeam} onClick={() => { setStructureModal('designation'); setStructureName(''); }} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-40"><Plus size={14} /> Add Designation</button>
          </div>
          <div className="flex min-h-36 flex-wrap content-start gap-2 p-4">
            {selectedDesignations.map((designation) => (
              <span key={designation._id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                {designation.name}
                <button type="button" onClick={() => removeDesignation(designation)} className="text-slate-400 hover:text-red-600"><X size={14} /></button>
              </span>
            ))}
            {selectedTeam && !selectedDesignations.length && <p className="text-sm text-slate-500">No designations added yet.</p>}
          </div>
        </div>
      </section>}

      {activeView === 'employees' && <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center">
          <label className="relative flex-1 lg:max-w-sm"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className={`${inputClass} py-2 pl-9`} /></label>
          <select value={communityFilter} onChange={(e) => setCommunityFilter(e.target.value)} className={`${inputClass} py-2 lg:w-44`}><option value="all">All Communities</option>{COMMUNITIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={`${inputClass} py-2 lg:w-44`}><option value="all">All Teams</option>{structure.teams.map((team) => <option key={team._id} value={team.name}>{team.name}</option>)}</select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`${inputClass} py-2 lg:w-52`}><option value="all">All CRM Roles</option>{roles.map((role) => <option key={role.roleKey} value={role.roleKey}>{role.roleLabel}</option>)}</select>
          <span className="text-xs font-bold text-slate-500">{filtered.length} results</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[74rem] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
              <th className="px-4 py-3">Employee</th><th className="px-4 py-3">Communities</th><th className="px-4 py-3">Team</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3">CRM Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last Login</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((employee) => (
                <tr key={employee._id} className="hover:bg-blue-50/30">
                  <td className="px-4 py-3"><div className="flex items-center gap-3">{employee.imageUrl ? <img src={getAssetUrl(employee.imageUrl)} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{initials(employee.name)}</span>}<div><p className="font-bold text-slate-900">{employee.name}</p><p className="text-xs text-slate-500">{employee.email}</p></div></div></td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{employee.communities?.map((key) => { const community = COMMUNITIES.find((item) => item.key === key); return <span key={key} className={`rounded-full border px-2 py-1 text-[11px] font-bold ${community?.tone || 'border-slate-200 bg-slate-50'}`}>{community?.label || key}</span>; })}</div></td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{employee.team || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{employee.position || '—'}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{getRoleLabel(employee.roleKey || employee.crmRole)}</span></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold capitalize text-emerald-700">{employee.accountStatus || 'active'}</span></td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-500">{formatDate(employee.lastLoginAt)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEmployee(employee)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700" title="Edit"><Edit3 size={15} /></button><button type="button" onClick={() => deactivate(employee)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50" title="Deactivate"><Trash2 size={15} /></button></div></td>
                </tr>
              ))}
              {!loading && !filtered.length && <tr><td colSpan="8" className="px-4 py-14 text-center text-sm font-semibold text-slate-500">No employees match these filters.</td></tr>}
              {loading && <tr><td colSpan="8" className="px-4 py-14 text-center text-sm font-semibold text-slate-500">Loading employees...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      <Modal isOpen={employeeModal} onRequestClose={() => setEmployeeModal(false)} overlayClassName="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Employee profile</p><h2 className="text-xl font-bold text-slate-950">{editingId ? 'Edit Employee' : 'Add Employee'}</h2></div><button type="button" onClick={() => setEmployeeModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button></div>
        <form onSubmit={submitEmployee} className="space-y-5 p-5">
          <section><h3 className="mb-3 text-sm font-bold text-slate-900">Basic information</h3><div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Full Name</span><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label><span className={labelClass}>Official Email</span><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label><span className={labelClass}>Phone Number</span><div className="flex"><span className="flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-600">+91</span><input className={`${inputClass} rounded-l-none`} inputMode="numeric" maxLength="10" pattern="\d{10}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required /></div></label>
            <label><span className={labelClass}>{editingId ? 'New Password (optional)' : 'Password'}</span><PasswordInput className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required={!editingId} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Address</span><input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></label>
          </div></section>

          <section className="border-t border-slate-200 pt-5"><h3 className="mb-3 text-sm font-bold text-slate-900">Team & access</h3><div className="grid gap-4 sm:grid-cols-3">
            <label><span className={labelClass}>Team</span><select className={inputClass} value={form.team} onChange={(e) => changeTeam(e.target.value)} required><option value="">Select team</option>{structure.teams.map((team) => <option key={team._id} value={team.name}>{team.name}</option>)}</select></label>
            <label><span className={labelClass}>Designation</span><select className={inputClass} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required><option value="">Select designation</option>{formDesignations.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}</select></label>
            <label><span className={labelClass}>CRM Permission Role</span><select className={inputClass} value={form.crmRole} onChange={(e) => setForm({ ...form, crmRole: e.target.value })}>{roles.map((role) => <option key={role.roleKey} value={role.roleKey}>{role.roleLabel}</option>)}</select></label>
          </div>
          <fieldset className="mt-4"><legend className={labelClass}>Community Access</legend>
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700"><input ref={selectAllRef} type="checkbox" checked={form.communities.length === COMMUNITIES.length} onChange={(e) => setForm({ ...form, communities: e.target.checked ? COMMUNITIES.map((item) => item.key) : [] })} className="h-4 w-4 rounded" /> Select All Communities</label>
            <div className="grid gap-2 sm:grid-cols-3">{COMMUNITIES.map((community) => <label key={community.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-bold ${form.communities.includes(community.key) ? community.tone : 'border-slate-200 text-slate-600'}`}><input type="checkbox" checked={form.communities.includes(community.key)} onChange={() => toggleCommunity(community.key)} className="h-4 w-4 rounded" />{community.label}</label>)}</div>
          </fieldset></section>

          <label className="block rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-600">Profile photo (optional)<input type="file" accept="image/png,image/jpeg" className="mt-2 block text-xs" onChange={(e) => { const file = e.target.files[0] || null; setForm({ ...form, image: file }); setImagePreview(file ? URL.createObjectURL(file) : imagePreview); }} />{imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 h-12 w-12 rounded-full object-cover" />}</label>
          {formError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{formError}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={() => setEmployeeModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Employee'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(structureModal)} onRequestClose={() => setStructureModal('')} overlayClassName="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" className="w-full max-w-md rounded-2xl bg-white shadow-2xl outline-none">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-lg font-bold text-slate-950">Add {structureModal === 'team' ? 'Team' : 'Designation'}</h2><p className="mt-1 text-xs text-slate-500">{structureModal === 'team' ? 'Default designations will be created automatically.' : `This designation will be added under ${selectedTeam}.`}</p></div>
        <form onSubmit={submitStructure} className="space-y-4 p-5"><label><span className={labelClass}>{structureModal === 'team' ? 'Team name' : 'Designation name'}</span><input autoFocus className={inputClass} value={structureName} onChange={(e) => setStructureName(e.target.value)} placeholder={structureModal === 'team' ? 'e.g. Creative Team' : 'e.g. Senior Designer'} required /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setStructureModal('')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button type="submit" disabled={structureSaving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white">{structureSaving ? 'Adding...' : 'Add'}</button></div></form>
      </Modal>
    </div>
  );
};

export default Employees;
