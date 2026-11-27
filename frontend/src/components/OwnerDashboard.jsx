import { useEffect, useState } from 'react';
import { getPending, putuskanSwap } from '../api';

const OWNER_ID = 1; // sesuaikan / ambil dari login

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
    <div className="rounded bg-white p-5 shadow">
      <h2 className="mb-3 text-lg font-semibold">Pengajuan Menunggu Persetujuan</h2>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {loading ? <p>Memuat...</p> : rows.length === 0 ? (
        <p className="text-slate-500">Tidak ada pengajuan.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b text-slate-500">
            <tr><th className="py-2">ID</th><th>Pengaju</th><th>Tujuan</th><th>Alasan</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.SWAP_ID} className="border-b">
                <td className="py-2">#{r.SWAP_ID}</td>
                <td>{r.PENGAJU_ID}</td>
                <td>{r.TARGET_ID}</td>
                <td>{r.ALASAN || '-'}</td>
                <td className="space-x-2 text-right">
                  <button onClick={() => putuskan(r.SWAP_ID, 'DISETUJUI')}
                    className="rounded bg-green-600 px-2 py-1 text-white">Setujui</button>
                  <button onClick={() => putuskan(r.SWAP_ID, 'DITOLAK')}
                    className="rounded bg-red-600 px-2 py-1 text-white">Tolak</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
