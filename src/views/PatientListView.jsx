import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Activity, Key, X } from 'lucide-react';
import { auth } from '../lib/firebase';
import { findPatientByShareCode, addToAccessList } from '../lib/patients';
import { PatientCardDetailed } from '../components/PatientCardDetailed';
import { GlassSelect } from '../components/ui/GlassSelect';
import { PLANS_CONFIG } from '../config/plans.js';
import { track } from '../lib/analytics.js';
import { cn } from '../utils/cn';

export function PatientListView({
  patients,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  onSelectPatient,
  onAddPatientClick,
  isTourActive,
  entitlement = { plan: 'free' },
  activeCountOverride = null,
  onOpenPaywall
}) {
  const [roomFilter, setRoomFilter] = useState('');
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState({ type: '', message: '' });

  const actualActiveCount = useMemo(() => {
    return patients.filter((p) => !p.isDeleted && p.status !== 'PULANG').length;
  }, [patients]);
  const activeCount = activeCountOverride !== null ? activeCountOverride : actualActiveCount;
  const isFree = entitlement.plan === 'free';
  const isAtLimit = isFree && activeCount >= PLANS_CONFIG.free.maxActivePatients;

  const handleAddPatientTrigger = () => {
    if (isAtLimit) {
      if (onOpenPaywall) {
        onOpenPaywall('patient_limit');
      }
      return;
    }
    onAddPatientClick();
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    const cleanCode = redeemCode.trim().toUpperCase().replace(/\s/g, '');
    if (!cleanCode) return;

    if (cleanCode.length < 4) {
      setRedeemStatus({ type: 'error', message: 'Kode akses minimal 4-6 karakter.' });
      return;
    }

    setIsRedeeming(true);
    setRedeemStatus({ type: 'info', message: 'Mencari data pasien...' });

    try {
      const result = await findPatientByShareCode(cleanCode);
      if (!result.found) {
        setRedeemStatus({
          type: 'error',
          message: 'Kode tidak ditemukan. Pastikan kode 6 digit sudah tepat.'
        });
        return;
      }

      const patientName = result.data?.patientName || 'Pasien';

      // 1. Check if user is the owner
      if (result.data?.ownerId && result.data.ownerId === auth.currentUser?.uid) {
        setRedeemStatus({
          type: 'info',
          message: `Ini adalah pasien Anda sendiri (${patientName}).`
        });
        return;
      }

      // 2. Check if user already has access to this patient
      const alreadyHasAccess = (patients || []).some((p) => p.id === result.patientId);
      if (alreadyHasAccess) {
        setRedeemStatus({
          type: 'info',
          message: `Anda sudah memiliki akses ke ${patientName}.`
        });
        return;
      }

      // 3. Add current user UID to patient's accessList in Firestore
      await addToAccessList(result.patientId, auth.currentUser.uid);
      track('share_code_redeemed');
      setRedeemStatus({
        type: 'success',
        message: `Berhasil! Akses rekam medis ${patientName} telah ditambahkan.`
      });
      setRedeemCode('');
      setTimeout(() => {
        setShowRedeem(false);
        setRedeemStatus({ type: '', message: '' });
      }, 2200);
    } catch (err) {
      console.error('Error redeeming patient code:', err);
      const isPermission = err.code === 'permission-denied';
      setRedeemStatus({
        type: 'error',
        message: isPermission
          ? 'Akses ditolak. Kode sudah tidak berlaku atau kadaluarsa.'
          : 'Gagal menghubungkan pasien. Silakan periksa koneksi internet Anda.'
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const uniqueRooms = useMemo(() => {
    const rooms = patients.filter((p) => !p.isDeleted).map((p) => p.ward).filter(Boolean);
    return [...new Set(rooms)].sort();
  }, [patients]);

  const roomOptions = useMemo(() => {
    return [
      { value: '', label: 'Semua Kamar' },
      ...uniqueRooms.map((room) => ({ value: room, label: room }))
    ];
  }, [uniqueRooms]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (p.isDeleted) return false;

      const matchesSearch =
        p.name.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        p.ward?.toLowerCase().includes((searchQuery || '').toLowerCase());
      const matchesRoom = roomFilter ? p.ward === roomFilter : true;

      let matchesCategory = true;
      if (categoryFilter === 'AKTIF') {
        matchesCategory = p.status !== 'PULANG';
      } else if (categoryFilter === 'BELUM_FU') {
        matchesCategory = !p.isFollowedUp && p.status !== 'PULANG';
      } else if (categoryFilter === 'INAKTIF') {
        matchesCategory = p.status === 'PULANG';
      }

      return matchesSearch && matchesRoom && matchesCategory;
    });
  }, [patients, searchQuery, roomFilter, categoryFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      className="flex-1 flex flex-col overflow-hidden relative"
    >
      <div className="glass-bar px-4 py-4 border-b sticky top-0 z-20 space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-slate-800 font-extrabold text-base tracking-tight uppercase">
            Daftar Pasien
          </h1>
          <button
            onClick={() => setShowRedeem(!showRedeem)}
            className="text-xs font-bold text-cyan-800 glass-btn-secondary px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5"
          >
            <Key size={13} className="text-cyan-700" /> Akses Kode
          </button>
        </div>

        <AnimatePresence>
          {showRedeem && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
              style={{ transformOrigin: 'top right' }}
              className="overflow-hidden"
            >
              <form
                onSubmit={handleRedeem}
                className="glass-dropdown p-3.5 rounded-2xl flex flex-col gap-2"
              >
                <p className="text-[10px] font-bold text-cyan-900 uppercase tracking-widest">
                  Masukkan Kode Unik Pasien
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: X7A9KQ"
                    maxLength={6}
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className="flex-1 p-2.5 rounded-xl glass-input text-sm font-mono font-bold tracking-widest uppercase text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={isRedeeming}
                    className="glass-btn-primary px-4 rounded-xl font-bold text-xs disabled:opacity-50"
                  >
                    {isRedeeming ? <Activity size={16} className="animate-spin" /> : 'Cari'}
                  </button>
                </div>
                {redeemStatus.message && (
                  <p
                    className={cn(
                      'text-[11px] font-bold mt-1',
                      redeemStatus.type === 'error' ? 'text-rose-600' : 'text-teal-700'
                    )}
                  >
                    {redeemStatus.message}
                  </p>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Tabs (Segmented Glass Control) */}
        <div className="flex bg-slate-200/70 backdrop-blur-md p-1 rounded-2xl border border-white/80 shadow-inner">
          {[
            { id: 'AKTIF', label: 'Aktif', activeText: 'text-teal-700' },
            { id: 'BELUM_FU', label: 'Belum FU', activeText: 'text-[#EF4444]' },
            { id: 'INAKTIF', label: 'Pulang', activeText: 'text-slate-800' }
          ].map((tab) => {
            const isActive = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={cn(
                  'relative flex-1 py-1.5 text-xs rounded-xl transition-colors z-10 active:scale-[0.98]',
                  isActive
                    ? cn('font-extrabold', tab.activeText)
                    : 'font-semibold text-slate-500 hover:text-slate-700 bg-transparent'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="category-segment-glass"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-white/95 border border-white rounded-xl shadow-[0_2px_10px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,1)] -z-10"
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Cari Nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl glass-input text-xs font-semibold text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors active:scale-90"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <GlassSelect
            value={roomFilter}
            onChange={(val) => setRoomFilter(val)}
            options={roomOptions}
            placeholder="Semua Kamar"
            className="w-[38%]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-28 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="glass-subpanel rounded-2xl p-8 text-center mt-6">
            <p className="text-slate-500 text-xs font-semibold">Tidak ada pasien yang sesuai.</p>
          </div>
        ) : (
          filtered.map((p, idx) => (
            <PatientCardDetailed
              key={p.id}
              id={p.name === 'Pasien Contoh' || idx === 0 ? 'tour-sample-patient-card' : undefined}
              patient={p}
              onClick={() => onSelectPatient(p.id)}
            />
          ))
        )}
      </div>

      <button
        id="tour-add-patient-btn"
        type="button"
        onClick={handleAddPatientTrigger}
        onPointerDown={(e) => {
          if (isTourActive) {
            handleAddPatientTrigger();
          }
        }}
        className={cn(
          "absolute bottom-6 right-6 glass-btn-primary w-14 h-14 flex items-center justify-center rounded-full z-30 transition-transform active:scale-95 shadow-xl",
          isTourActive && "ring-4 ring-cyan-400/60 shadow-xl shadow-cyan-500/40"
        )}
      >
        <Plus size={26} />
        {isFree && activeCount >= 8 && (
          <span
            className={cn(
              "absolute -top-1.5 -left-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold shadow-sm border border-white/60",
              activeCount >= 10 ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
            )}
          >
            {activeCount}/10
          </span>
        )}
      </button>
    </motion.div>
  );
}
