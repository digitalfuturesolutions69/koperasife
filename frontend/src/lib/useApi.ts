import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';

/**
 * Mengambil data dari API. Parameter `nokk` (cabang aktif) otomatis ditambahkan.
 * Isi `path` dengan null untuk menunda request (mis. sebelum user mengetik kata kunci).
 */
export function useApi<T>(path: string | null, params: Record<string, string | undefined> = {}) {
  const { nokk } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(params);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!path) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<T>(path, { params: { ...JSON.parse(key), nokk } })
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setData(null);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, key, nokk, reloadTick]);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
