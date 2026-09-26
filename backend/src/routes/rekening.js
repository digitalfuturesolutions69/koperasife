import { Router } from 'express';
import { callProc, query } from '../db.js';
import { branchOf } from '../auth.js';
import { code, handle, HttpError, limit, searchPattern } from '../util.js';

const isNumberQuery = (q) => /^[0-9][0-9.\-/]*$/.test(String(q || '').trim());

/* ------------------------------ TABUNGAN ------------------------------ */
export const tabungan = Router();

tabungan.get(
  '/',
  handle(async (req, res) => {
    const nokk = branchOf(req);
    const q = String(req.query.q || '').trim();
    const rows = isNumberQuery(q)
      ? await query(
          'SELECT P.*, N.NAMA, N.ALAMAT FROM penabung P JOIN nasabah N ON P.CIF = N.CIF WHERE P.NOMOR LIKE ? AND P.nokk = ? ORDER BY P.NOMOR LIMIT 301',
          [`${code(q, 'nomor')}%`, nokk],
        )
      : await callProc('PenabungNama', [searchPattern(q, 17), nokk]);
    res.json(
      limit(
        rows.map((r) => ({
          nomor: r.NOMOR,
          cif: r.CIF,
          nama: r.NAMA,
          alamat: r.ALAMAT,
          jenis: r.JENIS,
          saldo: r.SALDO,
          tanggal: r.TANGGAL,
          tutup: r.tutup,
        })),
      ),
    );
  }),
);

tabungan.get(
  '/:nomor',
  handle(async (req, res) => {
    const nomor = code(req.params.nomor, 'nomor rekening', 20);
    const [rekening] = await callProc('Penabung', [nomor, branchOf(req)]);
    if (!rekening) throw new HttpError(404, 'Rekening tabungan tidak ditemukan');
    const [[produk], mutasi] = await Promise.all([
      query('SELECT keterangan, bunga FROM tabel21 WHERE nomor = ?', [rekening.JENIS]),
      query(
        `SELECT TGL AS tgl, NO_BUKTI AS noBukti, SANDI AS sandi, keterangan, DK AS dk, JUMLAH AS jumlah, SALDO AS saldo, user
           FROM jurnal WHERE NOMOR = ? ORDER BY TGL DESC, NOURUT DESC LIMIT 200`,
        [nomor],
      ),
    ]);
    res.json({ rekening, produk: produk || null, mutasi });
  }),
);

/* ------------------------------ DEPOSITO ------------------------------ */
export const deposito = Router();

deposito.get(
  '/',
  handle(async (req, res) => {
    const nokk = branchOf(req);
    const q = String(req.query.q || '').trim();
    const rows = isNumberQuery(q)
      ? await query(
          'SELECT D.*, N.NAMA, N.ALAMAT FROM deposan D JOIN nasabah N ON D.cif = N.CIF WHERE D.no_rek LIKE ? AND D.nokk = ? ORDER BY D.no_rek LIMIT 301',
          [`${code(q, 'nomor')}%`, nokk],
        )
      : await callProc('DeposanNama', [searchPattern(q), nokk]);
    res.json(
      limit(
        rows.map((r) => ({
          nomor: r.no_rek,
          cif: r.cif,
          nama: r.NAMA,
          alamat: r.ALAMAT,
          jenis: r.jenis,
          nominal: r.plafond,
          saldo: r.saldo,
          bunga: r.bunga,
          mulai: r.mulai,
          sampai: r.sampai,
          aro: r.aro,
        })),
      ),
    );
  }),
);

deposito.get(
  '/:nomor',
  handle(async (req, res) => {
    const nomor = code(req.params.nomor, 'nomor rekening', 17);
    const [rekening] = await query(
      `SELECT D.*, N.NAMA, N.ALAMAT, N.CIF, T.keterangan AS namaProduk
         FROM deposan D JOIN nasabah N ON D.cif = N.CIF LEFT JOIN tabel22 T ON T.nomor = D.jenis
        WHERE D.no_rek = ? AND D.nokk = ?`,
      [nomor, branchOf(req)],
    );
    if (!rekening) throw new HttpError(404, 'Rekening deposito tidak ditemukan');
    const mutasi = await query(
      `SELECT TGL AS tgl, NO_BUKTI AS noBukti, SANDI AS sandi, keterangan, DK AS dk, JUMLAH AS jumlah, SALDO AS saldo, user
         FROM jurnald WHERE NOMOR = ? ORDER BY TGL DESC, NOURUT DESC LIMIT 200`,
      [nomor],
    );
    res.json({ rekening, mutasi });
  }),
);

/* ------------------------------- KREDIT ------------------------------- */
export const kredit = Router();

kredit.get(
  '/',
  handle(async (req, res) => {
    const nokk = branchOf(req);
    const q = String(req.query.q || '').trim();
    const rows = isNumberQuery(q)
      ? await query(
          'SELECT D.*, N.NAMA, N.ALAMAT FROM debitur D JOIN nasabah N ON D.CIF = N.CIF WHERE D.NO_REK LIKE ? AND D.nokk = ? ORDER BY D.NO_REK LIMIT 301',
          [`${code(q, 'nomor')}%`, nokk],
        )
      : await callProc('DebiturNama', [searchPattern(q), nokk]);
    res.json(
      limit(
        rows.map((r) => ({
          nomor: r.NO_REK,
          cif: r.CIF,
          nama: r.NAMA,
          alamat: r.ALAMAT,
          jenis: r.JENIS,
          plafond: r.PLAFOND,
          bakiDebet: r.BAKI_DEBET,
          kolek: r.KOLEK,
          tglKredit: r.TGL_KREDIT,
          sampai: r.SAMPAI,
          ao: r.AO,
        })),
      ),
    );
  }),
);

kredit.get(
  '/:nomor',
  handle(async (req, res) => {
    const nomor = code(req.params.nomor, 'nomor rekening', 20);
    const [rekening] = await query(
      `SELECT D.*, N.NAMA, N.ALAMAT, N.TELPON, T.keterangan AS namaProduk, K.KET AS namaKolek, A.nama AS namaAO
         FROM debitur D
         JOIN nasabah N ON D.CIF = N.CIF
         LEFT JOIN tabel23 T ON T.nomor = D.JENIS
         LEFT JOIN kole K ON K.SANDI = D.KOLEK
         LEFT JOIN tabelao A ON A.AO = D.AO
        WHERE D.NO_REK = ? AND D.nokk = ?`,
      [nomor, branchOf(req)],
    );
    if (!rekening) throw new HttpError(404, 'Rekening kredit tidak ditemukan');
    const [angsuran, jadwal] = await Promise.all([
      query(
        `SELECT TGLA AS tgl, NO_BUKTI AS noBukti, SANDI AS sandi, keterangan, dk, ANG_P AS pokok, ANG_B AS bunga,
                DENDA AS denda, TOT_ANG AS total, BAKI_DEBET AS bakiDebet, USER AS user
           FROM angsur WHERE NO_REK = ? ORDER BY TGLA DESC, NO_TRANS DESC LIMIT 200`,
        [nomor],
      ),
      query(
        'SELECT KE AS ke, DATE(TGLT) AS tgl, TAR_P AS pokok, TAR_B AS bunga, TOT_TAR AS total FROM target WHERE NO_REK = ? ORDER BY KE',
        [nomor],
      ),
    ]);
    res.json({ rekening, angsuran, jadwal });
  }),
);
