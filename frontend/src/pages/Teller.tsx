import { useState } from 'react';
import { DataTable, DK, ErrorBox, Loading, PageHeader, Section } from '../components/ui';
import { useApi } from '../lib/useApi';
import { useAuth } from '../lib/auth';
import { rupiah, teks, todayISO } from '../lib/format';

interface Transaksi {
  User: string;
  Dk: string;
  Keterangan: string;
  Sandi: string;
  No_Bukti: string;
  Nomor: string;
  Jumlah: number;
  Nama: string;
}

export default function TellerPage() {
  const { user } = useAuth();
  const [tgl, setTgl] = useState(todayISO());
  const [semua, setSemua] = useState(false);
  const { data, error, loading, reload } = useApi<{ rows: Transaksi[] }>('/laporan/teller', { tgl, semua: semua ? '1' : undefined });

  const rows = data?.rows || [];
  // Transaksi dengan D/K = K adalah uang masuk (setoran), D = uang keluar (penarikan)
  const masuk = rows.filter((r) => r.Dk === 'K').reduce((s, r) => s + Number(r.Jumlah), 0);
  const keluar = rows.filter((r) => r.Dk === 'D').reduce((s, r) => s + Number(r.Jumlah), 0);

  return (
    <>
      <PageHeader
        title="Transaksi Teller"
        subtitle={semua ? 'Seluruh transaksi tunai di cabang' : `Transaksi tunai oleh ${user?.username}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {user?.role !== 'staf' && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={semua} onChange={(e) => setSemua(e.target.checked)} />
                Semua user
              </label>
            )}
            <input type="date" className="input w-auto" value={tgl} onChange={(e) => e.target.value && setTgl(e.target.value)} />
          </div>
        }
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      <Section title={`${rows.length} transaksi`}>
        {loading ? (
          <Loading />
        ) : (
          <DataTable
            rows={rows}
            empty="Tidak ada transaksi tunai pada tanggal ini"
            columns={[
              { header: 'No. Bukti', cell: (r) => <span className="font-mono text-xs">{r.No_Bukti}</span> },
              { header: 'Sandi', cell: (r) => r.Sandi, align: 'center' },
              { header: 'Rekening', cell: (r) => <span className="font-mono text-xs">{r.Nomor}</span> },
              { header: 'Nama', cell: (r) => teks(r.Nama) },
              { header: 'Keterangan', cell: (r) => teks(r.Keterangan) },
              { header: 'D/K', cell: (r) => <DK dk={r.Dk} />, align: 'center' },
              { header: 'Jumlah', cell: (r) => rupiah(r.Jumlah), align: 'right' },
              ...(semua ? [{ header: 'User', cell: (r: Transaksi) => r.User }] : []),
            ]}
            footer={
              <tr>
                <td colSpan={semua ? 8 : 7} className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-x-8 gap-y-1 text-sm">
                    <span>
                      Masuk (K): <span className="text-emerald-700">{rupiah(masuk)}</span>
                    </span>
                    <span>
                      Keluar (D): <span className="text-red-700">{rupiah(keluar)}</span>
                    </span>
                    <span>Selisih: {rupiah(masuk - keluar)}</span>
                  </div>
                </td>
              </tr>
            }
          />
        )}
      </Section>
    </>
  );
}
