import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';

export type Role = 'staf' | 'pengurus' | 'admin';
export interface User {
  username: string;
  nokk: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Cabang yang sedang dilihat (pengurus/admin bisa berpindah cabang) */
  nokk: string;
  setNokk: (n: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const NOKK_KEY = 'koperasi_nokk';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nokk, setNokkState] = useState('');

  const applyUser = useCallback((u: User | null) => {
    setUser(u);
    if (!u) return setNokkState('');
    const saved = u.role !== 'staf' ? sessionStorage.getItem(NOKK_KEY) : null;
    setNokkState(saved || u.nokk);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    sessionStorage.removeItem(NOKK_KEY);
    applyUser(null);
  }, [applyUser]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return setLoading(false);
    api<{ user: User }>('/auth/me')
      .then((r) => applyUser(r.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [applyUser, logout]);

  const login = useCallback(
    async (username: string, password: string) => {
      const r = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { username, password } });
      tokenStore.set(r.token);
      sessionStorage.removeItem(NOKK_KEY);
      applyUser(r.user);
    },
    [applyUser],
  );

  const setNokk = useCallback((n: string) => {
    sessionStorage.setItem(NOKK_KEY, n);
    setNokkState(n);
  }, []);

  const value = useMemo(() => ({ user, loading, nokk, setNokk, login, logout }), [user, loading, nokk, setNokk, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
