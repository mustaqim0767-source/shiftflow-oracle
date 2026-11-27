-- ============================================================================
-- 05_functions.sql
-- Function Rekomendasi Pengganti, SP_CLAIM_SHIFT, SP_SWAP_SHIFT, & DBMS_SCHEDULER
-- ============================================================================

-- 1. TYPE & PIPELINED FUNCTION: Rekomendasi Karyawan Pengganti
CREATE OR REPLACE TYPE t_kandidat_pengganti_obj AS OBJECT (
    user_id          NUMBER,
    nama_lengkap     VARCHAR2(100),
    email            VARCHAR2(100),
    jam_minggu_ini   NUMBER,
    max_jam_mingguan NUMBER,
    sisa_kuota_jam   NUMBER
);
/

CREATE OR REPLACE TYPE t_kandidat_pengganti_tab AS TABLE OF t_kandidat_pengganti_obj;
/

CREATE OR REPLACE FUNCTION fn_rekomendasi_pengganti (
    p_schedule_id IN NUMBER
) RETURN t_kandidat_pengganti_tab PIPELINED
IS
    v_outlet_id     SHIFT_SCHEDULES.outlet_id%TYPE;
    v_tanggal_shift SHIFT_SCHEDULES.tanggal_shift%TYPE;
    v_durasi_jam    SHIFT_TEMPLATES.durasi_jam%TYPE;
    v_user_asal     SHIFT_SCHEDULES.user_id%TYPE;
BEGIN
    -- Ambil detail jadwal target
    SELECT s.outlet_id, s.tanggal_shift, t.durasi_jam, s.user_id
    INTO v_outlet_id, v_tanggal_shift, v_durasi_jam, v_user_asal
    FROM SHIFT_SCHEDULES s
    JOIN SHIFT_TEMPLATES t ON s.template_id = t.template_id
    WHERE s.schedule_id = p_schedule_id;

    -- Cari karyawan satu outlet yang kosong di tanggal tsb & kuota jam masih cukup
    FOR rec IN (
        SELECT 
            u.user_id,
            u.nama_lengkap,
            u.email,
            NVL(SUM(t2.durasi_jam), 0) AS jam_terpakai,
            u.max_jam_mingguan,
            (u.max_jam_mingguan - NVL(SUM(t2.durasi_jam), 0)) AS sisa_kuota
        FROM USERS u
        LEFT JOIN SHIFT_SCHEDULES s2 
            ON u.user_id = s2.user_id
            AND s2.status IN ('ASSIGNED', 'COMPLETED')
            AND TO_CHAR(s2.tanggal_shift, 'IYYY-IW') = TO_CHAR(v_tanggal_shift, 'IYYY-IW')
        LEFT JOIN SHIFT_TEMPLATES t2 
            ON s2.template_id = t2.template_id
        WHERE u.outlet_id = v_outlet_id
          AND u.role = 'KARYAWAN'
          AND u.user_id != NVL(v_user_asal, -1)
          AND NOT EXISTS (
              SELECT 1
              FROM SHIFT_SCHEDULES s3
              WHERE s3.user_id = u.user_id
                AND TRUNC(s3.tanggal_shift) = TRUNC(v_tanggal_shift)
                AND s3.status = 'ASSIGNED'
          )
        GROUP BY u.user_id, u.nama_lengkap, u.email, u.max_jam_mingguan
        HAVING (u.max_jam_mingguan - NVL(SUM(t2.durasi_jam), 0)) >= v_durasi_jam
        ORDER BY sisa_kuota DESC, u.nama_lengkap ASC
    ) LOOP
        PIPE ROW (
            t_kandidat_pengganti_obj(
                rec.user_id,
                rec.nama_lengkap,
                rec.email,
                rec.jam_terpakai,
                rec.max_jam_mingguan,
                rec.sisa_kuota
            )
        );
    END LOOP;

    RETURN;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN;
END fn_rekomendasi_pengganti;
/

-- 2. STORED PROCEDURE: Klaim Shift Kosong (Row-Level Locking FOR UPDATE)
CREATE OR REPLACE PROCEDURE sp_claim_shift (
    p_schedule_id IN NUMBER,
    p_user_id     IN NUMBER
)
IS
    v_status        SHIFT_SCHEDULES.status%TYPE;
    v_owner_sekarang SHIFT_SCHEDULES.user_id%TYPE;
    v_outlet_sched  SHIFT_SCHEDULES.outlet_id%TYPE;
    v_outlet_user   USERS.outlet_id%TYPE;
BEGIN
    -- Kunci baris jadwal agar tidak diklaim ganda secara bersamaan
    SELECT status, user_id, outlet_id
    INTO v_status, v_owner_sekarang, v_outlet_sched
    FROM SHIFT_SCHEDULES
    WHERE schedule_id = p_schedule_id
    FOR UPDATE;

    IF v_status != 'OPEN' OR v_owner_sekarang IS NOT NULL THEN
        RAISE_APPLICATION_ERROR(-20010, 'Gagal Klaim: Jadwal sudah diambil karyawan lain atau tidak berstatus OPEN.');
    END IF;

    SELECT outlet_id INTO v_outlet_user
    FROM USERS
    WHERE user_id = p_user_id AND role = 'KARYAWAN';

    IF v_outlet_sched != v_outlet_user THEN
        RAISE_APPLICATION_ERROR(-20011, 'Gagal Klaim: Karyawan hanya dapat mengambil jadwal pada outlet sendiri.');
    END IF;

    -- Update jadwal (otomatis memicu trg_validasi_jadwal & trg_audit_shift_history)
    UPDATE SHIFT_SCHEDULES
    SET user_id = p_user_id,
        status  = 'ASSIGNED'
    WHERE schedule_id = p_schedule_id;

    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        ROLLBACK;
        RAISE_APPLICATION_ERROR(-20012, 'Gagal Klaim: Data jadwal atau karyawan tidak ditemukan.');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END sp_claim_shift;
/

-- 3. STORED PROCEDURE: Eksekusi Persetujuan Tukar Shift (Atomik COMMIT/ROLLBACK)
CREATE OR REPLACE PROCEDURE sp_swap_shift (
    p_swap_id IN NUMBER
)
IS
    v_sched_asal    SHIFT_SWAPS.schedule_asal_id%TYPE;
    v_sched_tujuan  SHIFT_SWAPS.schedule_tujuan_id%TYPE;
    v_pengaju_id    SHIFT_SWAPS.pengaju_id%TYPE;
    v_penerima_id   SHIFT_SWAPS.penerima_id%TYPE;
    v_status_swap   SHIFT_SWAPS.status_swap%TYPE;
    v_user_asal_db  SHIFT_SCHEDULES.user_id%TYPE;
    v_user_tuj_db   SHIFT_SCHEDULES.user_id%TYPE;
BEGIN
    -- Kunci baris pengajuan swap
    SELECT schedule_asal_id, schedule_tujuan_id, pengaju_id, penerima_id, status_swap
    INTO v_sched_asal, v_sched_tujuan, v_pengaju_id, v_penerima_id, v_status_swap
    FROM SHIFT_SWAPS
    WHERE swap_id = p_swap_id
    FOR UPDATE;

    IF v_status_swap != 'PENDING' THEN
        RAISE_APPLICATION_ERROR(-20020, 'Gagal Swap: Pengajuan sudah diproses sebelumnya (' || v_status_swap || ').');
    END IF;

    -- Kunci kedua jadwal yang akan ditukar
    SELECT user_id INTO v_user_asal_db
    FROM SHIFT_SCHEDULES
    WHERE schedule_id = v_sched_asal AND status = 'ASSIGNED'
    FOR UPDATE;

    SELECT user_id INTO v_user_tuj_db
    FROM SHIFT_SCHEDULES
    WHERE schedule_id = v_sched_tujuan AND status = 'ASSIGNED'
    FOR UPDATE;

    IF v_user_asal_db != v_pengaju_id OR v_user_tuj_db != v_penerima_id THEN
        RAISE_APPLICATION_ERROR(-20021, 'Gagal Swap: Kepemilikan jadwal saat ini sudah berubah.');
    END IF;

    -- Lepas sementara kepemilikan agar tidak memicu false-positive bentrok saat pertukaran silang
    UPDATE SHIFT_SCHEDULES
    SET user_id = NULL, status = 'OPEN'
    WHERE schedule_id IN (v_sched_asal, v_sched_tujuan);

    -- Tukar user_id antar kedua jadwal
    UPDATE SHIFT_SCHEDULES
    SET user_id = v_penerima_id, status = 'ASSIGNED'
    WHERE schedule_id = v_sched_asal;

    UPDATE SHIFT_SCHEDULES
    SET user_id = v_pengaju_id, status = 'ASSIGNED'
    WHERE schedule_id = v_sched_tujuan;

    -- Perbarui status pengajuan swap
    UPDATE SHIFT_SWAPS
    SET status_swap = 'APPROVED'
    WHERE swap_id = p_swap_id;

    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        ROLLBACK;
        RAISE_APPLICATION_ERROR(-20022, 'Gagal Swap: Data pengajuan atau jadwal aktif tidak ditemukan.');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END sp_swap_shift;
/

-- 4. DBMS_SCHEDULER: Otomatisasi Status Jadwal Lampau & Kedaluwarsa Swap
CREATE OR REPLACE PROCEDURE sp_auto_maintenance_shifts
IS
BEGIN
    -- Tandai jadwal lampau yang masih ASSIGNED menjadi COMPLETED
    UPDATE SHIFT_SCHEDULES
    SET status = 'COMPLETED'
    WHERE status = 'ASSIGNED'
      AND tanggal_shift < TRUNC(SYSDATE);

    -- Batalkan pengajuan swap PENDING yang tanggal shift asalnya sudah lewat
    UPDATE SHIFT_SWAPS sw
    SET sw.status_swap = 'CANCELLED'
    WHERE sw.status_swap = 'PENDING'
      AND EXISTS (
          SELECT 1
          FROM SHIFT_SCHEDULES s
          WHERE s.schedule_id = sw.schedule_asal_id
            AND s.tanggal_shift < TRUNC(SYSDATE)
      );

    COMMIT;
END sp_auto_maintenance_shifts;
/

BEGIN
    -- Hapus job lama jika skrip dijalankan ulang
    BEGIN
        DBMS_SCHEDULER.DROP_JOB(job_name => 'JOB_AUTO_COMPLETE_SHIFTS', force => TRUE);
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;

    DBMS_SCHEDULER.CREATE_JOB (
        job_name        => 'JOB_AUTO_COMPLETE_SHIFTS',
        job_type        => 'STORED_PROCEDURE',
        job_action      => 'SP_AUTO_MAINTENANCE_SHIFTS',
        start_date      => SYSTIMESTAMP,
        repeat_interval => 'FREQ=DAILY; BYHOUR=0; BYMINUTE=5; BYSECOND=0',
        enabled         => TRUE,
        comments        => 'Job harian otomatis menyelesaikan jadwal lampau dan membatalkan swap kedaluwarsa'
    );
END;
/

-- ============================================================================
-- Query Uji Function, Stored Procedure, dan Scheduler
-- ============================================================================
/*
-- 1. Uji rekomendasi pengganti untuk salah satu jadwal mendatang:
SELECT * FROM TABLE(fn_rekomendasi_pengganti(
    (SELECT MIN(schedule_id) FROM SHIFT_SCHEDULES WHERE status = 'ASSIGNED' AND tanggal_shift >= TRUNC(SYSDATE))
));

-- 2. Cek status job DBMS_SCHEDULER:
SELECT job_name, state, repeat_interval, next_run_date 
FROM user_scheduler_jobs 
WHERE job_name = 'JOB_AUTO_COMPLETE_SHIFTS';
*/