import { Link, useParams } from 'react-router-dom';
import SearchPage from '../components/SearchPage';
import { Badge, DataTable, DetailGrid, ErrorBox, Loading, PageHeader, Section } from '../components/ui';
import { useApi } from '../lib/useApi';
import { rupiah, tanggal, teks } from '../lib/format';

interface NasabahRow {
  cif: string;
  nama: string;
  alamat: string;
  desa: string;
  tglLahir: string;
  noId: string;
  telpon: string;
}

export function NasabahList() {
  return (
    <SearchPage<NasabahRow>
      title="Nasabah"
      subtitle="Cari data nasabah berdasarkan nama"
      endpoint="/nasabah"
      placeholder="Nama nasabah…"
      rowLink={(r) => `/nasabah/${encodeURIComponent(r.cif)}`}
      columns={[
        { header: 'CIF', cell: (r) => <span className="font-mono text-xs">{r.cif}</span> },
        { header: 'Nama', cell: (r) => <span className="font-medium text-slate-900">{r.nama}</span> },
        { header: 'Alamat', cell: (r) => [teks(r.alamat), teks(r.desa)].filter((s) => s !== '-').join(', ') || '-' },
        { header: 'Tgl Lahir', cell: (r) => tanggal(r.tglLahir) },
        { header: 'No. Identitas', cell: (r) => teks(r.noId) },
        { header: 'Telepon', cell: (r) => teks(r.telpon) },
      ]}
    />
  );
}

interface Rekening {
  kode: '01' | '02' | '03';
  produk: string;
  nomor: string;
  namaProduk: string | null;
  saldo: number;
  tanggal: string;
}

const PRODUK_LINK: Record<string, string> = { '01': 'tabungan', '02': 'deposito', '03': 'kredit' };
const PRODUK_TONE = { '01': 'green', '02': 'blue', '03': 'amber' } as const;

export function NasabahDetail() {
  const { cif = '' } = useParams();
  const { data, error, loading, reload } = useApi<{ nasabah: Record<string, string>; rekening: Rekening[] }>(`/nasabah/${encodeURIComponent(cif)}`);
  const n = data?.nasabah;

  return (
    <>
      <PageHeader title={n ? n.NAMA : 'Detail Nasabah'} subtitle={`CIF ${cif}`} actions={<Link to="/nasabah" className="btn-ghost">← Kembali</Link>} />
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {n && data && (
        <>
          <Section title="Data Pribadi">
            <DetailGrid
              items={[
                ['Nama', n.NAMA],
                ['Jenis Kelamin', teks(n.JK)],
                ['Tempat, Tgl Lahir', `${teks(n.TEMPAT)}, ${tanggal(n.TGLL)}`],
                ['No. Identitas', teks(n.NOID)],
                ['Agama', teks(n.AGAMA)],
                ['Pekerjaan', teks(n.KERJA)],
                ['Alamat', `${teks(n.ALAMAT)} RT ${teks(n.RT)}/RW ${teks(n.RW)}`],
                ['Desa / Kecamatan', `${teks(n.DESA)} / ${teks(n.KEC)}`],
                ['Telepon', teks(n.TELPON)],
                ['Nama Ahli Waris', teks(n.AHLI_NAMA)],
                ['Hubungan Ahli Waris', teks(n.AHLI_HUB)],
                ['Terdaftar', tanggal(n.tanggal)],
              ]}
            />
          </Section>
          <Section title="Rekening">
            <DataTable
              rows={data.rekening}
              empty="Nasabah belum memiliki rekening"
              columns={[
                { header: 'Produk', cell: (r) => <Badge tone={PRODUK_TONE[r.kode]}>{r.produk}</Badge> },
                {
                  header: 'Nomor',
                  cell: (r) => (
                    <Link className="font-mono text-xs text-emerald-700 hover:underline" to={`/${PRODUK_LINK[r.kode]}/${encodeURIComponent(r.nomor)}`}>
                      {r.nomor}
                    </Link>
                  ),
                },
                { header: 'Jenis', cell: (r) => teks(r.namaProduk) },
                { header: 'Tanggal Buka', cell: (r) => tanggal(r.tanggal) },
                { header: 'Saldo / Baki Debet', cell: (r) => rupiah(r.saldo), align: 'right' },
              ]}
            />
          </Section>
        </>
      )}
    </>
  );
}
