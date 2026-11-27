import { useEffect, useState } from 'react';
import { getRekap } from '../api';

export default function RekapJamKerja() {
  const [bulan, setBulan] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getRekap(bulan).then((d) => { setRows(d); setError(''); })
      .catch((e) => setError(e.message));
  }, [bulan]);

  return (
    <div className="rounded bg-white p-5 shadow">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Rekap Jam Kerja</h2>
        <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead className="border-b text-slate-500">
          <tr><th className="py-2">Nama</th><th>Bulan</th><th>Total Jam</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.KARYAWAN_ID}-${r.BULAN}`} className="border-b">
              <td className="py-2">{r.NAMA}</td><td>{r.BULAN}</td><td>{r.TOTAL_JAM}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
