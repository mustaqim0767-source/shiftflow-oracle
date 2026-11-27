const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Email atau kata sandi salah');
  return data;
}

export async function fetchWeeklySchedules(outletFilter = 'ALL') {
  const query = outletFilter && outletFilter !== 'ALL' ? `?outlet=${encodeURIComponent(outletFilter)}` : '';
  const res = await fetch(`${API_BASE_URL}/shifts/weekly${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal memuat jadwal mingguan');
  return data;
}

export async function fetchSubstituteRecommendations(scheduleId) {
  const res = await fetch(`${API_BASE_URL}/shifts/${scheduleId}/recommendations`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal memuat rekomendasi pengganti');
  return data;
}

export async function fetchShiftHistory() {
  const res = await fetch(`${API_BASE_URL}/shifts/history`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal memuat riwayat perubahan shift');
  return data;
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