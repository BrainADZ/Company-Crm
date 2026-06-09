import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_BASE_URL, getAssetUrl } from '../config/api';

const statusStyles = {
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Contacted: 'border-sky-200 bg-sky-50 text-sky-700',
  'Follow Up': 'border-violet-200 bg-violet-50 text-violet-700',
  Interested: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Converted: 'border-green-200 bg-green-50 text-green-700',
  'Not Interested': 'border-rose-200 bg-rose-50 text-rose-700',
  'Not Reachable': 'border-orange-200 bg-orange-50 text-orange-700',
};

const filterOptions = [
  { id: 'all', label: 'All Tasks' },
  { id: 'attention', label: 'Needs Attention' },
  { id: 'follow-up', label: 'Follow Ups' },
  { id: 'pending', label: 'Pending Calls' },
  { id: 'meeting-ready', label: 'Meeting Ready' },
];

const meetingFilters = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today', label: 'Today' },
  { id: 'all', label: 'All' },
  { id: 'past', label: 'Past' },
];

const avatarClasses = ['bg-blue-600', 'bg-violet-600', 'bg-rose-600', 'bg-teal-600', 'bg-amber-500', 'bg-emerald-600'];
const iconClass = 'h-4 w-4 fill-none stroke-current';
const iconButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 hover:text-blue-700';

const getInitials = (name = '') => (
  name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'EM'
);

const getAvatarClass = (name = '') => avatarClasses[(name.charCodeAt(0) || 0) % avatarClasses.length];

const formatDateTime = (date, time) => {
  if (!date) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(`${date}T${time || '00:00'}`));
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getStatusClass = (status = 'Pending') => (
  statusStyles[status] || 'border-slate-200 bg-slate-50 text-slate-600'
);

const getTaskPriority = (status = 'Pending') => {
  if (status === 'Follow Up') return 'High';
  if (status === 'Pending') return 'Medium';
  if (status === 'Interested') return 'Warm';
  if (status === 'Converted') return 'Won';
  return 'Normal';
};

const getNextStep = (employee) => {
  if ((employee.followUpCount || 0) > 0) return 'Follow up due';
  if ((employee.pendingCallCount || 0) > 0) return 'Call pending';
  if ((employee.upcomingMeetingCount || 0) > 0) return 'Meeting set';
  if ((employee.assignedCount || 0) === 0) return 'No assignment';
  return 'On track';
};

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const AdminTasks = () => {
  const [summary, setSummary] = useState({ employees: [], meetings: [], tasks: [], totals: {} });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskOwnerFilter, setTaskOwnerFilter] = useState('all');
  const [meetingFilter, setMeetingFilter] = useState('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tasks/admin-summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      setSummary({
        employees: response.data.employees || [],
        meetings: response.data.meetings || [],
        tasks: response.data.tasks || [],
        totals: response.data.totals || {},
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load task summary');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const today = getToday();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const employees = useMemo(() => summary.employees || [], [summary.employees]);
  const meetings = useMemo(() => summary.meetings || [], [summary.meetings]);
  const tasks = useMemo(() => summary.tasks || [], [summary.tasks]);
  const totals = summary.totals || {};

  const taskStatusOptions = useMemo(() => (
    ['all', ...new Set(tasks.map((task) => task.status || 'Pending'))]
  ), [tasks]);

  const filteredEmployees = useMemo(() => (
    employees.filter((employee) => {
      const matchesSearch = !normalizedSearch || [
        employee.name,
        employee.email,
        employee.position,
        getNextStep(employee),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      const matchesFilter = activeFilter === 'all'
        || (activeFilter === 'attention' && ((employee.followUpCount || 0) > 0 || (employee.pendingCallCount || 0) > 0))
        || (activeFilter === 'follow-up' && (employee.followUpCount || 0) > 0)
        || (activeFilter === 'pending' && (employee.pendingCallCount || 0) > 0)
        || (activeFilter === 'meeting-ready' && (employee.upcomingMeetingCount || 0) > 0);

      return matchesSearch && matchesFilter;
    })
  ), [activeFilter, employees, normalizedSearch]);

  const filteredTasks = useMemo(() => (
    tasks.filter((task) => {
      const matchesSearch = !normalizedSearch || [
        task.clientName,
        task.companyName,
        task.datasetName,
        task.employeeName,
        task.phone,
        task.email,
        task.city,
        task.status,
        task.remark,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      const matchesStatus = taskStatusFilter === 'all' || task.status === taskStatusFilter;
      const matchesOwner = taskOwnerFilter === 'all' || String(task.employeeId) === String(taskOwnerFilter);

      return matchesSearch && matchesStatus && matchesOwner;
    })
  ), [normalizedSearch, taskOwnerFilter, taskStatusFilter, tasks]);

  const filteredMeetings = useMemo(() => (
    meetings.filter((meeting) => {
      const meetingDate = meeting.meetingDate || '';
      if (meetingFilter === 'today') return meetingDate === today;
      if (meetingFilter === 'upcoming') return meetingDate >= today;
      if (meetingFilter === 'past') return meetingDate < today;
      return true;
    })
  ), [meetingFilter, meetings, today]);

  const totalsCards = [
    {
      label: 'Assigned Work',
      value: totals.assignedData || 0,
      copy: `${totals.pendingCalls || 0} pending calls`,
      tone: 'bg-blue-50 text-blue-700',
      icon: <><path d="M4 4h16v16H4z" /><path d="M4 10h16" /><path d="M10 4v16" /></>,
    },
    {
      label: 'Follow Ups',
      value: totals.followUps || 0,
      copy: 'Needs next action',
      tone: 'bg-violet-50 text-violet-700',
      icon: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /><path d="M12 7v5l3 2" /></>,
    },
    {
      label: 'Converted',
      value: totals.converted || 0,
      copy: `${totals.interested || 0} interested`,
      tone: 'bg-emerald-50 text-emerald-700',
      icon: <><path d="m5 12 4 4L19 6" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    },
    {
      label: 'Meetings',
      value: totals.meetings || 0,
      copy: `${totals.upcomingMeetings || 0} upcoming`,
      tone: 'bg-amber-50 text-amber-700',
      icon: <><path d="M8 2v4" /><path d="M16 2v4" /><path d="M3 10h18" /><path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" /></>,
    },
  ];

  const downloadTaskCsv = () => {
    const headings = ['Client', 'Company', 'Owner', 'Status', 'Priority', 'Phone', 'Email', 'City', 'Dataset', 'Remark'];
    const rows = filteredTasks.map((task) => [
      task.clientName,
      task.companyName,
      task.employeeName,
      task.status,
      getTaskPriority(task.status),
      task.phone,
      task.email,
      task.city,
      task.datasetName,
      task.remark,
    ]);
    const csv = [headings, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'task-queue.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-md border border-slate-200 bg-white shadow-sm" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-md border border-slate-200 bg-white shadow-sm" />)}
        </div>
        <div className="h-96 animate-pulse rounded-md border border-slate-200 bg-white shadow-sm" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-500">Team task control</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-950">Tasks</h1>
              <select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
                className="rounded-full border border-transparent bg-transparent py-1 pl-2 pr-7 text-sm font-bold text-blue-700 outline-none hover:border-slate-300"
              >
                {filterOptions.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
              </select>
            </div>
            <p className="mt-4 text-xs font-medium text-slate-500">
              {filteredTasks.length} tasks - {filteredEmployees.length} team members - Updated a few seconds ago
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block w-full sm:w-80">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <svg viewBox="0 0 24 24" className={iconClass} strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search this list..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button type="button" title="Refresh" onClick={() => fetchSummary({ silent: true })} className={iconButtonClass}>
            <svg viewBox="0 0 24 24" className={`${iconClass} ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
          <button type="button" title="Export task queue" onClick={downloadTaskCsv} className={iconButtonClass}>
            <svg viewBox="0 0 24 24" className={iconClass} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M4 21h16" />
            </svg>
          </button>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {totalsCards.map((card) => (
          <article key={card.label} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {card.icon}
                </svg>
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Live
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{card.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{card.copy}</p>
          </article>
        ))}
      </section>

      <section>
        <article className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-300 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">Task Queue</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Assigned account rows that need sales activity.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={taskOwnerFilter}
                onChange={(event) => setTaskOwnerFilter(event.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All owners</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>{employee.name || employee.email}</option>
                ))}
              </select>
              <select
                value={taskStatusFilter}
                onChange={(event) => setTaskStatusFilter(event.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {taskStatusOptions.map((status) => (
                  <option key={status} value={status}>{status === 'all' ? 'All statuses' : status}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[76rem] w-full table-fixed border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="w-64 border-b border-r border-slate-300 px-4 py-2 font-bold">Client</th>
                  <th className="w-48 border-b border-r border-slate-300 px-4 py-2 font-bold">Owner</th>
                  <th className="w-36 border-b border-r border-slate-300 px-4 py-2 font-bold">Status</th>
                  <th className="w-28 border-b border-r border-slate-300 px-4 py-2 font-bold">Priority</th>
                  <th className="w-52 border-b border-r border-slate-300 px-4 py-2 font-bold">Contact</th>
                  <th className="w-52 border-b border-r border-slate-300 px-4 py-2 font-bold">Dataset</th>
                  <th className="w-52 border-b border-r border-slate-300 px-4 py-2 font-bold">Remark</th>
                  <th className="w-24 border-b border-slate-300 px-4 py-2 text-right font-bold">Open</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.slice(0, 50).map((task) => (
                  <tr key={task._id} className="bg-white transition hover:bg-blue-50/40">
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <p className="truncate font-bold text-blue-700">{task.clientName || task.companyName || `Row ${task.serialNumber}`}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{task.companyName || task.city || `Row ${task.serialNumber}`}</p>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <div className="flex max-w-full items-center gap-2 text-left">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${getAvatarClass(task.employeeName)}`}>
                          {getInitials(task.employeeName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-800">{task.employeeName}</span>
                          <span className="block truncate text-xs text-slate-500">{task.employeePosition || 'Team member'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClass(task.status)}`}>
                        {task.status || 'Pending'}
                      </span>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{getTaskPriority(task.status)}</td>
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <p className="truncate font-semibold text-slate-700">{task.phone || '-'}</p>
                      <p className="truncate text-xs text-slate-500">{task.email || task.website || ''}</p>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <p className="truncate font-semibold text-slate-700">{task.datasetName}</p>
                      <p className="truncate text-xs text-slate-500">{task.year || 'No year'} - row {task.serialNumber}</p>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 text-slate-600">
                      <span className="block truncate">{task.remark || '-'}</span>
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3 text-right">
                      <Link
                        to={`/dashboard/clients/${task.datasetId}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                        title="Open dataset"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 17 17 7" />
                          <path d="M7 7h10v10" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan="8" className="h-72 px-4 py-16 text-center">
                      <div className="mx-auto max-w-sm">
                        <p className="text-base font-bold text-slate-700">No tasks found</p>
                        <p className="mt-2 text-sm text-slate-500">Assigned rows will appear here after accounts are assigned to employees.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTasks.length > 50 && (
            <div className="border-t border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500">
              Showing 50 of {filteredTasks.length} tasks. Use search or filters to narrow the list.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-300 px-4 py-3">
            <h2 className="text-base font-bold text-slate-950">Employee Workload</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Assigned rows, activity pressure, and meeting load.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[48rem] w-full table-fixed border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="w-56 border-b border-r border-slate-300 px-4 py-2 font-bold">Employee</th>
                  <th className="w-24 border-b border-r border-slate-300 px-4 py-2 font-bold">Assigned</th>
                  <th className="w-24 border-b border-r border-slate-300 px-4 py-2 font-bold">Follow</th>
                  <th className="w-24 border-b border-r border-slate-300 px-4 py-2 font-bold">Pending</th>
                  <th className="w-28 border-b border-r border-slate-300 px-4 py-2 font-bold">Meetings</th>
                  <th className="w-36 border-b border-slate-300 px-4 py-2 font-bold">Next Step</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="bg-white transition hover:bg-blue-50/40">
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <div className="flex max-w-full items-center gap-3 text-left">
                        {employee.imageUrl ? (
                          <img src={getAssetUrl(employee.imageUrl)} alt={employee.name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${getAvatarClass(employee.name)}`}>
                            {getInitials(employee.name)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-slate-900">{employee.name || 'Employee'}</span>
                          <span className="block truncate text-xs text-slate-500">{employee.position || employee.email}</span>
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 font-bold text-slate-800">{employee.assignedCount || 0}</td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 font-bold text-violet-700">{employee.followUpCount || 0}</td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 font-bold text-amber-700">{employee.pendingCallCount || 0}</td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 font-bold text-emerald-700">
                      {employee.meetingCount || 0}
                      <span className="ml-1 text-xs font-medium text-slate-500">({employee.upcomingMeetingCount || 0})</span>
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{getNextStep(employee)}</span>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-sm font-semibold text-slate-500">No employees match this view.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">Meeting Timeline</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Employee meetings created from task work.</p>
            </div>
            <div className="flex rounded-full border border-slate-300 bg-white p-1">
              {meetingFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setMeetingFilter(filter.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${meetingFilter === filter.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="min-w-[44rem] w-full table-fixed border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-700">
                <tr>
                  <th className="w-44 border-b border-r border-slate-300 px-4 py-2 font-bold">When</th>
                  <th className="w-52 border-b border-r border-slate-300 px-4 py-2 font-bold">Client</th>
                  <th className="w-44 border-b border-r border-slate-300 px-4 py-2 font-bold">Owner</th>
                  <th className="w-28 border-b border-r border-slate-300 px-4 py-2 font-bold">Mode</th>
                  <th className="w-44 border-b border-slate-300 px-4 py-2 font-bold">Place</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeetings.map((meeting) => (
                  <tr key={meeting._id} className="bg-white transition hover:bg-blue-50/40">
                    <td className="border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-700">{formatDateTime(meeting.meetingDate, meeting.meetingTime)}</td>
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <p className="truncate font-bold text-slate-900">{meeting.clientName || meeting.companyName || meeting.meetingTitle}</p>
                      <p className="truncate text-xs text-slate-500">{meeting.datasetName}</p>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-700">{meeting.employee?.name || 'Employee'}</td>
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{meeting.meetingMode}</span>
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3 text-slate-600">{meeting.platformOrLocation || '-'}</td>
                  </tr>
                ))}
                {filteredMeetings.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-sm font-semibold text-slate-500">No meetings in this view.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
};

export default AdminTasks;
