import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, User, AlertTriangle, Activity, Pencil, Send, X, ListRestart, Trash2, Copy, Check, RefreshCw, LogOut } from 'lucide-react';
import { generateShareCode, ensureShareCodeRegistered, removeFromAccessList, subscribeToSoapNotes, mergeSoapHistory } from '../lib/patients';
import { auth } from '../lib/firebase';
import { SoapItem } from '../components/SoapItem';
import { cn } from '../utils/cn';

export function PatientDetailView({ patient, onBack, onAddSoap, onEditSoap, onEditPatient, onDeletePatient }) {
  const isPending = !patient.isFollowedUp && patient.status !== 'PULANG';
  const isDischarged = patient.status === 'PULANG';
  const isOwner = !patient.ownerId || patient.ownerId === auth.currentUser?.uid;

  const [shareCode, setShareCode] = useState(patient.shareCode || null);
  const [showCode, setShowCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [subcollectionNotes, setSubcollectionNotes] = useState([]);

  // Subscribe to real-time subcollection notes
  useEffect(() => {
    if (!patient?.id) return;
    const unsub = subscribeToSoapNotes(
      patient.id,
      (notes) => setSubcollectionNotes(notes),
      (err) => console.warn('Subcollection notes listener notice:', err)
    );
    return () => unsub && unsub();
  }, [patient?.id]);

  // Merge legacy patient.history and subcollectionNotes so older notes never disappear
  const displayHistory = useMemo(
    () => mergeSoapHistory(patient.history, subcollectionNotes),
    [patient.history, subcollectionNotes]
  );

  const handleCopyCode = async () => {
    if (!shareCode) return;
    try {
      await navigator.clipboard.writeText(shareCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      if (shareCode) {
        // Ensure existing shareCode is registered in shareCodes collection so colleagues can redeem
        await ensureShareCodeRegistered(patient.id, patient.name, auth.currentUser?.uid, shareCode);
        setShowCode(!showCode);
      } else {
        const newCode = await generateShareCode(patient.id, patient.name, auth.currentUser?.uid);
        setShareCode(newCode);
        setShowCode(true);
      }
    } catch (err) {
      console.error('Error sharing patient code:', err);
      alert('Gagal memproses kode unik pasien. Silakan coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm('Buat kode akses baru untuk pasien ini? Kode lama tidak akan dapat digunakan lagi oleh rekan baru.')) {
      return;
    }
    setIsGenerating(true);
    try {
      const newCode = await generateShareCode(patient.id, patient.name, auth.currentUser?.uid, shareCode);
      setShareCode(newCode);
      setShowCode(true);
      setIsCopied(false);
    } catch (err) {
      console.error('Error regenerating share code:', err);
      alert('Gagal membuat kode baru.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLeavePatient = async () => {
    if (!window.confirm(`Lepas akses rekam medis pasien "${patient.name}" dari daftar Anda? Pasien tidak akan muncul lagi di akun Anda.`)) {
      return;
    }
    setIsLeaving(true);
    try {
      await removeFromAccessList(patient.id, auth.currentUser?.uid);
      onBack();
    } catch (err) {
      console.error('Error leaving patient:', err);
      alert('Gagal melepas akses pasien.');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Pindahkan data pasien "${patient.name}" ke Tempat Sampah? Anda dapat memulihkannya nanti via menu Pengaturan.`)) {
      if (onDeletePatient) {
        const ok = await onDeletePatient(patient.id);
        if (ok) onBack();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      className="flex-1 flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="glass-bar px-4 py-3 flex items-center justify-between border-b sticky top-0 z-20">
        <button
          onClick={onBack}
          className="text-slate-700 p-1.5 rounded-xl glass-btn-secondary"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-slate-800 font-extrabold text-sm tracking-tight uppercase">
          Detail Pasien
        </h2>
        {isOwner && onDeletePatient ? (
          <button
            onClick={handleDelete}
            title="Pindahkan ke Sampah"
            className="text-slate-500 hover:text-rose-600 p-1.5 rounded-xl glass-btn-secondary transition-colors"
          >
            <Trash2 size={17} />
          </button>
        ) : !isOwner ? (
          <button
            onClick={handleLeavePatient}
            disabled={isLeaving}
            title="Lepas Akses Pasien"
            className="text-slate-500 hover:text-amber-600 p-1.5 rounded-xl glass-btn-secondary transition-colors"
          >
            {isLeaving ? <Activity size={17} className="animate-spin" /> : <LogOut size={17} />}
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Patient Profile Card */}
        <div className="glass-card m-4 p-5 pl-6 rounded-[22px] space-y-4 relative overflow-hidden">
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 w-[6px]',
              isDischarged
                ? 'bg-slate-400'
                : isPending
                ? 'bg-[#EF4444]'
                : 'bg-[#10B981]'
            )}
          />

          <div className="flex justify-between items-start pl-1">
            <div className="flex-1 pr-3">
              <h2 className="text-2xl font-extrabold text-slate-800 leading-tight">{patient.name}</h2>
              <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                <p className="text-[11px] font-semibold text-slate-500">Usia: {patient.age} thn</p>
                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                <p className="text-[11px] font-semibold text-slate-500">{patient.ward}</p>
                {patient.rm && (
                  <>
                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                    <p className="text-[11px] font-mono font-semibold text-slate-500">RM: {patient.rm}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2.5">
              <span
                className={cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm',
                  isDischarged
                    ? 'bg-slate-400'
                    : isPending
                    ? 'bg-[#EF4444] shadow-red-500/20'
                    : 'bg-[#10B981] shadow-emerald-500/20'
                )}
              >
                {patient.status}
              </span>
              {isOwner ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    disabled={isGenerating}
                    title="Bagikan Kode Akses"
                    className="p-2 text-cyan-800 glass-btn-secondary rounded-xl"
                  >
                    {isGenerating ? <Activity size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                  <button
                    onClick={onEditPatient}
                    title="Edit Identitas Pasien"
                    className="p-2 text-slate-600 hover:text-cyan-800 glass-btn-secondary rounded-xl"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              ) : (
                <span className="text-[9px] font-bold text-slate-500 glass-subpanel px-2.5 py-0.5 rounded-full">
                  Kolaborator
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-white/75 pl-2">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DPJP</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">{patient.dpjp}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DIAGNOSIS UTAMA</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">{patient.dx}</p>
            </div>
          </div>

          {/* Allergy Alert */}
          {patient.alergi && patient.alergi !== 'Tidak ada' && (
            <div className="bg-rose-500/10 backdrop-blur-md border border-rose-200/80 p-3.5 rounded-2xl flex items-start gap-3 ml-2">
              <div className="mt-0.5 bg-rose-500 text-white p-1.5 rounded-xl shadow-sm">
                <AlertTriangle size={14} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest">ALERGI OBAT</p>
                <p className="text-sm font-extrabold text-rose-800">{patient.alergi}</p>
              </div>
            </div>
          )}
        </div>

        {/* Share Code Section (Scale-Spring Popover Sheet) */}
        <AnimatePresence>
          {showCode && shareCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
              style={{ transformOrigin: 'top center' }}
              className="px-4 mb-4"
            >
              <div className="glass-dropdown rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-bold text-cyan-900 uppercase tracking-widest mb-1.5">
                  KODE AKSES PASIEN
                </p>
                <div className="text-2xl font-mono font-extrabold text-slate-800 tracking-[0.2em] glass-subpanel px-4 py-2.5 rounded-2xl mb-2 relative w-full flex justify-center items-center">
                  {shareCode}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={handleCopyCode}
                      title="Salin Kode"
                      className="text-cyan-800 hover:bg-white/70 transition-colors p-1.5 rounded-xl flex items-center gap-1 active:scale-90"
                    >
                      {isCopied ? <Check size={15} className="text-teal-600" /> : <Copy size={15} />}
                    </button>
                    <button
                      onClick={() => setShowCode(false)}
                      title="Tutup"
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-xl active:scale-90"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
                {isCopied && (
                  <p className="text-[10px] font-bold text-teal-700 mb-1">Kode berhasil disalin!</p>
                )}
                <p className="text-xs font-medium text-slate-600 leading-relaxed mb-3">
                  Berikan kode ini kepada dokter rekanan untuk berbagi akses rekam medis pasien ini.
                </p>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  disabled={isGenerating}
                  className="text-[11px] font-bold text-cyan-800 hover:text-cyan-950 flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-btn-secondary active:scale-95 transition-transform"
                >
                  <RefreshCw size={12} className={cn(isGenerating && 'animate-spin')} />
                  Ganti Kode Akses Baru
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <div className="px-4 mb-6">
          <button
            id="tour-add-soap-btn"
            onClick={() => onAddSoap(displayHistory)}
            className="w-full glass-btn-primary py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5"
          >
            <ListRestart size={19} />
            Tambah Follow-Up Hari Ini
          </button>
        </div>

        {/* SOAP History */}
        <div className="px-4 space-y-4 pb-24">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
              Riwayat Follow-Up (SOAP)
            </h3>
            <span className="text-[10px] font-bold text-slate-500 glass-subpanel px-2.5 py-1 rounded-full font-mono">
              {displayHistory.length} Catatan
            </span>
          </div>

          <div className="space-y-4">
            {displayHistory.length > 0 ? (
              displayHistory.map((h) => (
                <div key={h.id} className="glass-card rounded-[20px] overflow-hidden">
                  <div className="bg-white/45 px-4 py-3 flex justify-between items-center border-b border-white/75">
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">{h.date}</p>
                      {h.doctor && (
                        <p className="text-[10px] font-semibold text-cyan-800 mt-0.5 flex items-center gap-1">
                          <User size={10} />
                          {h.doctor}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      {h.isEdited && (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-500/12 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                          Diedit {h.editedAt ? `(${h.editedAt})` : ''}
                        </span>
                      )}
                      <p className="text-[10px] font-semibold text-slate-400 font-mono">{h.time}</p>
                      <button
                        onClick={() => onEditSoap(h.id, displayHistory)}
                        className="p-1.5 text-cyan-800 glass-btn-secondary rounded-xl"
                        title="Koreksi SOAP"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3.5">
                    <SoapItem label="SUBJECTIVE (S)" content={h.s} />
                    <SoapItem label="OBJECTIVE (O)" content={h.o} />
                    <SoapItem label="ASSESSMENT (A)" content={h.a} />
                    <SoapItem label="PLAN (P)" content={h.p} list />
                    <SoapItem label="INSTRUCTION (I)" content={h.i} list />
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-subpanel rounded-2xl py-16 text-center font-bold uppercase text-xs tracking-widest text-slate-400">
                Belum ada catatan follow-up
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
