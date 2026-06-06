import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const formatDateTime = (date, time) => {
  if (!date) return '-';
  const dateValue = new Date(`${date}T${time || '00:00'}`);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateValue);
};

const getInitials = (name = '') => (
  name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'EM'
);

const AdminTasks = () => {
  const [summary, setSummary] = useState({ employees: [], meetings: [], totals: {} });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/tasks/admin-summary`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        });
        setSummary(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load task summary');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return summary.employees;

    return summary.employees.filter((employee) => (
      [employee.name, employee.email, employee.position]
        .some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    ));
  }, [summary.employees, searchTerm]);

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />;
  }

  return (
    <div className="w-full space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-600">Team tasks</p>
          <h1 className="mt-1.5 text-2xl font-semibold text-slate-950">Tasks</h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Track assigned data, status load, pending calls, follow-ups, and employee meetings.
          </p>
        </div>
        <label className="relative block sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search employees"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Employees', summary.totals.employees || 0, 'Team members'],
          ['Assigned data', summary.totals.assignedData || 0, 'Rows allocated'],
          ['Follow ups', summary.totals.followUps || 0, 'Need action'],
          ['Pending calls', summary.totals.pendingCalls || 0, 'No outcome yet'],
          ['Meetings', summary.totals.meetings || 0, 'Scheduled total'],
        ].map(([label, value, copy]) => (
          <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{copy}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-950">Employee workload</h2>
          <p className="mt-1 text-sm text-slate-500">Assigned rows and status summary per employee.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">Employee</th>
                <th className="whitespace-nowrap px-5 py-3">Assigned data</th>
                <th className="whitespace-nowrap px-5 py-3">Follow up</th>
                <th className="whitespace-nowrap px-5 py-3">Pending calls</th>
                <th className="whitespace-nowrap px-5 py-3">Meetings</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((employee) => (
                <tr key={employee._id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">
                        {getInitials(employee.name)}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{employee.name || 'Employee'}</p>
                        <p className="text-xs text-slate-500">{employee.position || employee.email || 'Team member'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{employee.assignedCount}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-violet-700">{employee.followUpCount}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-amber-700">{employee.pendingCallCount}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-emerald-700">
                    {employee.meetingCount}
                    <span className="ml-1 text-xs text-slate-500">({employee.upcomingMeetingCount} upcoming)</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(employee.statusCounts || {}).map(([status, count]) => (
                        <span key={status} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {status}: {count}
                        </span>
                      ))}
                      {Object.keys(employee.statusCounts || {}).length === 0 && (
                        <span className="text-xs text-slate-400">No data assigned</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-950">Scheduled meetings</h2>
          <p className="mt-1 text-sm text-slate-500">Meetings created from employee task panel.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Client</th>
                <th className="whitespace-nowrap px-5 py-3">When</th>
                <th className="whitespace-nowrap px-5 py-3">Mode</th>
                <th className="px-5 py-3">Platform / Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.meetings.map((meeting) => (
                <tr key={meeting._id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-800">{meeting.employee?.name || 'Employee'}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{meeting.clientName || meeting.companyName}</p>
                    <p className="text-xs text-slate-500">{meeting.datasetName}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{formatDateTime(meeting.meetingDate, meeting.meetingTime)}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {meeting.meetingMode}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{meeting.platformOrLocation || '-'}</td>
                </tr>
              ))}
              {summary.meetings.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-sm text-slate-500">
                    No meetings scheduled yet.
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

export default AdminTasks;
