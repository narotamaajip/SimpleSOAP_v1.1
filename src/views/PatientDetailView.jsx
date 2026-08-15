import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, User, AlertTriangle, Activity, Pencil, Send, X } from 'lucide-react';
import { ListRestart } from 'lucide-react';
import { generateShareCode } from '../lib/patients';
import { SoapItem } from '../components/SoapItem';
import { cn } from '../utils/cn';

export function PatientDetailView({ patient, onBack, onAddSoap, onEditSoap, onEditPatient }) {
  const isPending = !patient.isFollowedUp && patient.status !== 'PULANG';
  const isDischarged = patient.status === 'PULANG';

  const [shareCode, setShareCode] = useState(patient.shareCode || null);
  const [showCode, setShowCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShare = async () => {
    if (shareCode) {
      setShowCode(true);
      return;
    }
    setIsGenerating(true);
    try {
      const newCode = await generateShareCode(patient.id);
      setShareCode(newCode);
      setShowCode(true);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat kode unik.');
    } finally {
      setIsGenerating(false);
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
        <button onClick={onBack} className="text-emerald-700"><ChevronLeft size={24} /></button>
        <h2 className="text-emerald-800 font-black text-sm tracking-tight uppercase">Detail Pasien</h2>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Patient Profile Card */}
        <div className={cn(
          'bg-white m-4 p-5 rounded-lg border-l-4 shadow-sm space-y-4',
          isDischarged ? 'border-l-slate-400' : isPending ? 'border-l-rose-500' : 'border-l-emerald-500'
        )}>
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-3">
              <h2 className="text-2xl font-black text-slate-800 leading-tight">{patient.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[11px] font-mono font-bold text-slate-400">Usia: {patient.age} thn</p>
                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                <p className="text-[11px] font-mono font-bold text-slate-400">{patient.ward}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={cn(
                'text-white px-2 py-1 rounded text-[10px] font-black uppercase',
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
                  className="p-1.5 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors"
                >
                  {isGenerating ? <Activity size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
                <button
                  onClick={onEditPatient}
                  className="p-1.5 text-slate-400 bg-slate-50 rounded hover:text-emerald-600 transition-colors"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
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
          {patient.alergi !== 'Tidak ada' && (
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
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                  KODE AKSES PASIEN
                </p>
                <div className="text-2xl font-mono font-black text-emerald-800 tracking-[0.2em] bg-white px-4 py-2 rounded-lg shadow-inner mb-2 border border-emerald-200 relative w-full flex justify-center items-center group">
                  {shareCode}
                  <button
                    onClick={() => setShowCode(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs font-medium text-emerald-700">
                  Berikan kode ini kepada dokter lain untuk berbagi akses rekam medis pasien ini.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <div className="px-4 mb-6">
          <button
            onClick={onAddSoap}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-lg font-black text-sm shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <ListRestart size={20} />
            Tambah Follow-Up Hari Ini
          </button>
        </div>

        {/* SOAP History */}
        <div className="px-4 space-y-4 pb-20">
          <h3 className="text-sm font-black text-slate-800 tracking-tight">Riwayat Follow-Up (SOAP)</h3>

          <div className="space-y-4">
            {patient.history.length > 0 ? (
              patient.history.map((h) => (
                <div key={h.id} className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
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
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-bold text-slate-400">{h.time}</p>
                      <button
                        onClick={() => onEditSoap(h.id)}
                        className="p-1 text-emerald-600 bg-emerald-50 rounded shadow-sm hover:scale-105 active:scale-95 transition-transform"
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
              <div className="py-20 text-center opacity-20 font-black uppercase text-xs tracking-widest">
                Belum ada catatan
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
