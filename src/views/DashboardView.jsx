import { motion } from 'framer-motion';
import { StatCard } from '../components/ui/StatCard';
import { PatientCardCompact } from '../components/PatientCardCompact';
import { LogoIcon } from '../components/ui/Logo';

export function DashboardView({ patients, stats, doctorProfile, onSelectPatient, onNavigateToPatients }) {
  const pendingPatients = patients.filter((p) => !p.isFollowedUp && p.status !== 'PULANG');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 overflow-y-auto no-scrollbar pb-10"
    >
      <div className="bg-white px-4 py-3.5 flex items-center justify-center sticky top-0 z-20 border-b border-emerald-50 shadow-sm">
        <div className="flex items-center gap-2">
          <LogoIcon className="w-5 h-6" />
          <h1 className="text-emerald-800 font-black text-lg tracking-tight">SimpleSOAP</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Follow-Up Pasien</h2>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">
            Ringkasan harian {doctorProfile.name}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="TOTAL PASIEN AKTIF"
            value={stats.total}
            color="emerald"
            onClick={() => onNavigateToPatients('AKTIF')}
          />
          <StatCard
            label="SUDAH FOLLOW-UP"
            value={stats.followedUp}
            color="emerald"
            light
            onClick={() => onNavigateToPatients('AKTIF')}
          />
          <StatCard
            label="BELUM FOLLOW-UP"
            value={stats.pending}
            color="rose"
            full
            onClick={() => onNavigateToPatients('BELUM_FU')}
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PERLU FOLLOW-UP</h3>
            <button
              onClick={() => onNavigateToPatients('BELUM_FU')}
              className="text-[10px] font-bold text-emerald-700"
            >
              LIHAT SEMUA
            </button>
          </div>
          <div className="space-y-3">
            {pendingPatients.slice(0, 3).map((p) => (
              <PatientCardCompact key={p.id} patient={p} onClick={() => onSelectPatient(p.id)} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
