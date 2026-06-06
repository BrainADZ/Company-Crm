import { useEffect, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { clearAuthToken } from '../utils/auth';
import PasswordInput from './PasswordInput';

const API_URL = 'http://localhost:5000';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-600';

const getInitials = (name = '') => (
  name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'US'
);

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${API_URL}/${imageUrl.replace(/\\/g, '/')}`;
};

const UserProfileMenu = ({ role }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    position: '',
    password: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const tokenKey = role === 'admin' ? 'adminToken' : 'employeeToken';

  const syncForm = (user) => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      position: user.position || '',
      password: '',
    });
  };

  useEffect(() => {
    let ignore = false;

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey)}` },
        });

        if (!ignore) {
          setProfile(response.data.user);
          syncForm(response.data.user);
        }
      } catch (requestError) {
        if (!ignore) {
          if ([401, 403].includes(requestError.response?.status)) {
            clearAuthToken(role);
            navigate('/');
            return;
          }
          setError(requestError.response?.data?.message || 'Unable to load profile');
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      ignore = true;
    };
  }, [navigate, role, tokenKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setMessage('');
    setError('');
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMessage('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setError('');

    const data = new FormData();
    data.append('name', formData.name);
    data.append('phone', formData.phone);
    data.append('address', formData.address);
    data.append('position', formData.position);

    if (role === 'admin') {
      data.append('email', formData.email);
      if (formData.password) data.append('password', formData.password);
    }
    if (imageFile) data.append('image', imageFile);

    try {
      const response = await axios.put(`${API_URL}/api/profile`, data, {
        headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey)}` },
      });
      setProfile(response.data.user);
      syncForm(response.data.user);
      setImageFile(null);
      setImagePreview('');
      setMessage(response.data.message);
      setIsEditingProfile(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    clearAuthToken(role);
    navigate('/');
  };

  const openDrawer = () => {
    setMessage('');
    setError('');
    setIsEditingProfile(false);
    setIsOpen(true);
  };

  const closeDrawer = () => {
    setIsOpen(false);
    setIsEditingProfile(false);
    setImageFile(null);
    setImagePreview('');
    if (profile) syncForm(profile);
  };

  const avatarUrl = imagePreview || getImageUrl(profile?.imageUrl);
  const accentClass = role === 'admin' ? 'from-blue-700 to-indigo-600' : 'from-emerald-700 to-teal-600';
  const buttonAccent = role === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700';
  const detailRows = [
    ['Full name', profile?.name || 'Not added'],
    ['Email address', profile?.email || 'No email available'],
    ['Phone', profile?.phone || 'Not added'],
    ['Position', profile?.position || 'Not added'],
    ['Address', profile?.address || 'Not added'],
  ];

  return (
    <>
      <button
        type="button"
        title="Open profile"
        onClick={openDrawer}
        className="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-600 ring-2 ring-white transition hover:ring-blue-300"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={profile?.name || 'Profile'} className="h-full w-full object-cover" />
        ) : (
          getInitials(profile?.name)
        )}
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[80] bg-slate-950/45" onClick={closeDrawer}>
          <aside
            className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-md flex-col overflow-hidden bg-slate-50 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`relative shrink-0 bg-gradient-to-br ${accentClass} px-6 pb-6 pt-5 text-white`}>
              <button
                type="button"
                onClick={closeDrawer}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold transition hover:bg-white/25"
              >
                X
              </button>

              <div className="pr-12">
                <p className="text-xs font-medium text-white/70">My account</p>
                <h2 className="mt-1 text-xl font-semibold">Profile settings</h2>
              </div>

              <div className="mt-6 flex items-center gap-4">
                {isEditingProfile ? (
                  <label className="group relative block h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full bg-white/20 ring-4 ring-white/15">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={profile?.name || 'Profile'} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg font-bold">{getInitials(profile?.name)}</span>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-xs font-medium opacity-0 transition group-hover:opacity-100">
                      Change
                    </span>
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleImageChange} />
                  </label>
                ) : (
                  <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/20 ring-4 ring-white/15">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={profile?.name || 'Profile'} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg font-bold">{getInitials(profile?.name)}</span>
                    )}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{profile?.name || (isLoading ? 'Loading profile...' : 'User')}</p>
                  <p className="mt-1 truncate text-sm text-white/75">{profile?.email || 'No email available'}</p>
                  <span className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-white/15">
                    {profile?.role || role} account
                  </span>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Personal details</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {isEditingProfile
                        ? role === 'admin'
                        ? 'You can update all account details and set a new password.'
                          : 'Email and password are managed by your administrator.'
                        : 'Review your saved account information.'}
                    </p>
                  </div>
                  {isEditingProfile ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setImageFile(null);
                        setImagePreview('');
                        setMessage('');
                        setError('');
                        if (profile) syncForm(profile);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMessage('');
                        setError('');
                        setIsEditingProfile(true);
                      }}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <label className="block">
                      <span className={labelClass}>Full name</span>
                      <input className={inputClass} type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </label>

                    <label className="block">
                      <span className={labelClass}>Email address</span>
                      <input
                        className={inputClass}
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={role !== 'admin'}
                        required
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label>
                        <span className={labelClass}>Phone</span>
                        <input className={inputClass} type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" />
                      </label>
                      <label>
                        <span className={labelClass}>Position</span>
                        <input className={inputClass} type="text" name="position" value={formData.position} onChange={handleChange} placeholder="Job title" />
                      </label>
                    </div>

                    <label className="block">
                      <span className={labelClass}>Address</span>
                      <textarea className={`${inputClass} min-h-20 resize-y`} name="address" value={formData.address} onChange={handleChange} placeholder="Address" />
                    </label>

                    {role === 'admin' && (
                      <label className="block">
                        <span className={labelClass}>New password</span>
                        <PasswordInput
                          className={inputClass}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Leave blank to keep current password"
                          minLength={8}
                        />
                        <span className="mt-1.5 block text-xs text-slate-400">Existing passwords are never displayed. Enter at least 8 characters to replace it.</span>
                      </label>
                    )}

                    {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{message}</p>}
                    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

                    <button
                      type="submit"
                      disabled={isSaving || isLoading}
                      className={`w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${buttonAccent}`}
                    >
                      {isSaving ? 'Saving changes...' : 'Save changes'}
                    </button>
                  </form>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {detailRows.map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-3 text-sm">
                        <span className="font-medium text-slate-500">{label}</span>
                        <span className="break-words font-medium text-slate-800">{value}</span>
                      </div>
                    ))}
                    {message && <p className="m-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{message}</p>}
                    {error && <p className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white p-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5m5 5H9" />
                </svg>
                Sign out
              </button>
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
};

export default UserProfileMenu;
