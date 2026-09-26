import jwt from 'jsonwebtoken';
import { config } from './config.js';

export const ROLES = ['staf', 'pengurus', 'admin'];

export function roleOf(username) {
  const u = String(username).trim().toLowerCase();
  if (config.roles.admin.includes(u)) return 'admin';
  if (config.roles.pengurus.includes(u)) return 'pengurus';
  return 'staf';
}

export function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Silakan login terlebih dahulu' });
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    res.status(401).json({ message: 'Sesi berakhir, silakan login ulang' });
  }
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Anda tidak punya akses ke menu ini' });
    }
    next();
  };
}

/**
 * Kode kantor/cabang (nokk) yang boleh diakses.
 * Staf selalu terkunci di cabangnya sendiri; pengurus & admin boleh memilih lewat ?nokk=.
 */
export function branchOf(req) {
  const requested = String(req.query.nokk || '').trim();
  if (req.user.role !== 'staf' && /^\d{3}$/.test(requested)) return requested;
  return req.user.nokk;
}
