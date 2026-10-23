import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, ShieldCheck, Zap, Camera, Users, Clock } from 'lucide-react';
import { PLANS_CONFIG, calculateSavingsPercent } from '../config/plans.js';
import { track } from '../lib/analytics.js';
import { startCheckout } from '../lib/billing.js';
import { cn } from '../utils/cn.js';

/**
 * PaywallBottomSheet
 * Bottom sheet paywall kontekstual yang ramah dokter dan transparan.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {'patient_limit' | 'photo' | 'settings'} props.trigger
 * @param {() => void} props.onClose
 */
export function PaywallBottomSheet({ isOpen, trigger = 'patient_limit', onClose }) {
  const [selectedPlanId, setSelectedPlanId] = useState('semi_annual');

  useEffect(() => {
    if (isOpen) {
      track('paywall_viewed', { trigger });
    }
  }, [isOpen, trigger]);

  // Keyboard accessibility: ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    track('paywall_dismissed', { trigger });
    onClose();
  };

  const handleSelectPlan = (id) => {
    setSelectedPlanId(id);
    track('plan_selected', { plan_id: id });
  };

  const handleCheckout = () => {
    startCheckout(selectedPlanId);
    onClose(); // Tutup sheet dan alur berpindah ke mock checkout modal
  };

  const proConfig = PLANS_CONFIG.pro;

  const triggerContextText = {
    patient_limit: {
      tag: 'Batas 10 Pasien Aktif',
      lead: 'Bangsal penuh atau rotasi baru? Tingkatkan ke Pro untuk terus menambah pasien tanpa batas kuota.'
    },
    photo: {
      tag: 'Fitur Simpan Foto Klinis',
      lead: 'Dokumentasikan foto luka, radiologi, atau serial EKG langsung ke catatan SOAP dengan paket Pro.'
    },
    settings: {
      tag: 'Tingkatkan Akun Dokter',
      lead: 'Nikmati kelancaran follow-up visite bangsal dan operan jaga harian tanpa batasan kuota.'
    }
  }[trigger] || {
    tag: 'SimpleSOAP Pro',
    lead: 'Dokumentasi pasien visite lebih lengkap, cepat, dan tanpa batas kuota.'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end justify-center"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="glass-dropdown w-full max-w-md rounded-t-[32px] p-6 pb-8 border-t border-x border-white/95 max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-300/80 rounded-full mx-auto mb-4" />

            {/* Header with Close Button */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-600/10 text-teal-800 border border-teal-200/60 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                <Sparkles size={11} className="text-teal-600" />
                <span>{triggerContextText.tag}</span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Tutup penawaran"
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-white/60 hover:bg-white rounded-full transition-colors active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {/* Headline */}
            <div className="space-y-1.5 mb-5">
              <h2
                id="paywall-title"
                className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug"
              >
                {proConfig.headline}
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {triggerContextText.lead}
              </p>
            </div>

            {/* Benefits List */}
            <div className="glass-subpanel p-3.5 rounded-2xl space-y-2.5 mb-5 border border-white/80">
              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-emerald-500/15 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                  <Check size={13} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Pasien Aktif Tanpa Batas</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">
                    Kelola seluruh pasien bangsal &amp; konsulan tanpa khawatir kuota 10 pasien.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-emerald-500/15 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                  <Camera size={13} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Lampirkan Foto Klinis</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">
                    Simpan foto luka, EKG serial, dan hasil lab langsung pada entri SOAP.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-emerald-500/15 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                  <Users size={13} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Kolaborasi Tetap Gratis</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">
                    Rekan koas, residen, atau dokter ruangan yang diundang via kode tetap gratis akses.
                  </p>
                </div>
              </div>
            </div>

            {/* Period Selector (Bulanan / 6 Bulan / Tahunan) */}
            <div className="space-y-2 mb-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-0.5">
                Pilih Periode Langganan
              </p>

              <div className="grid grid-cols-3 gap-2">
                {proConfig.pricing.map((option) => {
                  const isSelected = selectedPlanId === option.id;
                  const savings = calculateSavingsPercent(option.price, option.months);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectPlan(option.id)}
                      className={cn(
                        'relative p-3 rounded-2xl text-left transition-all flex flex-col justify-between border active:scale-95',
                        isSelected
                          ? 'bg-white/95 border-teal-600 shadow-[0_8px_20px_-4px_rgba(13,148,136,0.22),inset_0_1px_1px_rgba(255,255,255,1)] ring-2 ring-teal-500/30'
                          : 'glass-subpanel border-white/80 hover:bg-white/80'
                      )}
                    >
                      {/* Savings Badge */}
                      {savings > 0 && (
                        <span className="absolute -top-2 right-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm">
                          Hemat {savings}%
                        </span>
                      )}

                      <div>
                        <p className={cn('text-xs font-extrabold', isSelected ? 'text-teal-900' : 'text-slate-700')}>
                          {option.periodLabel}
                        </p>
                        <p className="text-[11px] font-extrabold text-slate-900 mt-1">
                          {option.formattedPrice}
                        </p>
                      </div>

                      <p className="text-[10px] font-semibold text-slate-500 mt-2">
                        {option.perMonthText}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full py-4 glass-btn-primary rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <span>Lanjut ke Pembayaran</span>
              </button>

              {/* Patient Safety & Clear Pricing Disclaimer */}
              <div className="text-center px-2 space-y-1">
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  {PLANS_CONFIG.billingTerms}
                </p>
                {PLANS_CONFIG.paymentMethodsPlaceholder ? (
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {PLANS_CONFIG.paymentMethodsPlaceholder}
                  </p>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
