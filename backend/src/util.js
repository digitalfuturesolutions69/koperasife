export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Membungkus handler async agar error diteruskan ke error handler Express. */
export const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function date(value, name = 'tanggal') {
  const v = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, `Parameter ${name} harus berformat YYYY-MM-DD`);
  return v;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Kata kunci pencarian nama → pola LIKE, dipotong sesuai panjang parameter prosedur. */
export function searchPattern(value, maxLen = 30) {
  const q = String(value || '').trim().replace(/[%_]/g, '');
  if (q.length < 2) throw new HttpError(400, 'Kata kunci pencarian minimal 2 huruf');
  return `%${q}%`.slice(0, maxLen);
}

export function code(value, name = 'nomor', maxLen = 20) {
  const v = String(value || '').trim();
  if (!v || v.length > maxLen || !/^[A-Za-z0-9.\-/ ]+$/.test(v)) throw new HttpError(400, `${name} tidak valid`);
  return v;
}

/** Membatasi jumlah baris hasil pencarian agar respons tetap ringan. */
export function limit(rows, max = 300) {
  return { rows: rows.slice(0, max), total: rows.length, truncated: rows.length > max };
}
