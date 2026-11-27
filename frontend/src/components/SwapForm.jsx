import { useState } from 'react';
import { ajukanSwap } from '../api';

const empty = { targetId: '', shiftPengajuId: '', shiftTargetId: '', alasan: '' };

export default function SwapForm({ currentUser }) {
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const pengajuId = currentUser.id ?? currentUser.id_karyawan;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await ajukanSwap({
        ...form,
        pengajuId: Number(form.pengajuId),
        targetId: Number(form.targetId),
        shiftPengajuId: Number(form.shiftPengajuId),
        shiftTargetId: Number(form.shiftTargetId),
      });
      setStatus({ type: 'ok', msg: `${res.message} (ID #${res.swapId})` });
      setForm(empty);
    } catch (err) {
      setStatus({ type: 'err', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'number') => (
    <label className="block text-sm">
      {label}
      <input
        name={name} type={type} value={form[name]} onChange={onChange}
        required={name !== 'alasan'}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
      />
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">Form Pengajuan Tukar Shift</h2>
      <p className="text-sm text-slate-500">Pengaju: {currentUser.nama_lengkap}</p>
      {field('targetId', 'ID Karyawan Tujuan')}
      {field('shiftPengajuId', 'ID Shift Kamu')}
      {field('shiftTargetId', 'ID Shift Tujuan')}
      {field('alasan', 'Alasan', 'text')}
      <button
        disabled={loading}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
      </button>
      {status && (
        <p className={`text-sm ${status.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {status.msg}
        </p>
      )}
    </form>
  );
}
