import { useState, type ReactNode } from 'react';
import { DataTable, ErrorBox, Loading, PageHeader, Section } from '../components/ui';
import { useApi } from '../lib/useApi';
import { firstOfMonthISO, rupiah, tanggal, teks, todayISO } from '../lib/format';

type Tab = 'neraca' | 'jurnal' | 'angsuran' | 'kas';
const TABS: { id: Tab; label: string }[] = [
  { id: 'neraca', label: 'Saldo Perkiraan' },
  { id: 'jurnal', label: 'Jurnal Umum' },
  { id: 'angsuran', label: 'Rekap Angsuran' },
  { id: 'kas', label: 'Mutasi Kas' },
];

function DateRange({ tgl1, tgl2, onChange }: { tgl1: string; tgl2: string; onChange: (a: string, b: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" className="input w-auto" value={tgl1} onChange={(e) => e.target.value && onChange(e.target.value, tgl2)} />
      <span className="text-sm text-slate-500">s/d</span>
      <input type="date" className="input w-auto" value={tgl2} onChange={(e) => e.target.value && onChange(tgl1, e.target.value)} />
    </div>
  );
}

function Body({ loading, error, children }: { loading: boolean; error: string | null; children: ReactNode }) {
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="p-4">
        <ErrorBox message={error} />
      </div>
    );
  return <>{children}</>;
}

const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + Number(f(r) || 0), 0);

interface Perkiraan {
  NOMOR: string;
  NAMA: string;
  TINGKAT: string;
  NERACA: string;
  SALDO: number;
  MUTDEB: number;
  MUTKRE: number;
  SALDOAK: number;
}

function Neraca() {
  const [filter, setFilter] = useState('');
  const { data, error, loading } = useApi<{ rows: Perkiraan[] }>('/laporan/neraca');
  const f = filter.trim().toLowerCase();
  const rows = (data?.rows || []).filter((r) => !f || r.NOMOR.toLowerCase().includes(f) || r.NAMA.toLowerCase().includes(f));
  return (
    <Section title="Saldo Perkiraan (Buku Besar)" actions={<input className="input w-56 py-1.5" placeholder="Filter nomor / nama…" value={filter} onChange={(e) => setFilter(e.target.value)} />}>
      <Body loading={loading} error={error}>
        <DataTable
          rows={rows}
          columns={[
            { header: 'Nomor', cell: (r) => <span className="font-mono text-xs">{r.NOMOR}</span> },
            {
              header: 'Nama Perkiraan',
              cell: (r) => (
                <span style={{ paddingLeft: `${Math.max(0, Number(r.TINGKAT) - 1) * 16}px` }} className={Number(r.TINGKAT) <= 1 ? 'font-semibold' : ''}>
                  {r.NAMA}
                </span>
              ),
            },
            { header: 'Saldo Awal', cell: (r) => rupiah(r.SALDO), align: 'right' },
            { header: 'Mutasi Debet', cell: (r) => rupiah(r.MUTDEB), align: 'right' },
            { header: 'Mutasi Kredit', cell: (r) => rupiah(r.MUTKRE), align: 'right' },
            { header: 'Saldo Akhir', cell: (r) => <span className="font-medium">{rupiah(r.SALDOAK)}</span>, align: 'right' },
          ]}
        />
      </Body>
    </Section>
  );
}

interface JurnalRow {
  TGL: string;
  NO_BUKTI: string;
  KETERANGAN: string;
  NOMOR: string;
  NAMA: string;
  DEBET: number;
  KREDIT: number;
  USER: string;
}

function Jurnal() {
  const [range, setRange] = useState({ tgl1: todayISO(), tgl2: todayISO() });
  const [nomor, setNomor] = useState('');
  const [nomorQuery, setNomorQuery] = useState('');
  const { data, error, loading } = useApi<{ rows: JurnalRow[] }>('/laporan/jurnal', { ...range, nomor: nomorQuery || undefined });
  const rows = data?.rows || [];
  return (
    <Section
      title="Jurnal Umum"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setNomorQuery(nomor.trim());
            }}
          >
            <input className="input w-40 py-1.5" placeholder="No. perkiraan (opsional)" value={nomor} onChange={(e) => setNomor(e.target.value)} />
          </form>
          <DateRange tgl1={range.tgl1} tgl2={range.tgl2} onChange={(tgl1, tgl2) => setRange({ tgl1, tgl2 })} />
        </div>
      }
    >
      <Body loading={loading} error={error}>
        <DataTable
          rows={rows}
          empty="Tidak ada jurnal pada periode ini"
          columns={[
            { header: 'Tanggal', cell: (r) => tanggal(r.TGL) },
            { header: 'No. Bukti', cell: (r) => <span className="font-mono text-xs">{r.NO_BUKTI}</span> },
            { header: 'Perkiraan', cell: (r) => `${r.NOMOR} · ${r.NAMA}` },
            { header: 'Keterangan', cell: (r) => teks(r.KETERANGAN) },
            { header: 'Debet', cell: (r) => (r.DEBET ? rupiah(r.DEBET) : ''), align: 'right' },
            { header: 'Kredit', cell: (r) => (r.KREDIT ? rupiah(r.KREDIT) : ''), align: 'right' },
            { header: 'User', cell: (r) => teks(r.USER) },
          ]}
          footer={
            <tr>
              <td colSpan={4} className="px-4 py-3 text-right">
                Total
              </td>
              <td className="px-4 py-3 text-right">{rupiah(sum(rows, (r) => r.DEBET))}</td>
              <td className="px-4 py-3 text-right">{rupiah(sum(rows, (r) => r.KREDIT))}</td>
              <td />
            </tr>
          }
        />
      </Body>
    </Section>
  );
}

interface AngsuranRekap {
  Tgla: string;
  AO: string;
  Sandi: string;
  Ang_P: number;
  Ang_B: number;
  Denda: number;
  Tot_Ang: number;
}

function Angsuran() {
  const [range, setRange] = useState({ tgl1: firstOfMonthISO(), tgl2: todayISO() });
  const { data, error, loading } = useApi<{ rows: AngsuranRekap[] }>('/laporan/angsuran', range);
  const rows = data?.rows || [];
  return (
    <Section title="Rekap Angsuran Kredit per AO" actions={<DateRange tgl1={range.tgl1} tgl2={range.tgl2} onChange={(tgl1, tgl2) => setRange({ tgl1, tgl2 })} />}>
      <Body loading={loading} error={error}>
        <DataTable
          rows={rows}
          empty="Tidak ada angsuran pada periode ini"
          columns={[
            { header: 'Tanggal', cell: (r) => tanggal(r.Tgla) },
            { header: 'AO', cell: (r) => r.AO },
            { header: 'Sandi', cell: (r) => r.Sandi, align: 'center' },
            { header: 'Pokok', cell: (r) => rupiah(r.Ang_P), align: 'right' },
            { header: 'Bunga', cell: (r) => rupiah(r.Ang_B), align: 'right' },
            { header: 'Denda', cell: (r) => rupiah(r.Denda), align: 'right' },
            { header: 'Total', cell: (r) => rupiah(r.Tot_Ang), align: 'right' },
          ]}
          footer={
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right">
                Total
              </td>
              <td className="px-4 py-3 text-right">{rupiah(sum(rows, (r) => r.Ang_P))}</td>
              <td className="px-4 py-3 text-right">{rupiah(sum(rows, (r) => r.Ang_B))}</td>
              <td className="px-4 py-3 text-right">{rupiah(sum(rows, (r) => r.Denda))}</td>
              <td className="px-4 py-3 text-right">{rupiah(sum(rows, (r) => r.Tot_Ang))}</td>
            </tr>
          }
        />
      </Body>
    </Section>
  );
}

interface KasRow {
  tgl: string;
  saldo: number;
  mutdeb: number;
  mutkre: number;
  saldoak: number;
}

function Kas() {
  const [tgl, setTgl] = useState(firstOfMonthISO());
  const { data, error, loading } = useApi<{ rows: KasRow[] }>('/laporan/kas', { tgl });
  return (
    <Section
      title="Mutasi Kas Harian"
      actions={
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Sejak
          <input type="date" className="input w-auto" value={tgl} onChange={(e) => e.target.value && setTgl(e.target.value)} />
        </label>
      }
    >
      <Body loading={loading} error={error}>
        <DataTable
          rows={data?.rows || []}
          empty="Tidak ada data kas"
          columns={[
            { header: 'Tanggal', cell: (r) => tanggal(r.tgl) },
            { header: 'Saldo Awal', cell: (r) => rupiah(r.saldo), align: 'right' },
            { header: 'Kas Masuk', cell: (r) => rupiah(r.mutdeb), align: 'right' },
            { header: 'Kas Keluar', cell: (r) => rupiah(r.mutkre), align: 'right' },
            { header: 'Saldo Akhir', cell: (r) => <span className="font-medium">{rupiah(r.saldoak)}</span>, align: 'right' },
          ]}
        />
      </Body>
    </Section>
  );
}

export default function LaporanPage() {
  const [tab, setTab] = useState<Tab>('neraca');
  return (
    <>
      <PageHeader title="Laporan" subtitle="Laporan keuangan dan operasional cabang" />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'neraca' && <Neraca />}
      {tab === 'jurnal' && <Jurnal />}
      {tab === 'angsuran' && <Angsuran />}
      {tab === 'kas' && <Kas />}
    </>
  );
}
