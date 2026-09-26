import { Router } from 'express';
import { callProc } from '../db.js';
import { requireRole, roleOf } from '../auth.js';
import { code, handle, HttpError } from '../util.js';

const router = Router();
router.use(requireRole('admin'));

// Daftar user aplikasi (tanpa password): prosedur User()
router.get(
  '/',
  handle(async (req, res) => {
    const rows = await callProc('User');
    res.json(
      rows.map((r) => ({
        username: r.user,
        nokk: r.nokk,
        hidup: r.hidup,
        tanggal: r.tanggal,
        batasTarik: r.batastrk,
        batasSetor: r.batasset,
        role: roleOf(r.user),
      })),
    );
  }),
);

// Ubah status "hidup" user: prosedur UPass01(hidup, user)
router.patch(
  '/:username/status',
  handle(async (req, res) => {
    const username = code(req.params.username, 'user', 15);
    const hidup = String(req.body?.hidup ?? '');
    if (!['0', '1'].includes(hidup)) throw new HttpError(400, 'Nilai hidup harus "0" atau "1"');
    await callProc('UPass01', [hidup, username]);
    res.json({ username, hidup });
  }),
);

export default router;
