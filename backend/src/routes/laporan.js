import { Router } from 'express';
import { callProc } from '../db.js';
import { branchOf, requireRole } from '../auth.js';
import { code, date, handle, HttpError, today } from '../util.js';

const router = Router();

// Transaksi tunai teller per tanggal.
// Staf hanya melihat transaksinya sendiri; pengurus/admin bisa melihat semua user di cabang.
router.get(
  '/teller',
  handle(async (req, res) => {
    const tgl = req.query.tgl ? date(req.query.tgl) : today();
    const nokk = branchOf(req);
    const semua = req.user.role !== 'staf' && req.query.semua === '1';
    const rows = await callProc('TransaksiTeller', [tgl, req.user.username, semua ? '0' : '1', nokk]);
    res.json({ tgl, nokk, semua, rows });
  }),
);

// Semua laporan di bawah ini khusus pengurus & admin
router.use(requireRole('pengurus', 'admin'));

// Daftar perkiraan (buku besar) beserta saldo: prosedur Neraca(nokk)
router.get(
  '/neraca',
  handle(async (req, res) => {
    const rows = await callProc('Neraca', [branchOf(req)]);
    res.json({ rows });
  }),
);

// Jurnal umum: prosedur LaporanNeraca(tanda, tgl1, tgl2, nokk, nomor)
//   tanda 2 = semua jurnal pada tgl1, tanda 3 = rentang tgl1..tgl2 (urut per perkiraan)
router.get(
  '/jurnal',
  handle(async (req, res) => {
    const tgl1 = date(req.query.tgl1, 'tgl1');
    const tgl2 = req.query.tgl2 ? date(req.query.tgl2, 'tgl2') : tgl1;
    const tanda = tgl1 === tgl2 ? 2 : 3;
    const nomor = req.query.nomor ? code(req.query.nomor, 'nomor perkiraan', 15) : ' ';
    const rows = await callProc('LaporanNeraca', [tanda, tgl1, tgl2, branchOf(req), nomor]);
    res.json({ tgl1, tgl2, rows });
  }),
);

// Rekap angsuran kredit per tanggal & AO: prosedur Angsur3(tgl1, tgl2, nokk)
router.get(
  '/angsuran',
  handle(async (req, res) => {
    const tgl1 = date(req.query.tgl1, 'tgl1');
    const tgl2 = date(req.query.tgl2, 'tgl2');
    if (tgl2 < tgl1) throw new HttpError(400, 'Tanggal akhir harus setelah tanggal awal');
    const rows = await callProc('Angsur3', [tgl1, tgl2, branchOf(req)]);
    res.json({ tgl1, tgl2, rows });
  }),
);

// Mutasi kas harian sejak tanggal tertentu: prosedur TransaksiTellerRekap(tgl, nokk)
router.get(
  '/kas',
  handle(async (req, res) => {
    const tgl = date(req.query.tgl);
    const rows = await callProc('TransaksiTellerRekap', [tgl, branchOf(req)]);
    res.json({ tgl, rows });
  }),
);

export default router;
