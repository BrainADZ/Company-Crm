import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import companyImage from '../assets/Company.jpg';
import PasswordInput from '../components/PasswordInput';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      if (response.data?.token) {
        localStorage.setItem('adminToken', response.data.token);
        navigate('/dashboard');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch {
      setError('Invalid email or password');
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <img src={companyImage} alt="Company workspace" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-blue-950/35 to-slate-950/20" />
        <div className="relative flex h-full max-w-2xl flex-col justify-end p-12 text-white">
          <p className="text-sm font-semibold text-blue-200">Company CRM</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Keep every client conversation moving forward.</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100">Manage your team, client assignments, and follow-ups from one focused workspace.</p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-50 p-5 sm:p-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
                <path d="M8 8.5a4 4 0 0 1 6.8-2.8l3.5 3.5a4 4 0 1 1-5.6 5.6L11.4 13" />
                <path d="M16 15.5a4 4 0 0 1-6.8 2.8l-3.5-3.5a4 4 0 1 1 5.6-5.6l1.3 1.8" />
              </svg>
            </span>
            <span>
              <span className="block font-semibold text-slate-900">Company CRM</span>
              <span className="block text-xs text-slate-500">Admin workspace</span>
            </span>
          </Link>

          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-slate-950">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in with your admin account.</p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Email address</span>
              <input className={inputClass} type="email" placeholder="admin@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Password</span>
              <PasswordInput className={inputClass} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Remember me
            </label>
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
              Sign in
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default AdminLogin;
