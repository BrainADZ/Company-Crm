import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { getBusinessPermissions, updateBusinessPermissions } from '../services/businessApi';

const PermissionsHub = () => {
  const [modules, setModules] = useState([]);
  const [roles, setRoles] = useState([]);
  const [draftRoles, setDraftRoles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingRole, setSavingRole] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPermissions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getBusinessPermissions();
      setModules(response.modules || []);
      setRoles(response.roles || []);
      setDraftRoles((response.roles || []).reduce((accumulator, role) => ({
        ...accumulator,
        [role.roleKey]: role.modules || [],
      }), {}));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load permissions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const changedRoles = useMemo(() => roles.filter((role) => {
    const original = [...(role.modules || [])].sort().join(',');
    const draft = [...(draftRoles[role.roleKey] || [])].sort().join(',');
    return original !== draft;
  }), [draftRoles, roles]);

  const toggleModule = (roleKey, moduleKey) => {
    setMessage('');
    setError('');
    setDraftRoles((previous) => {
      const current = previous[roleKey] || [];
      const next = current.includes(moduleKey)
        ? current.filter((item) => item !== moduleKey)
        : [...current, moduleKey];

      return { ...previous, [roleKey]: next };
    });
  };

  const saveRole = async (role) => {
    setSavingRole(role.roleKey);
    setMessage('');
    setError('');
    try {
      const response = await updateBusinessPermissions(role.roleKey, draftRoles[role.roleKey] || []);
      setRoles((previous) => previous.map((item) => item.roleKey === role.roleKey ? response.role : item));
      setMessage(response.message || 'Permissions updated');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update permissions');
    } finally {
      setSavingRole('');
    }
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <ShieldCheck size={20} strokeWidth={1.9} />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-500">Role based access</p>
            <h1 className="text-2xl font-bold text-slate-950">Permissions</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Control which CRM modules each role can access. Admin remains locked with full access.
            </p>
          </div>
        </div>
        <button type="button" onClick={loadPermissions} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
          <RefreshCw size={16} strokeWidth={1.9} />
          Refresh
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Roles</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{roles.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Modules</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{modules.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Changed Roles</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{changedRoles.length}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Locked</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{roles.filter((role) => role.locked).length}</p>
        </div>
      </section>

      {(message || error) && (
        <p className={`rounded-lg border px-4 py-3 text-sm font-bold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </p>
      )}

      <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 px-4 py-3">
          <h2 className="text-base font-bold text-slate-950">Permission Matrix</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">Toggle modules per role and save that role.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[76rem] w-full table-fixed border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="w-56 border-b border-r border-slate-300 px-4 py-2 font-bold">Module</th>
                {roles.map((role) => (
                  <th key={role.roleKey} className="w-44 border-b border-r border-slate-300 px-4 py-2 font-bold last:border-r-0">
                    <div className="flex items-center justify-between gap-2">
                      <span>{role.roleLabel}</span>
                      {!role.locked && (
                        <button
                          type="button"
                          onClick={() => saveRole(role)}
                          disabled={savingRole === role.roleKey || !changedRoles.some((item) => item.roleKey === role.roleKey)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
                          title="Save role permissions"
                        >
                          <Save size={14} strokeWidth={1.9} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.key} className="bg-white transition hover:bg-blue-50/40">
                  <td className="border-b border-r border-slate-200 px-4 py-3 font-bold text-slate-900">{module.label}</td>
                  {roles.map((role) => {
                    const allowed = (draftRoles[role.roleKey] || []).includes(module.key);
                    return (
                      <td key={`${role.roleKey}-${module.key}`} className="border-b border-r border-slate-200 px-4 py-3 text-center last:border-r-0">
                        <button
                          type="button"
                          disabled={role.locked}
                          onClick={() => toggleModule(role.roleKey, module.key)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                            allowed
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-300'
                          } ${role.locked ? 'cursor-not-allowed opacity-80' : 'hover:border-blue-300 hover:text-blue-700'}`}
                        >
                          {allowed && <Check size={16} strokeWidth={2.2} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {isLoading && (
                <tr>
                  <td colSpan={roles.length + 1} className="px-4 py-16 text-center text-sm font-semibold text-slate-500">
                    Loading permissions...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PermissionsHub;
