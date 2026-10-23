import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck } from 'lucide-react';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AmbientBackground } from '../components/ui/AmbientBackground';
import { useDialog } from '../context/DialogContext';

export default function OnboardingView({ user, onComplete }) {
  const { alert: showAlert } = useDialog();
  const [name, setName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert({
        title: 'Nama Wajib Diisi',
        message: 'Mohon lengkapi Nama Anda untuk identitas rekam medis.',
        variant: 'warning'
      });
      return;
    }
    if (!credentials.trim()) {
      showAlert({
        title: 'SIP / STR Diperlukan',
        message: 'Mohon cantumkan Nomor SIP atau STR Anda.',
        variant: 'warning'
      });
      return;
    }
    if (!hasAcceptedDisclaimer) {
      showAlert({
        title: 'Pernyataan Tanggung Jawab',
        message: 'Mohon setujui Pernyataan Tanggung Jawab Medis untuk melanjutkan pendaftaran.',
        variant: 'warning'
      });
      return;
    }

    setIsSubmitting(true);
    const profile = {
      name: name.trim(),
      credentials: credentials.trim(),
      specialty: specialty.trim() || 'Umum',
      email: user.email,
      disclaimerAcceptedAt: serverTimestamp()
    };

    try {
      const docRef = doc(db, 'doctors', user.uid);
      await setDoc(docRef, profile);
      onComplete(profile);
    } catch (err) {
      console.error(err);
      showAlert({
        title: 'Gagal Menyimpan',
        message: 'Gagal menyimpan profil dokter. Pastikan koneksi internet stabil.',
        variant: 'danger'
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen liquid-canvas flex flex-col border-x border-white/60 relative overflow-hidden">
      <AmbientBackground />

      <div className="flex-1 flex flex-col justify-center p-6 z-10 overflow-y-auto no-scrollbar">
        <div className="mb-5">
          <span className="inline-block px-3 py-1 rounded-full glass-subpanel text-[10px] font-bold text-cyan-800 uppercase tracking-widest mb-2">
            Profil Klinis
          </span>
          <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">
            Selamat Datang di SimpleSOAP!
          </h1>
          <p className="text-slate-500 font-medium mt-1.5 text-xs leading-relaxed">
            Sebelum mulai mencatat visitasi pasien, mari lengkapi identitas profesi medis Anda.
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          onSubmit={handleSaveProfile}
          className="glass-card p-6 rounded-3xl space-y-4"
        >
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
              NAMA LENGKAP &amp; GELAR *
            </label>
            <input
              type="text"
              required
              placeholder="Cth: dr. Andi Susanto, Sp.PD"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3.5 rounded-2xl glass-input text-sm font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
              NOMOR SIP / STR *
            </label>
            <input
              type="text"
              required
              placeholder="Cth: SIP.123.456.789 / STR..."
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              className="w-full p-3.5 rounded-2xl glass-input text-sm font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
              SPESIALISASI / RUANGAN (OPSIONAL)
            </label>
            <input
              type="text"
              placeholder="Cth: Penyakit Dalam / Rawat Inap"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full p-3.5 rounded-2xl glass-input text-sm font-semibold text-slate-800"
            />
          </div>

          {/* Medical Disclaimer Checkbox */}
          <div className="pt-1 flex items-start gap-2.5 glass-subpanel p-3.5 rounded-2xl">
            <input
              type="checkbox"
              id="disclaimer"
              required
              checked={hasAcceptedDisclaimer}
              onChange={(e) => setHasAcceptedDisclaimer(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-cyan-700 rounded border-slate-300 focus:ring-cyan-600 shrink-0 cursor-pointer"
            />
            <label htmlFor="disclaimer" className="text-[11px] font-medium text-slate-700 leading-snug cursor-pointer select-none">
              Saya menyatakan bahwa saya adalah tenaga medis berwenang dan memahami bahwa SimpleSOAP adalah <strong>asisten dokumentasi personal</strong>, bukan pengganti rekam medis resmi fasyankes.
            </label>
          </div>

          {/* Anonymous Analytics Notice */}
          <p className="text-[10px] text-slate-500 font-medium px-1 leading-relaxed">
            Kami mengumpulkan statistik pemakaian anonim, tanpa data pasien, untuk memperbaiki app.
          </p>

          <button
            type="submit"
            disabled={isSubmitting || !hasAcceptedDisclaimer}
            className="w-full py-4 glass-btn-primary disabled:opacity-50 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <Activity className="animate-spin" size={20} />
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Selesaikan Pendaftaran</span>
              </>
            )}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
