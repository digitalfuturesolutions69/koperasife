const rupiahFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const numberFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

export const rupiah = (v: unknown) => (v === null || v === undefined || v === '' ? '-' : `Rp ${rupiahFmt.format(Number(v))}`);
export const angka = (v: unknown) => (v === null || v === undefined || v === '' ? '-' : numberFmt.format(Number(v)));

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "2024-01-31" → "31 Jan 2024". Tanggal kosong ("0000-00-00") ditampilkan "-". */
export function tanggal(v: unknown) {
  const s = String(v || '');
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m || m[1] === '0000') return '-';
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}`;
}

/** Nilai default "0" pada kolom CHAR di database dianggap kosong. */
export const teks = (v: unknown) => {
  const s = String(v ?? '').trim();
  return s === '' || s === '0' ? '-' : s;
};

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const firstOfMonthISO = () => todayISO().slice(0, 8) + '01';
