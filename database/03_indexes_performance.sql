-- ============================================================================
-- 03_indexes_performance.sql
-- Optimasi Query dengan Composite Index pada Kolom Pencarian & Foreign Key
-- ============================================================================

-- 1. Index utama pencarian jadwal berdasarkan outlet, status, dan rentang tanggal
CREATE INDEX idx_sched_outlet_status_tgl 
ON SHIFT_SCHEDULES (outlet_id, status, tanggal_shift);

-- 2. Index pencarian jadwal & perhitungan total jam kerja per karyawan
CREATE INDEX idx_sched_user_tgl 
ON SHIFT_SCHEDULES (user_id, tanggal_shift);

-- 3. Index untuk filter pengajuan tukar shift (dashboard persetujuan Owner)
CREATE INDEX idx_swaps_penerima_status 
ON SHIFT_SWAPS (penerima_id, status_swap);

-- 4. Index untuk riwayat audit per jadwal
CREATE INDEX idx_history_schedule_waktu 
ON SHIFT_HISTORY (schedule_id, waktu_perubahan DESC);

-- Perbarui statistik optimizer Oracle agar langsung memakai index baru
BEGIN
    DBMS_STATS.GATHER_SCHEMA_STATS(ownname => 'DB_SHIFT');
END;
/

-- ============================================================================
-- Query Uji Performa (EXPLAIN PLAN Before vs After Index)
-- ============================================================================
/*
SELECT 
    s.schedule_id,
    s.tanggal_shift,
    s.status,
    u.nama_lengkap,
    t.nama_shift,
    t.durasi_jam
FROM SHIFT_SCHEDULES s
JOIN SHIFT_TEMPLATES t ON s.template_id = t.template_id
LEFT JOIN USERS u ON s.user_id = u.user_id
WHERE s.outlet_id = 1
  AND s.status = 'ASSIGNED'
  AND s.tanggal_shift BETWEEN TRUNC(SYSDATE) - 30 AND TRUNC(SYSDATE) + 7
ORDER BY s.tanggal_shift;
*/