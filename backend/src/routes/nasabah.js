import { Router } from 'express';
import { callProc, query } from '../db.js';
import { branchOf } from '../auth.js';
import { code, handle, HttpError, limit, searchPattern } from '../util.js';

const router = Router();

// GET /api/nasabah?q=nama
router.get(
  '/',
  handle(async (req, res) => {
    const nokk = branchOf(req);
    const rows = await callProc('NasabahNama', [searchPattern(req.query.q)]);
    const data = rows
      .filter((r) => r.NOKK === nokk)
      .map((r) => ({
        cif: r.CIF,
        nama: r.NAMA,
        alamat: r.ALAMAT,
        desa: r.DESA,
        tglLahir: r.TGLL,
        noId: r.NOID,
        telpon: r.TELPON,
        nokk: r.NOKK,
      }));
    res.json(limit(data));
  }),
);

// GET /api/nasabah/:cif  → data nasabah + semua rekeningnya
router.get(
  '/:cif',
  handle(async (req, res) => {
    const cif = code(req.params.cif, 'CIF', 15);
    const nokk = branchOf(req);
    const [nasabah] = await query('SELECT * FROM nasabah WHERE CIF = ? AND NOKK = ?', [cif, nokk]);
    if (!nasabah) throw new HttpError(404, 'Nasabah tidak ditemukan');

    // Sama dengan CariNasabah01, tetapi berdasarkan CIF
    const rekening = await query(
      `SELECT '01' AS kode, 'Tabungan' AS produk, P.NOMOR AS nomor, P.JENIS AS jenis, T.keterangan AS namaProduk, P.SALDO AS saldo, P.TANGGAL AS tanggal
         FROM penabung P LEFT JOIN tabel21 T ON T.nomor = P.JENIS WHERE P.CIF = ?
       UNION ALL
       SELECT '02', 'Deposito', D.no_rek, D.jenis, T.keterangan, D.saldo, D.tgl_kredit
         FROM deposan D LEFT JOIN tabel22 T ON T.nomor = D.jenis WHERE D.cif = ?
       UNION ALL
       SELECT '03', 'Kredit', D.NO_REK, D.JENIS, T.keterangan, D.BAKI_DEBET, D.TGL_KREDIT
         FROM debitur D LEFT JOIN tabel23 T ON T.nomor = D.JENIS WHERE D.CIF = ?
       ORDER BY kode, nomor`,
      [cif, cif, cif],
    );
    res.json({ nasabah, rekening });
  }),
);

export default router;
