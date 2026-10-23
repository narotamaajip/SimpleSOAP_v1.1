import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronUp, ChevronDown, Check, RefreshCw, X, ShieldAlert, Activity } from 'lucide-react';
import { setMockEntitlement, getEntitlement } from '../lib/billing.js';
import { subscribeToAnalyticsEvents, recentAnalyticsEvents } from '../lib/analytics.js';
import { cn } from '../utils/cn.js';

/**
 * DevPanel
 * Panel Developer khusus localhost/lingkungan pengembangan.
 * Memungkinkan penguji untuk berpindah state paket dan melihat log event analytics secara langsung.
 *
 * @param {Object} props
 * @param {(mockCount: number | null) => void} props.onSetMockPatientCount
 * @param {number | null} props.mockPatientCount
 */
export function DevPanel({ onSetMockPatientCount, mockPatientCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('states'); // 'states' | 'analytics'
  const [events, setEvents] = useState([...recentAnalyticsEvents]);
  const [currentEntitlement, setCurrentEntitlement] = useState(getEntitlement());

  // Hanya tampil di localhost atau mode development
  const isDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local') ||
      import.meta.env.DEV);

  useEffect(() => {
    if (!isDev) return;
    const unsub = subscribeToAnalyticsEvents((newEvents) => {
      setEvents(newEvents);
    });
    return () => unsub();
  }, [isDev]);

  if (!isDev) return null;

  const handleStateChange = (type) => {
    const now = new Date();

    switch (type) {
      case 'free_3': {
        onSetMockPatientCount(3);
        setMockEntitlement({
          plan: 'free',
          proUntil: null,
          checkoutState: 'idle',
          selectedPlanId: null
        });
        break;
      }
      case 'free_8': {
        onSetMockPatientCount(8);
        setMockEntitlement({
          plan: 'free',
          proUntil: null,
          checkoutState: 'idle',
          selectedPlanId: null
        });
        break;
      }
      case 'free_10': {
        onSetMockPatientCount(10);
        setMockEntitlement({
          plan: 'free',
          proUntil: null,
          checkoutState: 'idle',
          selectedPlanId: null
        });
        break;
      }
      case 'pro_active': {
        onSetMockPatientCount(null); // Gunakan jumlah pasien nyata
        const future = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
        setMockEntitlement({
          plan: 'pro',
          proUntil: future.toISOString(),
          checkoutState: 'idle',
          selectedPlanId: 'semi_annual'
        });
        break;
      }
      case 'pro_h7': {
        onSetMockPatientCount(null);
        const nearExpiry = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
        setMockEntitlement({
          plan: 'pro',
          proUntil: nearExpiry.toISOString(),
          checkoutState: 'idle',
          selectedPlanId: 'monthly'
        });
        break;
      }
      case 'pro_expired': {
        onSetMockPatientCount(null);
        const expiredDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        setMockEntitlement({
          plan: 'pro',
          proUntil: expiredDate.toISOString(),
          checkoutState: 'idle',
          selectedPlanId: 'monthly'
        });
        break;
      }
      case 'checkout_pending': {
        setMockEntitlement({
          checkoutState: 'pending',
          selectedPlanId: 'semi_annual'
        });
        break;
      }
      case 'checkout_success': {
        const future = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
        setMockEntitlement({
          plan: 'pro',
          proUntil: future.toISOString(),
          checkoutState: 'success',
          selectedPlanId: 'semi_annual'
        });
        break;
      }
      case 'checkout_failed': {
        setMockEntitlement({
          checkoutState: 'failed',
          selectedPlanId: 'semi_annual'
        });
        break;
      }
      case 'reset_real': {
        onSetMockPatientCount(null);
        setMockEntitlement({
          plan: 'free',
          proUntil: null,
          checkoutState: 'idle',
          selectedPlanId: null
        });
        break;
      }
      default:
        break;
    }

    setCurrentEntitlement(getEntitlement());
  };

  return (
    <aside
      aria-label="Developer testing panel"
      className="fixed bottom-20 left-4 z-[70] font-sans text-xs"
    >
      {/* Floating Trigger Pill */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 text-white rounded-full shadow-2xl border border-white/20 backdrop-blur-md hover:bg-slate-900 active:scale-95 transition-all"
        >
          <Terminal size={13} className="text-cyan-400" />
          <span className="font-mono text-[10px] font-bold">DEV PANEL</span>
          {events.length > 0 && (
            <span className="w-4 h-4 bg-teal-500 text-slate-950 font-extrabold text-[9px] rounded-full flex items-center justify-center">
              {events.length}
            </span>
          )}
        </button>
      )}

      {/* Expanded Modal / Floating Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-80 sm:w-96 bg-slate-900/95 text-slate-100 rounded-3xl p-4 shadow-2xl border border-slate-700/80 backdrop-blur-xl flex flex-col max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-cyan-400" />
                <h2 className="font-mono font-bold text-xs text-white">Dev Mode Controller</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl my-3 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('states')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg transition-colors text-center',
                  activeTab === 'states' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Simulasi State
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg transition-colors text-center flex items-center justify-center gap-1.5',
                  activeTab === 'analytics' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <span>Log Analytics</span>
                <span className="bg-cyan-500/20 text-cyan-300 text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                  {events.length}
                </span>
              </button>
            </div>

            {/* TAB: STATES */}
            {activeTab === 'states' && (
              <div className="space-y-3 overflow-y-auto no-scrollbar pr-1 pb-1">
                {/* Current Active Info */}
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 text-[10px] font-mono space-y-0.5">
                  <p className="text-slate-400">
                    Plan: <span className="text-emerald-400 font-bold uppercase">{currentEntitlement.plan}</span>
                    {mockPatientCount !== null && (
                      <span className="text-amber-400 ml-2">Override Pasien: {mockPatientCount}</span>
                    )}
                  </p>
                  <p className="text-slate-400 truncate">
                    Until: {currentEntitlement.proUntil ? new Date(currentEntitlement.proUntil).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-slate-400">
                    Checkout: <span className="text-cyan-400">{currentEntitlement.checkoutState}</span>
                  </p>
                </div>

                {/* State Group 1: Gratis */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    1. Kuota Pasien Gratis
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStateChange('free_3')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-semibold border border-slate-700 active:scale-95"
                    >
                      Gratis 3/10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStateChange('free_8')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-[10px] font-semibold border border-amber-500/30 active:scale-95"
                    >
                      Gratis 8/10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStateChange('free_10')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl text-[10px] font-semibold border border-rose-500/30 active:scale-95"
                    >
                      Gratis 10/10
                    </button>
                  </div>
                </div>

                {/* State Group 2: Status Pro */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    2. Siklus Masa Aktif Pro
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStateChange('pro_active')}
                      className="p-2 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 rounded-xl text-[10px] font-semibold border border-emerald-500/40 active:scale-95"
                    >
                      Pro Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStateChange('pro_h7')}
                      className="p-2 bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 rounded-xl text-[10px] font-semibold border border-amber-500/40 active:scale-95"
                    >
                      Pro H-7
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStateChange('pro_expired')}
                      className="p-2 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-[10px] font-semibold border border-rose-500/40 active:scale-95"
                    >
                      Pro Berakhir
                    </button>
                  </div>
                </div>

                {/* State Group 3: Mock Checkout */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    3. Layar Mock Pembayaran
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStateChange('checkout_pending')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-[10px] font-semibold border border-slate-700 active:scale-95"
                    >
                      Menunggu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStateChange('checkout_success')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-[10px] font-semibold border border-slate-700 active:scale-95"
                    >
                      Berhasil
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStateChange('checkout_failed')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl text-[10px] font-semibold border border-slate-700 active:scale-95"
                    >
                      Gagal
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleStateChange('reset_real')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold border border-slate-700 active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={11} />
                    <span>Reset ke Data Nyata</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: ANALYTICS LOG */}
            {activeTab === 'analytics' && (
              <div className="flex-1 flex flex-col overflow-hidden space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Stream Event GA4 Terakhir</span>
                  <span>Maks 20 event</span>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1 max-h-60">
                  {events.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 font-mono text-[11px]">
                      Belum ada event tercatat. Coba buka paywall atau simpan SOAP.
                    </div>
                  ) : (
                    events.map((evt) => (
                      <div
                        key={evt.id}
                        className="bg-slate-800/80 p-2 rounded-xl border border-slate-700 font-mono text-[10px] space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-cyan-400 font-bold">{evt.eventName}</span>
                          <span className="text-slate-500 text-[9px]">{evt.timestamp}</span>
                        </div>
                        <div className="bg-slate-950/70 p-1.5 rounded-lg text-slate-300 overflow-x-auto">
                          {Object.keys(evt.params).length > 0 ? (
                            <pre className="text-[9px] leading-tight font-mono">
                              {JSON.stringify(evt.params, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-slate-500 italic">tanpa parameter</span>
                          )}
                        </div>
                        {evt.rawRejected && evt.rawRejected.length > 0 && (
                          <p className="text-[9px] text-rose-400 font-sans">
                            Ditolak oleh Privacy Guard: {evt.rawRejected.join(', ')}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
