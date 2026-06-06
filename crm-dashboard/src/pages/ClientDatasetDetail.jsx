import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { getAuthenticatedRole, getValidToken } from '../utils/auth';
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
const STATUS_SELECT_STYLES = {
  '': 'border-slate-200 bg-slate-50 text-slate-500',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Contacted: 'border-sky-200 bg-sky-50 text-sky-700',
  'Follow Up': 'border-violet-200 bg-violet-50 text-violet-700',
  Interested: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Not Interested': 'border-rose-200 bg-rose-50 text-rose-700',
  Converted: 'border-green-200 bg-green-50 text-green-700',
  'Not Reachable': 'border-orange-200 bg-orange-50 text-orange-700',
};

const getAuthToken = () => getValidToken('admin') || getValidToken('employee');

const formatDate = (value) => (
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
);

const normalizeColumnName = (column) => String(column || '').trim().toLowerCase();

const getColumnIndex = (columns, columnName) => (
  columns.findIndex((column) => normalizeColumnName(column) === columnName.toLowerCase())
);

const getStatusSelectClass = (status) => [
  'h-8 w-32 cursor-pointer rounded-full border px-2.5 text-[11px] font-semibold outline-none transition focus:ring-2 focus:ring-blue-100',
  STATUS_SELECT_STYLES[status] || STATUS_SELECT_STYLES[''],
].join(' ');

const getRowLog = (rowLogs = [], rowIndex) => (
  rowLogs.find((rowLog) => Number(rowLog.rowIndex) === Number(rowIndex))
);

const getLogCounts = (rowLog) => {
  const entries = rowLog?.entries || [];

  return {
    statusChanges: entries.filter((entry) => entry.statusChanged).length,
    remarkUpdates: entries.filter((entry) => entry.remarkChanged).length,
  };
};

const addWorkColumnsAfterWebsite = (columns = [], rows = []) => {
  const safeColumns = columns.map((column, index) => String(column || '').trim() || `Column ${index + 1}`);
  const existingColumns = new Set(safeColumns.map(normalizeColumnName));
  const columnsToAdd = CLIENT_WORK_COLUMNS.filter((column) => !existingColumns.has(column.toLowerCase()));

  if (columnsToAdd.length === 0) {
    return { columns: safeColumns, rows };
  }

  const websiteIndex = safeColumns.findIndex((column) => normalizeColumnName(column) === 'website');
  const insertIndex = websiteIndex === -1 ? safeColumns.length : websiteIndex + 1;

  return {
    columns: [
      ...safeColumns.slice(0, insertIndex),
      ...columnsToAdd,
      ...safeColumns.slice(insertIndex),
    ],
    rows: rows.map((row) => [
      ...row.slice(0, insertIndex),
      ...columnsToAdd.map(() => ''),
      ...row.slice(insertIndex),
    ]),
  };
};

const ClientDatasetDetail = () => {
  const { datasetId } = useParams();
  const [dataset, setDataset] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savingRows, setSavingRows] = useState({});
  const [remarkModal, setRemarkModal] = useState(null);
  const [logModal, setLogModal] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const token = getAuthToken();
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${API_BASE_URL}/api/client-datasets/${datasetId}`, {
          headers,
        });

        if (getAuthenticatedRole() === 'admin') {
          const employeesResponse = await axios.get(`${API_BASE_URL}/api/employees`, {
            headers,
          });
          setEmployees(employeesResponse.data);
        }

        setDataset(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load client data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataset();
  }, [datasetId]);

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
        {error}
      </div>
    );
  }

  const tableData = addWorkColumnsAfterWebsite(dataset.columns, dataset.rows);
  const statusIndex = getColumnIndex(tableData.columns, 'Status');
  const remarkIndex = getColumnIndex(tableData.columns, 'Remark');
  const isAdmin = getAuthenticatedRole() === 'admin';
  const backLink = isAdmin ? '/dashboard/clients' : '/employee-dashboard/datasets';
  const backLabel = isAdmin ? 'Back to uploaded files' : 'Back to assigned datasets';
  const getOriginalRowIndex = (rowIndex) => dataset.originalRowIndexes?.[rowIndex] ?? rowIndex;
  const assignmentMap = new Map((dataset.rowAssignments || []).map((assignment) => [Number(assignment.rowIndex), assignment]));

  const toggleRowSelection = (rowIndex) => {
    setSelectedRows((previous) => (
      previous.includes(rowIndex)
        ? previous.filter((selectedRow) => selectedRow !== rowIndex)
        : [...previous, rowIndex]
    ));
  };

  const selectUnassignedRows = () => {
    const nextSelectedRows = [];
    for (let rowIndex = 0; rowIndex < tableData.rows.length; rowIndex += 1) {
      if (!assignmentMap.has(rowIndex)) nextSelectedRows.push(rowIndex);
    }
    setSelectedRows(nextSelectedRows);
  };

  const updateAssignmentState = (responseData) => {
    setDataset((previous) => ({
      ...previous,
      columns: responseData.columns,
      rows: responseData.rows,
      rowAssignments: responseData.rowAssignments,
    }));
    setSelectedRows([]);
  };

  const handleAssignRows = async () => {
    setAssignmentMessage('');
    setAssignmentError('');

    if (selectedRows.length === 0) {
      setAssignmentError('Select at least one row');
      return;
    }

    if (!selectedEmployeeId) {
      setAssignmentError('Select an employee');
      return;
    }

    const token = getAuthToken();
    setIsAssigning(true);
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/client-datasets/${datasetId}/assign`, {
        rowIndexes: selectedRows,
        employeeId: selectedEmployeeId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      updateAssignmentState(response.data);
      setAssignmentMessage(response.data.message);
    } catch (requestError) {
      setAssignmentError(requestError.response?.data?.message || 'Unable to assign selected rows');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignRows = async () => {
    setAssignmentMessage('');
    setAssignmentError('');

    if (selectedRows.length === 0) {
      setAssignmentError('Select at least one row');
      return;
    }

    const token = getAuthToken();
    setIsAssigning(true);
    try {
      const response = await axios.patch(`${API_BASE_URL}/api/client-datasets/${datasetId}/unassign`, {
        rowIndexes: selectedRows,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      updateAssignmentState(response.data);
      setAssignmentMessage(response.data.message);
    } catch (requestError) {
      setAssignmentError(requestError.response?.data?.message || 'Unable to unassign selected rows');
    } finally {
      setIsAssigning(false);
    }
  };

  const setRowCellValue = (rowIndex, columnIndex, value) => {
    const nextRows = tableData.rows.map((row, currentRowIndex) => (
      currentRowIndex === rowIndex
        ? [...row, ...Array(Math.max(tableData.columns.length - row.length, 0)).fill('')]
          .slice(0, tableData.columns.length)
          .map((cell, currentColumnIndex) => (currentColumnIndex === columnIndex ? value : cell || ''))
        : row
    ));

    setDataset((previous) => ({
      ...previous,
      columns: tableData.columns,
      rows: nextRows,
    }));

    return nextRows;
  };

  const saveRowStatus = async (rowIndex, rowsOverride = tableData.rows) => {
    if (statusIndex === -1 || remarkIndex === -1) return false;

    const token = getAuthToken();
    if (!token) {
      setSaveError('Session expired. Please login again.');
      return false;
    }

    setSaveError('');
    setSavingRows((previous) => ({ ...previous, [rowIndex]: true }));

    try {
      const originalRowIndex = getOriginalRowIndex(rowIndex);
      const response = await axios.patch(
        `${API_BASE_URL}/api/client-datasets/${datasetId}/rows/${originalRowIndex}/status`,
        {
          status: rowsOverride[rowIndex]?.[statusIndex] || '',
          remark: rowsOverride[rowIndex]?.[remarkIndex] || '',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setDataset((previous) => {
        const normalizedDataset = addWorkColumnsAfterWebsite(previous.columns, previous.rows);
        const nextRows = normalizedDataset.rows.map((row, currentRowIndex) => (
          getOriginalRowIndex(currentRowIndex) === response.data.rowIndex ? response.data.row : row
        ));
        const nextRowLogs = response.data.rowLog
          ? [
            ...(previous.rowLogs || []).filter((rowLog) => Number(rowLog.rowIndex) !== Number(response.data.rowIndex)),
            response.data.rowLog,
          ]
          : previous.rowLogs;

        return {
          ...previous,
          columns: response.data.columns,
          rows: nextRows,
          rowLogs: nextRowLogs,
        };
      });
      return true;
    } catch (requestError) {
      setSaveError(requestError.response?.data?.message || 'Unable to save status and remark');
      return false;
    } finally {
      setSavingRows((previous) => ({ ...previous, [rowIndex]: false }));
    }
  };

  const openRemarkModal = (rowIndex, row) => {
    setSaveError('');
    setRemarkModal({
      rowIndex,
      remark: row[remarkIndex] || '',
    });
  };

  const handleSaveRemark = async () => {
    if (!remarkModal) return;

    const nextRows = setRowCellValue(remarkModal.rowIndex, remarkIndex, remarkModal.remark);
    const isSaved = await saveRowStatus(remarkModal.rowIndex, nextRows);

    if (isSaved) {
      setRemarkModal(null);
    }
  };

  const openLogModal = async (rowIndex) => {
    setSaveError('');
    setLogModal({ rowIndex, isLoading: true });

    const token = getAuthToken();
    if (!token) {
      setSaveError('Session expired. Please login again.');
      setLogModal({ rowIndex, isLoading: false });
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/client-datasets/${datasetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDataset(response.data);
      setLogModal({ rowIndex, isLoading: false });
    } catch (requestError) {
      setSaveError(requestError.response?.data?.message || 'Unable to load activity log');
      setLogModal({ rowIndex, isLoading: false });
    }
  };

  return (
    <div className="w-full space-y-5">
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to={backLink} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            {backLabel}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{dataset.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {dataset.year || 'No year'} · Uploaded {formatDate(dataset.createdAt)} · {dataset.rowCount} rows
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
          {dataset.originalFileName}
        </span>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 bg-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Client data table</h2>
          {saveError && <p className="mt-1 text-xs font-semibold text-red-600">{saveError}</p>}
          {isAdmin && (
            <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {selectedRows.length} selected
                </span>
                <button
                  type="button"
                  onClick={selectUnassignedRows}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
                    <path d="M9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Select free rows
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRows([])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  Clear
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                  className="min-w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name || employee.email}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignRows}
                  disabled={isAssigning}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6" />
                    <path d="M22 11h-6" />
                  </svg>
                  Assign
                </button>
                <button
                  type="button"
                  onClick={handleUnassignRows}
                  disabled={isAssigning}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M17 11h5" />
                  </svg>
                  Unassign
                </button>
              </div>
            </div>
          )}
          {assignmentMessage && <p className="mt-2 text-xs font-semibold text-emerald-600">{assignmentMessage}</p>}
          {assignmentError && <p className="mt-2 text-xs font-semibold text-red-600">{assignmentError}</p>}
        </div>
        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-100">
                {isAdmin && (
                  <th className="whitespace-nowrap border border-slate-300 px-3 py-2 text-center font-semibold text-slate-800">
                    Select
                  </th>
                )}
                <th className="whitespace-nowrap border border-slate-300 px-3 py-2 text-center font-semibold text-slate-800">
                  S.No.
                </th>
                {tableData.columns.map((column, index) => (
                  <th key={`${column}-${index}`} className="whitespace-nowrap border border-slate-300 px-3 py-2 font-semibold text-slate-800">
                    {normalizeColumnName(column) === 'remark' ? 'Remark / Log' : column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  {isAdmin && (
                    <td className="border border-slate-300 px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(rowIndex)}
                        onChange={() => toggleRowSelection(rowIndex)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="whitespace-nowrap border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    {getOriginalRowIndex(rowIndex) + 1}
                  </td>
                  {tableData.columns.map((column, columnIndex) => {
                    const normalizedColumn = normalizeColumnName(column);

                    if (normalizedColumn === 'status') {
                      return (
                        <td key={`${rowIndex}-${column}-${columnIndex}`} className="min-w-36 border border-slate-300 px-2 py-1.5 text-slate-700">
                          <select
                            value={row[columnIndex] || ''}
                            onChange={(event) => {
                              const nextRows = setRowCellValue(rowIndex, columnIndex, event.target.value);
                              saveRowStatus(rowIndex, nextRows);
                            }}
                            className={getStatusSelectClass(row[columnIndex] || '')}
                          >
                            <option value="">Select status</option>
                            {CLIENT_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          {savingRows[rowIndex] && <p className="mt-1 text-[11px] font-semibold text-blue-600">Saving...</p>}
                        </td>
                      );
                    }

                    if (normalizedColumn === 'remark') {
                      const rowLog = getRowLog(dataset.rowLogs, rowIndex);

                      return (
                        <td key={`${rowIndex}-${column}-${columnIndex}`} className="min-w-28 border border-slate-300 px-2 py-1.5 text-slate-700">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openRemarkModal(rowIndex, row)}
                              title={row[columnIndex] ? 'Edit remark' : 'Add remark'}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                                row[columnIndex]
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                              }`}
                              aria-label={row[columnIndex] ? 'Edit remark' : 'Add remark'}
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                                <path d="M8 9h8" />
                                <path d="M8 13h5" />
                              </svg>
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openLogModal(rowIndex)}
                                title="View activity log"
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                                  rowLog?.entries?.length
                                    ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                                    : 'border-slate-200 bg-white text-slate-400 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700'
                                }`}
                                aria-label="View activity log"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                                  <path d="M3 3v6h6" />
                                  <path d="M12 7v5l3 2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }

                    if (normalizedColumn === 'employee') {
                      const assignment = assignmentMap.get(rowIndex);
                      const employeeName = assignment?.employeeName || row[columnIndex] || '';

                      return (
                        <td key={`${rowIndex}-${column}-${columnIndex}`} className="whitespace-nowrap border border-slate-300 px-3 py-2 text-slate-700">
                          {employeeName ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              {employeeName}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">Unassigned</span>
                          )}
                        </td>
                      );
                    }

                    return (
                      <td key={`${rowIndex}-${column}-${columnIndex}`} className="whitespace-nowrap border border-slate-300 px-3 py-2 text-slate-700">
                        {row[columnIndex] || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {tableData.rows.length === 0 && (
                <tr>
                  <td colSpan={tableData.columns.length + 1 + (isAdmin ? 1 : 0)} className="border border-slate-300 px-3 py-10 text-center text-slate-500">
                    No rows found in this file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {remarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-blue-600">Client remark</p>
                <h3 className="text-lg font-semibold text-slate-950">Update remark</h3>
              </div>
              <button
                type="button"
                onClick={() => setRemarkModal(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close remark popup"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <textarea
                value={remarkModal.remark}
                onChange={(event) => setRemarkModal((previous) => ({ ...previous, remark: event.target.value }))}
                rows="5"
                placeholder="Write remark here"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {saveError && <p className="text-xs font-semibold text-red-600">{saveError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRemarkModal(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRemark}
                  disabled={savingRows[remarkModal.rowIndex]}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                  {savingRows[remarkModal.rowIndex] ? 'Saving...' : 'Save remark'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && logModal && (() => {
        const rowLog = getRowLog(dataset.rowLogs, logModal.rowIndex);
        const entries = [...(rowLog?.entries || [])].reverse();
        const counts = getLogCounts(rowLog);
        const currentRow = tableData.rows[logModal.rowIndex] || [];
        const currentStatus = currentRow[statusIndex] || 'No status';
        const currentRemark = currentRow[remarkIndex] || 'No remark';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold text-violet-600">Admin log</p>
                  <h3 className="text-lg font-semibold text-slate-950">Row activity history</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setLogModal(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                  aria-label="Close log popup"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-[calc(85vh-76px)] overflow-auto p-5">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status changes</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{counts.statusChanges}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Remark updates</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{counts.remarkUpdates}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current status</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-950">{currentStatus}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current remark</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-950">{currentRemark}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {logModal.isLoading && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
                      <p className="text-sm font-semibold text-slate-700">Loading log...</p>
                    </div>
                  )}

                  {!logModal.isLoading && entries.map((entry, index) => (
                    <div key={`${entry.changedAt}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-950">
                          {entry.statusChanged && entry.remarkChanged
                            ? 'Status and remark updated'
                            : entry.statusChanged
                              ? 'Status updated'
                              : 'Remark updated'}
                        </p>
                        <p className="text-xs font-medium text-slate-500">{formatDate(entry.changedAt)}</p>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                        {entry.statusChanged && (
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-500">Status</p>
                            <p className="mt-1 text-slate-700">
                              <span className="text-slate-500">{entry.previousStatus || 'Empty'}</span>
                              <span className="px-2 text-slate-400">to</span>
                              <span className="font-semibold text-slate-950">{entry.currentStatus || 'Empty'}</span>
                            </p>
                          </div>
                        )}
                        {entry.remarkChanged && (
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-500">Remark</p>
                            <p className="mt-1 text-slate-700">
                              <span className="text-slate-500">{entry.previousRemark || 'Empty'}</span>
                              <span className="px-2 text-slate-400">to</span>
                              <span className="font-semibold text-slate-950">{entry.currentRemark || 'Empty'}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {!logModal.isLoading && entries.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                      <p className="text-sm font-semibold text-slate-700">No log found</p>
                      <p className="mt-1 text-sm text-slate-500">Status or remark changes will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ClientDatasetDetail;
