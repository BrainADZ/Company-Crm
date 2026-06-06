import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import companyImage from '../assets/Company.jpg';
import PasswordInput from '../components/PasswordInput';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100';

const EmployeeLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/employee-login', formData);
      if (response.data?.token) {
        localStorage.setItem('employeeToken', response.data.token);
        navigate('/employee-dashboard');
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
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/35 to-slate-950/20" />
        <div className="relative flex h-full max-w-2xl flex-col justify-end p-12 text-white">
          <p className="text-sm font-semibold text-emerald-200">Employee workspace</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Your assigned clients and daily tasks, together.</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-emerald-100">Review accounts, record call outcomes, and keep the team updated.</p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-50 p-5 sm:p-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
                <path d="M9 11 12 14 22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </span>
            <span>
              <span className="block font-semibold text-slate-900">Company CRM</span>
              <span className="block text-xs text-slate-500">Employee workspace</span>
            </span>
          </Link>

          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-slate-950">Employee sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Use your employee account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Email address</span>
              <input className={inputClass} type="email" name="email" placeholder="name@company.com" value={formData.email} onChange={handleChange} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Password</span>
              <PasswordInput className={inputClass} name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} required />
            </label>
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Sign in
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default EmployeeLogin;
