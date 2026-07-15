import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, ChevronRight, LockKeyhole, RefreshCw, RotateCcw, Save, Search, ShieldCheck,
} from 'lucide-react';
import { getPermissionMeta, getRoles, resetRole, updateRole } from '../services/accessApi';

const EDIT_ACTIONS = ['view', 'create', 'update', 'delete', 'assign', 'approve', 'export', 'manage'];
const SCOPE_OPTIONS = ['all', 'community', 'department', 'team', 'assigned', 'self', 'linked', 'none'];
const label = (value = '') => value.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const accessStatus = (role, resourceCount) => {
  const permissions = (role.permissions || []).filter((item) => item.actions?.length && item.scope !== 'none');
  if (!permissions.length) return { text: 'No Access', tone: 'bg-slate-100 text-slate-600' };
  const onlyView = permissions.every((item) => item.actions.every((action) => action === 'view'));
  if (onlyView) return { text: 'Read Only', tone: 'bg-blue-50 text-blue-700' };
  const full = permissions.length >= resourceCount && permissions.every((item) => item.scope === 'all' && EDIT_ACTIONS.every((action) => item.actions.includes(action)));
  return full
    ? { text: 'Full Access', tone: 'bg-emerald-50 text-emerald-700' }
    : { text: 'Partial Access', tone: 'bg-amber-50 text-amber-700' };
};

const PermissionsHub = () => {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState('super_admin');
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [roleData, meta] = await Promise.all([getRoles(), getPermissionMeta()]);
      setRoles(roleData || []);
      setModules(meta.modules || []);
      setResources(meta.resources || []);
      const selected = (roleData || []).find((role) => role.roleKey === selectedRoleKey) || roleData?.[0];
      if (selected) {
        setSelectedRoleKey(selected.roleKey);
        setDraftPermissions(selected.permissions || []);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load roles and permissions');
    } finally { setLoading(false); }
  }, [selectedRoleKey]);

  useEffect(() => { load(); }, [load]);

  const selectedRole = roles.find((role) => role.roleKey === selectedRoleKey);
  const originalPermissions = selectedRole?.permissions || [];
  const dirty = JSON.stringify(draftPermissions) !== JSON.stringify(originalPermissions);

  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const selectRole = (role) => {
    if (dirty && !window.confirm('Discard unsaved permission changes?')) return;
    setSelectedRoleKey(role.roleKey);
    setDraftPermissions(role.permissions || []);
    setMessage('');
    setError('');
  };

  const getDraft = (resource) => draftPermissions.find((item) => item.resource === resource) || { resource, actions: [], scope: 'none' };
  const replaceDraft = (nextPermission) => setDraftPermissions((current) => [
    ...current.filter((item) => item.resource !== nextPermission.resource),
    nextPermission,
  ]);

  const toggleAction = (resource, action) => {
    if (selectedRole?.locked) return;
    const current = getDraft(resource);
    const actions = current.actions.includes(action) ? current.actions.filter((item) => item !== action) : [...current.actions, action];
    replaceDraft({ ...current, actions, scope: actions.length ? (current.scope === 'none' ? selectedRole.defaultScope || 'community' : current.scope) : 'none' });
  };

  const changeScope = (resource, scope) => {
    if (selectedRole?.locked) return;
    const current = getDraft(resource);
    replaceDraft({ ...current, scope, actions: scope === 'none' ? [] : (current.actions.length ? current.actions : ['view']) });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const permissions = draftPermissions.filter((item) => item.actions.length && item.scope !== 'none');
      const response = await updateRole(selectedRole.roleKey, {
        roleLabel: selectedRole.roleLabel,
        description: selectedRole.description,
        allowedUserTypes: selectedRole.allowedUserTypes,
        defaultScope: selectedRole.defaultScope,
        active: selectedRole.active,
        permissions,
      });
      setRoles((current) => current.map((role) => role.roleKey === selectedRole.roleKey ? { ...response.role, userCount: role.userCount } : role));
      setDraftPermissions(response.role.permissions || []);
      setMessage('Role permissions saved successfully. Active users will receive updated access on next login.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save permissions');
    } finally { setSaving(false); }
  };

  const reset = async () => {
    if (!window.confirm(`Reset ${selectedRole.roleLabel} to its secure default permissions?`)) return;
    setSaving(true);
    try {
      const response = await resetRole(selectedRole.roleKey);
      setRoles((current) => current.map((role) => role.roleKey === selectedRole.roleKey ? { ...response.role, userCount: role.userCount } : role));
      setDraftPermissions(response.role.permissions || []);
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reset role');
    } finally { setSaving(false); }
  };

  const visibleModules = useMemo(() => modules.map((module) => ({
    ...module,
    resources: (module.resources || []).filter((resource) => !search || label(resource).toLowerCase().includes(search.toLowerCase()) || module.label.toLowerCase().includes(search.toLowerCase())),
  })).filter((module) => module.resources.length), [modules, search]);

  if (loading) return <div className="rounded-lg border border-slate-200 bg-white p-16 text-center text-sm font-semibold text-slate-500">Loading access control...</div>;

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white"><ShieldCheck size={20} /></span>
          <div><p className="text-xs font-bold text-slate-500">Access control</p><h1 className="text-2xl font-bold text-slate-950">Roles & Permissions</h1><p className="mt-1 text-sm text-slate-500">Roles control CRM access. Teams and designations do not grant permissions.</p></div>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"><RefreshCw size={16} /> Refresh</button>
      </section>

      {(message || error) && <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || message}</p>}

      <section className="grid min-h-[42rem] overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm xl:grid-cols-[19rem_1fr]">
        <aside className="border-b border-slate-200 xl:border-b-0 xl:border-r">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-bold text-slate-950">Permission Roles</h2><p className="mt-1 text-xs text-slate-500">{roles.length} reusable roles · select one to review</p></div>
          <div className="max-h-[42rem] overflow-y-auto p-2">
            {roles.map((role) => {
              const status = accessStatus(role, resources.length);
              return <button key={role.roleKey} type="button" onClick={() => selectRole(role)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${selectedRoleKey === role.roleKey ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${role.locked ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{role.locked ? <LockKeyhole size={15} /> : <ShieldCheck size={15} />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{role.roleLabel}</span><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${status.tone}`}>{status.text}</span></span>
                <ChevronRight size={15} className="text-slate-400" />
              </button>;
            })}
          </div>
        </aside>

        {selectedRole && <div className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-slate-950">{selectedRole.roleLabel}</h2>{selectedRole.locked && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700"><LockKeyhole size={12} /> Locked</span>}</div><p className="mt-1 text-sm text-slate-500">{selectedRole.description || 'No description'} · {selectedRole.userCount || 0} employee(s)</p></div>
            <div className="flex gap-2">{!selectedRole.locked && <button type="button" onClick={reset} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"><RotateCcw size={15} /> Reset Default</button>}<button type="button" onClick={save} disabled={saving || !dirty || selectedRole.locked} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}</button></div>
          </div>
          <div className="border-b border-slate-200 p-3"><label className="relative block max-w-sm"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search CRM resource..." className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></label></div>
          <div className="max-h-[34rem] overflow-auto">
            {visibleModules.map((module) => <div key={module.key} className="border-b border-slate-200 last:border-b-0">
              <div className="sticky top-0 z-10 bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">{module.label}</div>
              <table className="min-w-[68rem] w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="w-44 px-4 py-2">Resource</th>{EDIT_ACTIONS.map((action) => <th key={action} className="w-20 px-2 py-2 text-center">{label(action)}</th>)}<th className="w-36 px-3 py-2">Scope</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{module.resources.map((resource) => { const permission = getDraft(resource); return <tr key={resource}><td className="px-4 py-3 font-bold text-slate-800">{label(resource)}</td>{EDIT_ACTIONS.map((action) => { const active = permission.actions.includes(action); return <td key={action} className="px-2 py-3 text-center"><button type="button" disabled={selectedRole.locked} onClick={() => toggleAction(resource, action)} className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-transparent'} disabled:cursor-not-allowed`}><Check size={14} /></button></td>; })}<td className="px-3 py-2"><select disabled={selectedRole.locked} value={permission.scope} onChange={(event) => changeScope(resource, event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-semibold capitalize text-slate-700 disabled:bg-slate-50">{SCOPE_OPTIONS.map((scope) => <option key={scope} value={scope}>{label(scope)}</option>)}</select></td></tr>; })}</tbody>
              </table>
            </div>)}
          </div>
        </div>}
      </section>
    </div>
  );
};

export default PermissionsHub;
