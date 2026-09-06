import React, { Suspense, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LayoutGrid, Users, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { driver } from 'driver.js';
import { auth } from './lib/firebase';
import {
  addPatient,
  updatePatientProfile,
  deletePatient,
  restorePatient,
  permanentDeletePatient,
  addSoapEntry,
  updateSoapEntry
} from './lib/patients';
import { useAuth } from './hooks/useAuth';
import { usePatients } from './hooks/usePatients';
import { getFormattedDate, getFormattedTime } from './utils/timezone';

// --- UI Components ---
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { NavItem } from './components/ui/NavItem';
import { TourClosingModal } from './components/TourClosingModal';

// --- Views: eager-loaded (critical path) ---
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PatientListView } from './views/PatientListView';
import { PatientDetailView } from './views/PatientDetailView';
import { SettingsView } from './views/SettingsView';
import { SoapForm } from './views/SoapForm';
import { NewPatientSoapForm } from './views/NewPatientSoapForm';
import { EditPatientProfileForm } from './views/EditPatientProfileForm';

// --- Views: lazy-loaded ---
const RegisterView = React.lazy(() => import('./views/RegisterView'));
const OnboardingView = React.lazy(() => import('./views/OnboardingView'));
const ForgotPasswordView = React.lazy(() => import('./views/ForgotPasswordView'));
const UnverifiedEmailView = React.lazy(() => import('./views/UnverifiedEmailView'));

function AuthFallback() {
  return <LoadingSpinner text="Memuat..." />;
}

export default function SoapApp() {
  const { user, authView, setAuthView, doctorProfile, setDoctorProfile } = useAuth();
  const { patients, loading } = usePatients(user, authView);

  const [activeTab, setActiveTab] = useState('beranda');
  const [patientFilterCategory, setPatientFilterCategory] = useState('AKTIF');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [isAddingSoap, setIsAddingSoap] = useState(false);
  const [editingSoapId, setEditingSoapId] = useState(null);
  const [isAddingNewPatient, setIsAddingNewPatient] = useState(false);
  const [isEditingPatientProfile, setIsEditingPatientProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Onboarding Tour State ---
  const [isBrandNewDoctor, setIsBrandNewDoctor] = useState(false);
  const [tourStep, setTourStep] = useState(0); // 0 = inactive, 1..5 = steps, 6 = closing modal
  const driverRef = useRef(null);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  const stats = useMemo(() => {
    const activePatients = patients.filter((p) => !p.isDeleted && p.status !== 'PULANG');
    return {
      total: activePatients.length,
      followedUp: activePatients.filter((p) => p.isFollowedUp).length,
      pending: activePatients.filter((p) => !p.isFollowedUp).length
    };
  }, [patients]);

  // --- Trigger Tour only for brand new accounts completing onboarding ---
  useEffect(() => {
    if (authView === 'app' && isBrandNewDoctor && user && !loading) {
      const tourKey = `simplesoap_tour_done_${user.uid}`;
      if (!localStorage.getItem(tourKey)) {
        setActiveTab('beranda');
        setSelectedPatientId(null);
        setIsAddingNewPatient(false);
        setIsAddingSoap(false);
        setTourStep(1);
      }
    }
  }, [authView, isBrandNewDoctor, user, loading]);

  // --- Driver.js Highlight Manager ---
  useEffect(() => {
    if (tourStep === 0 || tourStep === 6) {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
      return;
    }

    const driverInstance = driver({
      showProgress: false,
      popoverClass: 'simplesoap-theme',
      allowClose: false,
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      stagePadding: 6,
      stageRadius: 12
    });
    driverRef.current = driverInstance;

    const timer = setTimeout(() => {
      try {
        if (tourStep === 1) {
          driverInstance.highlight({
            element: '#tour-nav-pasien',
            popover: {
              title: 'Daftar Pasien',
              description: 'Ini daftar pasien kamu, tempat semua catatan SOAP tersimpan.',
              side: 'top',
              showButtons: []
            }
          });
        } else if (tourStep === 2) {
          driverInstance.highlight({
            element: '#tour-add-patient-btn',
            popover: {
              title: 'Tambah Pasien Baru',
              description: 'Tap di sini untuk menambahkan pasien baru.',
              side: 'top',
              showButtons: []
            }
          });
        } else if (tourStep === 3) {
          driverInstance.highlight({
            element: '#tour-save-patient-btn',
            popover: {
              title: 'Simpan Data Pasien',
              description: 'Form ini sudah diisi contoh — coba tekan Simpan untuk lihat hasilnya.',
              side: 'top',
              showButtons: []
            }
          });
        } else if (tourStep === 4) {
          driverInstance.highlight({
            element: '#tour-sample-patient-card',
            popover: {
              title: 'Buka Detail Pasien',
              description: 'Ini pasienmu — tap untuk buka detail dan mulai catat SOAP.',
              side: 'bottom',
              showButtons: []
            }
          });
        } else if (tourStep === 5) {
          driverInstance.highlight({
            element: '#tour-add-soap-btn',
            popover: {
              title: 'Catat Follow-Up SOAP',
              description: 'Di sini tempat kamu mencatat follow-up harian pasien.',
              side: 'bottom',
              showButtons: []
            }
          });
        }
      } catch (err) {
        console.warn('Driver highlight error:', err);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, [tourStep, isAddingNewPatient, selectedPatientId, isAddingSoap]);

  // --- Skip & Finish Tour Handlers ---
  const skipTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    if (user) {
      localStorage.setItem(`simplesoap_tour_done_${user.uid}`, 'true');
    }
    setIsAddingNewPatient(false);
    setIsAddingSoap(false);
    setTourStep(0);
  }, [user]);

  const finishTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    if (user) {
      localStorage.setItem(`simplesoap_tour_done_${user.uid}`, 'true');
    }
    setIsAddingSoap(false);
    setTourStep(0);
  }, [user]);

  const startTourManually = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }
    setActiveTab('beranda');
    setSelectedPatientId(null);
    setIsAddingNewPatient(false);
    setIsAddingSoap(false);
    setIsEditingPatientProfile(false);
    setTourStep(1);
  }, []);

  // --- Handlers ---
  const handleSaveSoap = async (newSoap) => {
    if (!selectedPatientId || !selectedPatient) return;
    const { isDischarged, ...soapData } = newSoap;

    try {
      if (editingSoapId) {
        await updateSoapEntry(
          selectedPatientId,
          editingSoapId,
          soapData,
          selectedPatient.history,
          isDischarged,
          doctorProfile.name
        );
      } else {
        const soapEntry = {
          id: Date.now(),
          date: getFormattedDate(),
          time: getFormattedTime(),
          doctor: doctorProfile.name,
          ...soapData
        };
        await addSoapEntry(selectedPatientId, soapEntry, isDischarged, user.uid);
      }
      setIsAddingSoap(false);
      setEditingSoapId(null);
    } catch (error) {
      console.error('Error updating SOAP:', error);
      alert('Gagal menyimpan SOAP. Silakan periksa koneksi Anda.');
    }
  };

  const handleSavePatientProfile = async (updatedData) => {
    if (!selectedPatientId) return;
    try {
      await updatePatientProfile(selectedPatientId, updatedData);
      setIsEditingPatientProfile(false);
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const handleAddPatient = async (newPatient, initialSoap) => {
    try {
      const initialSoapItem = initialSoap
        ? {
            id: Date.now(),
            date: getFormattedDate(),
            time: getFormattedTime(),
            doctor: doctorProfile.name,
            ...initialSoap
          }
        : null;

      await addPatient(newPatient, user.uid, initialSoapItem);
      setIsAddingNewPatient(false);
      setActiveTab('pasien');

      if (tourStep === 3) {
        setTourStep(4);
      }
    } catch (error) {
      console.error('Error adding patient:', error);
    }
  };

  const handleDeletePatient = async (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return false;

    const result = await deletePatient(patientId, patient, user.uid);
    if (result.success) {
      alert('Pasien berhasil dipindahkan ke Tempat Sampah.');
      return true;
    } else {
      alert(result.message);
      return false;
    }
  };

  const handleRestorePatient = async (patientId) => {
    const result = await restorePatient(patientId, user.uid);
    if (result.success) {
      alert('Pasien berhasil dipulihkan ke daftar aktif.');
      return true;
    } else {
      alert(result.message);
      return false;
    }
  };

  const handlePermanentDeletePatient = async (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return false;

    const result = await permanentDeletePatient(patientId, patient, user.uid);
    if (result.success) {
      alert('Data pasien berhasil dimusnahkan secara permanen.');
      return true;
    } else {
      alert(result.message);
      return false;
    }
  };

  const handleTabClick = (tab) => {
    if (isAddingNewPatient || isAddingSoap) {
      if (window.confirm('Ada data yang belum disimpan. Yakin ingin pindah halaman?')) {
        setIsAddingNewPatient(false);
        setIsAddingSoap(false);
        setSelectedPatientId(null);
        setActiveTab(tab);
        if (tourStep === 1 && tab === 'pasien') {
          setTourStep(2);
        }
      }
    } else {
      setSelectedPatientId(null);
      setActiveTab(tab);
      if (tourStep === 1 && tab === 'pasien') {
        setTourStep(2);
      }
    }
  };

  // --- Auth views ---
  if (authView === 'loading') {
    return <LoadingSpinner text="Memeriksa Sesi Keamanan..." />;
  }

  if (authView === 'login') {
    return (
      <LoginView
        onSwitch={() => setAuthView('register')}
        onForgotPassword={() => setAuthView('forgotPassword')}
      />
    );
  }

  if (authView === 'register') {
    return (
      <Suspense fallback={<AuthFallback />}>
        <RegisterView onSwitch={() => setAuthView('login')} />
      </Suspense>
    );
  }

  if (authView === 'unverified') {
    return (
      <Suspense fallback={<AuthFallback />}>
        <UnverifiedEmailView onLogout={() => signOut(auth)} />
      </Suspense>
    );
  }

  if (authView === 'forgotPassword') {
    return (
      <Suspense fallback={<AuthFallback />}>
        <ForgotPasswordView onBack={() => setAuthView('login')} />
      </Suspense>
    );
  }

  if (authView === 'onboarding') {
    return (
      <Suspense fallback={<AuthFallback />}>
        <OnboardingView
          user={user}
          onComplete={(profile) => {
            setDoctorProfile(profile);
            setIsBrandNewDoctor(true);
            if (!user.emailVerified) {
              setAuthView('unverified');
            } else {
              setAuthView('app');
            }
          }}
        />
      </Suspense>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Menghubungkan ke Cloud..." />;
  }

  // --- Main App ---
  return (
    <div className="max-w-md mx-auto h-screen bg-[#f8fcf9] overflow-hidden font-sans relative flex flex-col border-x border-slate-200 shadow-2xl">
      {/* Floating Skip Tour Button */}
      {tourStep >= 1 && tourStep <= 5 && (
        <button
          onClick={skipTour}
          className="fixed top-4 right-4 z-[99999] bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm transition-all active:scale-95 border border-white/20 flex items-center gap-1.5"
        >
          <span>Lewati Tur</span>
          <span className="text-slate-400">✕</span>
        </button>
      )}

      {/* Tour Step 6: Closing Modal */}
      <AnimatePresence>
        {tourStep === 6 && <TourClosingModal onFinish={finishTour} />}
      </AnimatePresence>

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
              onAddSoap={() => {
                setIsAddingSoap(true);
                if (tourStep === 5) {
                  setTourStep(6);
                }
              }}
              onEditPatient={() => setIsEditingPatientProfile(true)}
              onEditSoap={(historyId) => {
                setEditingSoapId(historyId);
                setIsAddingSoap(true);
              }}
              onDeletePatient={handleDeletePatient}
            />
          ) : (
            <div className="h-full flex flex-col">
              {activeTab === 'beranda' && (
                <DashboardView
                  key="beranda"
                  patients={patients}
                  stats={stats}
                  doctorProfile={doctorProfile}
                  onSelectPatient={(id) => {
                    setSelectedPatientId(id);
                    if (tourStep === 4) {
                      setTourStep(5);
                    }
                  }}
                  onNavigateToPatients={(cat) => {
                    setPatientFilterCategory(cat);
                    setActiveTab('pasien');
                    if (tourStep === 1) {
                      setTourStep(2);
                    }
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
                  onSelectPatient={(id) => {
                    setSelectedPatientId(id);
                    if (tourStep === 4) {
                      setTourStep(5);
                    }
                  }}
                  onAddPatientClick={() => {
                    setIsAddingNewPatient(true);
                    if (tourStep === 2) {
                      setTourStep(3);
                    }
                  }}
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
                  onRestorePatient={handleRestorePatient}
                  onPermanentDeletePatient={handlePermanentDeletePatient}
                  onStartTour={startTourManually}
                />
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {isAddingNewPatient && (
          <NewPatientSoapForm
            isTourActive={tourStep === 3}
            defaultDpjp={doctorProfile?.name}
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
        <div id="tour-nav-pasien" className="flex items-center justify-center">
          <NavItem
            icon={<Users size={22} />}
            label="Pasien"
            active={activeTab === 'pasien' || !!selectedPatientId}
            onClick={() => handleTabClick('pasien')}
          />
        </div>
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
