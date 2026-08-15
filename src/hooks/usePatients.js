import { useState, useEffect } from 'react';
import { subscribeToPatients } from '../lib/patients';

/**
 * usePatients — subscribes to real-time patient list from Firestore.
 * Only activates when user is authenticated and authView === 'app'.
 *
 * Returns:
 *   patients — array of patient objects (sorted by createdAt desc)
 *   loading  — true until first snapshot arrives
 */
export function usePatients(user, authView) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authView !== 'app') return;

    const unsubscribe = subscribeToPatients(
      user.uid,
      (data) => {
        setPatients(data);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore Error:', err.code, err.message);
        if (err.code === 'permission-denied') {
          alert('Gagal memuat data pasien. Pastikan Firestore Security Rules di Firebase Console sudah diizinkan.');
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authView]);

  return { patients, loading };
}
