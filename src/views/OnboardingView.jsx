import { useState } from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function OnboardingView({ user, onComplete }) {
  const [name, setName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Mohon lengkapi Nama Anda.');
      return;
    }
    if (!credentials.trim()) {
      alert('Mohon cantumkan Nomor SIP atau STR Anda.');
      return;
    }
    if (!hasAcceptedDisclaimer) {
      alert('Mohon setujui Pernyataan Tanggung Jawab Medis untuk melanjutkan.');
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
      alert('Gagal menyimpan profil. Pastikan koneksi stabil.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-emerald-600 flex flex-col border-x border-slate-200 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
        <Activity size={400} className="absolute -top-20 -right-20 text-white" />
      </div>

      <div className="flex-1 flex flex-col justify-end p-6 z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white leading-tight">Selamat Datang di SimpleSOAP!</h1>
          <p className="text-emerald-100 font-medium mt-2 text-sm">
            Sebelum mulai mencatat visitasi pasien, mari lengkapi identitas profesi medis Anda.
          </p>
        </div>

        <form
          onSubmit={handleSaveProfile}
          className="bg-white p-6 rounded-2xl shadow-2xl space-y-4 mb-4 overflow-y-auto max-h-[70vh] no-scrollbar"
        >
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
              NAMA LENGKAP &amp; GELAR *
            </label>
            <input
              type="text" required placeholder="Cth: dr. Andi Susanto, Sp.PD"
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
              NOMOR SIP / STR *
            </label>
            <input
              type="text" required placeholder="Cth: SIP.123.456.789 / STR..."
              value={credentials} onChange={(e) => setCredentials(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
              SPESIALISASI / RUANGAN (OPSIONAL)
            </label>
            <input
              type="text" placeholder="Cth: Penyakit Dalam / Rawat Inap"
              value={specialty} onChange={(e) => setSpecialty(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>

          {/* Medical Disclaimer Checkbox */}
          <div className="pt-2 flex items-start gap-2.5 bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100">
            <input
              type="checkbox"
              id="disclaimer"
              required
              checked={hasAcceptedDisclaimer}
              onChange={(e) => setHasAcceptedDisclaimer(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 shrink-0 cursor-pointer"
            />
            <label htmlFor="disclaimer" className="text-[11px] font-medium text-slate-700 leading-snug cursor-pointer select-none">
              Saya menyatakan bahwa saya adalah tenaga medis berwenang dan memahami bahwa SimpleSOAP adalah <strong>asisten dokumentasi personal</strong>, bukan pengganti rekam medis resmi fasyankes.
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !hasAcceptedDisclaimer}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mt-4"
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
        </form>
      </div>
    </div>
  );
}
