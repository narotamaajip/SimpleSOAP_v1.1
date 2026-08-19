/**
 * patients.js — Firestore access functions for the "patients" collection.
 *
 * Whitelist policy:
 *   updatePatientProfile() only writes a fixed set of safe fields.
 *   It never touches ownerId, accessList, history, or status.
 *
 * Ownership policy:
 *   deletePatient() enforces client-side ownerId check before calling Firestore.
 *   If the current user did not create the patient, deletion is blocked immediately
 *   without hitting Firestore (matching original behavior in App.jsx).
 */

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { getFriendlyErrorMessage } from '../utils/friendlyError';

const PATIENTS_COL = 'patients';

// ---------------------------------------------------------------------------
// subscribeToPatients
// Subscribes to real-time patient list for a given userId (via accessList).
// Returns an unsubscribe function.
// ---------------------------------------------------------------------------
export function subscribeToPatients(userId, onData, onError) {
  const q = query(
    collection(db, PATIENTS_COL),
    where('accessList', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const todayStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      const data = snapshot.docs.map((docSnap) => {
        const docData = docSnap.data();
        const historyArray = docData.history || [];
        const isDischarged = docData.status === 'PULANG';
        const lastSoapDate = historyArray.length > 0
          ? historyArray[historyArray.length - 1].date
          : null;

        const isFollowedUpToday = lastSoapDate === todayStr;
        const displayStatus = isDischarged
          ? 'PULANG'
          : (isFollowedUpToday ? 'SUDAH FU' : 'BELUM FU');

        return {
          id: docSnap.id,
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

      onData(data);
    },
    onError
  );
}

// ---------------------------------------------------------------------------
// addPatient
// Creates a new patient document. history starts empty or with an initial SOAP.
// ---------------------------------------------------------------------------
export async function addPatient(patientData, userId, initialSoapItem) {
  const historyItem = initialSoapItem ? [initialSoapItem] : [];

  return addDoc(collection(db, PATIENTS_COL), {
    ...patientData,
    ownerId: userId,
    accessList: [userId],
    history: historyItem,
    isFollowedUp: !!initialSoapItem,
    status: initialSoapItem ? 'SUDAH FU' : 'BELUM FU',
    createdAt: serverTimestamp()
  });
}

// ---------------------------------------------------------------------------
// updatePatientProfile
// WHITELIST: only writes safe, user-editable fields.
// Never touches ownerId, accessList, history, status, createdAt, or shareCode.
// ---------------------------------------------------------------------------
export async function updatePatientProfile(patientId, updatedData) {
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

  const patientRef = doc(db, PATIENTS_COL, patientId);
  return updateDoc(patientRef, safeUpdate);
}

// ---------------------------------------------------------------------------
// deletePatient
// Enforces client-side ownerId check before hitting Firestore.
// Returns { success: true } or { success: false, reason: string }.
// ---------------------------------------------------------------------------
export async function deletePatient(patientId, patient, currentUserId) {
  // If ownerId exists and doesn't match current user → block immediately
  if (patient.ownerId && patient.ownerId !== currentUserId) {
    return {
      success: false,
      reason: 'permission_denied_client',
      message: 'Anda tidak memiliki izin untuk menghapus data pasien ini. Hanya dokter yang mendaftarkan pasien yang dapat menghapusnya.'
    };
  }

  try {
    await deleteDoc(doc(db, PATIENTS_COL, patientId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting patient:', error.code, error.message);
    return {
      success: false,
      reason: error.code === 'permission-denied' ? 'permission_denied_firestore' : 'unknown',
      message: error.code === 'permission-denied'
        ? 'Gagal menghapus: Anda tidak memiliki izin. Pastikan Anda adalah dokter yang mendaftarkan pasien ini.'
        : getFriendlyErrorMessage(error, 'Gagal menghapus data pasien. Silakan periksa koneksi Anda dan coba lagi.')
    };
  }
}

// ---------------------------------------------------------------------------
// addSoapEntry
// Appends a new SOAP entry to patient history via arrayUnion.
// ---------------------------------------------------------------------------
export async function addSoapEntry(patientId, soapData, isDischarged) {
  const patientRef = doc(db, PATIENTS_COL, patientId);
  return updateDoc(patientRef, {
    ...(isDischarged ? { status: 'PULANG' } : { status: 'SUDAH FU' }),
    history: arrayUnion(soapData)
  });
}

// ---------------------------------------------------------------------------
// updateSoapEntry
// Replaces the full history array (used when editing an existing SOAP entry).
// ---------------------------------------------------------------------------
export async function updateSoapEntry(patientId, updatedHistory, isDischarged) {
  const patientRef = doc(db, PATIENTS_COL, patientId);
  return updateDoc(patientRef, {
    history: updatedHistory,
    ...(isDischarged && { status: 'PULANG' })
  });
}

// ---------------------------------------------------------------------------
// generateShareCode
// Generates a cryptographically secure share code and saves it to Firestore.
// ---------------------------------------------------------------------------
export async function generateShareCode(patientId) {
  // Use Web Crypto API for cryptographically secure random code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes confusable chars O,0,I,1
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const newCode = Array.from(randomBytes).map(b => chars[b % chars.length]).join('');

  await updateDoc(doc(db, PATIENTS_COL, patientId), { shareCode: newCode });
  return newCode;
}

// ---------------------------------------------------------------------------
// addToAccessList
// Grants a user access to a patient document via arrayUnion on accessList.
// ---------------------------------------------------------------------------
export async function addToAccessList(patientId, userId) {
  return updateDoc(doc(db, PATIENTS_COL, patientId), {
    accessList: arrayUnion(userId)
  });
}

// ---------------------------------------------------------------------------
// findPatientByShareCode
// Returns { found: true, patientId, data } or { found: false }
// ---------------------------------------------------------------------------
export async function findPatientByShareCode(shareCode) {
  const q = query(
    collection(db, PATIENTS_COL),
    where('shareCode', '==', shareCode.trim().toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return { found: false };
  const first = snap.docs[0];
  return { found: true, patientId: first.id, data: first.data() };
}
