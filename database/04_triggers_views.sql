-- ============================================================================
-- 04_triggers_views.sql
-- Trigger Validasi Jadwal, Trigger Audit History, dan View Rekap Jam Kerja
-- ============================================================================

-- 1. COMPOUND TRIGGER: Validasi Anti-Bentrok & Batas Jam Mingguan
CREATE OR REPLACE TRIGGER trg_validasi_jadwal
FOR INSERT OR UPDATE OF user_id, tanggal_shift, template_id, status ON SHIFT_SCHEDULES
COMPOUND TRIGGER

    TYPE t_sched_rec IS RECORD (
        schedule_id   SHIFT_SCHEDULES.schedule_id%TYPE,
        user_id       SHIFT_SCHEDULES.user_id%TYPE,
        tanggal_shift SHIFT_SCHEDULES.tanggal_shift%TYPE,
        template_id   SHIFT_SCHEDULES.template_id%TYPE,
        status        SHIFT_SCHEDULES.status%TYPE
    );
    TYPE t_sched_tab IS TABLE OF t_sched_rec INDEX BY PLS_INTEGER;
    g_records t_sched_tab;

    AFTER EACH ROW IS
        v_idx PLS_INTEGER := g_records.COUNT + 1;
    BEGIN
        IF :NEW.user_id IS NOT NULL AND :NEW.status = 'ASSIGNED' THEN
            g_records(v_idx).schedule_id   := :NEW.schedule_id;
            g_records(v_idx).user_id       := :NEW.user_id;
            g_records(v_idx).tanggal_shift := :NEW.tanggal_shift;
            g_records(v_idx).template_id   := :NEW.template_id;
            g_records(v_idx).status        := :NEW.status;
        END IF;
    END AFTER EACH ROW;

    AFTER STATEMENT IS
        v_bentrok       NUMBER;
        v_jam_eksisting NUMBER;
        v_jam_baru      NUMBER;
        v_max_jam       NUMBER;
    BEGIN
        FOR i IN 1..g_records.COUNT LOOP
            -- Cek 1: Tidak boleh ada 2 jadwal ASSIGNED di tanggal yang sama untuk 1 karyawan
            SELECT COUNT(*)
            INTO v_bentrok
            FROM SHIFT_SCHEDULES
            WHERE user_id = g_records(i).user_id
              AND TRUNC(tanggal_shift) = TRUNC(g_records(i).tanggal_shift)
              AND status = 'ASSIGNED'
              AND schedule_id != g_records(i).schedule_id;

            IF v_bentrok > 0 THEN
                g_records.DELETE;
                RAISE_APPLICATION_ERROR(-20001, 'Validasi Gagal: Karyawan sudah memiliki jadwal aktif pada tanggal tersebut.');
            END IF;

            -- Cek 2: Total jam kerja dalam 1 minggu ISO tidak melebihi max_jam_mingguan
            SELECT durasi_jam INTO v_jam_baru
            FROM SHIFT_TEMPLATES
            WHERE template_id = g_records(i).template_id;

            SELECT max_jam_mingguan INTO v_max_jam
            FROM USERS
            WHERE user_id = g_records(i).user_id;

            SELECT NVL(SUM(t.durasi_jam), 0)
            INTO v_jam_eksisting
            FROM SHIFT_SCHEDULES s
            JOIN SHIFT_TEMPLATES t ON s.template_id = t.template_id
            WHERE s.user_id = g_records(i).user_id
              AND s.status IN ('ASSIGNED', 'COMPLETED')
              AND TO_CHAR(s.tanggal_shift, 'IYYY-IW') = TO_CHAR(g_records(i).tanggal_shift, 'IYYY-IW')
              AND s.schedule_id != g_records(i).schedule_id;

            IF (v_jam_eksisting + v_jam_baru) > v_max_jam THEN
                g_records.DELETE;
                RAISE_APPLICATION_ERROR(-20002, 'Validasi Gagal: Total jam kerja mingguan melebihi batas maksimal (' || v_max_jam || ' jam).');
            END IF;
        END LOOP;

        g_records.DELETE;
    END AFTER STATEMENT;

END trg_validasi_jadwal;
/

-- 2. TRIGGER AUDIT: Otomatis Catat Perubahan ke SHIFT_HISTORY
CREATE OR REPLACE TRIGGER trg_audit_shift_history
AFTER INSERT OR UPDATE OF user_id, status ON SHIFT_SCHEDULES
FOR EACH ROW
DECLARE
    v_aksi       VARCHAR2(30);
    v_keterangan VARCHAR2(255);
BEGIN
    IF INSERTING THEN
        IF :NEW.user_id IS NOT NULL THEN
            v_aksi := 'ASSIGN_NEW';
            v_keterangan := 'Jadwal baru langsung ditugaskan ke karyawan ID ' || :NEW.user_id;
            INSERT INTO SHIFT_HISTORY (schedule_id, user_lama_id, user_baru_id, aksi, keterangan)
            VALUES (:NEW.schedule_id, NULL, :NEW.user_id, v_aksi, v_keterangan);
        END IF;
    ELSIF UPDATING THEN
        IF NVL(:OLD.user_id, -1) != NVL(:NEW.user_id, -1) THEN
            IF :OLD.user_id IS NULL AND :NEW.user_id IS NOT NULL THEN
                v_aksi := 'CLAIM_SHIFT';
                v_keterangan := 'Shift kosong diklaim oleh karyawan ID ' || :NEW.user_id;
            ELSIF :OLD.user_id IS NOT NULL AND :NEW.user_id IS NOT NULL THEN
                v_aksi := 'SWAP_SHIFT';
                v_keterangan := 'Pergantian karyawan dari ID ' || :OLD.user_id || ' ke ID ' || :NEW.user_id;
            ELSE
                v_aksi := 'UNASSIGN_SHIFT';
                v_keterangan := 'Jadwal dilepas kembali menjadi OPEN';
            END IF;

            INSERT INTO SHIFT_HISTORY (schedule_id, user_lama_id, user_baru_id, aksi, keterangan)
            VALUES (:NEW.schedule_id, :OLD.user_id, :NEW.user_id, v_aksi, v_keterangan);
        ELSIF :OLD.status != :NEW.status THEN
            INSERT INTO SHIFT_HISTORY (schedule_id, user_lama_id, user_baru_id, aksi, keterangan)
            VALUES (:NEW.schedule_id, :OLD.user_id, :NEW.user_id, 'STATUS_CHANGE', 'Status berubah dari ' || :OLD.status || ' menjadi ' || :NEW.status);
        END IF;
    END IF;
END;
/

-- 3. VIEW: Rekapitulasi Jam Kerja Mingguan Karyawan
CREATE OR REPLACE VIEW V_REKAP_JAM_KERJA AS
SELECT 
    u.user_id,
    u.nama_lengkap,
    u.role,
    o.outlet_id,
    o.nama_outlet,
    TO_CHAR(s.tanggal_shift, 'IYYY-IW') AS minggu_ke,
    MIN(TRUNC(s.tanggal_shift, 'IW')) AS awal_minggu,
    MAX(TRUNC(s.tanggal_shift, 'IW') + 6) AS akhir_minggu,
    COUNT(s.schedule_id) AS total_shift,
    NVL(SUM(t.durasi_jam), 0) AS total_jam_kerja,
    u.max_jam_mingguan,
    (u.max_jam_mingguan - NVL(SUM(t.durasi_jam), 0)) AS sisa_kuota_jam,
    CASE 
        WHEN NVL(SUM(t.durasi_jam), 0) >= u.max_jam_mingguan THEN 'PENUH'
        WHEN NVL(SUM(t.durasi_jam), 0) >= (u.max_jam_mingguan * 0.8) THEN 'HAMPIR_PENUH'
        ELSE 'TERSEDIA'
    END AS status_kuota
FROM USERS u
JOIN OUTLETS o ON u.outlet_id = o.outlet_id
LEFT JOIN SHIFT_SCHEDULES s 
    ON u.user_id = s.user_id 
    AND s.status IN ('ASSIGNED', 'COMPLETED')
LEFT JOIN SHIFT_TEMPLATES t 
    ON s.template_id = t.template_id
WHERE u.role = 'KARYAWAN'
GROUP BY 
    u.user_id,
    u.nama_lengkap,
    u.role,
    o.outlet_id,
    o.nama_outlet,
    TO_CHAR(s.tanggal_shift, 'IYYY-IW'),
    u.max_jam_mingguan;


-- ============================================================================
-- Query Uji View Rekap Jam Kerja Mingguan
-- ============================================================================
/*
SELECT * FROM V_REKAP_JAM_KERJA 
WHERE minggu_ke IS NOT NULL 
ORDER BY minggu_ke DESC, user_id;
*/