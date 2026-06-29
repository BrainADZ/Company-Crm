import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

const iconClass = 'h-4 w-4 fill-none stroke-current';
const iconButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 hover:text-blue-700';

const meetingFilters = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today', label: 'Today' },
  { id: 'all', label: 'All' },
  { id: 'past', label: 'Past' },
];

const getToday = () => new Date().toISOString().slice(0, 10);

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

const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [meetingFilter, setMeetingFilter] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchMeetings = useCallback(async ({ silent = false } = {}) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tasks/admin-summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      setMeetings(response.data.meetings || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load meetings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const today = getToday();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredMeetings = useMemo(() => meetings.filter((meeting) => {
    const meetingDate = meeting.meetingDate || '';
    const matchesFilter =
      meetingFilter === 'today' ? meetingDate === today
        : meetingFilter === 'upcoming' ? meetingDate >= today
          : meetingFilter === 'past' ? meetingDate < today
            : true;

    const matchesSearch = !normalizedSearch || [
      meeting.clientName,
      meeting.companyName,
      meeting.meetingTitle,
      meeting.datasetName,
      meeting.employee?.name,
      meeting.meetingMode,
      meeting.platformOrLocation,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

    return matchesFilter && matchesSearch;
  }), [meetingFilter, meetings, normalizedSearch, today]);

  const stats = [
    { label: 'All Meetings', value: meetings.length, note: 'Scheduled by employees' },
    { label: 'Upcoming', value: meetings.filter((meeting) => meeting.meetingDate >= today).length, note: 'Today or later' },
    { label: 'Today', value: meetings.filter((meeting) => meeting.meetingDate === today).length, note: 'Due today' },
    { label: 'Past', value: meetings.filter((meeting) => meeting.meetingDate < today).length, note: 'Completed or overdue' },
  ];

  return (
    <div className="w-full space-y-4">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <CalendarDays size={20} strokeWidth={1.9} />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-500">Meeting timeline</p>
            <h1 className="text-2xl font-bold text-slate-950">Meetings</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Employee meetings are separated from Tasks and tracked here.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search meetings..."
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-80"
          />
          <button type="button" title="Refresh" onClick={() => fetchMeetings({ silent: true })} className={iconButtonClass}>
            <RefreshCw size={16} strokeWidth={1.9} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{stat.note}</p>
          </article>
        ))}
      </section>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Meeting Timeline</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">{filteredMeetings.length} meetings in this view.</p>
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
        <div className="overflow-x-auto">
          <table className="min-w-[60rem] w-full table-fixed border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="w-44 border-b border-r border-slate-300 px-4 py-2 font-bold">When</th>
                <th className="w-60 border-b border-r border-slate-300 px-4 py-2 font-bold">Client</th>
                <th className="w-44 border-b border-r border-slate-300 px-4 py-2 font-bold">Owner</th>
                <th className="w-28 border-b border-r border-slate-300 px-4 py-2 font-bold">Mode</th>
                <th className="w-52 border-b border-r border-slate-300 px-4 py-2 font-bold">Place</th>
                <th className="w-64 border-b border-slate-300 px-4 py-2 font-bold">Notes</th>
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
                  <td className="border-b border-r border-slate-200 px-4 py-3 text-slate-600">{meeting.platformOrLocation || '-'}</td>
                  <td className="border-b border-slate-200 px-4 py-3 text-slate-600">{meeting.notes || '-'}</td>
                </tr>
              ))}
              {!isLoading && filteredMeetings.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-16 text-center text-sm font-semibold text-slate-500">No meetings in this view.</td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan="6" className="px-4 py-16 text-center text-sm font-semibold text-slate-500">Loading meetings...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Meetings;
