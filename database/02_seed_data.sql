-- ============================================================================
-- 02_seed_data.sql
-- Reset & Generator 1.800+ Data Uji (Master, 1.260 Schedules, Swaps, History)
-- ============================================================================

-- Bersihkan data lama (urutan anak ke induk) agar aman dijalankan ulang
DELETE FROM SHIFT_HISTORY;
DELETE FROM SHIFT_SWAPS;
DELETE FROM SHIFT_SCHEDULES;
DELETE FROM USERS;
DELETE FROM SHIFT_TEMPLATES;
DELETE FROM OUTLETS;
COMMIT;

DECLARE
    v_outlet1_id    OUTLETS.outlet_id%TYPE;
    v_outlet2_id    OUTLETS.outlet_id%TYPE;
    v_tpl_pagi      SHIFT_TEMPLATES.template_id%TYPE;
    v_tpl_siang     SHIFT_TEMPLATES.template_id%TYPE;
    v_tpl_malam     SHIFT_TEMPLATES.template_id%TYPE;
    
    TYPE t_id_arr IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
    v_users         t_id_arr;
    v_sched_ids     t_id_arr;
    
    v_sched_id      SHIFT_SCHEDULES.schedule_id%TYPE;
    v_outlet_curr   NUMBER;
    v_tpl_curr      NUMBER;
    v_user_curr     NUMBER;
    v_tgl_curr      DATE;
    v_status_curr   VARCHAR2(20);
    v_idx           PLS_INTEGER := 0;
BEGIN
    -- 1. Insert OUTLETS (2 Cabang)
    INSERT INTO OUTLETS (nama_outlet, alamat)
    VALUES ('ShiftFlow Coffee - Darussalam', 'Jl. Teuku Nyak Arief No. 12, Banda Aceh')
    RETURNING outlet_id INTO v_outlet1_id;

    INSERT INTO OUTLETS (nama_outlet, alamat)
    VALUES ('ShiftFlow Coffee - Peunayong', 'Jl. Ahmad Yani No. 45, Banda Aceh')
    RETURNING outlet_id INTO v_outlet2_id;

    -- 2. Insert SHIFT_TEMPLATES (3 Pola Shift)
    INSERT INTO SHIFT_TEMPLATES (nama_shift, jam_mulai, jam_selesai, durasi_jam)
    VALUES ('Shift Pagi', '08:00', '16:00', 8.0)
    RETURNING template_id INTO v_tpl_pagi;

    INSERT INTO SHIFT_TEMPLATES (nama_shift, jam_mulai, jam_selesai, durasi_jam)
    VALUES ('Shift Siang', '12:00', '20:00', 8.0)
    RETURNING template_id INTO v_tpl_siang;

    INSERT INTO SHIFT_TEMPLATES (nama_shift, jam_mulai, jam_selesai, durasi_jam)
    VALUES ('Shift Malam', '16:00', '23:00', 7.0)
    RETURNING template_id INTO v_tpl_malam;

    -- 3. Insert USERS (1 Owner + 10 Karyawan)
    INSERT INTO USERS (outlet_id, nama_lengkap, email, password_hash, role, max_jam_mingguan)
    VALUES (v_outlet1_id, 'Budi Santoso', 'owner@shiftflow.id', '$2b$10$dummyhashowner123456', 'OWNER', 48.0);

    FOR i IN 1..10 LOOP
        IF i <= 6 THEN
            v_outlet_curr := v_outlet1_id;
        ELSE
            v_outlet_curr := v_outlet2_id;
        END IF;

        INSERT INTO USERS (outlet_id, nama_lengkap, email, password_hash, role, max_jam_mingguan)
        VALUES (
            v_outlet_curr,
            CASE i
                WHEN 1 THEN 'Mustaqim'
                WHEN 2 THEN 'Najla Putri'
                WHEN 3 THEN 'Hermanda Saputra'
                ELSE 'Karyawan Uji ' || i
            END,
            'karyawan' || i || '@shiftflow.id',
            '$2b$10$dummyhashuser' || i || '123456',
            'KARYAWAN',
            40.0
        )
        RETURNING user_id INTO v_users(i);
    END LOOP;

    -- 4. Generate 1.260 Data SHIFT_SCHEDULES (210 hari x 2 outlet x 3 shift)
    -- Rentang: 180 hari ke belakang (COMPLETED) s/d 30 hari ke depan (ASSIGNED / OPEN)
    FOR d IN -180..29 LOOP
        v_tgl_curr := TRUNC(SYSDATE) + d;

        FOR o IN 1..2 LOOP
            IF o = 1 THEN
                v_outlet_curr := v_outlet1_id;
            ELSE
                v_outlet_curr := v_outlet2_id;
            END IF;

            FOR s IN 1..3 LOOP
                v_idx := v_idx + 1;

                IF s = 1 THEN
                    v_tpl_curr := v_tpl_pagi;
                ELSIF s = 2 THEN
                    v_tpl_curr := v_tpl_siang;
                ELSE
                    v_tpl_curr := v_tpl_malam;
                END IF;

                -- Distribusi user & status jadwal
                IF d < 0 THEN
                    v_status_curr := 'COMPLETED';
                    IF o = 1 THEN
                        v_user_curr := v_users(MOD(v_idx, 6) + 1);
                    ELSE
                        v_user_curr := v_users(MOD(v_idx, 4) + 7);
                    END IF;
                ELSIF MOD(v_idx, 5) = 0 THEN
                    -- 20% jadwal mendatang dibuat OPEN untuk pengujian fitur Claim Shift
                    v_status_curr := 'OPEN';
                    v_user_curr := NULL;
                ELSE
                    v_status_curr := 'ASSIGNED';
                    IF o = 1 THEN
                        v_user_curr := v_users(MOD(v_idx, 6) + 1);
                    ELSE
                        v_user_curr := v_users(MOD(v_idx, 4) + 7);
                    END IF;
                END IF;

                INSERT INTO SHIFT_SCHEDULES (outlet_id, template_id, user_id, tanggal_shift, status)
                VALUES (v_outlet_curr, v_tpl_curr, v_user_curr, v_tgl_curr, v_status_curr)
                RETURNING schedule_id INTO v_sched_id;

                v_sched_ids(v_idx) := v_sched_id;

                -- 5. Generate 420 Audit Log awal di SHIFT_HISTORY
                IF MOD(v_idx, 3) = 0 AND v_user_curr IS NOT NULL THEN
                    INSERT INTO SHIFT_HISTORY (schedule_id, user_lama_id, user_baru_id, aksi, keterangan)
                    VALUES (v_sched_id, NULL, v_user_curr, 'ASSIGN_INITIAL', 'Penjadwalan otomatis sistem');
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;

    -- 6. Generate 150 Data Riwayat Pengajuan Tukar Shift di SHIFT_SWAPS
    FOR k IN 1..150 LOOP
        INSERT INTO SHIFT_SWAPS (
            schedule_asal_id, schedule_tujuan_id, pengaju_id, penerima_id, status_swap, alasan
        ) VALUES (
            v_sched_ids(k * 6 - 5),
            v_sched_ids(k * 6 - 3),
            v_users(1),
            v_users(2),
            CASE MOD(k, 4)
                WHEN 0 THEN 'PENDING'
                WHEN 1 THEN 'APPROVED'
                WHEN 2 THEN 'REJECTED'
                ELSE 'CANCELLED'
            END,
            'Keperluan kuliah / keluarga ke-' || k
        );
    END LOOP;

    COMMIT;
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