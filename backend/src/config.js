import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Path relatif (.env & STATIC_DIR) dihitung dari folder backend, bukan dari folder tempat perintah dijalankan
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} wajib diisi (lihat .env.example)`);
  }
  return value;
}

function list(name) {
  return (process.env[name] || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT || 3000),
  // Folder hasil build frontend. Kalau ada, Express ikut menyajikan web-nya.
  staticDir: process.env.STATIC_DIR ? path.resolve(ROOT, process.env.STATIC_DIR) : '',
  corsOrigins: list('CORS_ORIGINS'),

  db: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT || 3306),
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD || '',
    database: required('DB_NAME'),
    connectionLimit: Number(process.env.DB_POOL || 10),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_VERIFY !== 'false' } : undefined,
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  // Tabel `pass` tidak punya kolom peran, jadi peran ditentukan dari daftar user di sini.
  // User yang tidak disebut otomatis dianggap "staf".
  roles: {
    admin: list('ROLE_ADMIN'),
    pengurus: list('ROLE_PENGURUS'),
  },
};
