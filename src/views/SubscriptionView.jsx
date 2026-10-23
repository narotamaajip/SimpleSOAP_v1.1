import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  Camera,
  ArrowRight
} from 'lucide-react';
import { PLANS_CONFIG } from '../config/plans.js';
import { cn } from '../utils/cn.js';

/**
 * SubscriptionView
 * Layar Pengaturan -> Paket & Langganan
 *
 * @param {Object} props
 * @param {Object} props.entitlement - Status hak akses dari billing.js
 * @param {number} props.activePatientCount - Jumlah pasien aktif saat ini
 * @param {() => void} props.onBack
 * @param {() => void} props.onOpenPaywall
 */
export function SubscriptionView({
  entitlement,
  activePatientCount = 0,
  onBack,
  onOpenPaywall
}) {
  const isPro = entitlement.plan === 'pro';
  const isExpired = entitlement.isExpired;
  const isExpiringSoon = entitlement.isExpiringSoon;
  const daysRemaining = entitlement.daysRemaining;

  const formattedProUntil = entitlement.proUntil
    ? new Date(entitlement.proUntil).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      className="flex-1 flex flex-col h-full overflow-hidden"
    >
      {/* Top Header */}
      <div className="glass-bar px-4 py-3.5 flex items-center justify-between border-b sticky top-0 z-20">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-xl glass-btn-secondary text-slate-700 flex items-center gap-1 text-xs font-bold"
        >
          <ChevronLeft size={18} />
          <span>Kembali</span>
        </button>
        <h2 className="text-slate-800 font-extrabold text-sm tracking-tight uppercase">
          Paket &amp; Langganan
        </h2>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5 pb-24">
        {/* Banner Status Kedaluwarsa / Hampir Kedaluwarsa */}
        {isExpiringSoon && (
          <div className="glass-card p-4 rounded-2xl border-amber-300/80 bg-amber-500/10 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">
                Masa Aktif Pro Tersisa {daysRemaining} Hari
              </p>
              <p className="text-[11px] text-amber-800 leading-snug">
                Paket Anda akan berakhir pada {formattedProUntil}. Perpanjang sekarang agar pencatatan follow-up tetap tanpa batas.
              </p>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="glass-card p-4 rounded-2xl border-rose-300/80 bg-rose-500/10 flex items-start gap-3">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-rose-900">
                Masa Pro Telah Berakhir
              </p>
              <p className="text-[11px] text-rose-800 leading-snug">
                Akun kembali ke batas Paket Gratis. <strong>Seluruh data pasien Anda tetap aman dan dapat diakses kapan saja</strong>. Perpanjang untuk membuka kuota pasien baru dan foto.
              </p>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="glass-card p-5 rounded-[22px] space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Paket Saat Ini
              </p>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                {isPro ? PLANS_CONFIG.pro.name : PLANS_CONFIG.free.name}
              </h3>
            </div>

            <span
              className={cn(
                'px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider',
                isPro
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-700'
              )}
            >
              {isPro ? 'Pro Aktif' : 'Gratis'}
            </span>
          </div>

          {/* Kuota / Masa Aktif */}
          <div className="pt-2 border-t border-slate-200/60 space-y-3">
            {isPro ? (
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <Calendar size={15} className="text-teal-600 shrink-0" />
                <span className="font-medium">
                  Aktif hingga: <strong>{formattedProUntil || 'Aktif'}</strong>
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600">Kuota Pasien Aktif</span>
                  <span className={cn(activePatientCount >= 10 ? 'text-rose-600' : 'text-slate-800')}>
                    {activePatientCount} / {PLANS_CONFIG.free.maxActivePatients} Pasien
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      activePatientCount >= 10
                        ? 'bg-rose-500'
                        : activePatientCount >= 8
                        ? 'bg-amber-500'
                        : 'bg-teal-500'
                    )}
                    style={{
                      width: `${Math.min(100, (activePatientCount / PLANS_CONFIG.free.maxActivePatients) * 100)}%`
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Pasien yang telah dipulangkan atau diarsipkan tidak dihitung dalam kuota.
                </p>
              </div>
            )}
          </div>

          {/* Button Upgrade / Perpanjang */}
          <button
            type="button"
            onClick={onOpenPaywall}
            className="w-full py-3.5 glass-btn-primary rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md"
          >
            <Sparkles size={14} />
            <span>{isPro ? 'Perpanjang Langganan Pro' : 'Tingkatkan ke Pro'}</span>
          </button>
        </div>

        {/* Feature Comparison */}
        <div className="glass-card p-5 rounded-[22px] space-y-4">
          <h4 className="text-xs font-extrabold text-cyan-900 uppercase tracking-widest border-b border-white/75 pb-2.5">
            Perbandingan Fitur
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">Batas Pasien Aktif</p>
                <p className="text-[10px] text-slate-500">Maksimal pasien rawat inap tersimpan</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-slate-500">Gratis: 10</p>
                <p className="font-bold text-teal-700">Pro: Tanpa Batas</p>
              </div>
            </div>

            <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">Foto Hasil Lab &amp; Luka</p>
                <p className="text-[10px] text-slate-500">Lampiran foto langsung di form SOAP</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-slate-400">Gratis: Tidak</p>
                <p className="font-bold text-teal-700">Pro: Ya</p>
              </div>
            </div>

            <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">Kolaborasi Kode 6 Digit</p>
                <p className="text-[10px] text-slate-500">Berbagi pasien dengan rekanan dokter</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-teal-700">Gratis: Ya</p>
                <p className="font-bold text-teal-700">Pro: Ya</p>
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">Akses Baca Selamanya</p>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Data pasien tidak pernah dikunci meski masa langganan berakhir
                </p>
              </div>
              <div className="text-right shrink-0">
                <CheckCircle2 size={16} className="text-teal-600 inline" />
              </div>
            </div>
          </div>
        </div>

        {/* Patient Safety Note */}
        <div className="glass-subpanel p-4 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
          <ShieldCheck size={18} className="text-teal-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium leading-relaxed">
            <strong>Jaminan Keselamatan Pasien:</strong> Seluruh catatan rekam medis, alergi, dan riwayat SOAP tetap dapat Anda baca, salin, dan ekspor kapan saja tanpa batasan.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
