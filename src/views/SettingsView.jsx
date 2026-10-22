import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Sparkles, ChevronRight, RotateCcw, AlertOctagon, UserX } from 'lucide-react';
import {
  signOut,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from 'firebase/auth';
import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import { GlassSelect } from '../components/ui/GlassSelect';

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

  const patientOptions = useMemo(() => {
    return [
      { value: '', label: '-- Pilih Pasien --' },
      ...activePatients.map((p) => ({
        value: p.id,
        label: `${p.name} ${p.rm ? `(RM: ${p.rm})` : ''} - ${p.ward}`
      }))
    ];
  }, [activePatients]);

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
          const lastSignInMs = user.metadata?.lastSignInTime
            ? new Date(user.metadata.lastSignInTime).getTime()
            : 0;
          const isStaleSession = Date.now() - lastSignInMs > 4 * 60 * 1000;

          if (isStaleSession) {
            const isGoogle = user.providerData?.some((p) => p.providerId === 'google.com');
            if (isGoogle) {
              await reauthenticateWithPopup(user, new GoogleAuthProvider());
            } else if (user.email) {
              const pwd = window.prompt(
                'Demi keamanan, masukkan kata sandi akun Anda untuk mengonfirmasi penghapusan akun:'
              );
              if (!pwd) {
                setIsDeletingAccount(false);
                return;
              }
              const credential = EmailAuthProvider.credential(user.email, pwd);
              await reauthenticateWithCredential(user, credential);
            }
          }

          await deleteDoc(doc(db, 'doctors', user.uid));
          try {
            localStorage.removeItem(`simplesoap_doctor_profile_${user.uid}`);
            localStorage.removeItem(`simplesoap_tour_done_${user.uid}`);
          } catch (e) {
            console.warn('Cache cleanup notice:', e);
          }
          await deleteUser(user);
          alert('Akun Anda berhasil dihapus.');
        }
      } catch (err) {
        console.error('Error deleting user account:', err);
        if (err.code === 'auth/requires-recent-login') {
          alert('Demi keamanan, silakan keluar akun dan masuk kembali sebelum melakukan penghapusan akun.');
        } else {
          alert(getFriendlyErrorMessage(err, 'Gagal menghapus akun. Pastikan kata sandi benar dan coba lagi.'));
        }
      } finally {
        setIsDeletingAccount(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      className="p-5 space-y-5 pb-28 overflow-y-auto no-scrollbar"
    >
      <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Pengaturan</h2>

      {/* Profile Section */}
      <div className="glass-card p-5 rounded-[22px] space-y-4">
        <h3 className="text-xs font-extrabold text-cyan-900 uppercase tracking-widest border-b border-white/75 pb-2.5">
          Profil Dokter
        </h3>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Nama Lengkap &amp; Gelar
          </label>
          <input
            type="text"
            value={localProfile.name}
            onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
            className="w-full mt-1 p-3 rounded-2xl glass-input text-sm font-bold text-slate-800"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Kredensial / SIP / STR
          </label>
          <input
            type="text"
            placeholder="Contoh: Sp.PD / SIP: 12345"
            value={localProfile.credentials}
            onChange={(e) => setLocalProfile({ ...localProfile, credentials: e.target.value })}
            className="w-full mt-1 p-3 rounded-2xl glass-input text-sm font-bold text-slate-800"
          />
        </div>

        {isChanged && (
          <button
            onClick={handleSave}
            className="w-full py-3 glass-btn-primary rounded-2xl font-bold text-sm mt-2"
          >
            Simpan Perubahan
          </button>
        )}
      </div>

      {/* Patient Soft Delete Section */}
      <div className="glass-card p-5 rounded-[22px] space-y-4 relative">
        <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest border-b border-white/75 pb-2.5 flex items-center gap-2">
          <Trash2 size={15} className="text-amber-600" /> Kelola Pasien (Pindah ke Sampah)
        </h3>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
            Pilih Pasien Aktif
          </label>
          <div className="flex flex-col gap-2.5">
            <GlassSelect
              value={selectedPatientToDelete}
              onChange={(val) => setSelectedPatientToDelete(val)}
              options={patientOptions}
              placeholder="-- Pilih Pasien --"
              buttonClassName="py-3 rounded-2xl text-xs"
            />
            <button
              onClick={handleSoftDelete}
              disabled={!selectedPatientToDelete}
              className="w-full py-3 glass-btn-secondary text-amber-800 hover:text-amber-900 rounded-2xl font-bold text-xs disabled:opacity-45 disabled:cursor-not-allowed"
            >
              Pindahkan ke Tempat Sampah
            </button>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-2.5 leading-relaxed">
            Pasien akan disembunyikan dari daftar utama namun rekam medis tetap tersimpan aman di folder Tempat Sampah untuk mencegah risiko salah hapus.
          </p>
        </div>
      </div>

      {/* Trashed Patients (Recovery & Permanent Delete) */}
      {trashedPatients.length > 0 && (
        <div className="glass-card p-5 rounded-[22px] space-y-3.5">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest border-b border-white/75 pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RotateCcw size={15} className="text-cyan-700" />
              Tempat Sampah Pasien ({trashedPatients.length})
            </span>
          </h3>

          <div className="space-y-2.5 max-h-60 overflow-y-auto no-scrollbar">
            {trashedPatients.map((p) => (
              <div
                key={p.id}
                className="p-3.5 glass-subpanel rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                    RM: {p.rm || '-'} • {p.ward}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(p.id, p.name)}
                    className="px-3 py-1.5 glass-btn-secondary text-teal-800 rounded-xl text-[10px] font-bold"
                  >
                    Pulihkan
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(p.id, p.name)}
                    className="px-3 py-1.5 bg-rose-500/12 border border-rose-200/80 text-rose-700 rounded-xl text-[10px] font-bold active:scale-95 transition-transform"
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
            className="w-full p-4 glass-card-interactive rounded-2xl text-left font-bold text-slate-800 flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2.5">
              <Sparkles size={17} className="text-cyan-700" />
              Lihat Panduan Singkat (Tur App)
            </span>
            <ChevronRight size={17} className="text-slate-400" />
          </button>
        )}

        <button
          onClick={handleLogout}
          className="w-full p-4 glass-btn-secondary rounded-2xl text-left font-bold text-slate-700 text-sm"
        >
          Keluar Akun
        </button>
      </div>

      {/* Danger Zone: Account Deletion (Google Play Compliance) */}
      <div className="glass-card p-5 rounded-[22px] space-y-3 border-rose-200/60">
        <h3 className="text-xs font-extrabold text-rose-700 uppercase tracking-widest flex items-center gap-1.5">
          <AlertOctagon size={14} className="text-rose-600" /> Zona Bahaya: Hapus Akun Pengguna
        </h3>
        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
          Sesuai ketentuan Google Play Store, Anda berhak menghapus akun dan data profil dokter Anda secara mandiri dari cloud server SimpleSOAP.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeletingAccount}
          className="w-full py-3 bg-rose-600/90 hover:bg-rose-600 text-white border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_16px_-3px_rgba(225,29,72,0.25)] rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <UserX size={15} />
          {isDeletingAccount ? 'Memproses Penghapusan...' : 'Hapus Akun Dokter Saya'}
        </button>
      </div>
    </motion.div>
  );
}
