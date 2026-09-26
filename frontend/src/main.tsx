import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth, type Role } from './lib/auth';
import Layout from './components/Layout';
import { Loading } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { NasabahDetail, NasabahList } from './pages/Nasabah';
import { DepositoDetail, DepositoList, KreditDetail, KreditList, TabunganDetail, TabunganList } from './pages/Rekening';
import Teller from './pages/Teller';
import Laporan from './pages/Laporan';
import Users from './pages/Users';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading text="Memeriksa sesi…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">Akses ditolak</h1>
        <p className="mt-1 text-sm text-slate-500">Menu ini hanya untuk {roles.join(' / ')}.</p>
        <Link to="/" className="btn-primary mt-4">
          Ke Dashboard
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="card p-8 text-center">
      <h1 className="text-lg font-semibold">Halaman tidak ditemukan</h1>
      <Link to="/" className="btn-primary mt-4">
        Ke Dashboard
      </Link>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="nasabah" element={<NasabahList />} />
            <Route path="nasabah/:cif" element={<NasabahDetail />} />
            <Route path="tabungan" element={<TabunganList />} />
            <Route path="tabungan/:nomor" element={<TabunganDetail />} />
            <Route path="deposito" element={<DepositoList />} />
            <Route path="deposito/:nomor" element={<DepositoDetail />} />
            <Route path="kredit" element={<KreditList />} />
            <Route path="kredit/:nomor" element={<KreditDetail />} />
            <Route path="teller" element={<Teller />} />
            <Route
              path="laporan"
              element={
                <RequireRole roles={['pengurus', 'admin']}>
                  <Laporan />
                </RequireRole>
              }
            />
            <Route
              path="users"
              element={
                <RequireRole roles={['admin']}>
                  <Users />
                </RequireRole>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
