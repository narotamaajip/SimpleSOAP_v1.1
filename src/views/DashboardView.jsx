import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { PatientCardCompact } from '../components/PatientCardCompact';
import { LogoIcon } from '../components/ui/Logo';
import { PLANS_CONFIG } from '../config/plans.js';
import { cn } from '../utils/cn.js';

export function DashboardView({
  patients,
  stats,
  doctorProfile,
  onSelectPatient,
  onNavigateToPatients,
  entitlement = { plan: 'free' },
  activeCountOverride = null,
  onOpenPaywall
}) {
  const pendingPatients = patients.filter((p) => !p.isDeleted && !p.isFollowedUp && p.status !== 'PULANG');
  const activeCount = activeCountOverride !== null ? activeCountOverride : stats.total;
  const isFree = entitlement.plan === 'free';
  const showUsageMeter = isFree && activeCount >= 8;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      className="flex-1 overflow-y-auto no-scrollbar pb-12"
    >
      <div className="glass-bar px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 border-b">
        <div className="w-8" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl glass-subpanel flex items-center justify-center">
            <LogoIcon className="w-4 h-5" />
          </div>
          <h1 className="text-slate-800 font-extrabold text-base tracking-tight">SimpleSOAP</h1>
          {entitlement.plan === 'pro' && (
            <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[9px] font-extrabold rounded-full uppercase tracking-wider shadow-sm">
              Pro
            </span>
          )}
        </div>
        <div className="w-8" />
      </div>

      <div className="p-5 space-y-5">
        {/* Banner H-7 Pro Expiring Soon */}
        {entitlement.isExpiringSoon && (
          <div
            onClick={onOpenPaywall}
            className="glass-card p-3.5 rounded-2xl border-amber-300/80 bg-amber-500/10 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-900 font-semibold truncate">
                Masa Pro tersisa <strong>{entitlement.daysRemaining} hari</strong>
              </p>
            </div>
            <span className="text-[11px] font-extrabold text-teal-800 flex items-center gap-0.5 shrink-0">
              Perpanjang <ChevronRight size={14} />
            </span>
          </div>
        )}

        <div className="pt-1">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Follow-Up Pasien</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">
            Ringkasan harian {doctorProfile.name}
          </p>
        </div>

        {/* Subtle Usage Meter (Hanya muncul mulai dari 8/10, bukan paywall) */}
        {showUsageMeter && (
          <div className="glass-subpanel p-3.5 rounded-2xl border border-white/90 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">
                {activeCount} dari {PLANS_CONFIG.free.maxActivePatients} pasien aktif
              </span>
              <span
                className={cn(
                  'text-[11px] font-extrabold px-2 py-0.5 rounded-md',
                  activeCount >= 10
                    ? 'bg-rose-500/15 text-rose-700'
                    : 'bg-amber-500/15 text-amber-800'
                )}
              >
                {activeCount >= 10 ? 'Batas Tercapai' : 'Mendekati Batas'}
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  activeCount >= 10 ? 'bg-rose-500' : 'bg-amber-500'
                )}
                style={{
                  width: `${Math.min(100, (activeCount / PLANS_CONFIG.free.maxActivePatients) * 100)}%`
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3.5">
          <StatCard
            label="TOTAL PASIEN AKTIF"
            value={activeCount}
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
