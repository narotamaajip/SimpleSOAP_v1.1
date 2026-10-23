import { motion } from 'framer-motion';
import { StatCard } from '../components/ui/StatCard';
import { PatientCardCompact } from '../components/PatientCardCompact';
import { LogoIcon } from '../components/ui/Logo';

export function DashboardView({
  patients,
  stats,
  doctorProfile,
  onSelectPatient,
  onNavigateToPatients
}) {
  const pendingPatients = patients.filter((p) => !p.isDeleted && !p.isFollowedUp && p.status !== 'PULANG');

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      className="flex-1 overflow-y-auto no-scrollbar pb-12"
    >
      <div className="glass-bar px-4 py-3.5 flex items-center justify-center sticky top-0 z-20 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl glass-subpanel flex items-center justify-center">
            <LogoIcon className="w-4 h-5" />
          </div>
          <h1 className="text-slate-800 font-extrabold text-base tracking-tight">SimpleSOAP</h1>
        </div>
      </div>

      <div className="p-5 space-y-6">
        <div className="pt-1">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Follow-Up Pasien</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">
            Ringkasan harian {doctorProfile.name}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
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

        <div className="space-y-3.5">
          <div className="flex justify-between items-center px-0.5">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.16em]">
              PERLU FOLLOW-UP
            </h3>
            <button
              onClick={() => onNavigateToPatients('BELUM_FU')}
              className="text-[11px] font-bold text-cyan-800 hover:text-cyan-950 px-2.5 py-1 rounded-xl hover:bg-white/60 active:scale-95 transition-all"
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
