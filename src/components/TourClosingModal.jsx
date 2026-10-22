import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, KeyRound, Trash2 } from 'lucide-react';

export function TourClosingModal({ onFinish }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100000] bg-slate-900/35 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="glass-dropdown rounded-3xl max-w-sm w-full p-6 text-center space-y-5"
      >
        <div className="w-16 h-16 glass-subpanel text-teal-700 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 size={34} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-700/10 text-cyan-900 border border-white/80 text-[11px] font-bold rounded-full uppercase tracking-wider">
            <Sparkles size={12} /> Panduan Selesai
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
            Kamu Siap Menggunakan SimpleSOAP!
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Aplikasi ini dirancang cepat, ringan, dan siap dipakai langsung saat visitasi bangsal.
          </p>
        </div>

        <div className="glass-subpanel p-3.5 rounded-2xl text-left space-y-2.5 text-xs text-slate-600">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-cyan-700/10 text-cyan-800 rounded-lg mt-0.5">
              <Trash2 size={12} />
            </div>
            <p className="text-[11px] font-medium leading-tight">
              <strong className="text-slate-800">Hapus Pasien Contoh:</strong> Bisa dihapus kapan saja via menu Pengaturan atau detail pasien.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-cyan-700/10 text-cyan-800 rounded-lg mt-0.5">
              <KeyRound size={12} />
            </div>
            <p className="text-[11px] font-medium leading-tight">
              <strong className="text-slate-800">Berbagi Akses:</strong> Bagikan kode unik di halaman detail ke dokter rekanan untuk kolaborasi follow-up.
            </p>
          </div>
        </div>

        <button
          onClick={onFinish}
          className="w-full py-3.5 glass-btn-primary font-bold text-sm rounded-2xl"
        >
          Mulai Pakai App
        </button>
      </motion.div>
    </motion.div>
  );
}

export default TourClosingModal;
