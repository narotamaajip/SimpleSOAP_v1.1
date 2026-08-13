import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  Clock, 
  User, 
  Stethoscope, 
  ClipboardList, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  X,
  Save,
  FileText,
  ChevronDown,
  LayoutGrid,
  Users,
  Settings,
  MapPin,
  Menu,
  Filter,
  ListRestart,
  Trash2,
  Pencil,
  Send,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where,
  serverTimestamp,
  arrayUnion,
  deleteDoc,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signOut 
} from 'firebase/auth';
import { setDoc } from 'firebase/firestore';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- INITIAL MOCK DATA ---
const INITIAL_PATIENTS = [
  { 
    id: 'P001', 
    name: 'Tn. Budi Santoso', 
    rm: '09-87-65-43', 
    age: 54, 
    sex: 'L', 
    room: 'Melati 3 / Bed 2', 
    dpjp: 'dr. Andi H., Sp.PD', 
    dx: 'Pneumonia Komunitas, DM Tipe 2', 
    alergi: 'Penisilin, Golongan Sulfa', 
    status: 'BELUM FU', 
    isFollowedUp: false, 
    history: [
      { 
        id: 1, 
        date: '12 Okt 2023', 
        time: '08:15 WIB', 
        doctor: 'dr. Andi H.', 
        s: 'Pasien merasa sesak berkurang, batuk masih ada tapi jarang. Nafsu makan membaik.', 
        o: 'TD 120/80, HR 84x/m, RR 20x/m, T 36.7C. Ronki berkurang di basal paru kanan.', 
        a: 'Pneumonia perbaikan klinis. Demam (-), batuk berkurang. Gula darah terkontrol.', 
        p: 'Lanjutkan antibiotik hari ke-3 (Ceftriaxone 1x2g IV)\nDiet DM 1700 kkal\nCek DL besok pagi' 
      },
      { 
        id: 2, 
        date: '11 Okt 2023', 
        time: '09:30 WIB', 
        doctor: 'dr. Andi H.', 
        s: 'Pasien mengeluh sesak napas memberat sejak pagi tadi, batuk berdahak kuning.', 
        o: 'TD 130/90, HR 102x/m, RR 28x/m, T 38.5C. Ronki basah kasar (+) di basal paru kanan.', 
        a: 'Pneumonia akut. Sesak napas (+), ronki basah kasar di basal paru kanan. Hiperglikemia.', 
        p: 'O2 nasal kanul 3 lpm\nMulai Ceftriaxone 1x2g IV (skin test dulu)\nKonsul TS Paru' 
      }
    ] 
  },
  { 
    id: 'P002', 
    name: 'Ny. Siti Aminah', 
    rm: '65-43-21-00', 
    age: 62, 
    sex: 'P', 
    room: 'Anggrek 1 / Bed 4', 
    dpjp: 'dr. Andi H., Sp.PD', 
    dx: 'DHF Grade II H+3', 
    alergi: 'Tidak ada', 
    status: 'BELUM FU', 
    isFollowedUp: false, 
    history: [] 
  }
];

export default function SoapApp() {
  const [activeTab, setActiveTab] = useState('beranda');
  const [patientFilterCategory, setPatientFilterCategory] = useState('AKTIF');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [isAddingSoap, setIsAddingSoap] = useState(false);
  const [editingSoapId, setEditingSoapId] = useState(null);
  const [isAddingNewPatient, setIsAddingNewPatient] = useState(false);
  const [isEditingPatientProfile, setIsEditingPatientProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authView, setAuthView] = useState('loading'); // 'loading', 'login', 'register', 'onboarding', 'app'
  const [authError, setAuthError] = useState('');
  const [doctorProfile, setDoctorProfile] = useState({ name: 'dr. Tester', credentials: '' });

  // Failsafe timeout for loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authView === 'loading') {
        console.warn("Failsafe triggered: authView stuck on loading. Forcing login view.");
        setAuthView('login');
      }
      if (loading) {
        console.warn("Failsafe triggered: loading state stuck. Forcing loading false.");
        setLoading(false);
      }
    }, 10000); // 10 seconds timeout
    return () => clearTimeout(timer);
  }, [authView, loading]);

  // Handle Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        if (u.isAnonymous) {
          // Fallback for existing anonymous users
          setAuthView('app');
          return;
        }
        
        try {
          const docRef = doc(db, 'doctors', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDoctorProfile(data);
            if (data.status === 'pending') {
              // Legacy: treat pending as needing email verification
              setAuthView('unverified');
            } else {
              setAuthView('app');
            }
          } else {
            setAuthView('onboarding');
          }
        } catch (error) {
          console.error("Error fetching doctor profile", error);
          setAuthView('onboarding'); // Fallback to onboarding
        }
      } else {
        setUser(null);
        setAuthView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Patients from Firestore
  useEffect(() => {
    if (!user || authView !== 'app') return;

    // Fetch patients where the current user is in the accessList
    const q = query(
      collection(db, "patients"),
      where("accessList", "array-contains", user.uid)
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          const historyArray = docData.history || [];
          const isDischarged = docData.status === 'PULANG';
          const lastSoapDate = historyArray.length > 0 
            ? historyArray[historyArray.length - 1].date 
            : null;
          
          const isFollowedUpToday = lastSoapDate === todayStr;
          const displayStatus = isDischarged ? 'PULANG' : (isFollowedUpToday ? 'SUDAH FU' : 'BELUM FU');

          return {
            id: doc.id,
            ...docData,
            history: historyArray,
            isFollowedUp: isFollowedUpToday,
            status: displayStatus
          };
        });

        // Client-side sort by createdAt descending
        data.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });

        setPatients(data);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Error:", err.code, err.message);
        if (err.code === 'permission-denied') {
          alert("Gagal memuat data pasien. Pastikan Firestore Security Rules di Firebase Console sudah diizinkan.");
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authView]);

  const selectedPatient = useMemo(() => 
    patients.find(p => p.id === selectedPatientId), 
  [patients, selectedPatientId]);

  const stats = useMemo(() => {
    const activePatients = patients.filter(p => p.status !== 'PULANG');
    return {
      total: activePatients.length,
      followedUp: activePatients.filter(p => p.isFollowedUp).length,
      pending: activePatients.filter(p => !p.isFollowedUp).length,
    };
  }, [patients]);

  // Handlers
  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
  };

  const handleSaveSoap = async (newSoap) => {
    if (!selectedPatientId) return;

    const patientRef = doc(db, "patients", selectedPatientId);
    try {
      const isDischarged = newSoap.isDischarged;
      // remove isDischarged from soap object to not save it in history directly
      const { isDischarged: _, ...soapData } = newSoap; 

      if (editingSoapId) {
        // Edit existing SOAP
        const updatedHistory = selectedPatient.history.map(item => 
          item.id === editingSoapId ? { ...item, ...soapData } : item
        );
        await updateDoc(patientRef, {
          history: updatedHistory,
          ...(isDischarged && { status: 'PULANG' })
        });
      } else {
        // Add new SOAP
        await updateDoc(patientRef, {
          ...(isDischarged ? { status: 'PULANG' } : { status: 'SUDAH FU' }),
          history: arrayUnion({
            id: Date.now(),
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
            doctor: doctorProfile.name,
            ...soapData
          })
        });
      }
      setIsAddingSoap(false);
      setEditingSoapId(null);
    } catch (error) {
      console.error("Error updating SOAP:", error);
    }
  };

  const handleSavePatientProfile = async (updatedData) => {
    if (!selectedPatientId) return;
    const patientRef = doc(db, "patients", selectedPatientId);
    // Whitelist only safe editable fields — never overwrite ownerId, accessList, history, status
    const safeUpdate = {
      name: updatedData.name,
      rm: updatedData.rm || '',
      age: updatedData.age,
      sex: updatedData.sex,
      ward: updatedData.ward,
      dpjp: updatedData.dpjp,
      dx: updatedData.dx,
      alergi: updatedData.alergi || 'Tidak ada'
    };
    try {
      await updateDoc(patientRef, safeUpdate);
      setIsEditingPatientProfile(false);
    } catch (error) {
      console.error("Error updating patient:", error);
    }
  };

  const handleAddPatient = async (newPatient, initialSoap) => {
    try {
      const historyItem = initialSoap ? [{
        id: Date.now(),
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        doctor: doctorProfile.name,
        ...initialSoap
      }] : [];

      await addDoc(collection(db, "patients"), {
        ...newPatient, // now contains ward from form
        ownerId: user.uid,
        accessList: [user.uid],
        history: historyItem,
        isFollowedUp: !!initialSoap,
        status: initialSoap ? 'SUDAH FU' : 'BELUM FU',
        createdAt: serverTimestamp()
      });
      setIsAddingNewPatient(false);
      setActiveTab('pasien');
    } catch (error) {
      console.error("Error adding patient:", error);
    }
  };

  const handleDeletePatient = async (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return false;

    // If ownerId exists and doesn't match current user → block immediately
    if (patient.ownerId && patient.ownerId !== user.uid) {
      alert("Anda tidak memiliki izin untuk menghapus data pasien ini. Hanya dokter yang mendaftarkan pasien yang dapat menghapusnya.");
      return false;
    }

    try {
      await deleteDoc(doc(db, "patients", patientId));
      alert("Data pasien berhasil dihapus.");
      return true;
    } catch (error) {
      console.error("Error deleting patient:", error.code, error.message);
      if (error.code === 'permission-denied') {
        alert("Gagal menghapus: Anda tidak memiliki izin. Pastikan Anda adalah dokter yang mendaftarkan pasien ini.");
      } else {
        alert("Gagal menghapus data pasien. Error: " + error.message);
      }
      return false;
    }
  };

  const handleTabClick = (tab) => {
    if (isAddingNewPatient || isAddingSoap) {
      if (window.confirm("Ada data yang belum disimpan. Yakin ingin pindah halaman?")) {
        setIsAddingNewPatient(false);
        setIsAddingSoap(false);
        setSelectedPatientId(null);
        setActiveTab(tab);
      }
    } else {
      setSelectedPatientId(null);
      setActiveTab(tab);
    }
  };

  if (authView === 'loading') {
    return <LoadingSpinner text="Memeriksa Sesi Keamanan..." />;
  }

  if (authView === 'login') {
    return <LoginView onSwitch={() => setAuthView('register')} onForgotPassword={() => setAuthView('forgotPassword')} />;
  }

  if (authView === 'register') {
    return <RegisterView onSwitch={() => setAuthView('login')} />;
  }

  if (authView === 'unverified') {
    return <UnverifiedEmailView onLogout={() => signOut(auth)} />;
  }

  if (authView === 'forgotPassword') {
    return <ForgotPasswordView onBack={() => setAuthView('login')} />;
  }

  if (authView === 'onboarding') {
    return (
      <OnboardingView 
        user={user} 
        onComplete={(profile) => { 
          setDoctorProfile(profile); 
          if (!user.emailVerified) {
            setAuthView('unverified');
          } else {
            setAuthView('app'); 
          }
        }} 
      />
    );
  }

  if (loading) {
    return <LoadingSpinner text="Menghubungkan ke Cloud..." />;
  }

  return (
    <div className="max-w-md mx-auto h-screen bg-[#f8fcf9] overflow-hidden font-sans relative flex flex-col border-x border-slate-200 shadow-2xl">
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {isEditingPatientProfile && selectedPatient ? (
            <EditPatientProfileForm 
              key="edit_patient"
              patient={selectedPatient}
              onBack={() => setIsEditingPatientProfile(false)}
              onSave={handleSavePatientProfile}
            />
          ) : isAddingSoap && selectedPatient ? (
            <SoapForm 
              key="soap_form"
              patient={selectedPatient}
              editingSoapId={editingSoapId}
              onBack={() => {
                setIsAddingSoap(false);
                setEditingSoapId(null);
              }}
              onSave={handleSaveSoap}
            />
          ) : selectedPatientId ? (
              <PatientDetailView 
                key="detail"
                patient={selectedPatient} 
                onBack={() => setSelectedPatientId(null)}
                onAddSoap={() => setIsAddingSoap(true)}
                onEditPatient={() => setIsEditingPatientProfile(true)}
                onEditSoap={(historyId) => {
                  setEditingSoapId(historyId);
                  setIsAddingSoap(true);
                }}
              />
          ) : (
            <div className="h-full flex flex-col">
              {activeTab === 'beranda' && (
                <DashboardView 
                  key="beranda"
                  patients={patients}
                  stats={stats}
                  doctorProfile={doctorProfile}
                  onSelectPatient={handleSelectPatient}
                  onNavigateToPatients={(cat) => {
                    setPatientFilterCategory(cat);
                    setActiveTab('pasien');
                  }}
                />
              )}
              {activeTab === 'pasien' && (
                <PatientListView 
                  key="pasien"
                  patients={patients}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  categoryFilter={patientFilterCategory}
                  setCategoryFilter={setPatientFilterCategory}
                  onSelectPatient={handleSelectPatient}
                  onAddPatientClick={() => setIsAddingNewPatient(true)}
                />
              )}
              {activeTab === 'pengaturan' && (
                <SettingsView 
                  key="pengaturan" 
                  doctorProfile={doctorProfile}
                  setDoctorProfile={setDoctorProfile}
                  patients={patients}
                  currentUserId={user?.uid}
                  onDeletePatient={handleDeletePatient}
                />
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Patient Modal (Simple) */}
      <AnimatePresence>
        {isAddingNewPatient && (
          <NewPatientSoapForm 
            onBack={() => setIsAddingNewPatient(false)}
            onSave={(newPatient, initialSoap) => handleAddPatient(newPatient, initialSoap)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-slate-100 flex items-center justify-around py-3 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50">
        <NavItem 
          icon={<LayoutGrid size={22} />} 
          label="Beranda" 
          active={activeTab === 'beranda' && !selectedPatientId} 
          onClick={() => handleTabClick('beranda')} 
        />
        <NavItem 
          icon={<Users size={22} />} 
          label="Pasien" 
          active={activeTab === 'pasien' || selectedPatientId} 
          onClick={() => handleTabClick('pasien')} 
        />
        <NavItem 
          icon={<Settings size={22} />} 
          label="Pengaturan" 
          active={activeTab === 'pengaturan' && !selectedPatientId} 
          onClick={() => handleTabClick('pengaturan')} 
        />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center gap-1.5 transition-all px-8 relative",
      active ? "text-emerald-700" : "text-slate-400"
    )}>
      {icon}
      <span className="text-[10px] font-bold tracking-wide">{label}</span>
      {active && <motion.div layoutId="nav-pill" className="absolute -top-3 w-1.5 h-1.5 bg-emerald-700 rounded-full" />}
    </button>
  );
}

// --- VIEWS ---

function DashboardView({ patients, stats, doctorProfile, onSelectPatient, onNavigateToPatients }) {
  const pendingPatients = patients.filter(p => !p.isFollowedUp && p.status !== 'PULANG');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto no-scrollbar pb-10">
      <div className="bg-white px-4 py-4 flex items-center justify-center sticky top-0 z-20 border-b border-emerald-50">
        <h1 className="text-emerald-800 font-black text-base tracking-tight uppercase">SimpleSOAP</h1>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Follow-Up Pasien</h2>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">Ringkasan harian {doctorProfile.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="TOTAL PASIEN AKTIF" value={stats.total} color="emerald" onClick={() => onNavigateToPatients('AKTIF')} />
          <StatCard label="SUDAH FOLLOW-UP" value={stats.followedUp} color="emerald" light onClick={() => onNavigateToPatients('AKTIF')} />
          <StatCard label="BELUM FOLLOW-UP" value={stats.pending} color="rose" full onClick={() => onNavigateToPatients('BELUM_FU')} />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PERLU FOLLOW-UP</h3>
            <button onClick={() => onNavigateToPatients('BELUM_FU')} className="text-[10px] font-bold text-emerald-700">LIHAT SEMUA</button>
          </div>
          <div className="space-y-3">
            {pendingPatients.slice(0, 3).map(p => (
              <PatientCardCompact key={p.id} patient={p} onClick={() => onSelectPatient(p.id)} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PatientListView({ patients, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter, onSelectPatient, onAddPatientClick }) {
  const [roomFilter, setRoomFilter] = useState('');
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState({ type: '', message: '' });

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setIsRedeeming(true);
    setRedeemStatus({ type: 'info', message: 'Mencari pasien...' });
    try {
      const q = query(collection(db, "patients"), where("shareCode", "==", redeemCode.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setRedeemStatus({ type: 'error', message: 'Kode tidak ditemukan.' });
      } else {
        const patientDoc = snap.docs[0];
        const data = patientDoc.data();
        if (data.accessList?.includes(auth.currentUser.uid)) {
          setRedeemStatus({ type: 'error', message: 'Anda sudah memiliki akses ke pasien ini.' });
        } else {
          await updateDoc(doc(db, "patients", patientDoc.id), {
            accessList: arrayUnion(auth.currentUser.uid)
          });
          setRedeemStatus({ type: 'success', message: 'Berhasil! Pasien ditambahkan.' });
          setRedeemCode('');
          setTimeout(() => {
            setShowRedeem(false);
            setRedeemStatus({ type: '', message: '' });
          }, 2000);
        }
      }
    } catch (err) {
      console.error(err);
      setRedeemStatus({ type: 'error', message: 'Terjadi kesalahan sistem.' });
    } finally {
      setIsRedeeming(false);
    }
  };

  const uniqueRooms = useMemo(() => {
    const rooms = patients.map(p => p.ward).filter(Boolean);
    return [...new Set(rooms)].sort();
  }, [patients]);

  const filtered = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.ward?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRoom = roomFilter ? p.ward === roomFilter : true;
    
    let matchesCategory = true;
    if (categoryFilter === 'AKTIF') {
      matchesCategory = p.status !== 'PULANG';
    } else if (categoryFilter === 'BELUM_FU') {
      matchesCategory = !p.isFollowedUp && p.status !== 'PULANG';
    } else if (categoryFilter === 'INAKTIF') {
      matchesCategory = p.status === 'PULANG';
    }

    return matchesSearch && matchesRoom && matchesCategory;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden relative">
      <div className="bg-white px-4 py-4 border-b border-slate-100 sticky top-0 z-20 space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-emerald-800 font-black text-base tracking-tight uppercase">Daftar Pasien</h1>
          <button onClick={() => setShowRedeem(!showRedeem)} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 active:scale-95 transition-transform">
            <Key size={14} /> Akses Kode
          </button>
        </div>

        <AnimatePresence>
          {showRedeem && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <form onSubmit={handleRedeem} className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex flex-col gap-2">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Masukkan Kode Unik Pasien</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Contoh: X7A9KQ" 
                    value={redeemCode} 
                    onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                    className="flex-1 p-2 rounded-lg border border-emerald-200 text-sm font-mono font-bold tracking-widest focus:outline-none focus:border-emerald-500 uppercase"
                  />
                  <button type="submit" disabled={isRedeeming} className="bg-emerald-600 text-white px-4 rounded-lg font-bold text-xs shadow-sm disabled:opacity-50">
                    {isRedeeming ? <Activity size={16} className="animate-spin" /> : 'Cari'}
                  </button>
                </div>
                {redeemStatus.message && (
                  <p className={cn("text-[10px] font-bold mt-1", redeemStatus.type === 'error' ? "text-rose-600" : "text-emerald-600")}>
                    {redeemStatus.message}
                  </p>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Category Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setCategoryFilter('AKTIF')}
            className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", categoryFilter === 'AKTIF' ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500")}
          >
            Aktif
          </button>
          <button 
            onClick={() => setCategoryFilter('BELUM_FU')}
            className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", categoryFilter === 'BELUM_FU' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500")}
          >
            Belum FU
          </button>
          <button 
            onClick={() => setCategoryFilter('INAKTIF')}
            className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", categoryFilter === 'INAKTIF' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}
          >
            Pulang
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari Nama..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold"
            />
          </div>
          <select 
            value={roomFilter} 
            onChange={(e) => setRoomFilter(e.target.value)}
            className="w-1/3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold text-slate-600"
          >
            <option value="">Semua Kamar</option>
            {uniqueRooms.map(room => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 text-sm font-bold mt-10">Tidak ada pasien yang sesuai.</p>
        ) : (
          filtered.map(p => (
            <PatientCardDetailed key={p.id} patient={p} onClick={() => onSelectPatient(p.id)} />
          ))
        )}
      </div>

      <button 
        onClick={onAddPatientClick} 
        className="absolute bottom-6 right-6 bg-emerald-600 text-white w-14 h-14 flex items-center justify-center rounded-full shadow-lg shadow-emerald-600/40 active:scale-95 transition-transform z-30"
      >
        <Plus size={28} />
      </button>
    </motion.div>
  );
}

function SettingsView({ doctorProfile, setDoctorProfile, patients, currentUserId, onDeletePatient }) {
  const [localProfile, setLocalProfile] = useState(doctorProfile);
  const [selectedPatientToDelete, setSelectedPatientToDelete] = useState('');

  // Sync if doctorProfile changes externally (e.g. after save)
  useEffect(() => {
    setLocalProfile(doctorProfile);
  }, [doctorProfile]);
  const isChanged = localProfile.name !== doctorProfile.name || localProfile.credentials !== doctorProfile.credentials;

  const handleLogout = async () => {
    if (window.confirm("Yakin ingin keluar dari akun?")) {
      await signOut(auth);
    }
  };

  const handleSave = async () => {
    try {
      const docRef = doc(db, 'doctors', auth.currentUser.uid);
      await setDoc(docRef, localProfile, { merge: true });
      setDoctorProfile(localProfile);
      alert("Profil berhasil disimpan!");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan profil.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPatientToDelete) return;
    const patientName = patients.find(p => p.id === selectedPatientToDelete)?.name;
    if (window.confirm(`PERINGATAN: Yakin ingin menghapus seluruh data dan rekam medis pasien "${patientName}" secara permanen? Aksi ini tidak dapat dibatalkan.`)) {
      const success = await onDeletePatient(selectedPatientToDelete);
      // Only clear selection if delete actually succeeded
      if (success) {
        setSelectedPatientToDelete('');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Pengaturan</h2>
      
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest border-b border-emerald-50 pb-2">Profil Dokter (Tester)</h3>
        
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Lengkap</label>
          <input 
            type="text" 
            value={localProfile.name}
            onChange={e => setLocalProfile({...localProfile, name: e.target.value})}
            className="w-full mt-1 p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>
        
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Kredensial / SIP</label>
          <input 
            type="text" 
            placeholder="Contoh: Sp.PD / SIP: 12345"
            value={localProfile.credentials}
            onChange={e => setLocalProfile({...localProfile, credentials: e.target.value})}
            className="w-full mt-1 p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>

        {isChanged && (
          <button onClick={handleSave} className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow-md mt-2">
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
              onChange={e => setSelectedPatientToDelete(e.target.value)}
              className="w-full p-3 rounded-lg border border-rose-200 bg-white text-sm font-bold text-slate-800 outline-none focus:border-rose-500 truncate"
            >
              <option value="">-- Pilih Pasien --</option>
              {patients
                .filter(p => !p.ownerId || p.ownerId === currentUserId)
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.rm ? `(RM: ${p.rm})` : ''}</option>
                ))
              }
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
        <button onClick={handleLogout} className="w-full p-4 bg-rose-50 rounded-lg border border-rose-100 text-left font-bold text-rose-600 shadow-sm">Keluar Akun</button>
      </div>
    </motion.div>
  );
}

// --- COMPONENTS ---

function StatCard({ label, value, color, light, full, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border shadow-sm border-l-[6px]",
        full && "col-span-2",
        color === 'emerald' ? "border-emerald-100 border-l-emerald-600" : "border-rose-100 border-l-rose-500",
        light ? "bg-emerald-50/30" : "bg-white",
        onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""
      )}
    >
      <p className="text-[9px] font-black text-slate-400 tracking-wider mb-2">{label}</p>
      <p className={cn("text-3xl font-black", color === 'emerald' ? "text-emerald-800" : "text-rose-600")}>{value}</p>
    </div>
  );
}

function PatientCardCompact({ patient, onClick }) {
  const isPending = !patient.isFollowedUp && patient.status !== 'PULANG';
  const isDischarged = patient.status === 'PULANG';
  return (
    <div onClick={onClick} className={cn(
      "bg-white p-4 rounded-lg border border-slate-100 border-l-4 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer",
      isDischarged ? "border-l-slate-400 opacity-75" : (isPending ? "border-l-rose-500" : "border-l-emerald-500")
    )}>
      <div>
        <h4 className="font-bold text-slate-800">{patient.name}</h4>
        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Usia: {patient.age} thn</p>
      </div>
      <div className={cn(
        "text-white px-2 py-1 rounded text-[8px] font-black uppercase",
        isDischarged ? "bg-slate-400" : (isPending ? "bg-rose-500" : "bg-emerald-500")
      )}>
        {patient.status}
      </div>
    </div>
  );
}

function PatientCardDetailed({ patient, onClick }) {
  const isPending = !patient.isFollowedUp && patient.status !== 'PULANG';
  const isDischarged = patient.status === 'PULANG';
  return (
    <div onClick={onClick} className={cn(
      "bg-white p-4 rounded-xl border shadow-sm border-l-[6px] active:scale-[0.99] transition-all cursor-pointer",
      isDischarged ? "border-slate-400 opacity-80" : (isPending ? "border-rose-500" : "border-emerald-500")
    )}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-base font-black text-slate-800 leading-tight">{patient.name}</h4>
          <p className="text-[10px] font-mono text-slate-400 font-bold mt-1">Usia: {patient.age} thn</p>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white",
          isDischarged ? "bg-slate-400" : (isPending ? "bg-rose-500" : "bg-emerald-500")
        )}>
          {patient.status}
        </span>
      </div>
      <div className="pt-3 border-t border-slate-50 space-y-1.5">
        <div className="flex items-start gap-2">
          <Stethoscope size={12} className="text-slate-300 mt-0.5" />
          <p className="text-xs font-bold text-slate-600 line-clamp-1">{patient.dx}</p>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={12} className="text-slate-300 mt-0.5" />
          <p className="text-xs font-bold text-slate-600 line-clamp-1">{patient.ward}</p>
        </div>
      </div>
    </div>
  );
}

// --- PATIENT DETAIL VIEW (BASED ON SCREENSHOT) ---
function PatientDetailView({ patient, onBack, onAddSoap, onEditSoap, onEditPatient }) {
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
    // Use Web Crypto API for a cryptographically secure random code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusable chars O,0,I,1
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    const newCode = Array.from(randomBytes).map(b => chars[b % chars.length]).join('');
    try {
      await updateDoc(doc(db, "patients", patient.id), { shareCode: newCode });
      setShareCode(newCode);
      setShowCode(true);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat kode unik.");
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
          "bg-white m-4 p-5 rounded-lg border-l-4 shadow-sm space-y-4",
          isDischarged ? "border-l-slate-400" : (isPending ? "border-l-rose-500" : "border-l-emerald-500")
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
                "text-white px-2 py-1 rounded text-[10px] font-black uppercase",
                isDischarged ? "bg-slate-400" : (isPending ? "bg-rose-600" : "bg-emerald-600")
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
                <button onClick={onEditPatient} className="p-1.5 text-slate-400 bg-slate-50 rounded hover:text-emerald-600 transition-colors">
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
              <div className="mt-1 bg-rose-500 text-white p-1 rounded-full"><AlertTriangle size={14} /></div>
              <div>
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">ALERGI OBAT</p>
                <p className="text-sm font-black text-rose-700">{patient.alergi}</p>
              </div>
            </div>
          )}
        </div>

        {/* Share Section (Only visible when toggled) */}
        <AnimatePresence>
          {showCode && shareCode && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 mb-4 overflow-hidden">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">KODE AKSES PASIEN</p>
                <div className="text-2xl font-mono font-black text-emerald-800 tracking-[0.2em] bg-white px-4 py-2 rounded-lg shadow-inner mb-2 border border-emerald-200 relative w-full flex justify-center items-center group">
                  {shareCode}
                  <button onClick={() => setShowCode(false)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors p-1">
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
          <button onClick={onAddSoap} className="w-full bg-emerald-600 text-white py-3.5 rounded-lg font-black text-sm shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
            <ListRestart size={20} />
            Tambah Follow-Up Hari Ini
          </button>
        </div>

        {/* SOAP History Section */}
        <div className="px-4 space-y-4 pb-20">
          <h3 className="text-sm font-black text-slate-800 tracking-tight">Riwayat Follow-Up (SOAP)</h3>
          
          <div className="space-y-4">
            {patient.history.length > 0 ? (
              patient.history.map(h => (
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
              <div className="py-20 text-center opacity-20 font-black uppercase text-xs tracking-widest">Belum ada catatan</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SoapItem({ label, content, list }) {
  const safeContent = content || '-';
  
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="bg-emerald-50/40 p-3 rounded-lg border border-emerald-100/50">
        {list ? (
          <ul className="space-y-1">
            {safeContent.split('\n').map((line, i) => (
              <li key={i} className="text-xs font-bold text-slate-700 flex gap-2">
                <span className="text-emerald-500">•</span>
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs font-bold text-slate-700 leading-relaxed">{safeContent}</p>
        )}
      </div>
    </div>
  );
}

// --- SOAP FORM COMPONENT ---
function SoapForm({ patient, editingSoapId, onBack, onSave }) {
  const [activeSection, setActiveSection] = useState('s');
  const [isDischarged, setIsDischarged] = useState(patient.status === 'PULANG');
  const [soap, setSoap] = useState({
    s: '',
    vitals: { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
    o: '',
    a: '',
    p: '',
    i: ''
  });

  useEffect(() => {
    if (editingSoapId) {
      const historyItem = patient.history.find(h => h.id === editingSoapId);
      if (historyItem) {
        setSoap({
          s: historyItem.s || '',
          vitals: { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
          o: historyItem.o || '',
          a: historyItem.a || '',
          p: historyItem.p || '',
          i: historyItem.i || ''
        });
      }
    }
  }, [editingSoapId, patient]);

  const copyPrevious = () => {
    if (patient.history && patient.history.length > 0) {
      // Find the last item. If editing the last item, find the one before it.
      let lastItem = patient.history[0]; // History is ordered desc by date usually, wait, arrayUnion appends to end?
      // Check data structure: history is arrayUnion, so newest is at the end.
      const historyCopy = [...patient.history].sort((a, b) => b.id - a.id); // sort desc by id (timestamp)
      const prevItem = editingSoapId ? historyCopy.find(h => h.id !== editingSoapId) : historyCopy[0];
      
      if (prevItem) {
        setSoap({
          s: prevItem.s || '',
          vitals: { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
          o: prevItem.o || '',
          a: prevItem.a || '',
          p: prevItem.p || '',
          i: prevItem.i || ''
        });
        alert("SOAP sebelumnya berhasil disalin.");
      } else {
        alert("Tidak ada riwayat SOAP sebelumnya untuk disalin.");
      }
    } else {
      alert("Tidak ada riwayat SOAP sebelumnya.");
    }
  };

  const templates = {
    stabil: { 
      s: 'Keluhan (-), mobilitas baik. Pasien merasa nyaman.', 
      a: 'Kondisi klinis stabil, progres baik.', 
      p: 'Lanjutkan terapi saat ini.\nMonitoring tanda vital tiap shift.\nRencana BLPL (boleh pulang) jika stabil 24 jam.' 
    },
    membaik: { 
      s: 'Keluhan utama berkurang signifikan. Nafsu makan mulai membaik.', 
      a: 'Evolusi perbaikan klinis.', 
      p: 'Tappering off obat IV ke oral.\nMobilisasi bertahap.\nDiet bebas.' 
    },
    sesak: {
      s: 'Sesak napas bertambah terutama saat posisi berbaring.',
      a: 'Eksaserbasi sesak, curiga kongesti.',
      p: 'O2 nasal kanul 3 lpm.\nFurosemide 1 ampul extra IV.\nEvaluasi produksi urin dan Ro Thorax.'
    }
  };

  const applyTemplate = (type) => {
    const t = templates[type];
    if (t) {
      setSoap(prev => ({ ...prev, s: t.s, a: t.a, p: t.p }));
      setActiveSection('o'); // Move to objective to fill vitals
    }
  };

  const handleSave = () => {
    const { td, nadi, rr, suhu, spo2, bb } = soap.vitals;
    // Format objective string
    let formattedO = '';
    const vitalsStr = [
      td && `TD ${td} mmHg`,
      nadi && `HR ${nadi} x/m`,
      rr && `RR ${rr} x/m`,
      suhu && `T ${suhu} °C`,
      spo2 && `SpO2 ${spo2}%`,
      bb && `BB ${bb} kg`
    ].filter(Boolean).join(', ');
    
    if (vitalsStr) formattedO += vitalsStr + '.\n';
    if (soap.o) formattedO += soap.o;

    onSave({
      s: soap.s || '-',
      o: formattedO || '-',
      a: soap.a || '-',
      p: soap.p || '-',
      i: soap.i || '-',
      isDischarged
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="flex-1 flex flex-col h-full bg-[#f9fcf9] overflow-hidden absolute inset-0 z-50"
    >
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="text-slate-400 p-1 rounded-full hover:bg-slate-50"><X size={24} /></button>
        <h2 className="text-emerald-800 font-black text-sm tracking-tight uppercase">Update SOAP</h2>
        <button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform">
          Simpan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Title Area */}
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-2xl font-black text-slate-800">Entry SOAP Baru</h1>
          <p className="text-xs font-bold text-slate-500 mt-1">{patient.name} (RM: {patient.rm}) - {patient.ward}</p>
        </div>

        {/* Template Cepat */}
        <div className="px-4 mb-4">
          <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">TEMPLATE CEPAT</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button onClick={copyPrevious} className="px-4 py-2 rounded-lg bg-indigo-50/50 text-indigo-700 text-xs font-bold whitespace-nowrap border border-indigo-100 shadow-sm flex items-center gap-1.5"><FileText size={14}/> Salin Terakhir</button>
            <button onClick={() => applyTemplate('stabil')} className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm">Pasien Stabil</button>
            <button onClick={() => applyTemplate('membaik')} className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm">Pasien Membaik</button>
            <button onClick={() => applyTemplate('sesak')} className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm">Pasien Sesak</button>
          </div>
        </div>

        {/* Accordions */}
        <div className="px-4 space-y-3 pb-8">
          <AccordionSection 
            id="s" 
            title="(S) Subjective" 
            isActive={activeSection === 's'} 
            onClick={() => setActiveSection(activeSection === 's' ? null : 's')}
          >
            <textarea 
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Catatan keluhan tambahan pasien..."
              value={soap.s}
              onChange={(e) => setSoap({...soap, s: e.target.value})}
            />
          </AccordionSection>

          <AccordionSection 
            id="o" 
            title="(O) Objective" 
            isActive={activeSection === 'o'} 
            onClick={() => setActiveSection(activeSection === 'o' ? null : 'o')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <VitalInput label="TD (mmHg)" placeholder="120/80" value={soap.vitals.td} onChange={v => setSoap({...soap, vitals: {...soap.vitals, td: v}})} />
                <VitalInput label="Nadi (x/m)" placeholder="80" value={soap.vitals.nadi} onChange={v => setSoap({...soap, vitals: {...soap.vitals, nadi: v}})} />
                <VitalInput label="RR (x/m)" placeholder="20" value={soap.vitals.rr} onChange={v => setSoap({...soap, vitals: {...soap.vitals, rr: v}})} />
                <VitalInput label="Suhu (°C)" placeholder="36.5" value={soap.vitals.suhu} onChange={v => setSoap({...soap, vitals: {...soap.vitals, suhu: v}})} />
                <VitalInput label="SpO2 (%)" placeholder="98" value={soap.vitals.spo2} onChange={v => setSoap({...soap, vitals: {...soap.vitals, spo2: v}})} />
                <VitalInput label="BB (kg)" placeholder="65.0" value={soap.vitals.bb} onChange={v => setSoap({...soap, vitals: {...soap.vitals, bb: v}})} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-800 mb-1.5">Pemeriksaan Fisik / Penunjang</p>
                <textarea 
                  className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
                  rows={4}
                  placeholder="Catatan pemeriksaan fisik dan hasil lab/radiologi..."
                  value={soap.o}
                  onChange={(e) => setSoap({...soap, o: e.target.value})}
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection 
            id="a" 
            title="(A) Assessment" 
            isActive={activeSection === 'a'} 
            onClick={() => setActiveSection(activeSection === 'a' ? null : 'a')}
          >
            <textarea 
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Diagnosis atau masalah klinis saat ini..."
              value={soap.a}
              onChange={(e) => setSoap({...soap, a: e.target.value})}
            />
          </AccordionSection>

          <AccordionSection 
            id="p" 
            title="(P) Plan" 
            isActive={activeSection === 'p'} 
            onClick={() => setActiveSection(activeSection === 'p' ? null : 'p')}
          >
            <textarea 
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Rencana tatalaksana, terapi, dan edukasi..."
              value={soap.p}
              onChange={(e) => setSoap({...soap, p: e.target.value})}
            />
          </AccordionSection>

          <AccordionSection 
            id="i" 
            title="(I) Instruction" 
            isActive={activeSection === 'i'} 
            onClick={() => setActiveSection(activeSection === 'i' ? null : 'i')}
          >
            <textarea 
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Instruksi spesifik kepada pasien/perawat..."
              value={soap.i}
              onChange={(e) => setSoap({...soap, i: e.target.value})}
            />
          </AccordionSection>

          {/* BLPL Checkbox */}
          <div className="pt-2 flex items-center gap-3 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <input 
              type="checkbox" 
              id="blpl" 
              checked={isDischarged}
              onChange={(e) => setIsDischarged(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
            />
            <label htmlFor="blpl" className="text-sm font-bold text-slate-800">Tandai Pasien Boleh Pulang (BLPL)</label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 pb-20 space-y-3">
            <button onClick={handleSave} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform">
              Simpan SOAP
            </button>

            <button onClick={onBack} className="w-full py-4 bg-white border-2 border-emerald-100 rounded-xl text-slate-700 font-bold text-sm shadow-sm active:scale-[0.98] transition-transform">
              Kembali
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AccordionSection({ title, isActive, onClick, children }) {
  return (
    <div className="border border-emerald-100 rounded-lg overflow-hidden bg-white shadow-sm">
      <button 
        onClick={onClick}
        className={cn(
          "w-full px-4 py-3.5 flex items-center justify-between font-bold text-slate-800 transition-colors",
          isActive ? "bg-emerald-50/50" : "bg-emerald-50/30"
        )}
      >
        <span>{title}</span>
        <ChevronDown size={18} className={cn("transition-transform text-slate-500", isActive ? "rotate-180" : "")} />
      </button>
      <AnimatePresence>
        {isActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-emerald-50/10"
          >
            <div className="p-4 border-t border-emerald-50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VitalInput({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-800 mb-1.5 block">{label}</label>
      <input 
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-2.5 rounded-md border border-emerald-100 bg-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium placeholder:text-slate-300 transition-colors"
      />
    </div>
  );
}

// --- NEW PATIENT & SOAP FORM COMPONENT ---
function NewPatientSoapForm({ onBack, onSave }) {
  const [activeSection, setActiveSection] = useState('data');
  const [patientData, setPatientData] = useState({ name: '', rm: '', ward: '', age: '', sex: 'L', dpjp: '', dx: '', alergi: '' });
  const [isDischarged, setIsDischarged] = useState(false);
  const [soap, setSoap] = useState({
    s: '',
    vitals: { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
    o: '',
    a: '',
    p: '',
    i: ''
  });

  const templates = {
    stabil: { 
      s: 'Keluhan (-), mobilitas baik. Pasien merasa nyaman.', 
      a: 'Kondisi klinis stabil, progres baik.', 
      p: 'Lanjutkan terapi saat ini.\nMonitoring tanda vital tiap shift.\nRencana BLPL (boleh pulang) jika stabil 24 jam.' 
    },
    membaik: { 
      s: 'Keluhan utama berkurang signifikan. Nafsu makan mulai membaik.', 
      a: 'Evolusi perbaikan klinis.', 
      p: 'Tappering off obat IV ke oral.\nMobilisasi bertahap.\nDiet bebas.' 
    },
    sesak: {
      s: 'Sesak napas bertambah terutama saat posisi berbaring.',
      a: 'Eksaserbasi sesak, curiga kongesti.',
      p: 'O2 nasal kanul 3 lpm.\nFurosemide 1 ampul extra IV.\nEvaluasi produksi urin dan Ro Thorax.'
    }
  };

  const applyTemplate = (type) => {
    const t = templates[type];
    if (t) {
      setSoap(prev => ({ ...prev, s: t.s, a: t.a, p: t.p }));
      setActiveSection('o'); 
    }
  };

  const handleSave = () => {
    if (!patientData.name.trim()) {
      alert("Nama pasien wajib diisi.");
      return;
    }

    // Format objective string
    const { td, nadi, rr, suhu, spo2, bb } = soap.vitals;
    let formattedO = '';
    const vitalsStr = [
      td && `TD ${td} mmHg`,
      nadi && `HR ${nadi} x/m`,
      rr && `RR ${rr} x/m`,
      suhu && `T ${suhu} °C`,
      spo2 && `SpO2 ${spo2}%`,
      bb && `BB ${bb} kg`
    ].filter(Boolean).join(', ');
    
    if (vitalsStr) formattedO += vitalsStr + '.\n';
    if (soap.o) formattedO += soap.o;

    const initialSoap = (soap.s || formattedO || soap.a || soap.p || soap.i || isDischarged) ? {
      s: soap.s || '-',
      o: formattedO || '-',
      a: soap.a || '-',
      p: soap.p || '-',
      i: soap.i || '-',
      isDischarged
    } : null;

    onSave({ ...patientData, alergi: patientData.alergi || 'Tidak ada' }, initialSoap);
  };

  const handleSaveOnly = () => {
    if (!patientData.name.trim()) {
      alert("Nama pasien wajib diisi.");
      return;
    }
    onSave({ ...patientData, alergi: patientData.alergi || 'Tidak ada' }, null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="flex-1 flex flex-col h-full bg-[#f9fcf9] overflow-hidden absolute inset-0 z-50"
    >
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="text-slate-400 p-1 rounded-full hover:bg-slate-50"><X size={24} /></button>
        <h2 className="text-emerald-800 font-black text-sm tracking-tight uppercase">Pasien Baru</h2>
        <button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform">
          Simpan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Title Area */}
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-2xl font-black text-slate-800">Entry Pasien & SOAP</h1>
          <p className="text-xs font-bold text-slate-500 mt-1">Isi data pasien dan follow-up awal</p>
        </div>

        <div className="px-4 space-y-3 pb-8">
          
          {/* Data Pasien Accordion */}
          <AccordionSection 
            id="data" 
            title="Data Pasien" 
            isActive={activeSection === 'data'} 
            onClick={() => setActiveSection(activeSection === 'data' ? null : 'data')}
          >
            <div className="space-y-3">
              <input required value={patientData.name} onChange={e=>setPatientData({...patientData, name: e.target.value})} placeholder="Nama Pasien" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white" />
              <div className="flex gap-2">
                <input value={patientData.rm} onChange={e=>setPatientData({...patientData, rm: e.target.value})} placeholder="No RM (opsional)" className="w-1/2 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white" />
                <input required value={patientData.age} onChange={e=>setPatientData({...patientData, age: e.target.value})} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Usia" className="w-1/4 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white" />
                <select value={patientData.sex} onChange={e=>setPatientData({...patientData, sex: e.target.value})} className="w-1/4 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white">
                  <option value="L">L</option>
                  <option value="P">P</option>
                </select>
              </div>
              <input required value={patientData.ward} onChange={e=>setPatientData({...patientData, ward: e.target.value})} placeholder="Bangsal / Ruangan" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white" />
              <input required value={patientData.dpjp} onChange={e=>setPatientData({...patientData, dpjp: e.target.value})} placeholder="DPJP" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white" />
              <input required value={patientData.dx} onChange={e=>setPatientData({...patientData, dx: e.target.value})} placeholder="Diagnosis Utama" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white" />
              <input value={patientData.alergi} onChange={e=>setPatientData({...patientData, alergi: e.target.value})} placeholder="Alergi Obat (opsional)" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white" />
              
              <button 
                onClick={handleSaveOnly}
                className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-lg mt-2 text-xs shadow-sm active:scale-[0.98] transition-transform"
              >
                Simpan Data Pasien Saja
              </button>
            </div>
          </AccordionSection>

          {/* Template Cepat */}
          <div className="pt-2">
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">TEMPLATE CEPAT SOAP</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button onClick={() => applyTemplate('stabil')} className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm">Pasien Stabil</button>
              <button onClick={() => applyTemplate('membaik')} className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm">Pasien Membaik</button>
              <button onClick={() => applyTemplate('sesak')} className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm">Pasien Sesak</button>
            </div>
          </div>

          <AccordionSection 
            id="s" 
            title="(S) Subjective" 
            isActive={activeSection === 's'} 
            onClick={() => setActiveSection(activeSection === 's' ? null : 's')}
          >
            <textarea 
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Catatan keluhan tambahan pasien..."
              value={soap.s}
              onChange={(e) => setSoap({...soap, s: e.target.value})}
            />
          </AccordionSection>

          <AccordionSection 
            id="o" 
            title="(O) Objective" 
            isActive={activeSection === 'o'} 
            onClick={() => setActiveSection(activeSection === 'o' ? null : 'o')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <VitalInput label="TD (mmHg)" placeholder="120/80" value={soap.vitals.td} onChange={v => setSoap({...soap, vitals: {...soap.vitals, td: v}})} />
                <VitalInput label="Nadi (x/m)" placeholder="80" value={soap.vitals.nadi} onChange={v => setSoap({...soap, vitals: {...soap.vitals, nadi: v}})} />
                <VitalInput label="RR (x/m)" placeholder="20" value={soap.vitals.rr} onChange={v => setSoap({...soap, vitals: {...soap.vitals, rr: v}})} />
                <VitalInput label="Suhu (°C)" placeholder="36.5" value={soap.vitals.suhu} onChange={v => setSoap({...soap, vitals: {...soap.vitals, suhu: v}})} />
                <VitalInput label="SpO2 (%)" placeholder="98" value={soap.vitals.spo2} onChange={v => setSoap({...soap, vitals: {...soap.vitals, spo2: v}})} />
                <VitalInput label="BB (kg)" placeholder="65.0" value={soap.vitals.bb} onChange={v => setSoap({...soap, vitals: {...soap.vitals, bb: v}})} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-800 mb-1.5">Pemeriksaan Fisik / Penunjang</p>
                <textarea 
                  className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
                  rows={4}
                  placeholder="Catatan pemeriksaan fisik dan hasil lab/radiologi..."
                  value={soap.o}
                  onChange={(e) => setSoap({...soap, o: e.target.value})}
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection 
            id="a" 
            title="(A) Assessment" 
            isActive={activeSection === 'a'} 
            onClick={() => setActiveSection(activeSection === 'a' ? null : 'a')}
          >
            <textarea 
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Diagnosis atau masalah klinis saat ini..."
              value={soap.a}
              onChange={(e) => setSoap({...soap, a: e.target.value})}
            />
          </AccordionSection>

          <AccordionSection 
            id="p" 
            title="(P) Plan" 
            isActive={activeSection === 'p'} 
            onClick={() => setActiveSection(activeSection === 'p' ? null : 'p')}
          >
            <textarea 
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Rencana tatalaksana, terapi, dan edukasi..."
              value={soap.p}
              onChange={(e) => setSoap({...soap, p: e.target.value})}
            />
          </AccordionSection>

          <AccordionSection 
            id="i" 
            title="(I) Instruction" 
            isActive={activeSection === 'i'} 
            onClick={() => setActiveSection(activeSection === 'i' ? null : 'i')}
          >
            <textarea 
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Instruksi spesifik kepada pasien/perawat..."
              value={soap.i}
              onChange={(e) => setSoap({...soap, i: e.target.value})}
            />
          </AccordionSection>

          {/* BLPL Checkbox */}
          <div className="pt-2 flex items-center gap-3 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <input 
              type="checkbox" 
              id="blpl_new" 
              checked={isDischarged}
              onChange={(e) => setIsDischarged(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
            />
            <label htmlFor="blpl_new" className="text-sm font-bold text-slate-800">Tandai Pasien Boleh Pulang (BLPL)</label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 pb-20 space-y-3">
            <button onClick={handleSave} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform">
              Simpan Pasien & SOAP
            </button>
            <button onClick={onBack} className="w-full py-4 bg-white border-2 border-emerald-100 rounded-xl text-slate-700 font-bold text-sm shadow-sm active:scale-[0.98] transition-transform">
              Kembali
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EditPatientProfileForm({ patient, onBack, onSave }) {
  // Only keep editable fields – do NOT spread internal Firestore/runtime fields
  const [patientData, setPatientData] = useState({
    name: patient.name || '',
    rm: patient.rm || '',
    age: patient.age || '',
    sex: patient.sex || 'L',
    ward: patient.ward || '',
    dpjp: patient.dpjp || '',
    dx: patient.dx || '',
    alergi: patient.alergi || ''
  });
  
  const handleSave = () => {
    onSave(patientData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="flex-1 flex flex-col h-full bg-[#f9fcf9] overflow-hidden absolute inset-0 z-50"
    >
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="text-slate-400 p-1 rounded-full hover:bg-slate-50"><X size={24} /></button>
        <h2 className="text-emerald-800 font-black text-sm tracking-tight uppercase">Edit Pasien</h2>
        <button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform">
          Simpan
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <input required value={patientData.name} onChange={e=>setPatientData({...patientData, name: e.target.value})} placeholder="Nama Pasien" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors" />
          <div className="flex gap-2">
            <input value={patientData.rm} onChange={e=>setPatientData({...patientData, rm: e.target.value})} placeholder="No RM (opsional)" className="w-1/2 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors" />
            <input required value={patientData.age} onChange={e=>setPatientData({...patientData, age: e.target.value})} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Usia" className="w-1/4 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors" />
            <select value={patientData.sex} onChange={e=>setPatientData({...patientData, sex: e.target.value})} className="w-1/4 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors">
              <option value="L">L</option>
              <option value="P">P</option>
            </select>
          </div>
          <input required value={patientData.ward} onChange={e=>setPatientData({...patientData, ward: e.target.value})} placeholder="Bangsal / Ruangan" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors" />
          <input required value={patientData.dpjp} onChange={e=>setPatientData({...patientData, dpjp: e.target.value})} placeholder="DPJP" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors" />
          <input required value={patientData.dx} onChange={e=>setPatientData({...patientData, dx: e.target.value})} placeholder="Diagnosis Utama" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors" />
          <input value={patientData.alergi} onChange={e=>setPatientData({...patientData, alergi: e.target.value})} placeholder="Alergi Obat (opsional)" className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// --- NEW AUTH & ONBOARDING COMPONENTS ---

function LoadingSpinner({ text }) {
  return (
    <div className="max-w-md mx-auto h-screen bg-[#f8fcf9] flex items-center justify-center border-x border-slate-200">
      <div className="flex flex-col items-center gap-4">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Activity className="text-emerald-600" size={40} />
        </motion.div>
        <p className="text-emerald-800 font-bold text-sm animate-pulse">{text}</p>
      </div>
    </div>
  );
}

function ForgotPasswordView({ onBack }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({ 
        type: 'success', 
        text: 'Link reset password telah dikirim. Silakan cek inbox/spam email Anda.' 
      });
      setEmail('');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setMessage({ type: 'error', text: 'Email tidak terdaftar.' });
      } else {
        setMessage({ type: 'error', text: 'Gagal mengirim email. Coba lagi.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col items-center justify-center border-x border-slate-200 p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key className="text-emerald-600" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Lupa Password?</h1>
          <p className="text-sm font-medium text-slate-500">Masukkan email Anda untuk menerima link reset password.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          {message.text && (
            <div className={cn(
              "p-3 text-xs font-bold rounded-lg border text-center",
              message.type === 'error' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
            )}>
              {message.text}
            </div>
          )}
          <input 
            type="email" required placeholder="Alamat Email" 
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-colors"
          />
          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform flex items-center justify-center">
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : 'Kirim Link Reset'}
          </button>
        </form>

        <button onClick={onBack} className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1">
          <ChevronLeft size={14} /> Kembali ke Login
        </button>
      </div>
    </div>
  );
}

function LoginView({ onSwitch, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setError('Email atau password salah. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError('Gagal masuk dengan Google.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col items-center justify-center border-x border-slate-200 p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity className="text-emerald-600" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">SimpleSOAP</h1>
          <p className="text-sm font-medium text-slate-500">Masuk untuk mengakses rekam medis pasien.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-rose-100 text-center">{error}</div>}
          <div className="space-y-3">
            <input 
              type="email" required placeholder="Alamat Email" 
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
            <div className="space-y-1">
              <input 
                type="password" required placeholder="Password" 
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-colors"
              />
              <div className="flex justify-end">
                <button type="button" onClick={onForgotPassword} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Lupa Password?</button>
              </div>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform flex items-center justify-center">
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : 'Masuk'}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">Atau</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button type="button" onClick={handleGoogleLogin} disabled={isSubmitting} className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-3">
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Lanjutkan dengan Google
        </button>

        <p className="text-center text-xs font-bold text-slate-500">
          Belum memiliki akun? <button onClick={onSwitch} className="text-emerald-600 hover:underline">Daftar sekarang</button>
        </p>
      </div>
    </div>
  );
}

function RegisterView({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError('Gagal masuk dengan Google.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col items-center justify-center border-x border-slate-200 p-6 overflow-y-auto">
      <div className="w-full max-w-sm space-y-8 my-auto py-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Daftar Akun Baru</h1>
          <p className="text-xs font-medium text-slate-500">Akses terbatas khusus tenaga medis terdaftar.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-rose-100 text-center">{error}</div>}
          <div className="space-y-3">
            <input 
              type="email" required placeholder="Alamat Email" 
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
            <input 
              type="password" required placeholder="Password (Min. 6 karakter)" minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-slate-800 text-white font-black text-sm rounded-xl shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center mt-6">
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : 'Buat Akun'}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">Atau</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button type="button" onClick={handleGoogleRegister} disabled={isSubmitting} className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-3">
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Daftar dengan Google
        </button>

        <p className="text-center text-xs font-bold text-slate-500">
          Sudah terdaftar? <button onClick={onSwitch} className="text-emerald-600 hover:underline">Masuk di sini</button>
        </p>
      </div>
    </div>
  );
}

function OnboardingView({ user, onComplete }) {
  const [name, setName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Mohon lengkapi Nama Anda.");
      return;
    }
    
    setIsSubmitting(true);
    const profile = { 
      name, 
      credentials, 
      specialty, 
      email: user.email
    };
    
    try {
      const docRef = doc(db, 'doctors', user.uid);
      await setDoc(docRef, profile);
      onComplete(profile);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan profil. Pastikan koneksi stabil.");
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
          <p className="text-emerald-100 font-medium mt-2 text-sm">Sebelum mulai mengelola pasien, mari lengkapi identitas medis Anda.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl shadow-2xl space-y-4 mb-4 overflow-y-auto max-h-[60vh] no-scrollbar">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">NAMA LENGKAP & GELAR *</label>
            <input 
              type="text" required placeholder="Cth: dr. Andi Susanto, Sp.PD" 
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">NOMOR SIP / NIK (OPSIONAL)</label>
            <input 
              type="text" placeholder="Cth: SIP.123.456.789" 
              value={credentials} onChange={(e) => setCredentials(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">SPESIALISASI (OPSIONAL)</label>
            <input 
              type="text" placeholder="Cth: Penyakit Dalam / IGD" 
              value={specialty} onChange={(e) => setSpecialty(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform flex items-center justify-center mt-4">
            {isSubmitting ? <Activity className="animate-spin" size={20} /> : 'Ajukan Pendaftaran'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UnverifiedEmailView({ onLogout }) {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleResend = async () => {
    setIsResending(true);
    setMessage({ type: '', text: '' });
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMessage({ type: 'success', text: 'Email verifikasi telah dikirim ulang. Silakan cek inbox/spam Anda.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal mengirim email. Tunggu beberapa saat sebelum mencoba lagi.' });
    }
    setIsResending(false);
  };

  const handleReload = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-slate-50 flex flex-col items-center justify-center border-x border-slate-200 p-6 text-center space-y-6">
      <div className="bg-amber-100 p-4 rounded-full">
        <AlertTriangle className="text-amber-600" size={48} />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Verifikasi Email Anda</h1>
        <p className="text-sm font-medium text-slate-500">
          Link verifikasi telah dikirim ke <span className="font-bold text-slate-800">{auth.currentUser?.email}</span>. Silakan klik link tersebut untuk mengaktifkan akun Anda.
        </p>
      </div>

      {message.text && (
        <div className={cn(
          "w-full p-3 text-xs font-bold rounded-lg border",
          message.type === 'error' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
        )}
        >
          {message.text}
        </div>
      )}

      <div className="w-full space-y-3 pt-4">
        <button onClick={handleReload} className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
          <Activity size={18} /> Saya Sudah Verifikasi
        </button>
        <button onClick={handleResend} disabled={isResending} className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-transform">
          {isResending ? 'Mengirim...' : 'Kirim Ulang Email'}
        </button>
      </div>
      
      <button onClick={onLogout} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mt-6">
        <ChevronLeft size={14} /> Kembali ke Login
      </button>
    </div>
  );
}
