import { useEffect, useState } from 'react';
import { fetchShiftHistory } from '../services/api';

export default function ShiftHistory() {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await fetchShiftHistory();
    setHistoryList(data);
    setLoading(false);
  };

  const actionBadge = (aksi) => {
    const map = {
      SWAPPED: 'bg-purple-100 text-purple-800',
      CLAIMED: 'bg-emerald-100 text-emerald-800',
      SWAP_REQUESTED: 'bg-amber-100 text-amber-800',
      CANCELLED: 'bg-rose-100 text-rose-800',
    };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${map[aksi] || 'bg-slate-100 text-slate-700'}`}>
        {aksi}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Riwayat Perubahan Shift (Audit Log)</h2>
          <p className="text-xs text-slate-500">
            Catatan otomatis dari trigger database Oracle (<code className="text-amber-700">SHIFT_HISTORY</code>) setiap kali jadwal berubah.
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
        >
          Muat Ulang
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <th className="py-3.5 px-4">Waktu Perubahan</th>
                <th className="py-3.5 px-4">ID Jadwal &amp; Shift</th>
                <th className="py-3.5 px-4">Aksi</th>
                <th className="py-3.5 px-4">Petugas Lama → Baru</th>
                <th className="py-3.5 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">Memuat riwayat audit...</td>
                </tr>
              ) : (
                historyList.map((log) => (
                  <tr key={log.history_id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-500">{log.waktu_perubahan}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">#{log.schedule_id}</span> — {log.nama_shift}
                      <div className="text-xs text-slate-400">{log.tanggal_shift}</div>
                    </td>
                    <td className="py-3.5 px-4">{actionBadge(log.aksi)}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="text-slate-400">{log.user_lama || 'Kosong (OPEN)'}</span>
                      <span className="mx-2 text-slate-400">→</span>
                      <span className="font-semibold text-slate-900">{log.user_baru || '-'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">{log.keterangan}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}