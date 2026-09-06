import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, User, AlertTriangle, Activity, Pencil, Send, X, ListRestart, Trash2 } from 'lucide-react';
import { generateShareCode, subscribeToSoapNotes } from '../lib/patients';
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

  // Dual fallback: Use subcollection notes if available, otherwise legacy patient.history
  const displayHistory = subcollectionNotes.length > 0 ? subcollectionNotes : (patient.history || []);

  const handleShare = async () => {
    if (shareCode) {
      setShowCode(true);
      return;
    }
    setIsGenerating(true);
    try {
      const newCode = await generateShareCode(patient.id, patient.name, auth.currentUser?.uid);
      setShareCode(newCode);
      setShowCode(true);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat kode unik.');
    } finally {
      setIsGenerating(false);
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col h-full bg-[#f9fcf9] overflow-hidden"
    >
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
        <button onClick={onBack} className="text-emerald-700 p-1 rounded-full hover:bg-slate-50">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-emerald-800 font-black text-sm tracking-tight uppercase">Detail Pasien</h2>
        {isOwner && onDeletePatient ? (
          <button onClick={handleDelete} title="Pindahkan ke Sampah" className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors">
            <Trash2 size={18} />
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Patient Profile Card */}
        <div className={cn(
          'bg-white m-4 p-5 rounded-xl border-l-[6px] shadow-sm space-y-4 border border-slate-100',
          isDischarged ? 'border-l-slate-400' : isPending ? 'border-l-rose-500' : 'border-l-emerald-500'
        )}>
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-3">
              <h2 className="text-2xl font-black text-slate-800 leading-tight">{patient.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[11px] font-mono font-bold text-slate-400">Usia: {patient.age} thn</p>
                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                <p className="text-[11px] font-mono font-bold text-slate-400">{patient.ward}</p>
                {patient.rm && (
                  <>
                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                    <p className="text-[11px] font-mono font-bold text-slate-400">RM: {patient.rm}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={cn(
                'text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider',
                isDischarged ? 'bg-slate-400' : isPending ? 'bg-rose-600' : 'bg-emerald-600'
              )}>
                {patient.status}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (shareCode) {
                      setShowCode(!showCode);
                    } else {
                      handleShare();
                    }
                  }}
                  disabled={isGenerating}
                  title="Bagikan Kode Akses"
                  className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  {isGenerating ? <Activity size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
                <button
                  onClick={onEditPatient}
                  title="Edit Identitas Pasien"
                  className="p-1.5 text-slate-400 bg-slate-50 rounded-lg hover:text-emerald-600 transition-colors"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-50">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DPJP</p>
              <p className="text-sm font-bold text-slate-700">{patient.dpjp}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DIAGNOSIS UTAMA</p>
              <p className="text-sm font-bold text-slate-700">{patient.dx}</p>
            </div>
          </div>

          {/* Allergy Alert */}
          {patient.alergi && patient.alergi !== 'Tidak ada' && (
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-start gap-3">
              <div className="mt-1 bg-rose-500 text-white p-1 rounded-full">
                <AlertTriangle size={14} />
              </div>
              <div>
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">ALERGI OBAT</p>
                <p className="text-sm font-black text-rose-700">{patient.alergi}</p>
              </div>
            </div>
          )}
        </div>

        {/* Share Code Section */}
        <AnimatePresence>
          {showCode && shareCode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 mb-4 overflow-hidden"
            >
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">
                  KODE AKSES PASIEN
                </p>
                <div className="text-2xl font-mono font-black text-emerald-800 tracking-[0.2em] bg-white px-4 py-2 rounded-lg shadow-inner mb-2 border border-emerald-200 relative w-full flex justify-center items-center">
                  {shareCode}
                  <button
                    onClick={() => setShowCode(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs font-medium text-emerald-700 leading-relaxed">
                  Berikan kode ini kepada dokter rekanan untuk berbagi akses rekam medis pasien ini.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <div className="px-4 mb-6">
          <button
            id="tour-add-soap-btn"
            onClick={onAddSoap}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <ListRestart size={20} />
            Tambah Follow-Up Hari Ini
          </button>
        </div>

        {/* SOAP History */}
        <div className="px-4 space-y-4 pb-20">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Riwayat Follow-Up (SOAP)</h3>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {displayHistory.length} Catatan
            </span>
          </div>

          <div className="space-y-4">
            {displayHistory.length > 0 ? (
              displayHistory.map((h) => (
                <div key={h.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                    <div>
                      <p className="text-xs font-black text-slate-800">{h.date}</p>
                      {h.doctor && (
                        <p className="text-[10px] font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                          <User size={9} />
                          {h.doctor}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      {h.isEdited && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                          Diedit {h.editedAt ? `(${h.editedAt})` : ''}
                        </span>
                      )}
                      <p className="text-[10px] font-bold text-slate-400 font-mono">{h.time}</p>
                      <button
                        onClick={() => onEditSoap(h.id)}
                        className="p-1 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors active:scale-95"
                        title="Koreksi SOAP"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <SoapItem label="SUBJECTIVE (S)" content={h.s} />
                    <SoapItem label="OBJECTIVE (O)" content={h.o} />
                    <SoapItem label="ASSESSMENT (A)" content={h.a} />
                    <SoapItem label="PLAN (P)" content={h.p} list />
                    <SoapItem label="INSTRUCTION (I)" content={h.i} list />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center opacity-30 font-black uppercase text-xs tracking-widest">
                Belum ada catatan follow-up
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
