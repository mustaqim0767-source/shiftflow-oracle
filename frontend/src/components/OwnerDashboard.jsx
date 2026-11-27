import { useEffect, useState } from 'react';
import { getPending, putuskanSwap } from '../api';

export default function OwnerDashboard({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const ownerId = currentUser.id ?? currentUser.id_karyawan;


export default function OwnerDashboard() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setRows(await getPending()); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const putuskan = async (id, keputusan) => {
    try {
      await putuskanSwap(id, { keputusan, ownerId: OWNER_ID });
      await load();
    } catch (e) { setError(e.message); }
  };

  return (
 <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Pengajuan Menunggu Persetujuan</h2>
      {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
      {loading ? <p>Memuat...</p> : rows.length === 0 ? (
        <p className="text-slate-500">Tidak ada pengajuan.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b text-slate-500">
            <tr><th className="py-2">ID</th><th>Pengaju</th><th>Tujuan</th><th>Alasan</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.SWAP_ID} className="border-b border-slate-100">
                <td className="py-2">#{r.SWAP_ID}</td>
                <td>{r.PENGAJU_ID}</td>
                <td>{r.TARGET_ID}</td>
                <td>{r.ALASAN || '-'}</td>
                <td className="space-x-2 text-right">
                  <button onClick={() => putuskan(r.SWAP_ID, 'DISETUJUI')}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer">Setujui</button>
                  <button onClick={() => putuskan(r.SWAP_ID, 'DITOLAK')}
                    className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer">Tolak</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
