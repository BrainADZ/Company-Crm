import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { getValidToken } from '../utils/auth';
import { API_BASE_URL } from '../config/api';

const CLIENT_WORK_COLUMNS = ['Status', 'Remark', 'Employee'];

const CLIENT_STATUS_OPTIONS = [
  'Pending',
  'Contacted',
  'Follow Up',
  'Interested',
  'Not Interested',
  'Converted',
  'Not Reachable',
];

const CALL_OUTCOMES = [
  'Connected',
  'No Answer',
  'Busy',
  'Switched Off',
  'Wrong Number',
  'Callback Requested',
];

const STATUS_SELECT_STYLES = {
  '': 'border-slate-300 bg-slate-50 text-slate-500',
  Pending: 'border-amber-300 bg-amber-100 text-amber-800',
  Contacted: 'border-sky-300 bg-sky-100 text-sky-800',
  'Follow Up': 'border-violet-300 bg-violet-100 text-violet-800',
  Interested: 'border-cyan-300 bg-cyan-100 text-cyan-800',
  'Not Interested': 'border-rose-300 bg-rose-100 text-rose-800',
  Converted: 'border-green-400 bg-green-100 text-green-900',
  'Not Reachable': 'border-orange-300 bg-orange-100 text-orange-800',
};

const STATUS_ROW_STYLES = {
  Pending: 'bg-amber-50/60',
  Contacted: 'bg-sky-50/60',
  'Follow Up': 'bg-violet-50/70',
  Interested: 'bg-cyan-50/70',
  'Not Interested': 'bg-rose-50/60',
  Converted: 'bg-green-100/70',
  'Not Reachable': 'bg-orange-50/60',
};

const getAuthToken = () =>
  getValidToken('admin') || getValidToken('employee');

const formatDate = (value) => {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getTodayDateKey = () => {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000,
  );

  return localDate.toISOString().slice(0, 10);
};

const formatFollowUpDate = (value) => {
  const [year, month, day] = String(value || '')
    .split('-')
    .map(Number);

  if (!year || !month || !day) return value || '';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
};

const normalizeColumnName = (column) =>
  String(column || '')
    .trim()
    .toLowerCase();

const getColumnIndex = (columns, columnName) =>
  columns.findIndex(
    (column) =>
      normalizeColumnName(column) === columnName.toLowerCase(),
  );

const getFirstCellValue = (columns, row, aliases) => {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
  const index = columns.findIndex((column) =>
    normalizedAliases.includes(normalizeColumnName(column)),
  );

  return index === -1 ? '' : String(row[index] || '').trim();
};

const normalizeContactHeader = (column) =>
  normalizeColumnName(column)
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isPhoneColumn = (column) => {
  const header = normalizeContactHeader(column);

  return (
    /^(mobile|mobile no|mobile number)(\s*\d+)?$/.test(header) ||
    /^(phone|phone no|phone number)(\s*\d+)?$/.test(header) ||
    /^(contact no|contact number)(\s*\d+)?$/.test(header)
  );
};

const isEmailColumn = (column) => {
  const header = normalizeContactHeader(column);

  return /^(email|email id|email address)(\s*\d+)?$/.test(header);
};

const isOtherColumn = (column) =>
  ['other', 'others'].includes(normalizeContactHeader(column));

const getCompactColumnWidth = (column) => {
  const normalizedColumn = normalizeColumnName(column);

  if (isPhoneColumn(column) || isEmailColumn(column)) {
    return 'w-40 min-w-40 max-w-40';
  }

  if (normalizedColumn === 'employee') return 'w-40 min-w-40 max-w-40';

  if (
    normalizedColumn.includes('company') ||
    normalizedColumn.includes('account') ||
    normalizedColumn === 'full name' ||
    normalizedColumn === 'client name'
  ) {
    return 'w-44 min-w-44 max-w-44';
  }

  if (
    normalizedColumn.includes('requirement') ||
    normalizedColumn.includes('designation') ||
    normalizedColumn.includes('department')
  ) {
    return 'w-48 min-w-48 max-w-48';
  }

  if (
    normalizedColumn.includes('website') ||
    normalizedColumn.includes('address')
  ) {
    return 'w-40 min-w-40 max-w-40';
  }

  return 'w-32 min-w-32 max-w-32';
};

const splitContactValue = (value) =>
  String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const getGroupedContactValues = (row, indexes) => [
  ...new Set(
    indexes.flatMap((index) => splitContactValue(row[index])),
  ),
];

const getRowLog = (rowLogs = [], rowIndex) =>
  rowLogs.find(
    (rowLog) =>
      Number(rowLog.rowIndex) === Number(rowIndex),
  );

const addWorkColumnsAfterWebsite = (columns = [], rows = []) => {
  const safeColumns = columns.map(
    (column, index) =>
      String(column || '').trim() || `Column ${index + 1}`,
  );

  const workIndexes = new Map(
    CLIENT_WORK_COLUMNS.map((column) => [
      column,
      safeColumns.findIndex(
        (item) =>
          normalizeColumnName(item) === column.toLowerCase(),
      ),
    ]),
  );

  const dataIndexes = safeColumns
    .map((_, index) => index)
    .filter(
      (index) =>
        !CLIENT_WORK_COLUMNS.some(
          (column) =>
            normalizeColumnName(safeColumns[index]) ===
            column.toLowerCase(),
        ),
    );

  return {
    columns: [
      ...dataIndexes.map((index) => safeColumns[index]),
      ...CLIENT_WORK_COLUMNS,
    ],

    rows: rows.map((row) => [
      ...dataIndexes.map((index) => row[index] ?? ''),

      ...CLIENT_WORK_COLUMNS.map((column) =>
        workIndexes.get(column) === -1
          ? ''
          : (row[workIndexes.get(column)] ?? ''),
      ),
    ]),
  };
};

const ContactCell = ({ values, type, onCall, disabled = false }) => {
  const [selectedValue, setSelectedValue] = useState(values[0] || '');
  const canCall = type === 'Mobile' && Boolean(onCall);

  if (!values.length) {
    return (
      <span className="text-xs font-medium text-slate-400">
        —
      </span>
    );
  }

  if (values.length === 1) {
    return (
      <div className="flex w-36 items-center gap-1.5">
        <span
          title={values[0]}
          className={`min-w-0 flex-1 text-xs font-medium leading-4 text-slate-700 ${
            type === 'Email'
              ? 'line-clamp-2 break-all'
              : 'whitespace-nowrap'
          }`}
        >
          {values[0]}
        </span>

        {canCall && (
          <button
            type="button"
            title={`Call ${values[0]}`}
            onClick={() => onCall(values[0])}
            disabled={disabled}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-wait disabled:bg-slate-300"
          >
            <PhoneIcon />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-36 min-w-36">
      <select
        value={selectedValue}
        onChange={(event) => setSelectedValue(event.target.value)}
        aria-label={`${type} options`}
        className="h-8 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {values.map((value, index) => (
          <option
            key={`${value}-${index}`}
            value={value}
          >
            {value}
          </option>
        ))}
      </select>

      {canCall && (
        <button
          type="button"
          onClick={() => onCall(selectedValue || values[0])}
          disabled={disabled}
          className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:bg-slate-300"
        >
          <PhoneIcon /> Call selected
        </button>
      )}

      <p className="mt-1 text-[10px] font-semibold text-slate-400">
        {values.length} options
      </p>
    </div>
  );
};

const MessageIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 fill-none stroke-current"
    strokeWidth="2"
  >
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
  </svg>
);

const PhoneIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 fill-none stroke-current"
    strokeWidth="2"
  >
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
  </svg>
);

const formatCallDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const CallHistoryEntry = ({
  call,
  recordingAudioUrl,
  isRecordingLoading,
  onLoadRecording,
}) => (
  <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
            <PhoneIcon /> {call.outcome || (call.status === 'Failed' ? 'Call failed' : 'Call initiated')}
          </p>
          {call.recordingAvailable ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Recording ready
            </span>
          ) : call.recordingStatus === 'Pending' ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Recording processing
            </span>
          ) : (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              No audio recording
            </span>
          )}
        </div>
        <p className="mt-1 break-words text-xs text-slate-600">
          {call.notes || 'No notes added'}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-blue-700">
          By {call.createdBy?.name || call.owner || 'CRM user'}
        </p>
      </div>
      <div className="shrink-0 text-right text-[11px] font-semibold text-slate-500">
        <p>{formatDate(call.startedAt || call.createdAt)}</p>
        <p className="mt-1 font-mono">{formatCallDuration(call.durationSeconds)}</p>
      </div>
    </div>

    {call.recordingAvailable && !recordingAudioUrl && (
      <button
        type="button"
        onClick={() => onLoadRecording(call)}
        disabled={isRecordingLoading}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
      >
        <PhoneIcon /> {isRecordingLoading ? 'Loading recording...' : 'Play call recording'}
      </button>
    )}

    {recordingAudioUrl && (
      <audio className="mt-3 h-9 w-full" controls preload="metadata" src={recordingAudioUrl}>
        <track kind="captions" />
      </audio>
    )}

    {!call.recordingAvailable && call.recordingStatus === 'Pending' && (
      <p className="mt-3 text-[11px] font-semibold text-amber-700">
        Recording is processing and will appear here after Exotel completes the call.
      </p>
    )}

    {call.providerMode !== 'cloud' && !call.recordingAvailable && (
      <p className="mt-3 text-[11px] font-semibold text-slate-500">
        Device-dialer call — audio was not recorded by CRM.
      </p>
    )}
  </article>
);

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 fill-none stroke-current"
    strokeWidth="2"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 fill-none stroke-current"
    strokeWidth="2"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 fill-none stroke-current"
    strokeWidth="2"
  >
    <path d="M8 2v4M16 2v4M3 10h18" />
    <path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
  </svg>
);

const formatMeetingDateTime = (meeting) => {
  if (!meeting?.meetingDate) {
    return 'Date not set';
  }

  const dateTime = new Date(
    `${meeting.meetingDate}T${meeting.meetingTime || '00:00'}:00`,
  );

  if (Number.isNaN(dateTime.getTime())) {
    return [meeting.meetingDate, meeting.meetingTime]
      .filter(Boolean)
      .join(' ');
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateTime);
};

const ClientDatasetDetail = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();

  const [dataset, setDataset] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [employees, setEmployees] = useState([]);
  const [salesActions, setSalesActions] = useState([]);
  const [meetingActions, setMeetingActions] = useState([]);

  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] =
    useState([]);

  const [assignmentMode, setAssignmentMode] = useState('full');
  const [recordLimit, setRecordLimit] = useState('');

  const [assignmentMessage, setAssignmentMessage] =
    useState('');

  const [assignmentError, setAssignmentError] =
    useState('');

  const [isAssigning, setIsAssigning] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  const [assignmentFilter, setAssignmentFilter] =
    useState('all');

  const [sourceFilter, setSourceFilter] = useState('all');

  const [followUpDateFilter, setFollowUpDateFilter] =
    useState('');

  const [followUpDates, setFollowUpDates] = useState({});

  const [savingRows, setSavingRows] = useState({});
  const [saveError, setSaveError] = useState('');

  const [schedulingRows, setSchedulingRows] =
    useState({});
  const [scheduleRowErrors, setScheduleRowErrors] =
    useState({});

  const [actionMessage, setActionMessage] = useState('');
  const [actionModal, setActionModal] = useState(null);
  const [actionSaved, setActionSaved] = useState(false);

  const [callModal, setCallModal] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [callOutcome, setCallOutcome] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callElapsedSeconds, setCallElapsedSeconds] = useState(0);
  const [callError, setCallError] = useState('');
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [isCompletingCall, setIsCompletingCall] = useState(false);
  const [recordingAudioUrls, setRecordingAudioUrls] = useState({});
  const [loadingRecordings, setLoadingRecordings] = useState({});
  const [callConfiguration, setCallConfiguration] = useState(null);

  useEffect(() => {
    if (!callModal?.call?.startedAt || callModal.call.status !== 'Initiated') return undefined;

    const updateElapsed = () => {
      const startedAt = new Date(callModal.call.startedAt).getTime();
      setCallElapsedSeconds(
        Number.isNaN(startedAt) ? 0 : Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      );
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [callModal?.call?.startedAt, callModal?.call?.status]);

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const token = getAuthToken();

        if (!token) {
          setError(
            'Session expired. Please login again.',
          );
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [datasetResponse, optionsResponse] =
          await Promise.all([
            axios.get(
              `${API_BASE_URL}/api/client-datasets/${datasetId}`,
              {
                headers,
              },
            ),

            axios
              .get(
                `${API_BASE_URL}/api/client-datasets/options`,
                {
                  headers,
                },
              )
              .catch(() => ({
                data: {},
              })),
          ]);

        setDataset(datasetResponse.data);

        setFollowUpDates(
          datasetResponse.data.followUpDates || {},
        );

        setEmployees(
          optionsResponse.data.employees || [],
        );

        setSalesActions(
          optionsResponse.data.actions || [],
        );

        setMeetingActions(
          optionsResponse.data.meetingActions || [],
        );
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            'Unable to load client data',
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataset();
  }, [datasetId]);

  const tableData = useMemo(() => {
    if (!dataset) {
      return {
        columns: [],
        rows: [],
      };
    }

    return addWorkColumnsAfterWebsite(
      dataset.columns || [],
      dataset.rows || [],
    );
  }, [dataset]);

  const statusIndex = getColumnIndex(
    tableData.columns,
    'Status',
  );

  const remarkIndex = getColumnIndex(
    tableData.columns,
    'Remark',
  );

  const employeeIndex = getColumnIndex(
    tableData.columns,
    'Employee',
  );

  const sourceIndex = getColumnIndex(
    tableData.columns,
    'Source',
  );

  const phoneColumnIndexes = useMemo(
    () =>
      tableData.columns
        .map((column, index) =>
          isPhoneColumn(column) ? index : -1,
        )
        .filter((index) => index !== -1),
    [tableData.columns],
  );

  const emailColumnIndexes = useMemo(
    () =>
      tableData.columns
        .map((column, index) =>
          isEmailColumn(column) ? index : -1,
        )
        .filter((index) => index !== -1),
    [tableData.columns],
  );

  const primaryPhoneIndex =
    phoneColumnIndexes[0] ?? -1;

  const primaryEmailIndex =
    emailColumnIndexes[0] ?? -1;

  const displayColumnIndexes = useMemo(() => {
    const hiddenIndexes = new Set([
      statusIndex,
      remarkIndex,

      ...phoneColumnIndexes.slice(1),
      ...emailColumnIndexes.slice(1),

      ...tableData.columns
        .map((column, index) =>
          isOtherColumn(column) ? index : -1,
        )
        .filter((index) => index !== -1),
    ]);

    return tableData.columns
      .map((_, index) => index)
      .filter((index) => !hiddenIndexes.has(index));
  }, [
    tableData.columns,
    statusIndex,
    remarkIndex,
    phoneColumnIndexes,
    emailColumnIndexes,
  ]);

  if (isLoading) {
    return (
      <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
        {error}
      </div>
    );
  }

  if (!dataset) {
    return null;
  }

  const isAdmin = salesActions.includes('assign');
  const canUpdate = salesActions.includes('update');
  const canViewMeetings = meetingActions.includes('view');
  const canScheduleMeeting = meetingActions.includes('create');

  const backLink = '/dashboard/clients';
  const backLabel = 'Back to sales data';

  const getOriginalRowIndex = (rowIndex) =>
    dataset.originalRowIndexes?.[rowIndex] ??
    rowIndex;

  const getRowMeetings = (rowIndex) => {
    const originalRowIndex = getOriginalRowIndex(rowIndex);
    const value =
      dataset.rowMeetings?.[String(originalRowIndex)] ??
      dataset.rowMeetings?.[originalRowIndex];

    if (!value) {
      return [];
    }

    return (Array.isArray(value) ? value : [value]).filter(Boolean);
  };

  const getPrimaryMeeting = (rowMeetings) => {
    const sortedMeetings = [...rowMeetings].sort((first, second) =>
      `${first.meetingDate || '9999-12-31'}T${first.meetingTime || '23:59'}`.localeCompare(
        `${second.meetingDate || '9999-12-31'}T${second.meetingTime || '23:59'}`,
      ),
    );
    const today = getTodayDateKey();

    return (
      sortedMeetings.find(
        (meeting) =>
          String(meeting.status || 'scheduled').toLowerCase() === 'scheduled' &&
          meeting.meetingDate >= today,
      ) ||
      sortedMeetings.find(
        (meeting) =>
          String(meeting.status || 'scheduled').toLowerCase() === 'scheduled',
      ) ||
      sortedMeetings[0] ||
      null
    );
  };

  const getScheduleMeetingUrl = (rowIndex) => {
    const query = new URLSearchParams({
      create: '1',
      datasetId: String(datasetId),
      rowIndex: String(getOriginalRowIndex(rowIndex)),
    });

    return `/dashboard/meetings?${query.toString()}`;
  };

  const assignmentMap = new Map();

  (dataset.rowAssignments || []).forEach(
    (assignment) => {
      const originalIndex = Number(
        assignment.rowIndex,
      );

      assignmentMap.set(originalIndex, [
        ...(assignmentMap.get(originalIndex) || []),
        assignment,
      ]);
    },
  );

  const eligibleEmployees = employees.filter(
    (employee) =>
      !dataset.businessUnitId ||
      (employee.businessUnitIds || [])
        .map(String)
        .includes(String(dataset.businessUnitId)),
  );

  const getScheduleRequestIssue = (
    requestError,
  ) => {
    const responseMessage =
      requestError?.response?.data?.message || '';
    const responseCode =
      requestError?.response?.data?.code || '';
    const isAssignmentIssue =
      responseCode.startsWith('CLIENT_ROW_') ||
      responseMessage ===
        'This client row is outside your meeting access scope' ||
      responseMessage ===
        'You cannot schedule a meeting for this client row';

    return {
      blocking: isAssignmentIssue,
      message: isAssignmentIssue
        ? responseMessage ||
          'Assign an active employee with Department access before scheduling a meeting.'
        : responseMessage ||
          'Unable to verify this client for meeting scheduling. Please try again.',
    };
  };

  const scheduleMeetingForRow = async (
    rowIndex,
    { showInModal = false } = {},
  ) => {
    const showScheduleError = (
      message,
      { blocking = false } = {},
    ) => {
      setScheduleRowErrors((previous) => ({
        ...previous,
        [rowIndex]: { blocking, message },
      }));

      if (showInModal) {
        setSaveError(blocking ? '' : message);
      }
    };

    const token = getAuthToken();

    if (!token) {
      showScheduleError(
        'Session expired. Please login again.',
      );
      return false;
    }

    const originalRowIndex =
      getOriginalRowIndex(rowIndex);

    setScheduleRowErrors((previous) => {
      const next = { ...previous };
      delete next[rowIndex];
      return next;
    });
    setSchedulingRows((previous) => ({
      ...previous,
      [rowIndex]: true,
    }));

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/meetings/context`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            datasetId,
            rowIndex: originalRowIndex,
          },
        },
      );
      const context = response.data || {};

      if (!context.canSchedule) {
        showScheduleError(
          context.schedulingIssue?.message ||
            'This client row is not ready for meeting scheduling.',
          { blocking: true },
        );
        return false;
      }

      navigate(getScheduleMeetingUrl(rowIndex));
      return true;
    } catch (requestError) {
      const issue =
        getScheduleRequestIssue(requestError);
      showScheduleError(issue.message, {
        blocking: issue.blocking,
      });
      return false;
    } finally {
      setSchedulingRows((previous) => ({
        ...previous,
        [rowIndex]: false,
      }));
    }
  };

  const selectedEmployees =
    eligibleEmployees.filter((employee) =>
      selectedEmployeeIds.includes(employee._id),
    );

  const getFollowUpDate = (rowIndex) =>
    followUpDates[
      String(getOriginalRowIndex(rowIndex))
    ] || '';

  const todayDateKey = getTodayDateKey();

  const normalizedSearch = searchTerm
    .trim()
    .toLowerCase();

  const sourceOptions =
    sourceIndex === -1
      ? []
      : [
          ...new Set(
            tableData.rows
              .map((row) =>
                String(
                  row[sourceIndex] || '',
                ).trim(),
              )
              .filter(Boolean),
          ),
        ].sort((first, second) =>
          first.localeCompare(second),
        );

  const statusCounts = tableData.rows.reduce(
    (counts, row) => {
      const status = row[statusIndex] || '';

      counts.all += 1;

      if (status) {
        counts[status] =
          (counts[status] || 0) + 1;
      }

      return counts;
    },
    {
      all: 0,
    },
  );

  const selectedFilterEmployee =
    employeeFilter === 'all'
      ? null
      : eligibleEmployees.find(
          (employee) =>
            String(employee._id) ===
            String(employeeFilter),
        );

  const rowMatchesEmployee = (row, rowIndex) => {
    if (!selectedFilterEmployee) {
      return true;
    }

    const originalIndex =
      getOriginalRowIndex(rowIndex);

    const assignments =
      assignmentMap.get(originalIndex) || [];

    const assignedCell =
      employeeIndex === -1
        ? ''
        : String(
            row[employeeIndex] || '',
          ).trim();

    const selectedName = String(
      selectedFilterEmployee.name ||
        selectedFilterEmployee.email ||
        '',
    ).trim();

    return (
      assignments.some((assignment) => {
        const assignmentId =
          assignment.employee?._id ||
          assignment.employee ||
          assignment.employeeId ||
          assignment.assignedTo?._id;

        const assignmentName = String(
          assignment.employeeName ||
            assignment.employee?.name ||
            assignment.assignedTo?.name ||
            '',
        ).trim();

        return (
          (assignmentId &&
            String(assignmentId) ===
              String(
                selectedFilterEmployee._id,
              )) ||
          (selectedName &&
            assignmentName === selectedName)
        );
      }) ||
      (selectedName &&
        assignedCell.includes(selectedName))
    );
  };

  const visibleRows = tableData.rows
    .map((row, rowIndex) => ({
      row,
      rowIndex,
    }))
    .filter(({ row, rowIndex }) => {
      const status = row[statusIndex] || '';

      const followUpDate =
        getFollowUpDate(rowIndex);

      const originalIndex =
        getOriginalRowIndex(rowIndex);

      const assignments =
        assignmentMap.get(originalIndex) || [];

      const assignedCell =
        employeeIndex === -1
          ? ''
          : String(
              row[employeeIndex] || '',
            ).trim();

      const isAssigned =
        assignments.length > 0 ||
        Boolean(assignedCell);

      const matchesSearch =
        !normalizedSearch ||
        row.some((cell) =>
          String(cell || '')
            .toLowerCase()
            .includes(normalizedSearch),
        );

      const matchesStatus =
        statusFilter === 'all' ||
        status === statusFilter;

      const matchesEmployee =
        rowMatchesEmployee(row, rowIndex);

      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' &&
          isAssigned) ||
        (assignmentFilter === 'unassigned' &&
          !isAssigned);

      const matchesSource =
        sourceFilter === 'all' ||
        (sourceIndex !== -1 &&
          String(
            row[sourceIndex] || '',
          ).trim() === sourceFilter);

      const matchesFollowUpDate =
        statusFilter !== 'Follow Up'
          ? true
          : followUpDateFilter
            ? followUpDate === followUpDateFilter
            : !followUpDate ||
              followUpDate >= todayDateKey;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesEmployee &&
        matchesAssignment &&
        matchesSource &&
        matchesFollowUpDate
      );
    })
    .sort((first, second) => {
      if (statusFilter !== 'Follow Up') {
        return first.rowIndex - second.rowIndex;
      }

      const firstDate =
        getFollowUpDate(first.rowIndex) ||
        '9999-12-31';

      const secondDate =
        getFollowUpDate(second.rowIndex) ||
        '9999-12-31';

      return (
        firstDate.localeCompare(secondDate) ||
        first.rowIndex -
          second.rowIndex
      );
    });

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    statusFilter !== 'all' ||
    employeeFilter !== 'all' ||
    assignmentFilter !== 'all' ||
    sourceFilter !== 'all' ||
    Boolean(followUpDateFilter);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setEmployeeFilter('all');
    setAssignmentFilter('all');
    setSourceFilter('all');
    setFollowUpDateFilter('');
  };

  const toggleRowSelection = (rowIndex) => {
    setSelectedRows((previous) =>
      previous.includes(rowIndex)
        ? previous.filter(
            (selectedRow) =>
              selectedRow !== rowIndex,
          )
        : [...previous, rowIndex],
    );
  };

  const selectUnassignedRows = () => {
    const nextSelectedRows =
      tableData.rows
        .map((_, rowIndex) => rowIndex)
        .filter((rowIndex) => {
          const originalIndex =
            getOriginalRowIndex(rowIndex);

          return !(
            assignmentMap.get(originalIndex) || []
          ).length;
        });

    setSelectedRows(nextSelectedRows);
  };

  const updateAssignmentState = (
    responseData,
  ) => {
    setDataset((previous) => ({
      ...previous,
      columns: responseData.columns,
      rows: responseData.rows,
      rowAssignments:
        responseData.rowAssignments,
    }));

    setSelectedRows([]);
    setScheduleRowErrors({});
  };

  const refreshDataset = async () => {
    const token = getAuthToken();

    if (!token) {
      throw new Error(
        'Session expired. Please login again.',
      );
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/client-datasets/${datasetId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    setDataset(response.data);

    setFollowUpDates(
      response.data.followUpDates || {},
    );
    setScheduleRowErrors({});

    return response.data;
  };

  const loadCallHistory = async (rowIndex) => {
    const token = getAuthToken();
    if (!token) throw new Error('Session expired. Please login again.');

    const response = await axios.get(`${API_BASE_URL}/api/calls`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        datasetId,
        rowIndex: getOriginalRowIndex(rowIndex),
      },
    });

    setCallHistory(response.data.calls || []);
    return response.data.calls || [];
  };

  const loadCallConfiguration = async () => {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/calls/configuration`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCallConfiguration(response.data);
      return response.data;
    } catch {
      setCallConfiguration({
        providerMode: 'device',
        recordingEnabled: false,
        missingConfiguration: [],
      });
      return null;
    }
  };

  const launchDeviceDialer = (dialUrl) => {
    if (dialUrl) window.location.href = dialUrl;
  };

  const loadCallRecording = async (call, rowIndex = null) => {
    const token = getAuthToken();
    if (!token || !call?._id) return;

    const targetRowIndex = rowIndex ?? actionModal?.rowIndex ?? callModal?.rowIndex;
    setLoadingRecordings((previous) => ({ ...previous, [call._id]: true }));
    setCallError('');

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/calls/${call._id}/recording`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            datasetId,
            rowIndex: getOriginalRowIndex(targetRowIndex),
          },
          responseType: 'blob',
        },
      );
      const audioUrl = window.URL.createObjectURL(response.data);
      setRecordingAudioUrls((previous) => ({ ...previous, [call._id]: audioUrl }));
    } catch (requestError) {
      setCallError(
        requestError.response?.data?.message ||
          'Recording is not available yet. Refresh the history after the call ends.',
      );
    } finally {
      setLoadingRecordings((previous) => ({ ...previous, [call._id]: false }));
    }
  };

  const startClientCall = async (rowIndex, phoneNumber, row) => {
    const token = getAuthToken();
    if (!token) {
      setCallError('Session expired. Please login again.');
      return;
    }

    const clientName =
      getFirstCellValue(tableData.columns, row, [
        'Account Name',
        'Client Name',
        'Company Name',
        'Full Name',
        'Contact Name',
      ]) || `Client ${getOriginalRowIndex(rowIndex) + 1}`;

    setCallError('');
    setCallOutcome('');
    setCallNotes('');
    setCallHistory([]);
    setIsStartingCall(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/calls/start`,
        {
          datasetId,
          rowIndex: getOriginalRowIndex(rowIndex),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const call = response.data.call;
      setCallElapsedSeconds(0);
      setCallModal({
        call,
        rowIndex,
        clientName: call.clientName || clientName,
        phoneNumber: call.phoneNumber || phoneNumber,
        dialUrl: response.data.dialUrl,
        providerMode: response.data.providerMode || call.providerMode,
        providerMessage: response.data.message,
      });
      setCallHistory([call]);
      loadCallHistory(rowIndex).catch(() => {});
      if (response.data.dialUrl) {
        window.setTimeout(() => launchDeviceDialer(response.data.dialUrl), 50);
      }
    } catch (requestError) {
      setCallError(
        requestError.response?.data?.message || 'Unable to start this call from CRM.',
      );
    } finally {
      setIsStartingCall(false);
    }
  };

  const completeClientCall = async () => {
    if (!callModal?.call?._id) return;
    if (!callOutcome) {
      setCallError('Select the call outcome before saving.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setCallError('Session expired. Please login again.');
      return;
    }

    setCallError('');
    setIsCompletingCall(true);

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/calls/${callModal.call._id}/complete`,
        {
          datasetId,
          rowIndex: getOriginalRowIndex(callModal.rowIndex),
          outcome: callOutcome,
          notes: callNotes,
          durationSeconds: callElapsedSeconds,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const savedCall = response.data.call;
      setCallModal((previous) => ({ ...previous, call: savedCall, saved: true }));
      setCallHistory((previous) => [
        savedCall,
        ...previous.filter((call) => String(call._id) !== String(savedCall._id)),
      ]);
    } catch (requestError) {
      setCallError(requestError.response?.data?.message || 'Unable to save the call record.');
    } finally {
      setIsCompletingCall(false);
    }
  };

  const closeCallModal = () => {
    if (
      callModal?.call?.status === 'Initiated' &&
      !window.confirm('This call is not completed yet. Close without saving an outcome?')
    ) {
      return;
    }

    setCallModal(null);
    setCallError('');
    setCallOutcome('');
    setCallNotes('');
    setCallElapsedSeconds(0);
  };

  const handleAssignRows = async () => {
    setAssignmentMessage('');
    setAssignmentError('');

    if (
      assignmentMode === 'selected' &&
      selectedRows.length === 0
    ) {
      setAssignmentError(
        'Select at least one row',
      );
      return;
    }

    if (!selectedEmployeeIds.length) {
      setAssignmentError(
        'Select at least one employee',
      );
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setAssignmentError(
        'Session expired. Please login again.',
      );
      return;
    }

    setIsAssigning(true);

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/client-datasets/${datasetId}/assign`,
        {
          rowIndexes: selectedRows.map(
            getOriginalRowIndex,
          ),

          employeeIds: selectedEmployeeIds,

          assignmentMode,

          limit:
            assignmentMode === 'limited'
              ? Number(recordLimit)
              : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      updateAssignmentState(response.data);

      setAssignmentMessage(
        response.data.message ||
          'Data assigned successfully',
      );
    } catch (requestError) {
      setAssignmentError(
        requestError.response?.data?.message ||
          'Unable to assign selected rows',
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignRows = async () => {
    setAssignmentMessage('');
    setAssignmentError('');

    if (!selectedRows.length) {
      setAssignmentError(
        'Select at least one row',
      );
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setAssignmentError(
        'Session expired. Please login again.',
      );
      return;
    }

    setIsAssigning(true);

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/client-datasets/${datasetId}/unassign`,
        {
          rowIndexes: selectedRows.map(
            getOriginalRowIndex,
          ),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      updateAssignmentState(response.data);

      // Refresh from backend after unassign.
      await refreshDataset();

      setSelectedRows([]);

      setAssignmentMessage(
        response.data.message ||
          'Rows unassigned successfully',
      );
    } catch (requestError) {
      setAssignmentError(
        requestError.response?.data?.message ||
          'Unable to unassign selected rows',
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const openActionModal = (rowIndex, row) => {
    setSaveError('');
    setActionMessage('');
    setActionSaved(false);
    setCallHistory([]);
    setCallError('');

    setActionModal({
      rowIndex,

      row,

      clientName:
        getFirstCellValue(tableData.columns, row, [
          'Account Name',
          'Client Name',
          'Company Name',
          'Full Name',
          'Contact Name',
        ]) || `Client ${getOriginalRowIndex(rowIndex) + 1}`,

      phoneNumbers: getGroupedContactValues(row, phoneColumnIndexes),

      selectedPhone: getGroupedContactValues(row, phoneColumnIndexes)[0] || '',

      status: row[statusIndex] || '',

      remark: row[remarkIndex] || '',

      followUpDate:
        getFollowUpDate(rowIndex),
    });

    loadCallHistory(rowIndex).catch(() => {
      setCallError('Unable to load call history for this client.');
    });
    loadCallConfiguration();
  };

  const closeActionModal = () => {
    setActionModal(null);
    setSaveError('');
    setActionMessage('');
    setActionSaved(false);
  };

  const saveActionChanges = async (
    { scheduleAfterSave = false } = {},
  ) => {
    if (!actionModal || !canUpdate) {
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setSaveError(
        'Session expired. Please login again.',
      );
      return;
    }

    const rowIndex = actionModal.rowIndex;

    const originalRowIndex =
      getOriginalRowIndex(rowIndex);

    setSaveError('');
    setActionMessage('');

    setSavingRows((previous) => ({
      ...previous,
      [rowIndex]: true,
    }));

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/client-datasets/${datasetId}/rows/${originalRowIndex}/status`,
        {
          status: actionModal.status || '',

          remark: actionModal.remark || '',

          followUpDate:
            actionModal.status === 'Follow Up'
              ? actionModal.followUpDate || ''
              : '',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setDataset((previous) => {
        const normalized =
          addWorkColumnsAfterWebsite(
            previous.columns,
            previous.rows,
          );

        const nextRows = normalized.rows.map(
          (row, currentRowIndex) =>
            getOriginalRowIndex(currentRowIndex) ===
            Number(response.data.rowIndex)
              ? response.data.row
              : row,
        );

        const nextRowLogs =
          response.data.rowLog
            ? [
                ...(previous.rowLogs || []).filter(
                  (rowLog) =>
                    Number(rowLog.rowIndex) !==
                    Number(
                      response.data.rowIndex,
                    ),
                ),

                response.data.rowLog,
              ]
            : previous.rowLogs;

        return {
          ...previous,

          columns:
            response.data.columns ||
            normalized.columns,

          rows: nextRows,

          rowLogs: nextRowLogs,
        };
      });

      if (response.data.followUpDates) {
        setFollowUpDates(
          response.data.followUpDates,
        );
      } else {
        setFollowUpDates((previous) => {
          const next = {
            ...previous,
          };

          const key =
            String(originalRowIndex);

          const nextDate =
            response.data.followUpDate || '';

          if (nextDate) {
            next[key] = nextDate;
          } else {
            delete next[key];
          }

          return next;
        });
      }

      if (scheduleAfterSave) {
        const schedulerOpened = await scheduleMeetingForRow(rowIndex, {
          showInModal: true,
        });
        if (!schedulerOpened) {
          setActionMessage(
            'Client status and remark were saved successfully.',
          );
        }
        return;
      }

      setActionMessage(
        'Your action saved successfully.',
      );

      setActionSaved(true);

      window.setTimeout(() => {
        setActionModal(null);
        setActionSaved(false);
        setActionMessage('');
        setSaveError('');
      }, 900);
    } catch (requestError) {
      setSaveError(
        requestError.response?.data?.message ||
          'Unable to save client action. Please try again.',
      );
    } finally {
      setSavingRows((previous) => ({
        ...previous,
        [rowIndex]: false,
      }));
    }
  };

  const currentActionRowLog =
    actionModal
      ? getRowLog(
          dataset.rowLogs || [],
          getOriginalRowIndex(
            actionModal.rowIndex,
          ),
        )
      : null;

  const currentActionEntries = [
    ...(currentActionRowLog?.entries || []),
  ].reverse();

  return (
    <div className="w-full space-y-5">
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            to={backLink}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            ← {backLabel}
          </Link>

          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            {dataset.name}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {dataset.year || 'No year'} · Uploaded{' '}
            {formatDate(dataset.createdAt)} ·{' '}
            {dataset.rowCount} rows
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            {dataset.businessUnitName ||
              dataset.tableFormat ||
              'Sales Data'}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
            {dataset.originalFileName}
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 bg-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Client data table
          </h2>

          <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search client, phone, email, city, source..."
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 xl:max-w-sm"
              />

              <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setStatusFilter(value);

                    if (value !== 'Follow Up') {
                      setFollowUpDateFilter('');
                    }
                  }}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="all">
                    All statuses
                  </option>

                  {CLIENT_STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={employeeFilter}
                  onChange={(event) =>
                    setEmployeeFilter(
                      event.target.value,
                    )
                  }
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="all">
                    All employees
                  </option>

                  {eligibleEmployees.map(
                    (employee) => (
                      <option
                        key={employee._id}
                        value={String(
                          employee._id,
                        )}
                      >
                        {employee.name ||
                          employee.email}
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={assignmentFilter}
                  onChange={(event) =>
                    setAssignmentFilter(
                      event.target.value,
                    )
                  }
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="all">
                    All assignments
                  </option>

                  <option value="assigned">
                    Assigned
                  </option>

                  <option value="unassigned">
                    Unassigned
                  </option>
                </select>

                {sourceIndex !== -1 ? (
                  <select
                    value={sourceFilter}
                    onChange={(event) =>
                      setSourceFilter(
                        event.target.value,
                      )
                    }
                    className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="all">
                      All sources
                    </option>

                    {sourceOptions.map(
                      (source) => (
                        <option
                          key={source}
                          value={source}
                        >
                          {source}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <div className="hidden xl:block" />
                )}
              </div>
            </div>

            {statusFilter === 'Follow Up' && (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-violet-200 bg-violet-50/70 p-3">
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-violet-700">
                    Follow-up date
                  </span>

                  <input
                    type="date"
                    min={todayDateKey}
                    value={followUpDateFilter}
                    onChange={(event) =>
                      setFollowUpDateFilter(
                        event.target.value,
                      )
                    }
                    className="h-9 rounded-lg border border-violet-300 bg-white px-3 text-xs font-semibold text-violet-800 outline-none"
                  />
                </label>

                <p className="pb-2 text-xs font-medium text-violet-700">
                  Today first, then upcoming
                  follow-ups.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>
                  {visibleRows.length}{' '}
                  visible client
                  {visibleRows.length === 1
                    ? ''
                    : 's'}
                </span>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-bold text-blue-700 hover:underline"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  [
                    'all',
                    'All',
                    statusCounts.all || 0,
                  ],

                  [
                    'Pending',
                    'Pending',
                    statusCounts.Pending || 0,
                  ],

                  [
                    'Contacted',
                    'Contacted',
                    statusCounts.Contacted || 0,
                  ],

                  [
                    'Follow Up',
                    'Follow-up',
                    statusCounts['Follow Up'] || 0,
                  ],

                  [
                    'Interested',
                    'Interested',
                    statusCounts.Interested || 0,
                  ],

                  [
                    'Converted',
                    'Converted',
                    statusCounts.Converted || 0,
                  ],
                ].map(
                  ([value, label, count]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(value);

                        if (
                          value !== 'Follow Up'
                        ) {
                          setFollowUpDateFilter('');
                        }
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        statusFilter === value
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      {label}{' '}

                      <span className="ml-1 opacity-80">
                        {count}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid gap-3 lg:grid-cols-[auto_minmax(10rem,0.7fr)_minmax(16rem,1.2fr)_auto] lg:items-end">
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Row selection
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectUnassignedRows}
                      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-blue-50"
                    >
                      Select free rows
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRows([])
                      }
                      disabled={!selectedRows.length}
                      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <label>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Distribution
                  </span>

                  <select
                    value={assignmentMode}
                    onChange={(event) =>
                      setAssignmentMode(
                        event.target.value,
                      )
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="full">
                      Full data (
                      {tableData.rows.length})
                    </option>

                    <option value="half">
                      Half data (
                      {Math.ceil(
                        tableData.rows.length / 2,
                      )}
                      )
                    </option>

                    <option value="limited">
                      Limited records
                    </option>

                    <option value="selected">
                      Selected rows (
                      {selectedRows.length})
                    </option>
                  </select>
                </label>

                <div className="relative">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Assign employees
                  </span>

                  <details className="group relative">
                    <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm">
                      <span>
                        {selectedEmployees.length
                          ? `${selectedEmployees.length} selected`
                          : 'Select employees'}
                      </span>

                      <span>⌄</span>
                    </summary>

                    <div className="absolute right-0 z-40 mt-2 w-full min-w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      <div className="max-h-60 space-y-1 overflow-y-auto">
                        {eligibleEmployees.map(
                          (employee) => {
                            const checked =
                              selectedEmployeeIds.includes(
                                employee._id,
                              );

                            return (
                              <label
                                key={employee._id}
                                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setSelectedEmployeeIds(
                                      (previous) =>
                                        checked
                                          ? previous.filter(
                                              (id) =>
                                                id !==
                                                employee._id,
                                            )
                                          : [
                                              ...previous,
                                              employee._id,
                                            ],
                                    )
                                  }
                                />

                                <span className="text-sm font-semibold text-slate-800">
                                  {employee.name ||
                                    employee.email}
                                </span>
                              </label>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </details>
                </div>

                <div className="flex items-end gap-2">
                  {assignmentMode === 'limited' && (
                    <input
                      type="number"
                      min="1"
                      max={tableData.rows.length}
                      value={recordLimit}
                      onChange={(event) =>
                        setRecordLimit(
                          event.target.value,
                        )
                      }
                      placeholder="Qty"
                      className="h-10 w-24 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleAssignRows}
                    disabled={
                      isAssigning ||
                      !selectedEmployeeIds.length
                    }
                    className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
                  >
                    {isAssigning
                      ? 'Working...'
                      : 'Assign'}
                  </button>

                  <button
                    type="button"
                    onClick={handleUnassignRows}
                    disabled={
                      isAssigning ||
                      !selectedRows.length
                    }
                    className="h-10 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 disabled:opacity-40"
                  >
                    Unassign
                  </button>
                </div>
              </div>

              {assignmentMessage && (
                <p className="mt-2 text-xs font-semibold text-emerald-600">
                  {assignmentMessage}
                </p>
              )}

              {assignmentError && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  {assignmentError}
                </p>
              )}
            </div>
          )}
        </div>

        {callError && !callModal && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
            {callError}
          </div>
        )}

        <div className="client-table-scrollbar overflow-x-auto overscroll-x-contain border-t border-slate-200 bg-slate-50/70 pb-1">
          <table className="min-w-max border-collapse bg-white text-left text-xs">
            <thead>
              <tr className="bg-slate-100">
                {isAdmin && (
                  <th className="w-16 min-w-16 whitespace-nowrap border border-slate-300 px-2 py-2 text-center font-semibold text-slate-800">
                    Select
                  </th>
                )}

                <th className="w-14 min-w-14 whitespace-nowrap border border-slate-300 px-2 py-2 text-center font-semibold text-slate-800">
                  S.No.
                </th>

                {displayColumnIndexes.map(
                  (columnIndex) => {
                    const column =
                      tableData.columns[
                        columnIndex
                      ];

                    const normalizedColumn =
                      normalizeColumnName(column);

                    const label =
                      columnIndex ===
                      primaryPhoneIndex
                        ? 'Mobile'
                        : columnIndex ===
                            primaryEmailIndex
                          ? 'Email'
                          : normalizedColumn ===
                              'employee'
                            ? 'Assigned To'
                            : column;

                    return (
                      <th
                        key={`${column}-${columnIndex}`}
                        className={`${getCompactColumnWidth(column)} whitespace-nowrap border border-slate-300 px-2.5 py-2 font-semibold text-slate-800`}
                      >
                        {label}
                      </th>
                    );
                  },
                )}

                <th className="w-36 min-w-36 whitespace-nowrap border border-slate-300 px-2.5 py-2 text-center font-semibold text-slate-800">
                  Follow-up Date
                </th>

                <th className="w-48 min-w-48 whitespace-nowrap border border-slate-300 px-2.5 py-2 text-center font-semibold text-slate-800">
                  Meeting
                </th>

                <th className="w-16 min-w-16 whitespace-nowrap border border-slate-300 px-2 py-2 text-center font-semibold text-slate-800">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map(
                (
                  { row, rowIndex },
                  visibleIndex,
                ) => {
                  const rowStatus =
                    row[statusIndex] || '';

                  const rowFollowUpDate =
                    getFollowUpDate(rowIndex);

                  const isSchedulingMeeting =
                    Boolean(
                      schedulingRows[rowIndex],
                    );

                  const scheduleRowIssue =
                    scheduleRowErrors[rowIndex] ||
                    null;

                  const rowClass =
                    STATUS_ROW_STYLES[
                      rowStatus
                    ] ||
                    (visibleIndex % 2 === 0
                      ? 'bg-white'
                      : 'bg-slate-50');

                  const rowMeetings =
                    getRowMeetings(rowIndex);

                  const primaryMeeting =
                    getPrimaryMeeting(rowMeetings);

                  const hasUpcomingScheduledMeeting =
                    rowMeetings.some(
                      (meeting) =>
                        String(
                          meeting.status ||
                            'scheduled',
                        ).toLowerCase() ===
                          'scheduled' &&
                        meeting.meetingDate >=
                          todayDateKey,
                    );

                  const primaryMeetingId =
                    primaryMeeting?._id ||
                    primaryMeeting?.meetingId;

                  const primaryMeetingStatus =
                    String(
                      primaryMeeting?.status ||
                        'scheduled',
                    ).toLowerCase();

                  const meetingStatusClass =
                    primaryMeetingStatus ===
                    'cancelled'
                      ? 'bg-rose-50 text-rose-700'
                      : primaryMeetingStatus ===
                          'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-blue-50 text-blue-700';

                  const meetingSummary =
                    primaryMeeting ? (
                      <>
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meetingStatusClass}`}
                        >
                          <CalendarIcon />
                        </span>

                        <span className="min-w-0 text-left">
                          <span className="block whitespace-nowrap text-xs font-bold text-slate-800">
                            {formatMeetingDateTime(
                              primaryMeeting,
                            )}
                          </span>

                          <span className="mt-0.5 block max-w-44 truncate text-[11px] font-medium text-slate-500">
                            {primaryMeeting.meetingTitle ||
                              primaryMeetingStatus}
                          </span>
                        </span>
                      </>
                    ) : null;

                  return (
                    <tr
                      key={rowIndex}
                      className={`${rowClass} transition hover:brightness-[0.99]`}
                    >
                      {isAdmin && (
                        <td className="w-16 border border-slate-300 px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(
                              rowIndex,
                            )}
                            onChange={() =>
                              toggleRowSelection(
                                rowIndex,
                              )
                            }
                            className="h-4 w-4 cursor-pointer rounded border-slate-300"
                          />
                        </td>
                      )}

                      <td className="w-14 whitespace-nowrap border border-slate-300 px-2 py-2 text-center text-[11px] font-semibold text-slate-500">
                        {getOriginalRowIndex(
                          rowIndex,
                        ) + 1}
                      </td>

                      {displayColumnIndexes.map(
                        (columnIndex) => {
                          const column =
                            tableData.columns[
                              columnIndex
                            ];

                          const normalizedColumn =
                            normalizeColumnName(
                              column,
                            );

                          if (
                            columnIndex ===
                            primaryPhoneIndex
                          ) {
                            return (
                              <td
                                key={`${rowIndex}-mobile`}
                                className="w-40 min-w-40 max-w-40 border border-slate-300 px-2.5 py-2"
                              >
                                <ContactCell
                                  values={getGroupedContactValues(
                                    row,
                                    phoneColumnIndexes,
                                  )}
                                  type="Mobile"
                                />
                              </td>
                            );
                          }

                          if (
                            columnIndex ===
                            primaryEmailIndex
                          ) {
                            return (
                              <td
                                key={`${rowIndex}-email`}
                                className="w-40 min-w-40 max-w-40 border border-slate-300 px-2.5 py-2"
                              >
                                <ContactCell
                                  values={getGroupedContactValues(
                                    row,
                                    emailColumnIndexes,
                                  )}
                                  type="Email"
                                />
                              </td>
                            );
                          }

                          if (
                            normalizedColumn ===
                            'employee'
                          ) {
                            const originalIndex =
                              getOriginalRowIndex(
                                rowIndex,
                              );

                            const assignments =
                              assignmentMap.get(
                                originalIndex,
                              ) || [];

                            const employeeNames =
                              assignments
                                .map(
                                  (assignment) =>
                                    assignment.employeeName,
                                )
                                .filter(Boolean);

                            if (
                              !employeeNames.length &&
                              row[columnIndex]
                            ) {
                              employeeNames.push(
                                row[columnIndex],
                              );
                            }

                            return (
                              <td
                                key={`${rowIndex}-${column}-${columnIndex}`}
                                className={`${getCompactColumnWidth(column)} border border-slate-300 px-2.5 py-2`}
                              >
                                {employeeNames.length ? (
                                  <div className="flex max-w-40 flex-wrap gap-1">
                                    {employeeNames.map(
                                      (
                                        employeeName,
                                      ) => (
                                        <span
                                          key={
                                            employeeName
                                          }
                                          title={employeeName}
                                          className="max-w-36 truncate rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                                        >
                                          {
                                            employeeName
                                          }
                                        </span>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs font-medium text-slate-400">
                                    Unassigned
                                  </span>
                                )}
                              </td>
                            );
                          }

                          return (
                            <td
                              key={`${rowIndex}-${column}-${columnIndex}`}
                              className={`${getCompactColumnWidth(column)} border border-slate-300 px-2.5 py-2 text-slate-700`}
                            >
                              <span
                                title={String(row[columnIndex] || '')}
                                className={`block line-clamp-2 leading-4 ${
                                  normalizedColumn.includes('website')
                                    ? 'break-all'
                                    : 'break-words'
                                }`}
                              >
                                {row[columnIndex] || '—'}
                              </span>
                            </td>
                          );
                        },
                      )}

                      <td className="w-36 min-w-36 border border-slate-300 px-2.5 py-2 text-center">
                        {rowStatus === 'Follow Up' ? (
                          rowFollowUpDate ? (
                            <span
                              title={rowFollowUpDate}
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-bold ${
                                rowFollowUpDate < todayDateKey
                                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                                  : rowFollowUpDate === todayDateKey
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-violet-200 bg-violet-50 text-violet-700'
                              }`}
                            >
                              <CalendarIcon />
                              {formatFollowUpDate(rowFollowUpDate)}
                            </span>
                          ) : (
                            <span className="whitespace-nowrap text-[11px] font-semibold text-amber-700">
                              Date not set
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="w-48 min-w-48 max-w-48 border border-slate-300 px-2.5 py-2">
                        {primaryMeeting ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              {primaryMeetingId && canViewMeetings ? (
                                <Link
                                  to={`/dashboard/meetings?meetingId=${encodeURIComponent(primaryMeetingId)}`}
                                  title="Open meeting"
                                  className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/60"
                                >
                                  {meetingSummary}
                                </Link>
                              ) : (
                                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                  {meetingSummary}
                                </div>
                              )}

                              {rowMeetings.length > 1 && (
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                                  +{rowMeetings.length - 1}
                                </span>
                              )}

                              {rowStatus ===
                                'Interested' &&
                                canScheduleMeeting &&
                                !scheduleRowIssue?.blocking &&
                                !hasUpcomingScheduledMeeting && (
                                  <button
                                    type="button"
                                    title="Schedule another meeting"
                                    onClick={() =>
                                      scheduleMeetingForRow(
                                        rowIndex,
                                      )
                                    }
                                    disabled={isSchedulingMeeting}
                                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-cyan-300 bg-cyan-50 px-2 text-[11px] font-bold text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-100 disabled:cursor-wait disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                  >
                                    <CalendarIcon />
                                    {isSchedulingMeeting
                                      ? 'Checking...'
                                      : 'New'}
                                  </button>
                                )}
                            </div>

                            {rowStatus ===
                              'Interested' &&
                              canScheduleMeeting &&
                              !hasUpcomingScheduledMeeting &&
                              scheduleRowIssue?.blocking && (
                                <p className="max-w-64 text-[11px] font-semibold leading-4 text-amber-700">
                                  {scheduleRowIssue.message}
                                </p>
                              )}

                            {scheduleRowIssue &&
                              !scheduleRowIssue.blocking && (
                                <p className="max-w-64 text-[11px] font-semibold leading-4 text-rose-700">
                                  {scheduleRowIssue.message}
                                </p>
                              )}
                          </div>
                        ) : rowStatus ===
                            'Interested' &&
                          canScheduleMeeting ? (
                          <div className="space-y-1.5 text-center">
                            {!scheduleRowIssue?.blocking ? (
                              <button
                                type="button"
                                onClick={() =>
                                  scheduleMeetingForRow(
                                    rowIndex,
                                  )
                                }
                                disabled={isSchedulingMeeting}
                                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-100 disabled:cursor-wait disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                <CalendarIcon />
                                {isSchedulingMeeting
                                  ? 'Checking access...'
                                  : 'Schedule meeting'}
                              </button>
                            ) : (
                              <p className="mx-auto max-w-64 text-[11px] font-semibold leading-4 text-amber-700">
                                {scheduleRowIssue.message}
                              </p>
                            )}

                            {scheduleRowIssue &&
                              !scheduleRowIssue.blocking && (
                                <p className="mx-auto max-w-64 text-[11px] font-semibold leading-4 text-rose-700">
                                  {scheduleRowIssue.message}
                                </p>
                              )}
                          </div>
                        ) : (
                          <span className="block text-center text-xs font-medium text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="w-16 border border-slate-300 px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            openActionModal(
                              rowIndex,
                              row,
                            )
                          }
                          title="Open actions"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <MessageIcon />
                        </button>
                      </td>
                    </tr>
                  );
                },
              )}

              {!visibleRows.length && (
                <tr>
                  <td
                    colSpan={
                      displayColumnIndexes.length +
                      4 +
                      (isAdmin ? 1 : 0)
                    }
                    className="border border-slate-300 px-3 py-10 text-center text-slate-500"
                  >
                    {tableData.rows.length
                      ? 'No clients match the selected filters.'
                      : 'No rows found in this file.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {callModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-50/70 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <PhoneIcon />
                </span>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    CRM outbound call
                  </p>
                  <h3 className="text-lg font-semibold text-slate-950">
                    {callModal.clientName}
                  </h3>
                  <p className="text-sm font-medium text-slate-600">
                    {callModal.phoneNumber}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCallModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="max-h-[calc(92vh-80px)] overflow-y-auto p-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      {callModal.call.status === 'Initiated'
                        ? 'Call in progress'
                        : 'Call saved'}
                    </p>
                    <p className="mt-1 font-mono text-3xl font-bold text-emerald-700">
                      {formatCallDuration(
                        callModal.call.status === 'Initiated'
                          ? callElapsedSeconds
                          : callModal.call.durationSeconds,
                      )}
                    </p>
                  </div>

                  {callModal.dialUrl ? (
                    <button
                      type="button"
                      onClick={() => launchDeviceDialer(callModal.dialUrl)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <PhoneIcon /> Open dialer again
                    </button>
                  ) : (
                    <span className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700">
                      Recorded cloud call
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs leading-5 text-emerald-800">
                  {callModal.providerMode === 'cloud'
                    ? callModal.providerMessage ||
                      'Answer the call on your registered phone. Exotel will then connect the client and attach the recording to CRM history.'
                    : 'This fallback uses the device phone app and saves only the call log, not audio. Configure Exotel for recorded CRM calls.'}
                </p>
              </div>

              {callModal.call.status === 'Initiated' ? (
                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">
                      Call outcome *
                    </span>
                    <select
                      value={callOutcome}
                      onChange={(event) => {
                        setCallOutcome(event.target.value);
                        setCallError('');
                      }}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="">Select outcome</option>
                      {CALL_OUTCOMES.map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {outcome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">
                      Call notes
                    </span>
                    <textarea
                      rows="3"
                      value={callNotes}
                      onChange={(event) => setCallNotes(event.target.value)}
                      placeholder="Requirement discussed, next action, client response..."
                      className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>

                  {callError && (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                      {callError}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={completeClientCall}
                      disabled={isCompletingCall}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
                    >
                      <CheckIcon />
                      {isCompletingCall ? 'Saving call...' : 'Complete & save call'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="font-bold text-emerald-800">Call record saved successfully</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    Outcome: {callModal.call.outcome || 'Completed'}
                  </p>
                </div>
              )}

              <section className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      Call history
                    </p>
                    <h4 className="mt-0.5 font-semibold text-slate-950">
                      Previous CRM calls
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadCallHistory(callModal.rowIndex)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                    >
                      Refresh
                    </button>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {callHistory.length}
                    </span>
                  </div>
                </div>

                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {callHistory.map((call) => (
                    <CallHistoryEntry
                      key={call._id}
                      call={call}
                      recordingAudioUrl={recordingAudioUrls[call._id]}
                      isRecordingLoading={loadingRecordings[call._id]}
                      onLoadRecording={(selectedCall) =>
                        loadCallRecording(selectedCall, callModal.rowIndex)
                      }
                    />
                  ))}

                  {!callHistory.length && (
                    <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                      No previous calls found.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Client actions
                </p>

                <h3 className="text-lg font-semibold text-slate-950">
                  Status, remark & log
                </h3>
              </div>

              <button
                type="button"
                onClick={closeActionModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
              >
                <CloseIcon />
              </button>
            </div>

            {actionSaved ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-10 w-10 fill-none stroke-current"
                    strokeWidth="2.5"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-950">
                  Your action saved successfully
                </h3>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  Status and remark have been updated.
                </p>
              </div>
            ) : (
              <div className="max-h-[calc(90vh-74px)] overflow-y-auto p-5">
                <div className="space-y-5">
                  <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                          Call client
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-slate-900">
                          {actionModal.clientName}
                        </p>

                        {actionModal.phoneNumbers.length > 1 ? (
                          <select
                            value={actionModal.selectedPhone}
                            onChange={(event) =>
                              setActionModal((previous) => ({
                                ...previous,
                                selectedPhone: event.target.value,
                              }))
                            }
                            className="mt-2 h-10 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-100"
                          >
                            {actionModal.phoneNumbers.map((phoneNumber) => (
                              <option key={phoneNumber} value={phoneNumber}>
                                {phoneNumber}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            {actionModal.selectedPhone || 'No phone number available'}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          startClientCall(
                            actionModal.rowIndex,
                            actionModal.selectedPhone,
                            actionModal.row,
                          )
                        }
                        disabled={!actionModal.selectedPhone || isStartingCall}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <PhoneIcon /> {isStartingCall ? 'Starting...' : 'Call from CRM'}
                      </button>
                    </div>

                    {callConfiguration?.recordingEnabled ? (
                      <p className="mt-3 rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 text-xs font-semibold text-emerald-700">
                        Cloud recording is ON. Audio will appear in Client history after the call ends.
                      </p>
                    ) : (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                        Audio recording is OFF. Configure CALL_PROVIDER=exotel and Exotel credentials in the backend .env; device-dialer calls only save call logs.
                      </p>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                        Status
                      </span>

                      <select
                        value={actionModal.status}
                        disabled={!canUpdate}
                        onChange={(event) => {
                          const nextStatus =
                            event.target.value;

                          setSaveError('');
                          setActionMessage('');

                          setActionModal(
                            (previous) => ({
                              ...previous,

                              status: nextStatus,

                              followUpDate:
                                nextStatus ===
                                'Follow Up'
                                  ? previous.followUpDate ||
                                    ''
                                  : '',
                            }),
                          );
                        }}
                        className={`h-10 w-full rounded-lg border px-3 text-sm font-bold outline-none transition focus:ring-2 focus:ring-blue-100 ${
                          STATUS_SELECT_STYLES[
                            actionModal.status
                          ] ||
                          STATUS_SELECT_STYLES['']
                        }`}
                      >
                        <option value="">
                          Select status
                        </option>

                        {CLIENT_STATUS_OPTIONS.map(
                          (status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    {actionModal.status ===
                      'Follow Up' && (
                      <label className="mt-4 block">
                        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-violet-700">
                          Follow-up date
                        </span>

                        <input
                          type="date"
                          min={todayDateKey}
                          value={
                            actionModal.followUpDate ||
                            ''
                          }
                          disabled={!canUpdate}
                          onChange={(event) => {
                            setSaveError('');
                            setActionMessage('');

                            setActionModal(
                              (previous) => ({
                                ...previous,

                                followUpDate:
                                  event.target
                                    .value,
                              }),
                            );
                          }}
                          className="h-10 w-full rounded-lg border border-violet-300 bg-violet-50 px-3 text-sm font-semibold text-violet-800 outline-none focus:ring-2 focus:ring-violet-100"
                        />
                      </label>
                    )}

                    <label className="mt-4 block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                        Remark
                      </span>

                      <textarea
                        rows="4"
                        value={actionModal.remark}
                        disabled={!canUpdate}
                        onChange={(event) => {
                          setSaveError('');
                          setActionMessage('');

                          setActionModal(
                            (previous) => ({
                              ...previous,

                              remark:
                                event.target.value,
                            }),
                          );
                        }}
                        placeholder="Write remark here..."
                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                      />
                    </label>

                    {actionModal.status ===
                      'Interested' &&
                      canScheduleMeeting &&
                      scheduleRowErrors[
                        actionModal.rowIndex
                      ]?.blocking && (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                          {
                            scheduleRowErrors[
                              actionModal
                                .rowIndex
                            ].message
                          }
                        </p>
                      )}

                    {saveError && (
                      <p className="mt-3 text-xs font-semibold text-red-600">
                        {saveError}
                      </p>
                    )}

                    {actionMessage && (
                      <p className="mt-3 text-xs font-semibold text-emerald-600">
                        {actionMessage}
                      </p>
                    )}

                    {canUpdate && (
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        {actionModal.status ===
                          'Interested' &&
                          canScheduleMeeting &&
                          !scheduleRowErrors[
                            actionModal.rowIndex
                          ]?.blocking && (
                            <button
                              type="button"
                              onClick={() =>
                                saveActionChanges({
                                  scheduleAfterSave:
                                    true,
                                })
                              }
                              disabled={
                                savingRows[
                                  actionModal
                                    .rowIndex
                                ]
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800 transition hover:border-cyan-400 hover:bg-cyan-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <CalendarIcon />

                              {savingRows[
                                actionModal.rowIndex
                              ]
                                ? 'Saving...'
                                : 'Save & schedule meeting'}
                            </button>
                          )}

                        <button
                          type="button"
                          onClick={() =>
                            saveActionChanges()
                          }
                          disabled={
                            savingRows[
                              actionModal.rowIndex
                            ]
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
                        >
                          <CheckIcon />

                          {savingRows[
                            actionModal.rowIndex
                          ]
                            ? 'Saving...'
                            : 'Save changes'}
                        </button>
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                          Activity log
                        </p>

                        <h4 className="mt-0.5 text-base font-semibold text-slate-950">
                          Client history
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadCallHistory(actionModal.rowIndex)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                        >
                          Refresh calls
                        </button>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {currentActionEntries.length + callHistory.length} entries
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                      {callHistory.map((call) => (
                        <CallHistoryEntry
                          key={`call-${call._id}`}
                          call={call}
                          recordingAudioUrl={recordingAudioUrls[call._id]}
                          isRecordingLoading={loadingRecordings[call._id]}
                          onLoadRecording={(selectedCall) =>
                            loadCallRecording(selectedCall, actionModal.rowIndex)
                          }
                        />
                      ))}

                      {currentActionEntries.map(
                        (entry, index) => (
                          <div
                            key={`${entry.changedAt}-${index}`}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">
                                  {entry.statusChanged &&
                                  entry.remarkChanged
                                    ? 'Status and remark updated'
                                    : entry.statusChanged
                                      ? 'Status updated'
                                      : 'Remark updated'}
                                </p>

                                <p className="mt-0.5 text-xs font-medium text-blue-700">
                                  Updated by{' '}
                                  {entry.changedByName ||
                                    entry.changedBy
                                      ?.name ||
                                    entry.changedBy
                                      ?.email ||
                                    'Unknown user'}
                                </p>
                              </div>

                              <p className="text-xs font-medium text-slate-500">
                                {formatDate(
                                  entry.changedAt,
                                )}
                              </p>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {entry.statusChanged && (
                                <div className="rounded-lg bg-slate-50 p-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Status
                                  </p>

                                  <p className="mt-1 text-sm text-slate-700">
                                    {entry.previousStatus ||
                                      'Empty'}{' '}
                                    →{' '}
                                    <strong>
                                      {entry.currentStatus ||
                                        'Empty'}
                                    </strong>
                                  </p>
                                </div>
                              )}

                              {entry.remarkChanged && (
                                <div className="rounded-lg bg-slate-50 p-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Remark
                                  </p>

                                  <p className="mt-1 break-words text-sm text-slate-700">
                                    {entry.previousRemark ||
                                      'Empty'}{' '}
                                    →{' '}
                                    <strong>
                                      {entry.currentRemark ||
                                        'Empty'}
                                    </strong>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      )}

                      {!currentActionEntries.length && !callHistory.length && (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                          <p className="text-sm font-semibold text-slate-700">
                            No activity yet
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Calls, status and remark updates will appear here.
                          </p>
                        </div>
                      )}

                      {callError && (
                        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                          {callError}
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDatasetDetail;
