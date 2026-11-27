import { useState } from 'react';
import { ajukanSwap } from '../api';

const empty = { pengajuId: '', targetId: '', shiftPengajuId: '', shiftTargetId: '', alasan: '' };

export default function SwapForm() {
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState(null); // {type, msg}
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
    <form onSubmit={onSubmit} className="space-y-3 rounded bg-white p-5 shadow">
      <h2 className="text-lg font-semibold">Form Pengajuan Tukar Shift</h2>
      {field('pengajuId', 'ID Karyawan Pengaju')}
      {field('targetId', 'ID Karyawan Tujuan')}
      {field('shiftPengajuId', 'ID Shift Pengaju')}
      {field('shiftTargetId', 'ID Shift Tujuan')}
      {field('alasan', 'Alasan', 'text')}
      <button disabled={loading}
        className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">
        {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
      </button>
      {status && (
        <p className={`text-sm ${status.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
          {status.msg}
        </p>
      )}
    </form>
  );
}
