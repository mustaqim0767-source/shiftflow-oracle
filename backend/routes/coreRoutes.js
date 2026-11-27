const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');

// 1. Klaim Shift Kosong via Stored Procedure SP_CLAIM_SHIFT (Row-Level Locking FOR UPDATE)
router.post('/shifts/claim', async (req, res) => {
  const { schedule_id, user_id } = req.body;

  if (!schedule_id || !user_id) {
    return res.status(400).json({ message: 'schedule_id dan user_id wajib diisi' });
  }

  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `BEGIN sp_claim_shift(:schedule_id, :user_id); END;`,
      {
        schedule_id: Number(schedule_id),
        user_id: Number(user_id),
      }
    );

    res.json({
      success: true,
      message: 'Shift berhasil diklaim dan dicatat ke riwayat audit.',
    });
  } catch (err) {
    console.error('Error SP_CLAIM_SHIFT:', err);
    // Tangkap pesan error bisnis dari Oracle (-20001 s.d. -20012)
    const isBusinessError = err.errorNum && err.errorNum >= 20000 && err.errorNum <= 20999;
    res.status(isBusinessError ? 400 : 500).json({
      success: false,
      message: isBusinessError ? err.message.split('\n')[0] : 'Gagal memproses klaim shift',
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 2. Daftar Pengajuan Tukar Shift (untuk Halaman Owner & Karyawan)
router.get('/swaps', async (req, res) => {
  const { status } = req.query;
  let connection;

  try {
    connection = await getConnection();
    let sql = `
      SELECT
        sw.swap_id,
        sw.status_swap,
        sw.alasan,
        TO_CHAR(sw.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
        sw.schedule_asal_id,
        TO_CHAR(sa.tanggal_shift, 'YYYY-MM-DD') AS tanggal_asal,
        ta.nama_shift AS shift_asal,
        o.nama_outlet,
        sw.pengaju_id,
        up.nama_lengkap AS nama_pengaju,
        sw.schedule_tujuan_id,
        TO_CHAR(st.tanggal_shift, 'YYYY-MM-DD') AS tanggal_tujuan,
        tt.nama_shift AS shift_tujuan,
        sw.penerima_id,
        ut.nama_lengkap AS nama_penerima
      FROM shift_swaps sw
      JOIN shift_schedules sa ON sw.schedule_asal_id = sa.schedule_id
      JOIN shift_templates ta ON sa.template_id = ta.template_id
      JOIN outlets o ON sa.outlet_id = o.outlet_id
      JOIN users up ON sw.pengaju_id = up.user_id
      JOIN shift_schedules st ON sw.schedule_tujuan_id = st.schedule_id
      JOIN shift_templates tt ON st.template_id = tt.template_id
      JOIN users ut ON sw.penerima_id = ut.user_id
    `;

    const binds = {};
    if (status && status !== 'ALL') {
      sql += ` WHERE sw.status_swap = :status`;
      binds.status = status.toUpperCase();
    }

    sql += ` ORDER BY sw.created_at DESC`;

    const result = await connection.execute(sql, binds);
    const formatted = result.rows.map((r) => ({
      swap_id: r.SWAP_ID,
      status_swap: r.STATUS_SWAP,
      alasan: r.ALASAN,
      created_at: r.CREATED_AT,
      schedule_asal_id: r.SCHEDULE_ASAL_ID,
      tanggal_asal: r.TANGGAL_ASAL,
      shift_asal: r.SHIFT_ASAL,
      nama_outlet: r.NAMA_OUTLET,
      pengaju_id: r.PENGAJU_ID,
      nama_pengaju: r.NAMA_PENGAJU,
      schedule_tujuan_id: r.SCHEDULE_TUJUAN_ID,
      tanggal_tujuan: r.TANGGAL_TUJUAN,
      shift_tujuan: r.SHIFT_TUJUAN,
      penerima_id: r.PENERIMA_ID,
      nama_penerima: r.NAMA_PENERIMA,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetch swaps:', err);
    res.status(500).json({ message: 'Gagal memuat daftar pengajuan tukar shift' });
  } finally {
    if (connection) await connection.close();
  }
});

// 3. Buat Pengajuan Tukar Shift Baru (POST /api/swaps)
router.post('/swaps', async (req, res) => {
  const { schedule_asal_id, schedule_tujuan_id, pengaju_id, penerima_id, alasan } = req.body;

  if (!schedule_asal_id || !schedule_tujuan_id || !pengaju_id || !penerima_id) {
    return res.status(400).json({ message: 'Data jadwal dan karyawan tukar shift belum lengkap' });
  }

  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO shift_swaps (schedule_asal_id, schedule_tujuan_id, pengaju_id, penerima_id, alasan, status_swap)
       VALUES (:schedule_asal_id, :schedule_tujuan_id, :pengaju_id, :penerima_id, :alasan, 'PENDING')`,
      {
        schedule_asal_id: Number(schedule_asal_id),
        schedule_tujuan_id: Number(schedule_tujuan_id),
        pengaju_id: Number(pengaju_id),
        penerima_id: Number(penerima_id),
        alasan: alasan || 'Pengajuan tukar jadwal shift',
      },
      { autoCommit: true }
    );

    res.status(201).json({
      success: true,
      message: 'Pengajuan tukar shift berhasil dikirim dan menunggu persetujuan Owner.',
    });
  } catch (err) {
    console.error('Error create swap:', err);
    res.status(500).json({ message: 'Gagal membuat pengajuan tukar shift' });
  } finally {
    if (connection) await connection.close();
  }
});

// 4. Persetujuan Tukar Shift Atomik via Stored Procedure SP_SWAP_SHIFT (Owner)
router.post('/swaps/:swapId/approve', async (req, res) => {
  const swapId = Number(req.params.swapId);
  let connection;

  try {
    connection = await getConnection();
    await connection.execute(
      `BEGIN sp_swap_shift(:swap_id); END;`,
      { swap_id: swapId }
    );

    res.json({
      success: true,
      message: 'Tukar shift disetujui dan jadwal berhasil ditukar secara atomik.',
    });
  } catch (err) {
    console.error('Error SP_SWAP_SHIFT:', err);
    const isBusinessError = err.errorNum && err.errorNum >= 20000 && err.errorNum <= 20999;
    res.status(isBusinessError ? 400 : 500).json({
      success: false,
      message: isBusinessError ? err.message.split('\n')[0] : 'Gagal menyetujui tukar shift (transaksi di-rollback)',
    });
  } finally {
    if (connection) await connection.close();
  }
});

// 5. Penolakan Tukar Shift oleh Owner
router.post('/swaps/:swapId/reject', async (req, res) => {
  const swapId = Number(req.params.swapId);
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE shift_swaps SET status_swap = 'REJECTED' WHERE swap_id = :swap_id AND status_swap = 'PENDING'`,
      { swap_id: swapId },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(400).json({ message: 'Pengajuan tidak ditemukan atau sudah diproses sebelumnya' });
    }

    res.json({ success: true, message: 'Pengajuan tukar shift ditolak.' });
  } catch (err) {
    console.error('Error reject swap:', err);
    res.status(500).json({ message: 'Gagal menolak pengajuan tukar shift' });
  } finally {
    if (connection) await connection.close();
  }
});

// 6. Rekap Jam Kerja Mingguan dari View V_REKAP_JAM_KERJA
router.get('/rekap-jam-kerja', async (req, res) => {
  const { minggu_ke } = req.query;
  let connection;

  try {
    connection = await getConnection();
    let sql = `SELECT * FROM v_rekap_jam_kerja WHERE minggu_ke IS NOT NULL`;
    const binds = {};

    if (minggu_ke) {
      sql += ` AND minggu_ke = :minggu_ke`;
      binds.minggu_ke = minggu_ke;
    }

    sql += ` ORDER BY minggu_ke DESC, user_id ASC`;

    const result = await connection.execute(sql, binds);
    const formatted = result.rows.map((r) => ({
      user_id: r.USER_ID,
      nama_lengkap: r.NAMA_LENGKAP,
      nama_outlet: r.NAMA_OUTLET,
      minggu_ke: r.MINGGU_KE,
      jumlah_shift: r.JUMLAH_SHIFT,
      total_jam_kerja: r.TOTAL_JAM_KERJA,
      max_jam_mingguan: r.MAX_JAM_MINGGUAN,
      sisa_kuota_jam: r.SISA_KUOTA_JAM,
      status_kuota: r.STATUS_KUOTA,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetch rekap jam kerja:', err);
    res.status(500).json({ message: 'Gagal memuat rekap jam kerja mingguan' });
  } finally {
    if (connection) await connection.close();
  }
});

// 7. Daftar Outlet
router.get('/outlets', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT outlet_id, nama_outlet, alamat FROM outlets ORDER BY outlet_id ASC`
    );
    res.json(
      result.rows.map((o) => ({
        outlet_id: o.OUTLET_ID,
        nama_outlet: o.NAMA_OUTLET,
        alamat: o.ALAMAT,
      }))
    );
  } catch (err) {
    console.error('Error fetch outlets:', err);
    res.status(500).json({ message: 'Gagal memuat daftar outlet' });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;