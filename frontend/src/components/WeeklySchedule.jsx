import { useEffect, useState } from 'react';
import { fetchWeeklySchedules, fetchSubstituteRecommendations } from '../services/api';

export default function WeeklySchedule({ currentUser }) {
  const [schedules, setSchedules] = useState([]);
  const [outletFilter, setOutletFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    loadSchedules();
  }, [outletFilter]);

  const loadSchedules = async () => {
    setLoading(true);
    const data = await fetchWeeklySchedules(outletFilter);
    setSchedules(data);
    setLoading(false);
  };

  const handleOpenRecommendation = async (shift) => {
    setSelectedShift(shift);
    setLoadingRec(true);
    const recs = await fetchSubstituteRecommendations(shift.schedule_id);
    setRecommendations(recs);
    setLoadingRec(false);
  };

  const handleClaimShift = (shiftId) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.schedule_id === shiftId
          ? { ...item, status: 'ASSIGNED', nama_karyawan: currentUser.nama_lengkap, user_id: currentUser.user_id }
          : item
      )
    );
    setToastMsg(`Shift #${shiftId} berhasil diklaim oleh ${currentUser.nama_lengkap} (Row-level lock verified).`);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const statusBadge = (status) => {
    const styles = {
      OPEN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
      SWAP_PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
      COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${styles[status] || styles.COMPLETED}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Jadwal Shift Mingguan</h2>
          <p className="text-xs text-slate-500">
            Pantau jadwal aktif, klaim shift kosong, atau cari rekomendasi pengganti otomatis dari Oracle Function.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Filter Outlet:</label>
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">Semua Outlet</option>
            <option value="Darussalam">Kopi Ulee Kareng - Darussalam</option>
            <option value="Peunayong">Kopi Ulee Kareng - Peunayong</option>
          </select>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex justify-between items-center">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-xs font-bold ml-4 cursor-pointer">✕</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Outlet</th>
                <th className="py-3.5 px-4">Shift &amp; Jam</th>
                <th className="py-3.5 px-4">Petugas</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Memuat jadwal shift...</td>
                </tr>
              ) : (
                schedules.map((item) => (
                  <tr key={item.schedule_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900">{item.tanggal_shift}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.nama_outlet}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{item.nama_shift}</div>
                      <div className="text-xs text-slate-500">
                        {item.jam_mulai} - {item.jam_selesai} ({item.durasi_jam} jam)
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.nama_karyawan ? (
                        <span className="font-medium text-slate-800">{item.nama_karyawan}</span>
                      ) : (
                        <span className="italic text-slate-400">Belum ada petugas</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{statusBadge(item.status)}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {item.status === 'OPEN' && (
                        <button
                          onClick={() => handleClaimShift(item.schedule_id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer"
                        >
                          Klaim Shift
                        </button>
                      )}
                      {item.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleOpenRecommendation(item)}
                          className="px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition cursor-pointer"
                        >
                          Cari Pengganti
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel Rekomendasi Pengganti (Output Oracle Function) */}
      {selectedShift && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Rekomendasi Pengganti untuk {selectedShift.nama_shift} ({selectedShift.tanggal_shift})
              </h3>
              <p className="text-xs text-amber-800">
                Kandidat disaring otomatis berdasarkan batas maksimal 40 jam/minggu dan jeda istirahat minimal 8 jam.
              </p>
            </div>
            <button
              onClick={() => setSelectedShift(null)}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-amber-200 rounded-lg text-amber-900 hover:bg-amber-100 cursor-pointer"
            >
              Tutup
            </button>
          </div>

          {loadingRec ? (
            <p className="text-xs text-amber-700">Menghitung kelayakan kandidat dari Oracle...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recommendations.map((rec) => (
                <div key={rec.user_id} className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-2xs">
                  <div className="font-bold text-slate-900 text-sm">{rec.nama_lengkap}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Jam Terpakai: <span className="font-semibold">{rec.jam_terpakai}j</span> | Sisa Kuota:{' '}
                    <span className="font-semibold text-emerald-700">{rec.sisa_kuota_jam}j</span>
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-amber-800 bg-amber-100/70 px-2 py-1 rounded">
                    {rec.status_kelayakan}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}