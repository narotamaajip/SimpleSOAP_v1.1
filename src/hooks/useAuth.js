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
  const [doctorProfile, setDoctorProfile] = useState({ name: 'dr. Tester', credentials: '' });

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
          console.error('Error fetching doctor profile', error);
          setAuthView('onboarding'); // Fallback to onboarding
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
