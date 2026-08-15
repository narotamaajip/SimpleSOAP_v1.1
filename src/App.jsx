import React, { Suspense, useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LayoutGrid, Users, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  addPatient,
  updatePatientProfile,
  deletePatient,
  addSoapEntry,
  updateSoapEntry
} from './lib/patients';
import { useAuth } from './hooks/useAuth';
import { usePatients } from './hooks/usePatients';

// --- UI Components (always loaded, small footprint) ---
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { NavItem } from './components/ui/NavItem';

// --- Views: eager-loaded (critical path) ---
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PatientListView } from './views/PatientListView';
import { PatientDetailView } from './views/PatientDetailView';
import { SettingsView } from './views/SettingsView';
import { SoapForm } from './views/SoapForm';
import { NewPatientSoapForm } from './views/NewPatientSoapForm';
import { EditPatientProfileForm } from './views/EditPatientProfileForm';

// --- Views: lazy-loaded (not needed on initial load) ---
const RegisterView = React.lazy(() => import('./views/RegisterView'));
const OnboardingView = React.lazy(() => import('./views/OnboardingView'));
const ForgotPasswordView = React.lazy(() => import('./views/ForgotPasswordView'));
const UnverifiedEmailView = React.lazy(() => import('./views/UnverifiedEmailView'));

// Shared Suspense fallback
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

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  const stats = useMemo(() => {
    const activePatients = patients.filter((p) => p.status !== 'PULANG');
    return {
      total: activePatients.length,
      followedUp: activePatients.filter((p) => p.isFollowedUp).length,
      pending: activePatients.filter((p) => !p.isFollowedUp).length
    };
  }, [patients]);

  // --- Handlers ---

  const handleSaveSoap = async (newSoap) => {
    if (!selectedPatientId || !selectedPatient) return;
    const { isDischarged, ...soapData } = newSoap;

    try {
      if (editingSoapId) {
        const updatedHistory = selectedPatient.history.map((item) =>
          item.id === editingSoapId ? { ...item, ...soapData } : item
        );
        await updateSoapEntry(selectedPatientId, updatedHistory, isDischarged);
      } else {
        const soapEntry = {
          id: Date.now(),
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          doctor: doctorProfile.name,
          ...soapData
        };
        await addSoapEntry(selectedPatientId, soapEntry, isDischarged);
      }
      setIsAddingSoap(false);
      setEditingSoapId(null);
    } catch (error) {
      console.error('Error updating SOAP:', error);
    }
  };

  const handleSavePatientProfile = async (updatedData) => {
    if (!selectedPatientId) return;
    try {
      // updatePatientProfile enforces its own whitelist — no ownerId/accessList/history touched
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
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
            doctor: doctorProfile.name,
            ...initialSoap
          }
        : null;

      await addPatient(newPatient, user.uid, initialSoapItem);
      setIsAddingNewPatient(false);
      setActiveTab('pasien');
    } catch (error) {
      console.error('Error adding patient:', error);
    }
  };

  const handleDeletePatient = async (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return false;

    const result = await deletePatient(patientId, patient, user.uid);
    if (result.success) {
      alert('Data pasien berhasil dihapus.');
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
      }
    } else {
      setSelectedPatientId(null);
      setActiveTab(tab);
    }
  };

  // --- Auth views (gated by Suspense for lazy-loaded ones) ---

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
                  onSelectPatient={(id) => setSelectedPatientId(id)}
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
                  onSelectPatient={(id) => setSelectedPatientId(id)}
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

      {/* Add Patient Modal */}
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
          active={activeTab === 'pasien' || !!selectedPatientId}
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
