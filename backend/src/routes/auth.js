import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { callProc } from '../db.js';
import { requireAuth, roleOf, signToken } from '../auth.js';
import { handle, HttpError } from '../util.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan login. Coba lagi 15 menit lagi.' },
});

router.post(
  '/login',
  loginLimiter,
  handle(async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || !password || username.length > 15 || password.length > 15) {
      throw new HttpError(400, 'User dan password wajib diisi');
    }

    // Prosedur bawaan aplikasi desktop: CariUser(user, password)
    const rows = await callProc('CariUser', [username, password]);
    const row = rows[0];
    if (!row) throw new HttpError(401, 'User atau password salah');

    const user = {
      username: row.user,
      nokk: row.nokk || '000',
      role: roleOf(row.user),
    };
    res.json({ token: signToken(user), user });
  }),
);

router.get('/me', requireAuth, (req, res) => {
  const { username, nokk, role } = req.user;
  res.json({ user: { username, nokk, role } });
});

export default router;
