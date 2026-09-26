import { Link, useParams } from 'react-router-dom';
import SearchPage from '../components/SearchPage';
import { Badge, DataTable, DetailGrid, DK, ErrorBox, KolekBadge, Loading, PageHeader, Section } from '../components/ui';
import { useApi } from '../lib/useApi';
import { angka, rupiah, tanggal, teks } from '../lib/format';

type Row = Record<string, string | number>;

interface Mutasi {
  tgl: string;
  noBukti: string;
  sandi: string;
  keterangan: string;
  dk: string;
  jumlah: number;
  saldo: number;
  user: string;
}

const nomorCell = (v: string) => <span className="font-mono text-xs">{v}</span>;
const namaCell = (v: string) => <span className="font-medium text-slate-900">{v}</span>;
const back = (to: string) => <Link to={to} className="btn-ghost">← Kembali</Link>;
const cifLink = (cif: unknown) => (
  <Link className="text-emerald-700 hover:underline" to={`/nasabah/${encodeURIComponent(String(cif))}`}>
    {String(cif)}
  </Link>
);

function MutasiTable({ rows }: { rows: Mutasi[] }) {
  return (
    <DataTable
      rows={rows}
      empty="Belum ada mutasi"
      columns={[
        { header: 'Tanggal', cell: (r) => tanggal(r.tgl) },
        { header: 'No. Bukti', cell: (r) => nomorCell(r.noBukti) },
        { header: 'Keterangan', cell: (r) => teks(r.keterangan) },
        { header: 'D/K', cell: (r) => <DK dk={r.dk} />, align: 'center' },
        { header: 'Jumlah', cell: (r) => rupiah(r.jumlah), align: 'right' },
        { header: 'Saldo', cell: (r) => rupiah(r.saldo), align: 'right' },
        { header: 'User', cell: (r) => teks(r.user) },
      ]}
    />
  );
}

/* ------------------------------ TABUNGAN ------------------------------ */

interface TabunganRow {
  nomor: string;
  nama: string;
  alamat: string;
  saldo: number;
  tanggal: string;
  tutup: string;
}

export function TabunganList() {
  return (
    <SearchPage<TabunganRow>
      title="Tabungan"
      subtitle="Cari rekening tabungan berdasarkan nama atau nomor rekening"
      endpoint="/tabungan"
      placeholder="Nama atau nomor rekening…"
      rowLink={(r) => `/tabungan/${encodeURIComponent(r.nomor)}`}
      columns={[
        { header: 'No. Rekening', cell: (r) => nomorCell(r.nomor) },
        { header: 'Nama', cell: (r) => namaCell(r.nama) },
        { header: 'Alamat', cell: (r) => teks(r.alamat) },
        { header: 'Tgl Buka', cell: (r) => tanggal(r.tanggal) },
        { header: 'Saldo', cell: (r) => rupiah(r.saldo), align: 'right' },
      ]}
    />
  );
}

export function TabunganDetail() {
  const { nomor = '' } = useParams();
  const { data, error, loading, reload } = useApi<{ rekening: Row; produk: { keterangan: string; bunga: number } | null; mutasi: Mutasi[] }>(
    `/tabungan/${encodeURIComponent(nomor)}`,
  );
  const r = data?.rekening;
  return (
    <>
      <PageHeader title={r ? String(r.NAMA) : 'Detail Tabungan'} subtitle={`Rekening tabungan ${nomor}`} actions={back('/tabungan')} />
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {r && data && (
        <>
          <Section title="Informasi Rekening">
            <DetailGrid
              items={[
                ['No. Rekening', nomorCell(String(r.NOMOR))],
                ['CIF', cifLink(r.CIF)],
                ['Nama', r.NAMA],
                ['Alamat', teks(r.ALAMAT)],
                ['Produk', data.produk ? `${data.produk.keterangan} (${angka(data.produk.bunga)}%)` : teks(r.JENIS)],
                ['Tanggal Buka', tanggal(r.TANGGAL)],
                ['Saldo', <span className="text-lg">{rupiah(r.SALDO)}</span>],
                ['Saldo Minimum', rupiah(r.SALDOMIN)],
                ['Status', r.tutup === '1' ? <Badge tone="red">Tutup</Badge> : <Badge tone="green">Aktif</Badge>],
              ]}
            />
          </Section>
          <Section title="Mutasi Terakhir">
            <MutasiTable rows={data.mutasi} />
          </Section>
        </>
      )}
    </>
  );
}

/* ------------------------------ DEPOSITO ------------------------------ */

interface DepositoRow {
  nomor: string;
  nama: string;
  nominal: number;
  saldo: number;
  bunga: number;
  mulai: string;
  sampai: string;
}

export function DepositoList() {
  return (
    <SearchPage<DepositoRow>
      title="Deposito"
      subtitle="Cari bilyet deposito berdasarkan nama atau nomor rekening"
      endpoint="/deposito"
      placeholder="Nama atau nomor rekening…"
      rowLink={(r) => `/deposito/${encodeURIComponent(r.nomor)}`}
      columns={[
        { header: 'No. Rekening', cell: (r) => nomorCell(r.nomor) },
        { header: 'Nama', cell: (r) => namaCell(r.nama) },
        { header: 'Mulai', cell: (r) => tanggal(r.mulai) },
        { header: 'Jatuh Tempo', cell: (r) => tanggal(r.sampai) },
        { header: 'Bunga', cell: (r) => `${angka(r.bunga)}%`, align: 'right' },
        { header: 'Saldo', cell: (r) => rupiah(r.saldo), align: 'right' },
      ]}
    />
  );
}

export function DepositoDetail() {
  const { nomor = '' } = useParams();
  const { data, error, loading, reload } = useApi<{ rekening: Row; mutasi: Mutasi[] }>(`/deposito/${encodeURIComponent(nomor)}`);
  const r = data?.rekening;
  return (
    <>
      <PageHeader title={r ? String(r.NAMA) : 'Detail Deposito'} subtitle={`Rekening deposito ${nomor}`} actions={back('/deposito')} />
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {r && data && (
        <>
          <Section title="Informasi Deposito">
            <DetailGrid
              items={[
                ['No. Rekening', nomorCell(String(r.no_rek))],
                ['CIF', cifLink(r.CIF)],
                ['Nama', r.NAMA],
                ['Produk', teks(r.namaProduk ?? r.jenis)],
                ['Nominal', rupiah(r.plafond)],
                ['Saldo', <span className="text-lg">{rupiah(r.saldo)}</span>],
                ['Suku Bunga', `${angka(r.bunga)}% p.a.`],
                ['Jangka Waktu', `${angka(r.jk_bulan)} bulan`],
                ['Tanggal Mulai', tanggal(r.mulai)],
                ['Jatuh Tempo', tanggal(r.sampai)],
                ['ARO', r.aro === '1' || r.aro === 'Y' ? 'Ya' : 'Tidak'],
                ['Rek. Tabungan Bunga', teks(r.no_rekt)],
              ]}
            />
          </Section>
          <Section title="Mutasi Terakhir">
            <MutasiTable rows={data.mutasi} />
          </Section>
        </>
      )}
    </>
  );
}

/* ------------------------------- KREDIT ------------------------------- */

interface KreditRow {
  nomor: string;
  nama: string;
  plafond: number;
  bakiDebet: number;
  kolek: string;
  tglKredit: string;
  sampai: string;
}

export function KreditList() {
  return (
    <SearchPage<KreditRow>
      title="Kredit"
      subtitle="Cari debitur berdasarkan nama atau nomor rekening"
      endpoint="/kredit"
      placeholder="Nama atau nomor rekening…"
      rowLink={(r) => `/kredit/${encodeURIComponent(r.nomor)}`}
      columns={[
        { header: 'No. Rekening', cell: (r) => nomorCell(r.nomor) },
        { header: 'Nama', cell: (r) => namaCell(r.nama) },
        { header: 'Tgl Realisasi', cell: (r) => tanggal(r.tglKredit) },
        { header: 'Jatuh Tempo', cell: (r) => tanggal(r.sampai) },
        { header: 'Kolek', cell: (r) => <KolekBadge kolek={r.kolek} /> },
        { header: 'Plafond', cell: (r) => rupiah(r.plafond), align: 'right' },
        { header: 'Baki Debet', cell: (r) => rupiah(r.bakiDebet), align: 'right' },
      ]}
    />
  );
}

interface Angsuran {
  tgl: string;
  noBukti: string;
  keterangan: string;
  dk: string;
  pokok: number;
  bunga: number;
  denda: number;
  total: number;
  bakiDebet: number;
  user: string;
}

interface Jadwal {
  ke: number;
  tgl: string;
  pokok: number;
  bunga: number;
  total: number;
}

export function KreditDetail() {
  const { nomor = '' } = useParams();
  const { data, error, loading, reload } = useApi<{ rekening: Row; angsuran: Angsuran[]; jadwal: Jadwal[] }>(`/kredit/${encodeURIComponent(nomor)}`);
  const r = data?.rekening;
  return (
    <>
      <PageHeader title={r ? String(r.NAMA) : 'Detail Kredit'} subtitle={`Rekening kredit ${nomor}`} actions={back('/kredit')} />
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {r && data && (
        <>
          <Section title="Informasi Kredit">
            <DetailGrid
              items={[
                ['No. Rekening', nomorCell(String(r.NO_REK))],
                ['CIF', cifLink(r.CIF)],
                ['Nama', r.NAMA],
                ['Alamat', teks(r.ALAMAT)],
                ['Produk', teks(r.namaProduk ?? r.JENIS)],
                ['No. PK', teks(r.NO_PK)],
                ['Plafond', rupiah(r.PLAFOND)],
                ['Baki Debet', <span className="text-lg">{rupiah(r.BAKI_DEBET)}</span>],
                ['Suku Bunga', `${angka(r.BUNGA)}% p.a.`],
                ['Jangka Waktu', `${angka(r.JK_BULAN)} bulan`],
                ['Tanggal Realisasi', tanggal(r.TGL_KREDIT)],
                ['Jatuh Tempo', tanggal(r.SAMPAI)],
                ['Angsuran', rupiah(r.TOT_ANG)],
                ['Tunggakan Pokok', rupiah(r.T_POKOK)],
                ['Tunggakan Bunga', rupiah(r.T_BUNGA)],
                ['Denda', rupiah(r.DENDA)],
                ['Kolektibilitas', <KolekBadge kolek={String(r.KOLEK)} label={r.namaKolek ? String(r.namaKolek) : undefined} />],
                ['AO', r.namaAO ? `${r.AO} · ${r.namaAO}` : teks(r.AO)],
              ]}
            />
          </Section>
          <Section title="Riwayat Angsuran">
            <DataTable
              rows={data.angsuran}
              empty="Belum ada pembayaran angsuran"
              columns={[
                { header: 'Tanggal', cell: (a) => tanggal(a.tgl) },
                { header: 'No. Bukti', cell: (a) => nomorCell(a.noBukti) },
                { header: 'Keterangan', cell: (a) => teks(a.keterangan) },
                { header: 'Pokok', cell: (a) => rupiah(a.pokok), align: 'right' },
                { header: 'Bunga', cell: (a) => rupiah(a.bunga), align: 'right' },
                { header: 'Denda', cell: (a) => rupiah(a.denda), align: 'right' },
                { header: 'Total', cell: (a) => <span className="font-medium">{rupiah(a.total)}</span>, align: 'right' },
                { header: 'Baki Debet', cell: (a) => rupiah(a.bakiDebet), align: 'right' },
                { header: 'User', cell: (a) => teks(a.user) },
              ]}
            />
          </Section>
          {data.jadwal.length > 0 && (
            <Section title="Jadwal Angsuran">
              <DataTable
                rows={data.jadwal}
                columns={[
                  { header: 'Ke', cell: (j) => j.ke, align: 'center' },
                  { header: 'Tanggal', cell: (j) => tanggal(j.tgl) },
                  { header: 'Pokok', cell: (j) => rupiah(j.pokok), align: 'right' },
                  { header: 'Bunga', cell: (j) => rupiah(j.bunga), align: 'right' },
                  { header: 'Total', cell: (j) => rupiah(j.total), align: 'right' },
                ]}
              />
            </Section>
          )}
        </>
      )}
    </>
  );
}
