import { useState } from 'react';
import { Badge, DataTable, ErrorBox, Loading, PageHeader, Section } from '../components/ui';
import { useApi } from '../lib/useApi';
import { api } from '../lib/api';
import { rupiah } from '../lib/format';
import type { Role } from '../lib/auth';

interface UserRow {
  username: string;
  nokk: string;
  hidup: string;
  batasTarik: number;
  batasSetor: number;
  role: Role;
}

const ROLE_TONE = { admin: 'red', pengurus: 'blue', staf: 'slate' } as const;

export default function UsersPage() {
  const { data, error, loading, reload } = useApi<UserRow[]>('/users');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const toggle = async (u: UserRow) => {
    const next = u.hidup === '1' ? '0' : '1';
    if (!confirm(`Ubah status "hidup" user ${u.username} menjadi ${next}?`)) return;
    setBusy(u.username);
    setActionError('');
    try {
      await api(`/users/${encodeURIComponent(u.username)}/status`, { method: 'PATCH', body: { hidup: next } });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Pengguna" subtitle="Daftar user aplikasi (tabel pass). Peran diatur di konfigurasi server API." />
      {actionError && (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      )}
      {error && <ErrorBox message={error} onRetry={reload} />}
      <Section title="Daftar User">
        {loading && !data ? (
          <Loading />
        ) : (
          <DataTable
            rows={data || []}
            columns={[
              { header: 'User', cell: (u) => <span className="font-medium text-slate-900">{u.username}</span> },
              { header: 'Cabang', cell: (u) => u.nokk },
              { header: 'Peran', cell: (u) => <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge> },
              { header: 'Batas Tarik', cell: (u) => rupiah(u.batasTarik), align: 'right' },
              { header: 'Batas Setor', cell: (u) => rupiah(u.batasSetor), align: 'right' },
              { header: 'Hidup', cell: (u) => (u.hidup === '1' ? <Badge tone="green">1</Badge> : <Badge>{u.hidup}</Badge>), align: 'center' },
              {
                header: 'Aksi',
                align: 'right',
                cell: (u) => (
                  <button className="btn-ghost py-1 text-xs" disabled={busy === u.username} onClick={() => toggle(u)}>
                    {busy === u.username ? 'Menyimpan…' : 'Ubah status'}
                  </button>
                ),
              },
            ]}
          />
        )}
      </Section>
    </>
  );
}
