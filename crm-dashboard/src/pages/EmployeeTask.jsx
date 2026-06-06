import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const emptyForm = {
  assignedClient: '',
  meetingTitle: '',
  meetingDate: '',
  meetingTime: '',
  meetingMode: 'Online',
  platformOrLocation: '',
  notes: '',
};

const formatDateTime = (date, time) => {
  if (!date) return '-';
  const value = new Date(`${date}T${time || '00:00'}`);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
};

const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-600';

const getEmployeeAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('employeeToken')}`,
});

const EmployeeTasks = () => {
  const [assignedRows, setAssignedRows] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTaskData = useCallback(async () => {
    try {
      const [rowsResponse, meetingsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/tasks/employee/assigned-rows`, { headers: getEmployeeAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/tasks/meetings/me`, { headers: getEmployeeAuthHeaders() }),
      ]);
      setAssignedRows(rowsResponse.data);
      setMeetings(meetingsResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaskData();
  }, [fetchTaskData]);

  const filteredAssignedRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return assignedRows;

    return assignedRows.filter((row) => (
      [row.clientName, row.companyName, row.datasetName, row.phone, row.email, row.city]
        .some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    ));
  }, [assignedRows, searchTerm]);

  const selectedAssignedRow = assignedRows.find((row) => (
    `${row.datasetId}:${row.rowIndex}` === formData.assignedClient
  ));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!selectedAssignedRow) {
      setError('Select a client from assigned data');
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/tasks/meetings`, {
        datasetId: selectedAssignedRow.datasetId,
        rowIndex: selectedAssignedRow.rowIndex,
        meetingTitle: formData.meetingTitle,
        meetingDate: formData.meetingDate,
        meetingTime: formData.meetingTime,
        meetingMode: formData.meetingMode,
        platformOrLocation: formData.platformOrLocation,
        notes: formData.notes,
      }, {
        headers: getEmployeeAuthHeaders(),
      });

      setMessage(response.data.message);
      setFormData(emptyForm);
      await fetchTaskData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to schedule meeting');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />;
  }

  return (
    <div className="w-full space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-emerald-600">Meeting tasks</p>
          <h1 className="mt-1.5 text-2xl font-semibold text-slate-950">Tasks</h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Schedule meetings from your assigned client data rows.
          </p>
        </div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
          {assignedRows.length} assigned rows
        </span>
      </section>

      <section className="grid gap-5 xl:grid-cols-[430px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Schedule meeting</h2>
          <p className="mt-1 text-sm text-slate-500">Choose an assigned client and fill the meeting details.</p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className={labelClass}>Assigned client</span>
              <select className={inputClass} name="assignedClient" value={formData.assignedClient} onChange={handleChange} required>
                <option value="">Select assigned client</option>
                {assignedRows.map((row) => (
                  <option key={`${row.datasetId}-${row.rowIndex}`} value={`${row.datasetId}:${row.rowIndex}`}>
                    {row.clientName} - {row.datasetName} - Row {row.serialNumber}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>Meeting title</span>
              <input className={inputClass} type="text" name="meetingTitle" value={formData.meetingTitle} onChange={handleChange} placeholder="e.g. Product demo discussion" required />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Date</span>
                <input className={inputClass} type="date" name="meetingDate" value={formData.meetingDate} onChange={handleChange} required />
              </label>
              <label>
                <span className={labelClass}>Time</span>
                <input className={inputClass} type="time" name="meetingTime" value={formData.meetingTime} onChange={handleChange} required />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Meeting type</span>
                <select className={inputClass} name="meetingMode" value={formData.meetingMode} onChange={handleChange}>
                  <option value="Online">Online</option>
                  <option value="Physical">Physical</option>
                  <option value="Phone">Phone</option>
                </select>
              </label>
              <label>
                <span className={labelClass}>Platform / Location</span>
                <input className={inputClass} type="text" name="platformOrLocation" value={formData.platformOrLocation} onChange={handleChange} placeholder="Google Meet, Zoom, office address..." />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Notes</span>
              <textarea className={`${inputClass} min-h-24 resize-none`} name="notes" value={formData.notes} onChange={handleChange} placeholder="Meeting context or agenda" />
            </label>

            {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <path d="M3 10h18" />
                <path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
              </svg>
              {isSaving ? 'Scheduling...' : 'Schedule meeting'}
            </button>
          </div>
        </form>

        <section className="space-y-5">
          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Assigned data list</h2>
                <p className="mt-1 text-sm text-slate-500">Search and choose from the rows assigned by admin.</p>
              </div>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 sm:w-72"
              />
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Dataset</th>
                    <th className="whitespace-nowrap px-5 py-3">Status</th>
                    <th className="px-5 py-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignedRows.map((row) => (
                    <tr key={`${row.datasetId}-${row.rowIndex}`} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{row.clientName}</p>
                        <p className="text-xs text-slate-500">{row.companyName || row.city || `Row ${row.serialNumber}`}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{row.datasetName}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {row.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        <p>{row.phone || '-'}</p>
                        <p className="text-xs">{row.email || ''}</p>
                      </td>
                    </tr>
                  ))}
                  {filteredAssignedRows.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-5 py-10 text-center text-sm text-slate-500">
                        No assigned data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-950">My meetings</h2>
              <p className="mt-1 text-sm text-slate-500">Meetings scheduled from assigned data.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {meetings.map((meeting) => (
                <div key={meeting._id} className="p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{meeting.meetingTitle}</p>
                      <p className="mt-1 text-sm text-slate-500">{meeting.clientName || meeting.companyName} - {meeting.datasetName}</p>
                    </div>
                    <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {meeting.meetingMode}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{formatDateTime(meeting.meetingDate, meeting.meetingTime)}</p>
                  <p className="mt-1 text-sm text-slate-500">{meeting.platformOrLocation || 'No platform/location added'}</p>
                </div>
              ))}
              {meetings.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-slate-500">No meetings scheduled yet.</p>
              )}
            </div>
          </article>
        </section>
      </section>
    </div>
  );
};

export default EmployeeTasks;
