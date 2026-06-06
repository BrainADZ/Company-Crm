import { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import PasswordInput from '../components/PasswordInput';

Modal.setAppElement('#root');

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  position: '',
  image: null,
};

const avatarClasses = ['bg-blue-600', 'bg-violet-600', 'bg-rose-600', 'bg-teal-600', 'bg-amber-500', 'bg-emerald-600'];

const getInitials = (name = '') => (
  name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'EM'
);

const getAvatarClass = (name = '') => avatarClasses[(name.charCodeAt(0) || 0) % avatarClasses.length];

const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-600';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/employees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      setEmployees(response.data);
    } catch (requestError) {
      console.error('Error fetching employees:', requestError);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openModal = (employee = null) => {
    setSuccess('');
    setError('');
    if (employee) {
      setIsEditing(true);
      setEditingEmployeeId(employee._id);
      setFormData({
        name: employee.name,
        email: employee.email,
        password: '',
        phone: employee.phone,
        address: employee.address,
        position: employee.position,
        image: null,
      });
      setImagePreview(employee.imageUrl ? `http://localhost:5000/${employee.imageUrl}` : null);
    } else {
      setIsEditing(false);
      setEditingEmployeeId(null);
      setFormData(emptyForm);
      setImagePreview(null);
    }
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setImagePreview(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    setFormData((previous) => ({ ...previous, image: file }));
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== '') data.append(key, value);
    });

    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } };
      const response = isEditing
        ? await axios.put(`http://localhost:5000/api/employees/${editingEmployeeId}`, data, config)
        : await axios.post('http://localhost:5000/api/employees/register', data, config);

      setSuccess(response.data.message);
      setError('');
      await fetchEmployees();
      setTimeout(closeModal, 500);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'An error occurred');
      setSuccess('');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      const response = await axios.delete(`http://localhost:5000/api/employees/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      alert(response.data.message);
      fetchEmployees();
    } catch (requestError) {
      console.error('Error deleting employee:', requestError);
      alert('Failed to delete employee');
    }
  };

  return (
    <div className="w-full space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-600">Team management</p>
          <h1 className="mt-1.5 text-2xl font-semibold text-slate-950">Employees</h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Manage your team and employee access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <span className="text-lg leading-none">+</span>
          Add employee
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {employees.map((employee) => (
          <article key={employee._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-4 border-b border-slate-100 p-5">
              {employee.imageUrl ? (
                <img
                  src={`http://localhost:5000/${employee.imageUrl}`}
                  alt={employee.name}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-slate-100"
                />
              ) : (
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${getAvatarClass(employee.name)}`}>
                  {getInitials(employee.name)}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-900">{employee.name}</h2>
                <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {employee.position || 'Team member'}
                </span>
              </div>
            </div>

            <dl className="space-y-3 p-5 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Email</dt>
                <dd className="mt-0.5 truncate text-slate-700">{employee.email || 'N/A'}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500">Phone</dt>
                  <dd className="mt-0.5 truncate text-slate-700">{employee.phone || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Address</dt>
                  <dd className="mt-0.5 truncate text-slate-700">{employee.address || 'N/A'}</dd>
                </div>
              </div>
            </dl>

            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => openModal(employee)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(employee._id)}
                className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>

      {employees.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-slate-700">No employees yet</p>
          <p className="mt-1 text-sm text-slate-500">Add your first team member to get started.</p>
        </div>
      )}

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel={isEditing ? 'Edit Employee' : 'Register Employee'}
        overlayClassName="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {isEditing ? 'Edit employee' : 'New employee'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Enter the employee&apos;s profile and login information.</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            X
          </button>
        </div>

        <label htmlFor="employee-image" className="mt-6 flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50/50">
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-xl font-semibold text-blue-700">+</span>
          )}
          <span>
            <span className="block text-sm font-semibold text-slate-700">
              {imagePreview ? 'Change profile photo' : 'Upload profile photo'}
            </span>
            <span className="mt-1 block text-xs text-slate-500">PNG or JPG, optional</span>
          </span>
          <input id="employee-image" type="file" name="image" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Name</span>
              <input className={inputClass} type="text" name="name" placeholder="Full name" value={formData.name} onChange={handleChange} required />
            </label>
            <label>
              <span className={labelClass}>Position</span>
              <input className={inputClass} type="text" name="position" placeholder="e.g. Manager" value={formData.position} onChange={handleChange} required />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>Email</span>
            <input className={inputClass} type="email" name="email" placeholder="name@company.com" value={formData.email} onChange={handleChange} required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Password</span>
              <PasswordInput className={inputClass} name="password" placeholder={isEditing ? 'Leave blank to keep' : 'Password'} value={formData.password} onChange={handleChange} required={!isEditing} />
            </label>
            <label>
              <span className={labelClass}>Phone</span>
              <input className={inputClass} type="text" name="phone" placeholder="+91 ..." value={formData.phone} onChange={handleChange} required />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>Address</span>
            <input className={inputClass} type="text" name="address" placeholder="City, State" value={formData.address} onChange={handleChange} required />
          </label>

          {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{success}</p>}
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

          <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            {isEditing ? 'Update employee' : 'Register employee'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Employees;
