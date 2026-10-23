import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, AlertCircle, X, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { PLANS_CONFIG } from '../config/plans.js';
import { completeMockCheckout, resetCheckoutState, startCheckout } from '../lib/billing.js';
import { cn } from '../utils/cn.js';

/**
 * MockCheckoutModal
 * Layar mock pembayaran: Menunggu Pembayaran, Berhasil, dan Gagal.
 * 
 * TODO: Integrasikan gateway pembayaran nyata di sini (misal panggil window.snap.pay atau redirect URL).
 * Klien tidak boleh memegang API Key rahasia gateway apa pun.
 *
 * @param {Object} props
 * @param {'idle' | 'pending' | 'success' | 'failed'} props.checkoutState
 * @param {string | null} props.selectedPlanId
 * @param {() => void} props.onClose
 */
export function MockCheckoutModal({ checkoutState, selectedPlanId, onClose }) {
  if (checkoutState === 'idle') return null;

  const planInfo =
    PLANS_CONFIG.pro.pricing.find((p) => p.id === selectedPlanId) ||
    PLANS_CONFIG.pro.pricing[0];

  const handleSimulateSuccess = () => {
    completeMockCheckout(selectedPlanId, true);
  };

  const handleSimulateFailure = () => {
    completeMockCheckout(selectedPlanId, false);
  };

  const handleClose = () => {
    resetCheckoutState();
    if (onClose) onClose();
  };

  const handleRetry = () => {
    startCheckout(selectedPlanId || 'monthly');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="glass-dropdown w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/95 relative text-center space-y-5"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 bg-white/70 hover:bg-white rounded-full transition-colors active:scale-90"
        >
          <X size={18} />
        </button>

        {/* STATE: PENDING (Menunggu Pembayaran) */}
        {checkoutState === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-2xl glass-subpanel flex items-center justify-center mx-auto text-amber-600 border border-amber-200/50">
              <Clock size={32} className="animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                Simulasi Pembayaran (Mock)
              </span>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Menunggu Pembayaran
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Paket SimpleSOAP Pro {planInfo.periodLabel}
              </p>
            </div>

            <div className="glass-subpanel p-4 rounded-2xl text-left space-y-2 border border-white/80">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Total Tagihan</span>
                <span className="font-extrabold text-slate-900 text-sm">{planInfo.formattedPrice}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium">Jenis Langganan</span>
                <span className="font-bold text-slate-700">Prabayar (Non-Otomatis)</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight pt-1">
                Catatan: Gerbang pembayaran sebenarnya belum terhubung. Anda dapat mensimulasikan hasil pembayaran di bawah ini.
              </p>
            </div>

            {/* Simulation controls */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSimulateSuccess}
                className="w-full py-3.5 glass-btn-primary rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <CheckCircle2 size={16} />
                <span>Simulasikan Pembayaran Berhasil</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateFailure}
                className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-200/70 rounded-2xl font-bold text-xs active:scale-95 transition-all"
              >
                Simulasikan Pembayaran Gagal
              </button>
            </div>
          </>
        )}

        {/* STATE: SUCCESS (Pembayaran Berhasil) */}
        {checkoutState === 'success' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-300/60 shadow-sm">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                Berhasil Diaktifkan
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Selamat Datang di Pro!
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Paket SimpleSOAP Pro {planInfo.periodLabel} telah aktif. Anda kini dapat mengelola pasien aktif tanpa batas dan menyimpan foto klinis.
              </p>
            </div>

            <div className="glass-subpanel p-3.5 rounded-2xl text-left space-y-1.5 text-xs border border-white/80">
              <div className="flex items-center gap-2 text-teal-800 font-bold">
                <Sparkles size={14} className="text-teal-600" />
                <span>Batas kuota pasien dinonaktifkan</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Data rekam medis Anda selalu aman dan dapat diekspor kapan saja.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3.5 glass-btn-primary rounded-2xl font-bold text-xs shadow-md"
            >
              Mulai Gunakan Fitur Pro
            </button>
          </>
        )}

        {/* STATE: FAILED (Pembayaran Gagal / Dibatalkan) */}
        {checkoutState === 'failed' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center mx-auto border border-rose-300/60 shadow-sm">
              <AlertCircle size={36} />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-0.5 rounded-full bg-rose-500/15 text-rose-800 text-[10px] font-extrabold uppercase tracking-wider">
                Transaksi Tidak Selesai
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Pembayaran Belum Berhasil
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Tidak ada biaya yang ditagihkan. Anda dapat mencoba kembali atau melanjutkan dengan Paket Gratis.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full py-3.5 glass-btn-primary rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <RefreshCw size={14} />
                <span>Coba Lagi</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 glass-btn-secondary text-slate-700 rounded-2xl font-bold text-xs"
              >
                Kembali ke Paket Gratis
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
