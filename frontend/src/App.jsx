import { useState } from 'react';
import LoginPage from './components/LoginPage';
import WeeklySchedule from './components/WeeklySchedule';
import ShiftHistory from './components/ShiftHistory';
import SwapForm from './components/SwapForm';
import OwnerDashboard from './components/OwnerDashboard';
import RekapJamKerja from './components/RekapJamKerja';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('weekly');

  if (!user) {
    return <LoginPage onLoginSuccess={(userData) => setUser(userData)} />;
  }

  const isOwner = user.role?.toLowerCase() === 'owner';

  const tabClass = (tab) =>
    `px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer whitespace-nowrap ${
      activeTab === tab
        ? 'bg-amber-50 text-amber-800 font-semibold'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Navbar Utama */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center text-sm">
                TJ
              </div>
              <span className="font-bold text-lg text-slate-900">TukarJaga</span>
            </div>

            <nav className="flex items-center gap-1 overflow-x-auto">
              <button onClick={() => setActiveTab('weekly')} className={tabClass('weekly')}>
                Jadwal Mingguan
              </button>

              <button onClick={() => setActiveTab('swap')} className={tabClass('swap')}>
                Ajukan Tukar Shift
              </button>

              {isOwner && (
                <button onClick={() => setActiveTab('approval')} className={tabClass('approval')}>
                  Persetujuan
                </button>
              )}

              <button onClick={() => setActiveTab('rekap')} className={tabClass('rekap')}>
                Rekap Jam Kerja
              </button>

              <button onClick={() => setActiveTab('history')} className={tabClass('history')}>
                Riwayat Perubahan
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900">{user.nama_lengkap}</div>
              <div className="text-xs text-slate-500">{user.role}</div>
            </div>
            <button
              onClick={() => {
                setUser(null);
                setActiveTab('weekly');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'weekly' && <WeeklySchedule currentUser={user} />}
        {activeTab === 'swap' && <SwapForm currentUser={user} />}
        {activeTab === 'approval' && isOwner && <OwnerDashboard currentUser={user} />}
        {activeTab === 'rekap' && <RekapJamKerja currentUser={user} />}
        {activeTab === 'history' && <ShiftHistory />}
      </main>
    </div>
  );
}