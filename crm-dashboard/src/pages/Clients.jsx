import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
});

const formatDate = (value) => (
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
);

const buttonIconClass = 'h-3.5 w-3.5 fill-none stroke-current';

const Clients = () => {
  const [datasets, setDatasets] = useState([]);
  const [formData, setFormData] = useState({ name: '', year: '' });
  const [file, setFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [editingDatasetId, setEditingDatasetId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', year: '' });
  const [updatingDatasetId, setUpdatingDatasetId] = useState(null);
  const [deletingDatasetId, setDeletingDatasetId] = useState(null);

  const fetchDatasets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/client-datasets`, {
        headers: getAuthHeaders(),
      });
      setDatasets(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load uploaded client data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setActionMessage('');
    setActionError('');

    if (!file) {
      setError('Please choose an Excel file');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('name', formData.name);
    uploadData.append('year', formData.year);
    uploadData.append('file', file);

    setIsUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/client-datasets/upload`, uploadData, {
        headers: getAuthHeaders(),
      });
      setMessage(response.data.message);
      setFormData({ name: '', year: '' });
      setFile(null);
      event.target.reset();
      await fetchDatasets();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const startEditingDataset = (dataset) => {
    setActionMessage('');
    setActionError('');
    setEditingDatasetId(dataset._id);
    setEditFormData({
      name: dataset.name || '',
      year: dataset.year || '',
    });
  };

  const cancelEditingDataset = () => {
    setEditingDatasetId(null);
    setEditFormData({ name: '', year: '' });
  };

  const handleUpdateDataset = async (datasetId) => {
    setActionMessage('');
    setActionError('');

    if (!editFormData.name.trim()) {
      setActionError('Data name is required');
      return;
    }

    setUpdatingDatasetId(datasetId);
    try {
      const response = await axios.patch(`${API_URL}/api/client-datasets/${datasetId}`, editFormData, {
        headers: getAuthHeaders(),
      });

      setDatasets((previous) => previous.map((dataset) => (
        dataset._id === datasetId ? { ...dataset, ...response.data.dataset } : dataset
      )));
      setActionMessage(response.data.message);
      cancelEditingDataset();
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to update data file');
    } finally {
      setUpdatingDatasetId(null);
    }
  };

  const handleDeleteDataset = async (dataset) => {
    setActionMessage('');
    setActionError('');

    const isConfirmed = window.confirm(`Delete "${dataset.name}" data file? This cannot be undone.`);
    if (!isConfirmed) return;

    setDeletingDatasetId(dataset._id);
    try {
      const response = await axios.delete(`${API_URL}/api/client-datasets/${dataset._id}`, {
        headers: getAuthHeaders(),
      });

      setDatasets((previous) => previous.filter((currentDataset) => currentDataset._id !== dataset._id));
      if (editingDatasetId === dataset._id) cancelEditingDataset();
      setActionMessage(response.data.message);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to delete data file');
    } finally {
      setDeletingDatasetId(null);
    }
  };

  const filteredDatasets = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return datasets;

    return datasets.filter((dataset) => (
      [dataset.name, dataset.year, dataset.originalFileName]
        .some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    ));
  }, [datasets, searchTerm]);

  return (
    <div className="w-full space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-600">Client data uploads</p>
          <h1 className="mt-1.5 text-2xl font-semibold text-slate-950">Clients</h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Upload Excel sheets and open each dataset as a classic table.
          </p>
        </div>
        <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
          {datasets.length} uploaded files
        </span>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Upload client Excel</h2>
          <p className="mt-1 text-sm text-slate-500">Give this file a data name, year, and select the Excel sheet.</p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Data name</span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
                placeholder="e.g. Aahar 2025"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Year</span>
              <input
                type="text"
                value={formData.year}
                onChange={(event) => setFormData((previous) => ({ ...previous, year: event.target.value }))}
                placeholder="2025"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50/40">
              <span className="block text-sm font-semibold text-slate-700">Excel file</span>
              <span className="mt-1 block text-xs text-slate-500">{file?.name || 'Only .xlsx or .xls files'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => setFile(event.target.files[0])}
                className="mt-3 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700"
                required
              />
            </label>

            {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{message}</p>}
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={isUploading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isUploading ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin fill-none stroke-current" strokeWidth="2">
                    <path d="M12 3a9 9 0 1 1-6.4 2.6" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M4 20h16" />
                  </svg>
                  Upload data
                </>
              )}
            </button>
          </div>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Uploaded data files</h2>
              <p className="mt-1 text-sm text-slate-500">Only file summary is shown here. Open a name to view full data.</p>
              {actionMessage && <p className="mt-2 text-xs font-semibold text-emerald-600">{actionMessage}</p>}
              {actionError && <p className="mt-2 text-xs font-semibold text-red-600">{actionError}</p>}
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
                placeholder="Search files"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-5 py-3">Data name</th>
                  <th className="whitespace-nowrap px-5 py-3">Year</th>
                  <th className="whitespace-nowrap px-5 py-3">Uploaded</th>
                  <th className="whitespace-nowrap px-5 py-3">Rows</th>
                  <th className="px-5 py-3">Excel file</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDatasets.map((dataset) => {
                  const isEditing = editingDatasetId === dataset._id;

                  return (
                    <tr key={dataset._id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.name}
                            onChange={(event) => setEditFormData((previous) => ({ ...previous, name: event.target.value }))}
                            className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        ) : (
                          <Link to={`/dashboard/clients/${dataset._id}`} className="font-semibold text-blue-600 hover:text-blue-800">
                            {dataset.name}
                          </Link>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.year}
                            onChange={(event) => setEditFormData((previous) => ({ ...previous, year: event.target.value }))}
                            className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        ) : (
                          dataset.year || '-'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(dataset.createdAt)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">{dataset.rowCount}</td>
                      <td className="px-5 py-4 text-slate-500">{dataset.originalFileName}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateDataset(dataset._id)}
                              disabled={updatingDatasetId === dataset._id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              <svg viewBox="0 0 24 24" className={buttonIconClass} strokeWidth="2">
                                <path d="m5 12 4 4L19 6" />
                              </svg>
                              {updatingDatasetId === dataset._id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingDataset}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                              <svg viewBox="0 0 24 24" className={buttonIconClass} strokeWidth="2">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                              </svg>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingDataset(dataset)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                            >
                              <svg viewBox="0 0 24 24" className={buttonIconClass} strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>

                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDataset(dataset)}
                              disabled={deletingDatasetId === dataset._id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <svg viewBox="0 0 24 24" className={buttonIconClass} strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6 18 20H6L5 6" />
                                <path d="M10 11v5" />
                                <path d="M14 11v5" />
                              </svg>
                              {/* {deletingDatasetId === dataset._id ? 'Deleting...' : 'Delete'} */}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && filteredDatasets.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-sm text-slate-500">
                      No uploaded client data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
};

export default Clients;
