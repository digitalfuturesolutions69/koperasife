import { useState, type FormEvent, type ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Loading({ text = 'Memuat data…' }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 p-6 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      {text}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      {onRetry && (
        <button className="font-medium underline" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{text}</div>;
}

export function SearchBox({ placeholder, initial = '', onSearch }: { placeholder: string; initial?: string; onSearch: (q: string) => void }) {
  const [q, setQ] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input className="input max-w-md" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <button className="btn-primary" type="submit">
        Cari
      </button>
    </form>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function DataTable<T>({ columns, rows, onRowClick, empty = 'Tidak ada data', footer }: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: string;
  footer?: ReactNode;
}) {
  if (!rows.length) return <Empty text={empty} />;
  const alignClass = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            {columns.map((c) => (
              <th key={c.header} className={`whitespace-nowrap px-4 py-2.5 font-medium ${alignClass(c.align)}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer hover:bg-emerald-50/60' : 'hover:bg-slate-50'}
            >
              {columns.map((c) => (
                <td key={c.header} className={`whitespace-nowrap px-4 py-2.5 ${alignClass(c.align)} ${c.className || ''}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">{footer}</tfoot>}
      </table>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-sm text-slate-500">{hint}</div>}
    </div>
  );
}

export function DetailGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium text-slate-500">{k}</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card mb-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-sky-100 text-sky-800',
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** Kolektibilitas kredit: 1 Lancar … 5 Macet */
export function KolekBadge({ kolek, label }: { kolek: string; label?: string }) {
  const tone = kolek === '1' ? 'green' : kolek === '2' ? 'amber' : ['3', '4', '5'].includes(kolek) ? 'red' : 'slate';
  const names: Record<string, string> = { '1': 'Lancar', '2': 'DPK', '3': 'Kurang Lancar', '4': 'Diragukan', '5': 'Macet' };
  return <Badge tone={tone}>{label?.trim() || names[kolek] || `Kolek ${kolek}`}</Badge>;
}

export function DK({ dk }: { dk: string }) {
  return dk === 'D' ? <Badge tone="red">Debet</Badge> : dk === 'K' ? <Badge tone="green">Kredit</Badge> : <Badge>{dk}</Badge>;
}

export function TruncatedNote({ total, shown }: { total: number; shown: number }) {
  if (total <= shown) return null;
  return (
    <div className="border-t border-slate-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
      Menampilkan {shown} dari {total} hasil. Perjelas kata kunci untuk mempersempit pencarian.
    </div>
  );
}
