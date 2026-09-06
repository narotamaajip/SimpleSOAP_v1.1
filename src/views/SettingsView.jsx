import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Sparkles, ChevronRight, RotateCcw, AlertOctagon, UserX } from 'lucide-react';
import { signOut, deleteUser } from 'firebase/auth';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getFriendlyErrorMessage } from '../utils/friendlyError';

export function SettingsView({
  doctorProfile,
  setDoctorProfile,
  patients,
  currentUserId,
  onDeletePatient,
  onRestorePatient,
  onPermanentDeletePatient,
  onStartTour
}) {
  const [localProfile, setLocalProfile] = useState(doctorProfile);
  const [selectedPatientToDelete, setSelectedPatientToDelete] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    setLocalProfile(doctorProfile);
  }, [doctorProfile]);

  const isChanged =
    localProfile.name !== doctorProfile.name ||
    localProfile.credentials !== doctorProfile.credentials;

  const activePatients = patients.filter(
    (p) => !p.isDeleted && (!p.ownerId || p.ownerId === currentUserId)
  );

  const trashedPatients = patients.filter(
    (p) => p.isDeleted && (!p.ownerId || p.ownerId === currentUserId)
  );

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

  const handleSoftDelete = async () => {
    if (!selectedPatientToDelete) return;
    const patient = patients.find((p) => p.id === selectedPatientToDelete);
    if (!patient) return;

    if (
      window.confirm(
        `Pindahkan data pasien "${patient.name}" ke Tempat Sampah? Pasien akan disembunyikan dari daftar aktif dan dapat dipulihkan kapan saja.`
      )
    ) {
      const success = await onDeletePatient(selectedPatientToDelete);
      if (success) {
        setSelectedPatientToDelete('');
      }
    }
  };

  const handleRestore = async (patientId, patientName) => {
    if (window.confirm(`Pulihkan pasien "${patientName}" kembali ke daftar aktif?`)) {
      if (onRestorePatient) {
        await onRestorePatient(patientId);
      }
    }
  };

  const handlePermanentDelete = async (patientId, patientName) => {
    const confirmation = window.prompt(
      `PERINGATAN KRITIS: Seluruh rekam medis pasien "${patientName}" akan dimusnahkan permanen dari cloud server dan TIDAK DAPAT dipulihkan.\n\nKetik "HAPUS" untuk melanjutkan:`
    );
    if (confirmation === 'HAPUS') {
      if (onPermanentDeletePatient) {
        await onPermanentDeletePatient(patientId);
      }
    }
  };

  const handleDeleteAccount = async () => {
    const confirmInput = window.prompt(
      'PERINGATAN AKUN: Seluruh profil dokter dan akun login Anda akan dihapus permanen sesuai Kebijakan Google Play.\n\nKetik "HAPUS AKUN" untuk mengonfirmasi:'
    );

    if (confirmInput === 'HAPUS AKUN') {
      setIsDeletingAccount(true);
      try {
        const user = auth.currentUser;
        if (user) {
          // Delete doctor profile doc
          await deleteDoc(doc(db, 'doctors', user.uid));
          // Delete Firebase auth user
          await deleteUser(user);
          alert('Akun Anda berhasil dihapus.');
        }
      } catch (err) {
        console.error('Error deleting user account:', err);
        if (err.code === 'auth/requires-recent-login') {
          alert('Demi keamanan, silakan keluar akun dan masuk kembali sebelum melakukan penghapusan akun.');
        } else {
          alert(getFriendlyErrorMessage(err, 'Gagal menghapus akun. Silakan coba lagi nanti.'));
        }
      } finally {
        setIsDeletingAccount(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 space-y-6 pb-24 overflow-y-auto no-scrollbar"
    >
      <h2 className="text-xl font-bold text-slate-800">Pengaturan</h2>

      {/* Profile Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest border-b border-emerald-50 pb-2">
          Profil Dokter
        </h3>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Lengkap &amp; Gelar</label>
          <input
            type="text"
            value={localProfile.name}
            onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
            className="w-full mt-1 p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Kredensial / SIP / STR</label>
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
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-md mt-2 active:scale-[0.99] transition-transform"
          >
            Simpan Perubahan
          </button>
        )}
      </div>

      {/* Patient Soft Delete Section */}
      <div className="bg-amber-50/70 p-5 rounded-xl border border-amber-100 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest border-b border-amber-200/50 pb-2 flex items-center gap-2">
          <Trash2 size={16} /> Kelola Pasien (Pindah ke Sampah)
        </h3>

        <div>
          <label className="text-[10px] font-bold text-amber-700 uppercase">Pilih Pasien Aktif</label>
          <div className="flex flex-col gap-2.5 mt-1">
            <select
              value={selectedPatientToDelete}
              onChange={(e) => setSelectedPatientToDelete(e.target.value)}
              className="w-full p-3 rounded-lg border border-amber-200 bg-white text-sm font-bold text-slate-800 outline-none focus:border-amber-500 truncate"
            >
              <option value="">-- Pilih Pasien --</option>
              {activePatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.rm ? `(RM: ${p.rm})` : ''} - {p.ward}
                </option>
              ))}
            </select>
            <button
              onClick={handleSoftDelete}
              disabled={!selectedPatientToDelete}
              className="w-full py-3 bg-amber-600 text-white rounded-lg font-bold text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
            >
              Pindahkan ke Tempat Sampah
            </button>
          </div>
          <p className="text-[10px] text-amber-700/80 font-medium mt-2 leading-relaxed">
            Pasien akan disembunyikan dari daftar utama namun rekam medis tetap tersimpan aman di folder Tempat Sampah untuk mencegah risiko salah hapus.
          </p>
        </div>
      </div>

      {/* Trashed Patients (Recovery & Permanent Delete) */}
      {trashedPatients.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RotateCcw size={16} className="text-slate-500" />
              Tempat Sampah Pasien ({trashedPatients.length})
            </span>
          </h3>

          <div className="space-y-2.5 max-h-60 overflow-y-auto no-scrollbar">
            {trashedPatients.map((p) => (
              <div
                key={p.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] font-mono text-slate-400">
                    RM: {p.rm || '-'} • {p.ward}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(p.id, p.name)}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                  >
                    Pulihkan
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(p.id, p.name)}
                    className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-bold hover:bg-rose-100 transition-colors"
                  >
                    Musnahkan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation & Guide Section */}
      <div className="space-y-3">
        {onStartTour && (
          <button
            onClick={onStartTour}
            className="w-full p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-100 text-left font-bold text-emerald-800 shadow-sm flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Sparkles size={18} className="text-emerald-600" />
              Lihat Panduan Singkat (Tur App)
            </span>
            <ChevronRight size={18} className="text-emerald-500" />
          </button>
        )}

        <button
          onClick={handleLogout}
          className="w-full p-4 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 text-left font-bold text-slate-700 shadow-sm transition-colors"
        >
          Keluar Akun
        </button>
      </div>

      {/* Danger Zone: Account Deletion (Google Play Compliance) */}
      <div className="bg-rose-50 p-5 rounded-xl border border-rose-100 space-y-3">
        <h3 className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
          <AlertOctagon size={14} className="text-rose-600" /> Zona Bahaya: Hapus Akun Pengguna
        </h3>
        <p className="text-[11px] text-rose-600 font-medium leading-relaxed">
          Sesuai ketentuan Google Play Store, Anda berhak menghapus akun dan data profil dokter Anda secara mandiri dari cloud server SimpleSOAP.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeletingAccount}
          className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <UserX size={15} />
          {isDeletingAccount ? 'Memproses Penghapusan...' : 'Hapus Akun Dokter Saya'}
        </button>
      </div>
    </motion.div>
  );
}
