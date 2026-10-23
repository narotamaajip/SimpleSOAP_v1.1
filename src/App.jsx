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
import { useDialog } from './context/DialogContext';
import { getFormattedDate, getFormattedTime } from './utils/timezone';

// --- UI Components ---
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { NavItem } from './components/ui/NavItem';
import { AmbientBackground } from './components/ui/AmbientBackground';
import { TourClosingModal } from './components/TourClosingModal';
import { PaywallBottomSheet } from './components/PaywallBottomSheet.jsx';
import { MockCheckoutModal } from './components/MockCheckoutModal.jsx';
import { DevPanel } from './components/DevPanel.jsx';
import { initAnalytics, setAuthUserId, setUserPlanProperty, track } from './lib/analytics.js';
import { getEntitlement, subscribeEntitlement, resetCheckoutState } from './lib/billing.js';

// --- Views: eager-loaded (critical path) ---
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PatientListView } from './views/PatientListView';
import { PatientDetailView } from './views/PatientDetailView';
import { SettingsView } from './views/SettingsView';
import { SubscriptionView } from './views/SubscriptionView.jsx';
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

function waitForElement(selector, timeout = 2500) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const start = Date.now();
    const interval = setInterval(() => {
      const found = document.querySelector(selector);
      if (found) {
        clearInterval(interval);
        resolve(found);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        resolve(null);
      }
    }, 40);
  });
}

export default function SoapApp() {
  const { confirm, alert: showAlert } = useDialog();
  const { user, authView, setAuthView, doctorProfile, setDoctorProfile } = useAuth();
  const { patients, loading } = usePatients(user, authView, (msg) =>
    showAlert({ title: 'Koneksi Terputus', message: msg, variant: 'warning' })
  );

  const [activeTab, setActiveTab] = useState('beranda');
  const [patientFilterCategory, setPatientFilterCategory] = useState('AKTIF');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [isAddingSoap, setIsAddingSoap] = useState(false);
  const [editingSoapId, setEditingSoapId] = useState(null);
  const [activePatientNotes, setActivePatientNotes] = useState([]);
  const [isAddingNewPatient, setIsAddingNewPatient] = useState(false);
  const [isEditingPatientProfile, setIsEditingPatientProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isViewingSubscription, setIsViewingSubscription] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState(null); // 'patient_limit' | 'photo' | 'settings' | null
  const [entitlement, setEntitlement] = useState(() => getEntitlement());
  const [mockPatientCount, setMockPatientCount] = useState(null);

  // Subscribe to billing entitlement changes
  useEffect(() => {
    const unsub = subscribeEntitlement((newEnt) => {
      setEntitlement(newEnt);
    });
    return () => unsub();
  }, []);

  // Initialize Analytics & set User Properties
  useEffect(() => {
    if (user?.uid) {
      initAnalytics().then(() => {
        setAuthUserId(user.uid);
        setUserPlanProperty(entitlement.plan);
      });
    }
  }, [user?.uid, entitlement.plan]);

  // --- Browser History (Android Back Button / Swipe Back) Sync ---
  const overlayDepth = useMemo(() => {
    if (isAddingSoap || isEditingPatientProfile) return 2;
    if (selectedPatientId || isAddingNewPatient || isViewingSubscription) return 1;
    return 0;
  }, [selectedPatientId, isAddingNewPatient, isAddingSoap, isEditingPatientProfile, isViewingSubscription]);

  const prevDepthRef = useRef(0);
  const isPopStateRef = useRef(false);

  useEffect(() => {
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      prevDepthRef.current = overlayDepth;
      return;
    }
    if (overlayDepth > prevDepthRef.current) {
      window.history.pushState({ depth: overlayDepth }, '');
    }
    prevDepthRef.current = overlayDepth;
  }, [overlayDepth]);

  useEffect(() => {
    const handlePopState = () => {
      if (isAddingSoap) {
        isPopStateRef.current = true;
        setIsAddingSoap(false);
        setEditingSoapId(null);
      } else if (isEditingPatientProfile) {
        isPopStateRef.current = true;
        setIsEditingPatientProfile(false);
      } else if (isAddingNewPatient) {
        isPopStateRef.current = true;
        setIsAddingNewPatient(false);
      } else if (isViewingSubscription) {
        isPopStateRef.current = true;
        setIsViewingSubscription(false);
      } else if (selectedPatientId) {
        isPopStateRef.current = true;
        setSelectedPatientId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAddingSoap, isEditingPatientProfile, isAddingNewPatient, isViewingSubscription, selectedPatientId]);

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

    let isCancelled = false;

    const driverInstance = driver({
      showProgress: false,
      popoverClass: 'simplesoap-theme',
      allowClose: false,
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      stagePadding: 8,
      stageRadius: tourStep === 2 ? 30 : 16
    });
    driverRef.current = driverInstance;

    const runTourStep = async () => {
      try {
        if (tourStep === 1) {
          const el = await waitForElement('#tour-nav-pasien');
          if (isCancelled || !el) return;
          driverInstance.highlight({
            element: el,
            popover: {
              title: 'Daftar Pasien',
              description: 'Ini daftar pasien kamu, tempat semua catatan SOAP tersimpan.',
              side: 'top',
              nextBtnText: 'Buka Daftar Pasien',
              showButtons: ['next'],
              onNextClick: () => {
                setActiveTab('pasien');
                setTourStep(2);
              }
            }
          });
        } else if (tourStep === 2) {
          const el = await waitForElement('#tour-add-patient-btn');
          if (isCancelled || !el) return;
          driverInstance.highlight({
            element: el,
            popover: {
              title: 'Tambah Pasien Baru',
              description: 'Tap tombol (+) atau tombol di bawah ini untuk menambahkan pasien baru.',
              side: 'top',
              nextBtnText: '+ Tambah Pasien',
              showButtons: ['next'],
              onNextClick: () => {
                setIsAddingNewPatient(true);
                setTourStep(3);
              }
            }
          });
        } else if (tourStep === 3) {
          const el = await waitForElement('#tour-save-patient-btn');
          if (isCancelled || !el) return;
          driverInstance.highlight({
            element: el,
            popover: {
              title: 'Simpan Data Pasien',
              description: 'Form ini sudah diisi contoh — coba tekan Simpan untuk lihat hasilnya.',
              side: 'top',
              showButtons: []
            }
          });
        } else if (tourStep === 4) {
          const el = await waitForElement('#tour-sample-patient-card');
          if (isCancelled || !el) return;
          driverInstance.highlight({
            element: el,
            popover: {
              title: 'Buka Detail Pasien',
              description: 'Ini pasienmu — tap untuk buka detail dan mulai catat SOAP.',
              side: 'bottom',
              showButtons: []
            }
          });
        } else if (tourStep === 5) {
          const el = await waitForElement('#tour-add-soap-btn');
          if (isCancelled || !el) return;
          driverInstance.highlight({
            element: el,
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
    };

    const timer = setTimeout(runTourStep, 80);

    return () => {
      isCancelled = true;
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
        const matchedNote = activePatientNotes.find((n) => String(n.id) === String(editingSoapId));
        await updateSoapEntry(
          selectedPatientId,
          editingSoapId,
          soapData,
          selectedPatient.history,
          isDischarged,
          doctorProfile.name,
          matchedNote?._docId
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
      track('soap_saved');
    } catch (error) {
      console.error('Error updating SOAP:', error);
      showAlert({
        title: 'Gagal Menyimpan',
        message: 'Gagal menyimpan catatan SOAP. Silakan periksa koneksi Anda.',
        variant: 'danger'
      });
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

      const nextActiveCount = patients.filter((p) => !p.isDeleted && p.status !== 'PULANG').length + 1;
      let bucket = '1-5';
      if (nextActiveCount > 10) bucket = '11+';
      else if (nextActiveCount > 5) bucket = '6-10';
      track('patient_added', { active_bucket: bucket });

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
      showAlert({
        title: 'Tempat Sampah',
        message: `Data pasien "${patient.name}" berhasil dipindahkan ke Tempat Sampah.`,
        variant: 'success'
      });
      return true;
    } else {
      showAlert({
        title: 'Gagal Menghapus',
        message: result.message || 'Terjadi kesalahan.',
        variant: 'danger'
      });
      return false;
    }
  };

  const handleRestorePatient = async (patientId) => {
    const result = await restorePatient(patientId, user.uid);
    if (result.success) {
      showAlert({
        title: 'Pasien Dipulihkan',
        message: 'Pasien berhasil dipulihkan kembali ke daftar aktif.',
        variant: 'success'
      });
      return true;
    } else {
      showAlert({
        title: 'Gagal Memulihkan',
        message: result.message || 'Terjadi kesalahan.',
        variant: 'danger'
      });
      return false;
    }
  };

  const handlePermanentDeletePatient = async (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return false;

    const result = await permanentDeletePatient(patientId, patient, user.uid);
    if (result.success) {
      showAlert({
        title: 'Data Dimusnahkan',
        message: 'Data pasien berhasil dimusnahkan secara permanen dari server.',
        variant: 'success'
      });
      return true;
    } else {
      showAlert({
        title: 'Gagal Memusnahkan',
        message: result.message || 'Terjadi kesalahan.',
        variant: 'danger'
      });
      return false;
    }
  };

  const handleTabClick = async (tab) => {
    if (isAddingNewPatient || isAddingSoap) {
      const ok = await confirm({
        title: 'Tinggalkan Halaman?',
        message: 'Ada perubahan data yang belum disimpan. Yakin ingin pindah halaman?',
        confirmText: 'Pindah Halaman',
        cancelText: 'Tetap di Sini',
        variant: 'warning'
      });
      if (!ok) return;

      setIsAddingNewPatient(false);
      setIsAddingSoap(false);
      setIsViewingSubscription(false);
      setSelectedPatientId(null);
      setActiveTab(tab);
      if (tourStep === 1 && tab === 'pasien') {
        setTourStep(2);
      }
    } else {
      setIsViewingSubscription(false);
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
    <div className="max-w-md mx-auto h-screen h-[100dvh] liquid-canvas overflow-hidden font-sans relative flex flex-col border-x border-white/60 shadow-2xl">
      <AmbientBackground />

      {/* Floating Skip Tour Button */}
      {tourStep >= 1 && tourStep <= 5 && (
        <button
          onClick={skipTour}
          className="fixed top-4 right-4 z-[99999] bg-slate-900/75 hover:bg-slate-900/90 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 border border-white/30 flex items-center gap-1.5"
        >
          <span>Lewati Tur</span>
          <span className="text-slate-300">✕</span>
        </button>
      )}

      {/* Tour Step 6: Closing Modal */}
      <AnimatePresence>
        {tourStep === 6 && <TourClosingModal onFinish={finishTour} />}
      </AnimatePresence>

      <div className="flex-1 overflow-hidden relative z-10 flex flex-col">
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
              notes={activePatientNotes}
              editingSoapId={editingSoapId}
              onBack={() => {
                setIsAddingSoap(false);
                setEditingSoapId(null);
              }}
              onSave={handleSaveSoap}
              entitlement={entitlement}
              onOpenPaywall={(trigger) => setPaywallTrigger(trigger || 'photo')}
            />
          ) : isViewingSubscription ? (
            <SubscriptionView
              key="subscription"
              entitlement={entitlement}
              activePatientCount={mockPatientCount !== null ? mockPatientCount : stats.total}
              onBack={() => setIsViewingSubscription(false)}
              onOpenPaywall={() => setPaywallTrigger('settings')}
            />
          ) : selectedPatientId ? (
            <PatientDetailView
              key="detail"
              patient={selectedPatient}
              onBack={() => setSelectedPatientId(null)}
              onAddSoap={(notesList) => {
                setActivePatientNotes(notesList || []);
                setIsAddingSoap(true);
                if (tourStep === 5) {
                  setTourStep(6);
                }
              }}
              onEditPatient={() => setIsEditingPatientProfile(true)}
              onEditSoap={(historyId, notesList) => {
                setActivePatientNotes(notesList || []);
                setEditingSoapId(historyId);
                setIsAddingSoap(true);
              }}
              onDeletePatient={handleDeletePatient}
            />
          ) : (
            <div className="h-full flex flex-col">
              <AnimatePresence mode="wait">
                {activeTab === 'beranda' && (
                  <DashboardView
                    key="beranda"
                    patients={patients}
                    stats={stats}
                    doctorProfile={doctorProfile}
                    entitlement={entitlement}
                    activeCountOverride={mockPatientCount}
                    onOpenPaywall={() => setPaywallTrigger('settings')}
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
                    entitlement={entitlement}
                    activeCountOverride={mockPatientCount}
                    onOpenPaywall={(trigger) => setPaywallTrigger(trigger || 'patient_limit')}
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
                    isTourActive={tourStep === 2}
                  />
                )}
                {activeTab === 'pengaturan' && (
                  <SettingsView
                    key="pengaturan"
                    doctorProfile={doctorProfile}
                    setDoctorProfile={setDoctorProfile}
                    patients={patients}
                    currentUserId={user?.uid}
                    entitlement={entitlement}
                    onNavigateToSubscription={() => setIsViewingSubscription(true)}
                    onDeletePatient={handleDeletePatient}
                    onRestorePatient={handleRestorePatient}
                    onPermanentDeletePatient={handlePermanentDeletePatient}
                    onStartTour={startTourManually}
                  />
                )}
              </AnimatePresence>
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
      <div className="glass-bar border-t flex items-center justify-around py-1.5 pb-3 z-40">
        <NavItem
          icon={<LayoutGrid size={19} />}
          label="Beranda"
          active={activeTab === 'beranda' && !selectedPatientId && !isViewingSubscription}
          onClick={() => handleTabClick('beranda')}
        />
        <div id="tour-nav-pasien" className="flex items-center justify-center">
          <NavItem
            icon={<Users size={19} />}
            label="Pasien"
            active={(activeTab === 'pasien' || !!selectedPatientId) && !isViewingSubscription}
            onClick={() => handleTabClick('pasien')}
          />
        </div>
        <NavItem
          icon={<Settings size={19} />}
          label="Pengaturan"
          active={(activeTab === 'pengaturan' || isViewingSubscription) && !selectedPatientId}
          onClick={() => handleTabClick('pengaturan')}
        />
      </div>

      {/* Paywall Bottom Sheet */}
      <PaywallBottomSheet
        isOpen={!!paywallTrigger}
        trigger={paywallTrigger || 'patient_limit'}
        onClose={() => setPaywallTrigger(null)}
      />

      {/* Mock Checkout Modal (Menunggu Pembayaran, Berhasil, Gagal) */}
      <MockCheckoutModal
        checkoutState={entitlement.checkoutState}
        selectedPlanId={entitlement.selectedPlanId}
        onClose={() => resetCheckoutState()}
      />

      {/* Developer Testing Panel (Localhost only) */}
      <DevPanel
        mockPatientCount={mockPatientCount}
        onSetMockPatientCount={setMockPatientCount}
      />
    </div>
  );
}
