import { useEffect, useState } from 'react';
import { approveSwapRequest, fetchSwaps, rejectSwapRequest } from '../services/api';

export default function OwnerDashboard() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchSwaps(statusFilter);
      setRows(data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleAction = async (swapId, action) => {
    setProcessingId(swapId);
    setError('');
    setSuccessMsg('');
    try {
      const res =
        action === 'APPROVE'
          ? await approveSwapRequest(swapId)
          : await rejectSwapRequest(swapId);
      setSuccessMsg(res.message);
      await load();
    } catch (e) {
      // Menampilkan pesan error bisnis Oracle (mis. ORA-20001 bentrok/melebihi 40 jam)
      setError(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Persetujuan Tukar Shift (Owner)</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="PENDING">Menunggu Persetujuan (PENDING)</option>
          <option value="APPROVED">Disetujui (APPROVED)</option>
          <option value="REJECTED">Ditolak (REJECTED)</option>
          <option value="ALL">Semua Pengajuan</option>
        </select>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Memuat data pengajuan...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Tidak ada pengajuan tukar shift pada filter ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2">ID</th>
                <th>Outlet</th>
                <th>Pengaju & Shift Asal</th>
                <th>Penerima & Shift Tujuan</th>
                <th>Alasan</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.swap_id} className="border-b border-slate-100">
                  <td className="py-2.5 font-medium">#{r.swap_id}</td>
                  <td>{r.nama_outlet}</td>
                  <td>
                    <div className="font-medium text-slate-800">{r.nama_pengaju}</div>
                    <div className="text-xs text-slate-500">
                      {r.tanggal_asal} ({r.shift_asal})
                    </div>
                  </td>
                  <td>
                    <div className="font-medium text-slate-800">{r.nama_penerima}</div>
                    <div className="text-xs text-slate-500">
                      {r.tanggal_tujuan} ({r.shift_tujuan})
                    </div>
                  </td>
                  <td className="max-w-xs truncate">{r.alasan || '-'}</td>
                  <td>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status_swap === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.status_swap === 'REJECTED'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.status_swap}
                    </span>
                  </td>
                  <td className="space-x-2 text-right whitespace-nowrap">
                    {r.status_swap === 'PENDING' && (
                      <>
                        <button
                          disabled={processingId === r.swap_id}
                          onClick={() => handleAction(r.swap_id, 'APPROVE')}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        >
                          Setujui
                        </button>
                        <button
                          disabled={processingId === r.swap_id}
                          onClick={() => handleAction(r.swap_id, 'REJECT')}
                          className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                        >
                          Tolak
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
