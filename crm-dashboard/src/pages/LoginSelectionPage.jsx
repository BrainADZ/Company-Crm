import { useNavigate } from 'react-router-dom';
import companyImage from '../assets/Company.jpg';

const LoginSelection = () => {
  const navigate = useNavigate();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <img src={companyImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/95 via-slate-950/85 to-slate-950/95" />

      <section className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-950/40">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-white" strokeWidth="2">
              <path d="M8 8.5a4 4 0 0 1 6.8-2.8l3.5 3.5a4 4 0 1 1-5.6 5.6L11.4 13" />
              <path d="M16 15.5a4 4 0 0 1-6.8 2.8l-3.5-3.5a4 4 0 1 1 5.6-5.6l1.3 1.8" />
            </svg>
          </span>
          <p className="mt-6 text-sm font-semibold text-blue-300">Company CRM</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Choose your workspace</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Sign in to manage clients, employees, and daily CRM activity.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="group rounded-2xl border border-white/15 bg-white p-5 text-left text-slate-900 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
                <path d="M4 21v-4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
              </svg>
            </span>
            <span className="mt-4 block font-semibold">Admin login</span>
            <span className="mt-1 block text-sm text-slate-500">Manage the complete CRM workspace.</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/employee-login')}
            className="group rounded-2xl border border-white/15 bg-white p-5 text-left text-slate-900 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2">
                <path d="M9 11 12 14 22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </span>
            <span className="mt-4 block font-semibold">Employee login</span>
            <span className="mt-1 block text-sm text-slate-500">Open assigned clients and tasks.</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default LoginSelection;
