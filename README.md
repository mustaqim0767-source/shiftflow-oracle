# ShiftFlow — Sistem Manajemen & Tukar Shift Karyawan Berbasis Oracle Database

**ShiftFlow** adalah aplikasi web *full-stack* untuk pengelolaan jadwal shift multi-outlet, klaim shift kosong (*open shift*), pengajuan tukar shift antar karyawan dengan persetujuan Owner, serta pemantauan kuota jam kerja mingguan. Seluruh integritas data dan aturan bisnis ditegakkan langsung di lapisan database menggunakan **Oracle Database 21c Express Edition (XE)**.

---

## Arsitektur & Teknologi

* **Database:** Oracle Database 21c XE (`XEPDB1`) — *Identity Columns*, *Composite Indexes*, *Compound Trigger*, *Audit Trigger*, *Database View*, *Pipelined Table Function*, *Stored Procedures* (`FOR UPDATE` *Row-Level Locking*), dan `DBMS_SCHEDULER`.
* **Backend:** Node.js, Express.js, `oracledb` (Connection Pooling), `cors`, `dotenv`.
* **Frontend:** React, Vite, Tailwind CSS.

---

## Prasyarat Sistem

1. **Oracle Database 21c Express Edition (XE)** aktif dengan *pluggable database* `XEPDB1` (port `1521`).
2. **SQL Client** (DBeaver, Oracle SQL Developer, atau SQL*Plus).
3. **Node.js** versi 18 atau lebih baru (`npm` terpasang).

---

## Panduan Instalasi & Menjalankan Proyek

### 1. Setup Database Oracle (Eksekusi Berurutan `01` – `05`)

Buat user/schema database (misalnya `DB_SHIFT`) pada `XEPDB1` dengan hak akses `CONNECT`, `RESOURCE`, `CREATE VIEW`, `CREATE JOB`, dan kuota tablespace yang memadai, lalu jalankan skrip SQL di folder `database/` **secara berurutan**:

1. **`01_setup_ddl.sql`**
   Membuat 6 tabel relasional beserta *primary key*, *foreign key*, dan *check constraints* (`OUTLETS`, `USERS`, `SHIFT_TEMPLATES`, `SHIFT_SCHEDULES`, `SHIFT_SWAPS`, `SHIFT_HISTORY`).
2. **`02_seed_data.sql`**
   Mengisi 1.800+ baris data uji otomatis (2 outlet cabang Darussalam & Peunayong, 1 Owner, 10 Karyawan, 3 template shift, 1.260 jadwal, 420 log audit awal, dan 150 riwayat pengajuan tukar shift).
3. **`03_indexes_performance.sql`**
   Membuat 4 *composite index* untuk optimasi pencarian jadwal, rekap jam kerja, dan riwayat audit, serta memperbarui statistik optimizer (`DBMS_STATS.GATHER_SCHEMA_STATS`).
4. **`04_triggers_views.sql`**
   Membuat *Compound Trigger* `trg_validasi_jadwal` (anti-bentrok shift di hari yang sama & batas maksimal 40 jam kerja/minggu), *Trigger* `trg_audit_shift_history` (pencatatan otomatis ke `SHIFT_HISTORY`), dan *View* `V_REKAP_JAM_KERJA`.
5. **`05_functions.sql`**
   Membuat *Pipelined Function* `fn_rekomendasi_pengganti`, *Stored Procedure* `sp_claim_shift` (*row-level locking* `FOR UPDATE`), *Stored Procedure* `sp_swap_shift` (pertukaran jadwal atomik), dan job harian `JOB_AUTO_COMPLETE_SHIFTS` via `DBMS_SCHEDULER`.

---

### 2. Konfigurasi & Menjalankan Backend

1. Masuk ke direktori `backend/`:
   ```bash
   cd backend
