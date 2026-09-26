import { useApi } from '../lib/useApi';
import { angka, rupiah, tanggal } from '../lib/format';
import { DataTable, ErrorBox, KolekBadge, Loading, PageHeader, Section, StatCard } from '../components/ui';
import { useAuth } from '../lib/auth';

interface Dashboard {
  nokk: string;
  tanggalSistem: string | null;
  nasabah: { jumlah: number };
  tabungan: { jumlah: number; saldo: number };
  deposito: { jumlah: number; saldo: number };
  kredit: { jumlah: number; baki_debet: number; plafond: number; tunggakan_pokok: number; tunggakan_bunga: number };
  kolek: { kolek: string; keterangan: string | null; jumlah: number; baki_debet: number }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<Dashboard>('/dashboard');

  const npl = data
    ? data.kolek.filter((k) => ['3', '4', '5'].includes(k.kolek)).reduce((s, k) => s + Number(k.baki_debet), 0)
    : 0;
  const nplPct = data && data.kredit.baki_debet > 0 ? (npl / data.kredit.baki_debet) * 100 : 0;

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${user?.username}`}
        subtitle={data ? `Ringkasan cabang ${data.nokk} · Tanggal sistem ${tanggal(data.tanggalSistem)}` : 'Ringkasan data koperasi'}
      />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Nasabah" value={angka(data.nasabah.jumlah)} hint="orang terdaftar" />
            <StatCard label="Saldo Tabungan" value={rupiah(data.tabungan.saldo)} hint={`${angka(data.tabungan.jumlah)} rekening aktif`} />
            <StatCard label="Saldo Deposito" value={rupiah(data.deposito.saldo)} hint={`${angka(data.deposito.jumlah)} bilyet aktif`} />
            <StatCard label="Baki Debet Kredit" value={rupiah(data.kredit.baki_debet)} hint={`${angka(data.kredit.jumlah)} debitur aktif`} />
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Tunggakan Pokok" value={rupiah(data.kredit.tunggakan_pokok)} />
            <StatCard label="Tunggakan Bunga" value={rupiah(data.kredit.tunggakan_bunga)} />
            <StatCard label="NPL (Kolek 3–5)" value={`${nplPct.toFixed(2).replace('.', ',')}%`} hint={rupiah(npl)} />
          </div>
          <Section title="Kolektibilitas Kredit">
            <DataTable
              rows={data.kolek}
              empty="Belum ada kredit aktif"
              columns={[
                { header: 'Kolektibilitas', cell: (r) => <KolekBadge kolek={r.kolek} label={r.keterangan || undefined} /> },
                { header: 'Jumlah Debitur', cell: (r) => angka(r.jumlah), align: 'right' },
                { header: 'Baki Debet', cell: (r) => rupiah(r.baki_debet), align: 'right' },
                {
                  header: 'Porsi',
                  align: 'right',
                  cell: (r) => (data.kredit.baki_debet ? `${((r.baki_debet / data.kredit.baki_debet) * 100).toFixed(1).replace('.', ',')}%` : '-'),
                },
              ]}
            />
          </Section>
        </>
      )}
    </>
  );
}
