import { useEffect, useState } from 'react';
import { fetchRekapJamKerja } from '../services/api';

export default function RekapJamKerja() {
  const [mingguKe, setMingguKe] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRekapJamKerja(mingguKe)
      .then((d) => {
        setRows(d);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mingguKe]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Rekap Jam Kerja Mingguan</h2>
          <p className="text-xs text-slate-500">Sumber: Oracle View V_REKAP_JAM_KERJA</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={mingguKe}
            onChange={(e) => setMingguKe(e.target.value)}
            placeholder="Filter minggu_ke (mis. 2026-W48)"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          {mingguKe && (
            <button
              onClick={() => setMingguKe('')}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Memuat rekap jam kerja...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada data rekap jam kerja.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2">Karyawan</th>
                <th>Outlet</th>
                <th>Minggu Ke</th>
                <th>Jumlah Shift</th>
                <th>Total Jam</th>
                <th>Sisa Kuota</th>
                <th>Status Kuota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.user_id}-${r.minggu_ke}`} className="border-b border-slate-100">
                  <td className="py-2.5 font-medium text-slate-800">{r.nama_lengkap}</td>
                  <td>{r.nama_outlet}</td>
                  <td>{r.minggu_ke}</td>
                  <td>{r.jumlah_shift} shift</td>
                  <td className="font-semibold">
                    {r.total_jam_kerja} / {r.max_jam_mingguan} jam
                  </td>
                  <td>{r.sisa_kuota_jam} jam</td>
                  <td>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.sisa_kuota_jam <= 0
                          ? 'bg-rose-100 text-rose-700'
                          : r.sisa_kuota_jam <= 8
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {r.status_kuota}
                    </span>
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
