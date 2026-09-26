import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { DataTable, Empty, ErrorBox, Loading, PageHeader, SearchBox, Section, TruncatedNote, type Column } from './ui';

interface SearchResult<T> {
  rows: T[];
  total: number;
  truncated: boolean;
}

/** Halaman pencarian standar: kotak cari → tabel hasil → klik baris untuk detail. */
export default function SearchPage<T>({ title, subtitle, endpoint, placeholder, columns, rowLink }: {
  title: string;
  subtitle: string;
  endpoint: string;
  placeholder: string;
  columns: Column<T>[];
  rowLink: (row: T) => string;
}) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q') || '';
  const { data, error, loading } = useApi<SearchResult<T>>(q ? endpoint : null, { q });

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="mb-4">
        <SearchBox key={q} placeholder={placeholder} initial={q} onSearch={(v) => setParams(v ? { q: v } : {})} />
      </div>
      <Section title={q ? `Hasil pencarian "${q}"` : 'Hasil pencarian'} actions={data && <span className="text-xs text-slate-500">{data.total} data</span>}>
        {!q && <Empty text="Ketik nama atau nomor, lalu tekan Cari." />}
        {q && loading && <Loading />}
        {q && error && (
          <div className="p-4">
            <ErrorBox message={error} />
          </div>
        )}
        {q && data && !loading && (
          <>
            <DataTable rows={data.rows} columns={columns} onRowClick={(r) => navigate(rowLink(r))} empty="Tidak ditemukan" />
            <TruncatedNote total={data.total} shown={data.rows.length} />
          </>
        )}
      </Section>
    </>
  );
}
