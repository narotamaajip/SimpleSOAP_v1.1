import { useState, useEffect, useRef } from 'react';
import { subscribeToPatients } from '../lib/patients';
import { getFriendlyErrorMessage } from '../utils/friendlyError';

/**
 * usePatients — subscribes to real-time patient list from Firestore.
 * Only activates when user is authenticated and authView === 'app'.
 *
 * Returns:
 *   patients — array of patient objects (sorted by createdAt desc)
 *   loading  — true until first snapshot arrives
 */
export function usePatients(user, authView, onError) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!user?.uid || authView !== 'app') return;

    const unsubscribe = subscribeToPatients(
      user.uid,
      (data) => {
        setPatients(data);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore Error:', err.code, err.message);
        const friendlyMsg = getFriendlyErrorMessage(err, 'Gagal memuat data pasien. Silakan periksa koneksi internet Anda.');
        if (onErrorRef.current) {
          onErrorRef.current(friendlyMsg);
        } else {
          console.warn('Patient listener notice:', friendlyMsg);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, authView]);

  return { patients, loading };
}
