import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  // Tanggal dikembalikan apa adanya (mis. "2024-01-31" atau "0000-00-00"),
  // supaya tidak bergeser karena zona waktu.
  dateStrings: true,
  charset: 'utf8mb4',
});

/**
 * Memanggil stored procedure dan mengembalikan result set pertama.
 * Nama prosedur hanya boleh berasal dari kode (bukan dari input user).
 */
export async function callProc(name, params = []) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Nama prosedur tidak valid: ${name}`);
  const placeholders = params.map(() => '?').join(',');
  const [results] = await pool.query(`CALL \`${name}\`(${placeholders})`, params);
  // Hasil CALL berupa [resultSet1, ..., OkPacket]; untuk prosedur UPDATE hanya OkPacket.
  if (Array.isArray(results) && Array.isArray(results[0])) return results[0];
  return [];
}

/** Query SELECT biasa dengan parameter (dipakai bila belum ada prosedurnya). */
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
