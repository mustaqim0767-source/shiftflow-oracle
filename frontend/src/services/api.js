const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Data simulasi (fallback) sesuai struktur tabel Oracle TukarJaga agar UI tetap berjalan saat backend offline
const MOCK_SCHEDULES = [
  { schedule_id: 101, tanggal_shift: '2026-11-26', nama_outlet: 'Kopi Ulee Kareng - Darussalam', nama_shift: 'Shift Pagi', jam_mulai: '07:00', jam_selesai: '15:00', durasi_jam: 8, nama_karyawan: 'Karyawan 1', user_id: 2, status: 'ASSIGNED' },
  { schedule_id: 102, tanggal_shift: '2026-11-26', nama_outlet: 'Kopi Ulee Kareng - Darussalam', nama_shift: 'Shift Siang', jam_mulai: '15:00', jam_selesai: '23:00', durasi_jam: 8, nama_karyawan: 'Karyawan 2', user_id: 3, status: 'SWAP_PENDING' },
  { schedule_id: 103, tanggal_shift: '2026-11-26', nama_outlet: 'Kopi Ulee Kareng - Darussalam', nama_shift: 'Shift Part-Time Sore', jam_mulai: '16:00', jam_selesai: '21:00', durasi_jam: 5, nama_karyawan: null, user_id: null, status: 'OPEN' },
  { schedule_id: 104, tanggal_shift: '2026-11-27', nama_outlet: 'Kopi Ulee Kareng - Darussalam', nama_shift: 'Shift Pagi', jam_mulai: '07:00', jam_selesai: '15:00', durasi_jam: 8, nama_karyawan: 'Karyawan 3', user_id: 4, status: 'ASSIGNED' },
  { schedule_id: 105, tanggal_shift: '2026-11-27', nama_outlet: 'Kopi Ulee Kareng - Darussalam', nama_shift: 'Shift Part-Time Sore', jam_mulai: '16:00', jam_selesai: '21:00', durasi_jam: 5, nama_karyawan: null, user_id: null, status: 'OPEN' },
  { schedule_id: 106, tanggal_shift: '2026-11-28', nama_outlet: 'Kopi Ulee Kareng - Peunayong', nama_shift: 'Shift Pagi', jam_mulai: '07:00', jam_selesai: '15:00', durasi_jam: 8, nama_karyawan: 'Karyawan 7', user_id: 8, status: 'ASSIGNED' },
  { schedule_id: 107, tanggal_shift: '2026-11-28', nama_outlet: 'Kopi Ulee Kareng - Peunayong', nama_shift: 'Shift Part-Time Sore', jam_mulai: '16:00', jam_selesai: '21:00', durasi_jam: 5, nama_karyawan: null, user_id: null, status: 'OPEN' },
];

const MOCK_RECOMMENDATIONS = [
  { user_id: 5, nama_lengkap: 'Karyawan 4', jam_terpakai: 16, sisa_kuota_jam: 24, status_kelayakan: 'SANGAT DIREKOMENDASIKAN (Jeda aman & kuota longgar)' },
  { user_id: 6, nama_lengkap: 'Karyawan 5', jam_terpakai: 24, sisa_kuota_jam: 16, status_kelayakan: 'DIREKOMENDASIKAN (Memenuhi syarat 8 jam istirahat)' },
  { user_id: 7, nama_lengkap: 'Karyawan 6', jam_terpakai: 32, sisa_kuota_jam: 8, status_kelayakan: 'TERBATAS (Sisa kuota mingguan 8 jam)' },
];

const MOCK_HISTORY = [
  { history_id: 501, schedule_id: 101, tanggal_shift: '2026-11-26', nama_shift: 'Shift Pagi', user_lama: 'Karyawan 4', user_baru: 'Karyawan 1', aksi: 'SWAPPED', keterangan: 'Tukar shift disetujui Owner (SP_SWAP_SHIFT)', waktu_perubahan: '2026-11-25 09:15:22' },
  { history_id: 502, schedule_id: 104, tanggal_shift: '2026-11-27', nama_shift: 'Shift Pagi', user_lama: null, user_baru: 'Karyawan 3', aksi: 'CLAIMED', keterangan: 'Klaim shift kosong berhasil dengan row-level lock', waktu_perubahan: '2026-11-25 10:02:45' },
  { history_id: 503, schedule_id: 102, tanggal_shift: '2026-11-26', nama_shift: 'Shift Siang', user_lama: 'Karyawan 2', user_baru: 'Karyawan 2', aksi: 'SWAP_REQUESTED', keterangan: 'Menunggu persetujuan Owner', waktu_perubahan: '2026-11-25 10:40:11' },
];

export async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login gagal');
    return await res.json();
  } catch {
    // Fallback mode demo lokal
    if (email.toLowerCase().includes('owner')) {
      return { user_id: 1, nama_lengkap: 'Teuku Owner', email, role: 'OWNER', outlet_id: 1, isMock: true };
    }
    return { user_id: 2, nama_lengkap: 'Karyawan 1', email: email || 'karyawan1@tukarjaga.id', role: 'KARYAWAN', outlet_id: 1, isMock: true };
  }
}

export async function fetchWeeklySchedules(outletFilter = 'ALL') {
  try {
    const query = outletFilter !== 'ALL' ? `?outlet=${encodeURIComponent(outletFilter)}` : '';
    const res = await fetch(`${API_BASE_URL}/shifts/weekly${query}`);
    if (!res.ok) throw new Error('Gagal memuat jadwal');
    return await res.json();
  } catch {
    if (outletFilter === 'ALL') return MOCK_SCHEDULES;
    return MOCK_SCHEDULES.filter((item) => item.nama_outlet.includes(outletFilter));
  }
}

export async function fetchSubstituteRecommendations(scheduleId) {
  try {
    const res = await fetch(`${API_BASE_URL}/shifts/${scheduleId}/recommendations`);
    if (!res.ok) throw new Error('Gagal memuat rekomendasi');
    return await res.json();
  } catch {
    return MOCK_RECOMMENDATIONS;
  }
}

export async function fetchShiftHistory() {
  try {
    const res = await fetch(`${API_BASE_URL}/shifts/history`);
    if (!res.ok) throw new Error('Gagal memuat riwayat');
    return await res.json();
  } catch {
    return MOCK_HISTORY;
  }
}

export async function fetchSwaps(status = 'ALL') {
  const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE_URL}/swaps${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal memuat daftar pengajuan tukar shift');
  return data;
}

export async function createSwapRequest(payload) {
  const res = await fetch(`${API_BASE_URL}/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal mengirim pengajuan tukar shift');
  return data;
}

export async function approveSwapRequest(swapId) {
  const res = await fetch(`${API_BASE_URL}/swaps/${swapId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal menyetujui tukar shift');
  return data;
}

export async function rejectSwapRequest(swapId) {
  const res = await fetch(`${API_BASE_URL}/swaps/${swapId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal menolak pengajuan tukar shift');
  return data;
}

export async function fetchRekapJamKerja(mingguKe = '') {
  const query = mingguKe ? `?minggu_ke=${encodeURIComponent(mingguKe)}` : '';
  const res = await fetch(`${API_BASE_URL}/rekap-jam-kerja${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal memuat rekap jam kerja');
  return data;
}

export async function claimOpenShift(scheduleId, userId) {
  const res = await fetch(`${API_BASE_URL}/shifts/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule_id: scheduleId, user_id: userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal mengklaim shift');
  return data;
}

export async function fetchOutlets() {
  const res = await fetch(`${API_BASE_URL}/outlets`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal memuat daftar outlet');
  return data;
}
