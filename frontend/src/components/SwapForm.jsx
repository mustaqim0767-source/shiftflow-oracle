import { useEffect, useState } from 'react';
import { createSwapRequest, fetchWeeklySchedules } from '../services/api';

export default function SwapForm({ currentUser }) {
  const [schedules, setSchedules] = useState([]);
  const [scheduleAsalId, setScheduleAsalId] = useState('');
  const [scheduleTujuanId, setScheduleTujuanId] = useState('');
  const [alasan, setAlasan] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const pengajuId = currentUser?.user_id ?? currentUser?.id ?? currentUser?.id_karyawan;

  useEffect(() => {
    fetchWeeklySchedules('ALL').then((data) => {
      setSchedules(data);
    });
  }, []);

  // Filter jadwal milik user yang sedang login (status ASSIGNED)
  const mySchedules = schedules.filter(
    (s) => Number(s.user_id) === Number(pengajuId) && s.status === 'ASSIGNED'
  );

  // Filter jadwal milik karyawan lain yang bisa diajak tukar (status ASSIGNED)
  const targetSchedules = schedules.filter(
    (s) => s.user_id && Number(s.user_id) !== Number(pengajuId) && s.status === 'ASSIGNED'
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const selectedTarget = targetSchedules.find(
      (s) => Number(s.schedule_id) === Number(scheduleTujuanId)
    );

    if (!scheduleAsalId || !selectedTarget) {
      setStatus({ type: 'err', msg: 'Pilih jadwal asal dan jadwal tujuan terlebih dahulu.' });
      setLoading(false);
      return;
    }

    try {
      const res = await createSwapRequest({
        schedule_asal_id: Number(scheduleAsalId),
        schedule_tujuan_id: Number(scheduleTujuanId),
        pengaju_id: Number(pengajuId),
        penerima_id: Number(selectedTarget.user_id),
        alasan: alasan.trim() || 'Pengajuan tukar jadwal shift',
      });
      setStatus({ type: 'ok', msg: res.message });
      setScheduleAsalId('');
      setScheduleTujuanId('');
      setAlasan('');
    } catch (err) {
      setStatus({ type: 'err', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Form Pengajuan Tukar Shift</h2>
        <p className="text-sm text-slate-500">
          Pengaju: <span className="font-medium text-slate-700">{currentUser?.nama_lengkap}</span>
        </p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Jadwal Shift Kamu (Asal)
        <select
          value={scheduleAsalId}
          onChange={(e) => setScheduleAsalId(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">-- Pilih jadwal shift milikmu --</option>
          {mySchedules.map((s) => (
            <option key={s.schedule_id} value={s.schedule_id}>
              #{s.schedule_id} | {s.tanggal_shift} — {s.nama_shift} ({s.jam_mulai}-{s.jam_selesai}) @ {s.nama_outlet}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Jadwal Shift Rekan Kerja (Tujuan)
        <select
          value={scheduleTujuanId}
          onChange={(e) => setScheduleTujuanId(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">-- Pilih jadwal rekan yang ingin ditukar --</option>
          {targetSchedules.map((s) => (
            <option key={s.schedule_id} value={s.schedule_id}>
              {s.nama_karyawan} — {s.tanggal_shift} | {s.nama_shift} ({s.jam_mulai}-{s.jam_selesai}) @ {s.nama_outlet}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Alasan Tukar Shift
        <input
          type="text"
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder="Contoh: Ada keperluan mendadak / jadwal kuliah"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <button
        disabled={loading}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
      </button>

      {status && (
        <p className={`text-sm font-medium ${status.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {status.msg}
        </p>
      )}
    </form>
  );
}
