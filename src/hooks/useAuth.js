import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

/**
 * useAuth — manages Firebase Authentication state and doctor profile.
 *
 * Returns:
 *   user          — Firebase User object or null
 *   authView      — 'loading' | 'login' | 'register' | 'onboarding' |
 *                   'unverified' | 'forgotPassword' | 'app'
 *   setAuthView   — setter for programmatic navigation between auth screens
 *   doctorProfile — { name, credentials, ... } from Firestore "doctors" collection
 *   setDoctorProfile — setter (used after onboarding or profile save)
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('loading');
  const [doctorProfile, setDoctorProfileState] = useState({ name: 'dr. Tester', credentials: '' });

  const setDoctorProfile = (profileOrUpdater) => {
    setDoctorProfileState((prev) => {
      const next = typeof profileOrUpdater === 'function' ? profileOrUpdater(prev) : profileOrUpdater;
      if (auth.currentUser?.uid && next) {
        try {
          localStorage.setItem(`simplesoap_doctor_profile_${auth.currentUser.uid}`, JSON.stringify(next));
        } catch (e) {
          console.warn('Could not cache doctor profile:', e);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        if (u.isAnonymous) {
          // Fallback for existing anonymous users
          setAuthView('app');
          return;
        }

        const cacheKey = `simplesoap_doctor_profile_${u.uid}`;

        try {
          const docRef = doc(db, 'doctors', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDoctorProfileState(data);
            try {
              localStorage.setItem(cacheKey, JSON.stringify(data));
            } catch (e) {
              console.warn('Could not cache doctor profile:', e);
            }
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
          console.error('Error fetching doctor profile', error);
          // Network/offline resilience: check cached profile before falling back to onboarding
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              setDoctorProfileState(parsed);
              setAuthView(parsed.status === 'pending' ? 'unverified' : 'app');
              return;
            }
            if (localStorage.getItem(`simplesoap_tour_done_${u.uid}`)) {
              setAuthView('app');
              return;
            }
          } catch (e) {
            console.warn('Error reading cached doctor profile:', e);
          }
          setAuthView('onboarding');
        }
      } else {
        setUser(null);
        setAuthView('login');
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, authView, setAuthView, doctorProfile, setDoctorProfile };
}
