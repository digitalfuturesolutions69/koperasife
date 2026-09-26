import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../lib/auth';
import { api } from '../lib/api';

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'KUD Bantarangin';

interface MenuItem {
  to: string;
  label: string;
  icon: string;
  roles?: Role[];
}

// Path ikon (24x24, stroke) supaya tidak perlu library ikon tambahan
const I = {
  home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  wallet: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  credit: 'M2 5h20v14H2zM2 10h20M6 15h4',
  cash: 'M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 12h.01M18 12h.01',
  report: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10',
};

const MENU: MenuItem[] = [
  { to: '/', label: 'Dashboard', icon: I.home },
  { to: '/nasabah', label: 'Nasabah', icon: I.users },
  { to: '/tabungan', label: 'Tabungan', icon: I.wallet },
  { to: '/deposito', label: 'Deposito', icon: I.lock },
  { to: '/kredit', label: 'Kredit', icon: I.credit },
  { to: '/teller', label: 'Transaksi Teller', icon: I.cash },
  { to: '/laporan', label: 'Laporan', icon: I.report, roles: ['pengurus', 'admin'] },
  { to: '/users', label: 'Pengguna', icon: I.shield, roles: ['admin'] },
];

export function Icon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

const ROLE_LABEL: Record<Role, string> = { staf: 'Staf', pengurus: 'Pengurus', admin: 'Admin' };

interface Cabang {
  nokk: string;
  nama: string;
}

function BranchSelect() {
  const { user, nokk, setNokk } = useAuth();
  const [cabang, setCabang] = useState<Cabang[]>([]);
  useEffect(() => {
    api<Cabang[]>('/cabang').then(setCabang).catch(() => setCabang([]));
  }, []);
  const current = cabang.find((c) => c.nokk === nokk);
  if (user?.role === 'staf' || cabang.length <= 1) {
    return <span className="text-sm text-slate-600">{current ? current.nama : `Cabang ${nokk}`}</span>;
  }
  return (
    <select className="input w-auto py-1.5" value={nokk} onChange={(e) => setNokk(e.target.value)} aria-label="Pilih cabang">
      {cabang.map((c) => (
        <option key={c.nokk} value={c.nokk}>
          {c.nokk} · {c.nama}
        </option>
      ))}
    </select>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const items = MENU.filter((m) => !m.roles || (user && m.roles.includes(user.role)));

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((m) => (
        <NavLink
          key={m.to}
          to={m.to}
          end={m.to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-emerald-700 text-white' : 'text-emerald-50/90 hover:bg-emerald-800'
            }`
          }
        >
          <Icon d={m.icon} />
          {m.label}
        </NavLink>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3 border-b border-emerald-800 px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-bold text-emerald-800">K</div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">{APP_NAME}</div>
        <div className="text-xs text-emerald-200">Sistem Informasi Koperasi</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-emerald-900 lg:flex">
        {brand}
        {nav}
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-emerald-900">
            {brand}
            {nav}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <button className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu">
          <Icon d="M3 6h18M3 12h18M3 18h18" />
        </button>
        <BranchSelect />
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium text-slate-900">{user?.username}</div>
            <div className="text-xs text-slate-500">{user && ROLE_LABEL[user.role]}</div>
          </div>
          <button className="btn-ghost py-1.5" onClick={logout}>
            Keluar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
