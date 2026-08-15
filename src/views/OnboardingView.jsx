import { useState } from 'react';
import { Activity } from 'lucide-react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function OnboardingView({ user, onComplete }) {
  const [name, setName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Mohon lengkapi Nama Anda.');
      return;
    }

    setIsSubmitting(true);
    const profile = { name, credentials, specialty, email: user.email };

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
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white leading-tight">Selamat Datang di SimpleSOAP!</h1>
          <p className="text-emerald-100 font-medium mt-2 text-sm">
            Sebelum mulai mengelola pasien, mari lengkapi identitas medis Anda.
          </p>
        </div>

        <form
          onSubmit={handleSaveProfile}
          className="bg-white p-6 rounded-2xl shadow-2xl space-y-4 mb-4 overflow-y-auto max-h-[60vh] no-scrollbar"
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
              NOMOR SIP / NIK (OPSIONAL)
            </label>
            <input
              type="text" placeholder="Cth: SIP.123.456.789"
              value={credentials} onChange={(e) => setCredentials(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
              SPESIALISASI (OPSIONAL)
            </label>
            <input
              type="text" placeholder="Cth: Penyakit Dalam / IGD"
              value={specialty} onChange={(e) => setSpecialty(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>

          <button
            type="submit" disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform flex items-center justify-center mt-4"
          >
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : 'Ajukan Pendaftaran'}
          </button>
        </form>
      </div>
    </div>
  );
}
