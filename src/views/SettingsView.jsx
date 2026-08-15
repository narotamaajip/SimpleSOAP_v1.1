import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export function SettingsView({ doctorProfile, setDoctorProfile, patients, currentUserId, onDeletePatient }) {
  const [localProfile, setLocalProfile] = useState(doctorProfile);
  const [selectedPatientToDelete, setSelectedPatientToDelete] = useState('');

  // Sync if doctorProfile changes externally (e.g. after save)
  useEffect(() => {
    setLocalProfile(doctorProfile);
  }, [doctorProfile]);

  const isChanged =
    localProfile.name !== doctorProfile.name ||
    localProfile.credentials !== doctorProfile.credentials;

  const handleLogout = async () => {
    if (window.confirm('Yakin ingin keluar dari akun?')) {
      await signOut(auth);
    }
  };

  const handleSave = async () => {
    try {
      const docRef = doc(db, 'doctors', auth.currentUser.uid);
      await setDoc(docRef, localProfile, { merge: true });
      setDoctorProfile(localProfile);
      alert('Profil berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan profil.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPatientToDelete) return;
    const patientName = patients.find((p) => p.id === selectedPatientToDelete)?.name;
    if (
      window.confirm(
        `PERINGATAN: Yakin ingin menghapus seluruh data dan rekam medis pasien "${patientName}" secara permanen? Aksi ini tidak dapat dibatalkan.`
      )
    ) {
      const success = await onDeletePatient(selectedPatientToDelete);
      // Only clear selection if delete actually succeeded
      if (success) {
        setSelectedPatientToDelete('');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 space-y-6"
    >
      <h2 className="text-xl font-bold text-slate-800">Pengaturan</h2>

      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest border-b border-emerald-50 pb-2">
          Profil Dokter (Tester)
        </h3>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Lengkap</label>
          <input
            type="text"
            value={localProfile.name}
            onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
            className="w-full mt-1 p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Kredensial / SIP</label>
          <input
            type="text"
            placeholder="Contoh: Sp.PD / SIP: 12345"
            value={localProfile.credentials}
            onChange={(e) => setLocalProfile({ ...localProfile, credentials: e.target.value })}
            className="w-full mt-1 p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>

        {isChanged && (
          <button
            onClick={handleSave}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-md mt-2"
          >
            Simpan Perubahan
          </button>
        )}
      </div>

      <div className="bg-rose-50 p-5 rounded-xl border border-rose-100 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest border-b border-rose-200/50 pb-2 flex items-center gap-2">
          <Trash2 size={16} /> Hapus Data Pasien
        </h3>

        <div>
          <label className="text-[10px] font-bold text-rose-600 uppercase">Pilih Pasien</label>
          <div className="flex flex-col gap-2.5 mt-1">
            <select
              value={selectedPatientToDelete}
              onChange={(e) => setSelectedPatientToDelete(e.target.value)}
              className="w-full p-3 rounded-lg border border-rose-200 bg-white text-sm font-bold text-slate-800 outline-none focus:border-rose-500 truncate"
            >
              <option value="">-- Pilih Pasien --</option>
              {patients
                .filter((p) => !p.ownerId || p.ownerId === currentUserId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.rm ? `(RM: ${p.rm})` : ''}
                  </option>
                ))}
            </select>
            <button
              onClick={handleDeleteConfirm}
              disabled={!selectedPatientToDelete}
              className="w-full py-3 bg-rose-600 text-white rounded-lg font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-center active:scale-[0.99] transition-transform"
            >
              Hapus Data Pasien
            </button>
          </div>
          <p className="text-[9px] text-rose-500 font-bold mt-2 leading-relaxed">
            Hanya pasien yang Anda daftarkan yang dapat dihapus. Pasien yang dibagikan ke Anda tidak akan muncul di sini.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleLogout}
          className="w-full p-4 bg-rose-50 rounded-lg border border-rose-100 text-left font-bold text-rose-600 shadow-sm"
        >
          Keluar Akun
        </button>
      </div>
    </motion.div>
  );
}
