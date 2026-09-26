import { Router } from 'express';
import { callProc, query } from '../db.js';
import { branchOf } from '../auth.js';
import { handle } from '../util.js';

const router = Router();

router.get(
  '/cabang',
  handle(async (req, res) => {
    const rows = await callProc('Cabang');
    const visible = req.user.role === 'staf' ? rows.filter((r) => r.nokk === req.user.nokk) : rows;
    res.json(visible.map((r) => ({ nokk: r.nokk, nama: r.namacabang, alamat: r.alamatcabang })));
  }),
);

router.get(
  '/dashboard',
  handle(async (req, res) => {
    const nokk = branchOf(req);
    const [[tgl], [nasabah], [tabungan], [deposito], [kredit], kolek] = await Promise.all([
      query('SELECT MAX(TGL) AS tgl FROM tanggal'),
      query('SELECT COUNT(*) AS jumlah FROM nasabah WHERE NOKK = ?', [nokk]),
      query('SELECT COUNT(*) AS jumlah, COALESCE(SUM(SALDO),0) AS saldo FROM penabung WHERE nokk = ? AND SALDO > 0', [nokk]),
      query('SELECT COUNT(*) AS jumlah, COALESCE(SUM(saldo),0) AS saldo FROM deposan WHERE nokk = ? AND saldo > 0', [nokk]),
      query(
        `SELECT COUNT(*) AS jumlah, COALESCE(SUM(BAKI_DEBET),0) AS baki_debet, COALESCE(SUM(PLAFOND),0) AS plafond,
                COALESCE(SUM(T_POKOK),0) AS tunggakan_pokok, COALESCE(SUM(T_BUNGA),0) AS tunggakan_bunga
           FROM debitur WHERE nokk = ? AND BAKI_DEBET > 0`,
        [nokk],
      ),
      query(
        `SELECT d.KOLEK AS kolek, k.KET AS keterangan, COUNT(*) AS jumlah, COALESCE(SUM(d.BAKI_DEBET),0) AS baki_debet
           FROM debitur d LEFT JOIN kole k ON k.SANDI = d.KOLEK
          WHERE d.nokk = ? AND d.BAKI_DEBET > 0
          GROUP BY d.KOLEK, k.KET ORDER BY d.KOLEK`,
        [nokk],
      ),
    ]);
    res.json({ nokk, tanggalSistem: tgl?.tgl || null, nasabah, tabungan, deposito, kredit, kolek });
  }),
);

export default router;
