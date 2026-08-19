import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, KeyRound, Trash2 } from 'lucide-react';

export function TourClosingModal({ onFinish }) {
  return (
    <div className="fixed inset-0 z-[100000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-emerald-100 text-center space-y-5"
      >
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 size={36} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-extrabold rounded-full uppercase tracking-wider">
            <Sparkles size={12} /> Panduan Selesai
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">
            Kamu Siap Menggunakan SimpleSOAP!
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Aplikasi ini dirancang cepat, ringan, dan siap dipakai langsung saat visitasi bangsal.
          </p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-left space-y-2.5 text-xs text-slate-600">
          <div className="flex items-start gap-2.5">
            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-md mt-0.5">
              <Trash2 size={12} />
            </div>
            <p className="text-[11px] font-medium leading-tight">
              <strong className="text-slate-800">Hapus Pasien Contoh:</strong> Bisa dihapus kapan saja via menu Pengaturan atau detail pasien.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-md mt-0.5">
              <KeyRound size={12} />
            </div>
            <p className="text-[11px] font-medium leading-tight">
              <strong className="text-slate-800">Berbagi Akses:</strong> Bagikan kode unik di halaman detail ke dokter rekanan untuk kolaborasi follow-up.
            </p>
          </div>
        </div>

        <button
          onClick={onFinish}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all"
        >
          Mulai Pakai App
        </button>
      </motion.div>
    </div>
  );
}

export default TourClosingModal;
