const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// Pastikan hasil query Oracle dikembalikan dalam bentuk Object JSON (bukan array polos)
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// 1. Endpoint Login Pengguna (POST /api/auth/login)
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  let connection;

  try {
    connection = await req.app.locals.dbPool.getConnection();
    const result = await connection.execute(
      `SELECT user_id, nama_lengkap, email, role, outlet_id
       FROM users
       WHERE LOWER(email) = LOWER(:email)
         AND password_hash = :password`,
      { email, password } // Bind variables mencegah SQL Injection
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email atau kata sandi salah' });
    }

    const user = result.rows[0];
    res.json({
      user_id: user.USER_ID,
      nama_lengkap: user.NAMA_LENGKAP,
      email: user.EMAIL,
      role: user.ROLE,
      outlet_id: user.OUTLET_ID,
    });
  } catch (err) {
    console.error('Error login:', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server database' });
  } finally {
    if (connection) await connection.close();
  }
});

// 2. Endpoint Jadwal Shift Mingguan + Filter Outlet (GET /api/shifts/weekly)
router.get('/shifts/weekly', async (req, res) => {
  const { outlet } = req.query;
  let connection;

  try {
    connection = await req.app.locals.dbPool.getConnection();

    let sql = `
      SELECT 
        s.schedule_id,
        TO_CHAR(s.tanggal_shift, 'YYYY-MM-DD') AS tanggal_shift,
        o.nama_outlet,
        st.nama_shift,
        st.jam_mulai,
        st.jam_selesai,
        st.durasi_jam,
        u.nama_lengkap AS nama_karyawan,
        s.user_id,
        s.status
      FROM shift_schedules s
      JOIN outlets o ON s.outlet_id = o.outlet_id
      JOIN shift_templates st ON s.template_id = st.template_id
      LEFT JOIN users u ON s.user_id = u.user_id
    `;

    const binds = {};
    if (outlet && outlet !== 'ALL') {
      sql += ` WHERE o.nama_outlet LIKE :outletPattern`;
      binds.outletPattern = `%${outlet}%`;
    }

    sql += ` ORDER BY s.tanggal_shift ASC, st.jam_mulai ASC`;

    const result = await connection.execute(sql, binds);

    // Ubah key huruf kapital dari Oracle menjadi lowercase agar cocok dengan Frontend React
    const formattedRows = result.rows.map((row) => ({
      schedule_id: row.SCHEDULE_ID,
      tanggal_shift: row.TANGGAL_SHIFT,
      nama_outlet: row.NAMA_OUTLET,
      nama_shift: row.NAMA_SHIFT,
      jam_mulai: row.JAM_MULAI,
      jam_selesai: row.JAM_SELESAI,
      durasi_jam: row.DURASI_JAM,
      nama_karyawan: row.NAMA_KARYAWAN,
      user_id: row.USER_ID,
      status: row.STATUS,
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error('Error fetch weekly schedules:', err);
    res.status(500).json({ message: 'Gagal mengambil data jadwal mingguan' });
  } finally {
    if (connection) await connection.close();
  }
});

// 3. Endpoint Rekomendasi Pengganti dari Oracle Function (GET /api/shifts/:scheduleId/recommendations)
router.get('/shifts/:scheduleId/recommendations', async (req, res) => {
  const scheduleId = Number(req.params.scheduleId);
  let connection;

  try {
    connection = await req.app.locals.dbPool.getConnection();
    const result = await connection.execute(
      `SELECT * FROM TABLE(FN_REKOMENDASI_PENGGANTI(:scheduleId))`,
      { scheduleId }
    );

    const formatted = result.rows.map((r) => ({
   user_id: r.USER_ID,
   nama_lengkap: r.NAMA_LENGKAP,
   jam_terpakai: r.JAM_MINGGU_INI,
   sisa_kuota_jam: r.SISA_KUOTA_JAM,
   status_kelayakan:
     r.SISA_KUOTA_JAM >= 16
       ? 'SANGAT DIREKOMENDASIKAN (Jeda aman & kuota longgar)'
       : 'DIREKOMENDASIKAN (Kuota mingguan mencukupi)',
      
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error recommendations:', err);
    res.status(500).json({ message: 'Gagal memuat rekomendasi pengganti' });
  } finally {
    if (connection) await connection.close();
  }
});

// 4. Endpoint Riwayat Perubahan / Audit Log (GET /api/shifts/history)
router.get('/shifts/history', async (req, res) => {
  let connection;

  try {
    connection = await req.app.locals.dbPool.getConnection();
    const result = await connection.execute(`
      SELECT 
        h.history_id,
        h.schedule_id,
        TO_CHAR(s.tanggal_shift, 'YYYY-MM-DD') AS tanggal_shift,
        st.nama_shift,
        ul.nama_lengkap AS user_lama,
        ub.nama_lengkap AS user_baru,
        h.aksi,
        h.keterangan,
        TO_CHAR(h.waktu_perubahan, 'YYYY-MM-DD HH24:MI:SS') AS waktu_perubahan
      FROM shift_history h
      JOIN shift_schedules s ON h.schedule_id = s.schedule_id
      JOIN shift_templates st ON s.template_id = st.template_id
      LEFT JOIN users ul ON h.user_id_lama = ul.user_id
      LEFT JOIN users ub ON h.user_id_baru = ub.user_id
      ORDER BY h.waktu_perubahan DESC
      FETCH FIRST 50 ROWS ONLY
    `);

    const formattedHistory = result.rows.map((h) => ({
      history_id: h.HISTORY_ID,
      schedule_id: h.SCHEDULE_ID,
      tanggal_shift: h.TANGGAL_SHIFT,
      nama_shift: h.NAMA_SHIFT,
      user_lama: h.USER_LAMA,
      user_baru: h.USER_BARU,
      aksi: h.AKSI,
      keterangan: h.KETERANGAN,
      waktu_perubahan: h.WAKTU_PERUBAHAN,
    }));

    res.json(formattedHistory);
  } catch (err) {
    console.error('Error fetch shift history:', err);
    res.status(500).json({ message: 'Gagal mengambil riwayat perubahan shift' });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;