import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { HttpError } from './util.js';
import authRoutes from './routes/auth.js';
import masterRoutes from './routes/master.js';
import nasabahRoutes from './routes/nasabah.js';
import { tabungan, deposito, kredit } from './routes/rekening.js';
import laporanRoutes from './routes/laporan.js';
import userRoutes from './routes/users.js';

const app = express();
app.set('trust proxy', 1); // di belakang Nginx
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

// CORS hanya diperlukan bila frontend dibuka dari domain lain
if (config.corsOrigins.length) {
  app.use((req, res, next) => {
    const origin = String(req.headers.origin || '').toLowerCase();
    if (config.corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

const api = express.Router();
api.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'terhubung' });
  } catch {
    res.status(503).json({ status: 'error', database: 'tidak terhubung' });
  }
});
api.use('/auth', authRoutes);
api.use(requireAuth);
api.use('/', masterRoutes);
api.use('/nasabah', nasabahRoutes);
api.use('/tabungan', tabungan);
api.use('/deposito', deposito);
api.use('/kredit', kredit);
api.use('/laporan', laporanRoutes);
api.use('/users', userRoutes);
api.use((req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan' }));
app.use('/api', api);

// Menyajikan hasil build frontend (opsional)
if (config.staticDir && fs.existsSync(config.staticDir)) {
  const dir = path.resolve(config.staticDir);
  app.use(express.static(dir, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dir, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Format JSON tidak valid' });
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  const dbDown = ['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR'].includes(err.code);
  res.status(dbDown ? 503 : 500).json({
    message: dbDown ? 'Tidak dapat terhubung ke server database' : 'Terjadi kesalahan pada server',
  });
});

app.listen(config.port, '127.0.0.1', () => {
  console.log(`API koperasi berjalan di port ${config.port}`);
});
