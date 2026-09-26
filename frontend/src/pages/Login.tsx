import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { APP_NAME } from '../components/Layout';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    const from = (location.state as { from?: string } | null)?.from || '/';
    return <Navigate to={from} replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-emerald-800 shadow-lg">K</div>
          <h1 className="text-xl font-semibold">{APP_NAME}</h1>
          <p className="text-sm text-emerald-200">Sistem Informasi Koperasi</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6 shadow-xl">
          <div>
            <label className="label" htmlFor="username">
              User
            </label>
            <input id="username" className="input" autoComplete="username" maxLength={15} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" type="password" className="input" autoComplete="current-password" maxLength={15} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-emerald-200/80">Gunakan user & password yang sama dengan aplikasi desktop.</p>
      </div>
    </div>
  );
}
