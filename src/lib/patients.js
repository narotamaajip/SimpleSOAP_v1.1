/**
 * patients.js — Firestore access functions for the "patients" collection,
 * "shareCodes" collection, and "soapNotes" subcollection.
 *
 * Security & Data Policies:
 *   - updatePatientProfile() enforces a strict whitelist of safe fields.
 *   - deletePatient() defaults to Safe Soft-Delete (isDeleted: true).
 *   - permanentDeletePatient() allows permanent destruction with ownership check.
 *   - shareCodes are stored in a dedicated collection to allow cross-doctor lookup without permission-denied.
 *   - soapNotes are stored in subcollections with dual-fallback to patient.history for 100% backward compatibility.
 */

import {
  collection,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  deleteDoc,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import { getFormattedDate, getFormattedTime } from '../utils/timezone';

const PATIENTS_COL = 'patients';
const SHARE_CODES_COL = 'shareCodes';

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
      const todayStr = getFormattedDate();

      const data = snapshot.docs.map((docSnap) => {
        const docData = docSnap.data();
        const historyArray = docData.history || [];
        const isDischarged = docData.status === 'PULANG';
        const lastSoapDate = docData.lastSoapDate || (historyArray.length > 0
          ? historyArray[historyArray.length - 1].date
          : null);

        const isFollowedUpToday = lastSoapDate === todayStr;
        const displayStatus = isDischarged
          ? 'PULANG'
          : (isFollowedUpToday ? 'SUDAH FU' : 'BELUM FU');

        return {
          id: docSnap.id,
          ...docData,
          history: historyArray,
          isFollowedUp: isFollowedUpToday,
          status: displayStatus,
          isDeleted: !!docData.isDeleted
        };
      });

      // Client-side sort by createdAt descending with offline timestamp fallback
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.localTimestamp || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.localTimestamp || 0);
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
  const now = Date.now();

  const docRef = await addDoc(collection(db, PATIENTS_COL), {
    ...patientData,
    ownerId: userId,
    accessList: [userId],
    history: historyItem,
    isFollowedUp: !!initialSoapItem,
    status: initialSoapItem ? 'SUDAH FU' : 'BELUM FU',
    lastSoapDate: initialSoapItem ? initialSoapItem.date : null,
    lastSoapDoctor: initialSoapItem ? initialSoapItem.doctor : null,
    isDeleted: false,
    createdAt: serverTimestamp(),
    localTimestamp: now
  });

  // Also write initial SOAP to subcollection if provided
  if (initialSoapItem) {
    try {
      await addDoc(collection(db, PATIENTS_COL, docRef.id, 'soapNotes'), {
        ...initialSoapItem,
        authorId: userId,
        createdAt: serverTimestamp(),
        localTimestamp: now
      });
    } catch (err) {
      console.warn('Subcollection initial soap note write warning:', err);
    }
  }

  return docRef;
}

// ---------------------------------------------------------------------------
// updatePatientProfile
// WHITELIST: only writes safe, user-editable fields.
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
// softDeletePatient (Default Delete Action)
// Marks patient as isDeleted: true instead of destroying medical data.
// ---------------------------------------------------------------------------
export async function softDeletePatient(patientId, patient, currentUserId) {
  if (patient.ownerId && patient.ownerId !== currentUserId) {
    return {
      success: false,
      reason: 'permission_denied_client',
      message: 'Anda tidak memiliki izin untuk menghapus data pasien ini. Hanya dokter pembuat yang dapat menghapusnya.'
    };
  }

  try {
    const patientRef = doc(db, PATIENTS_COL, patientId);
    await updateDoc(patientRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: currentUserId
    });
    return { success: true };
  } catch (error) {
    console.error('Error soft-deleting patient:', error);
    return {
      success: false,
      message: getFriendlyErrorMessage(error, 'Gagal memindahkan pasien ke tempat sampah.')
    };
  }
}

// Alias deletePatient to softDeletePatient for safety
export const deletePatient = softDeletePatient;

// ---------------------------------------------------------------------------
// restorePatient
// Restores a soft-deleted patient back to the active patient list.
// ---------------------------------------------------------------------------
export async function restorePatient(patientId, currentUserId) {
  try {
    const patientRef = doc(db, PATIENTS_COL, patientId);
    await updateDoc(patientRef, {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    });
    return { success: true };
  } catch (error) {
    console.error('Error restoring patient:', error);
    return {
      success: false,
      message: getFriendlyErrorMessage(error, 'Gagal memulihkan pasien.')
    };
  }
}

// ---------------------------------------------------------------------------
// permanentDeletePatient (Hard Delete)
// Permanently removes the patient document from Firestore.
// ---------------------------------------------------------------------------
export async function permanentDeletePatient(patientId, patient, currentUserId) {
  if (patient.ownerId && patient.ownerId !== currentUserId) {
    return {
      success: false,
      reason: 'permission_denied_client',
      message: 'Anda tidak memiliki izin untuk memusnahkan data pasien ini.'
    };
  }

  try {
    // If patient had a shareCode, clean it up from shareCodes collection
    if (patient.shareCode) {
      try {
        await deleteDoc(doc(db, SHARE_CODES_COL, patient.shareCode));
      } catch (e) {
        console.warn('Could not clean up share code doc:', e);
      }
    }

    await deleteDoc(doc(db, PATIENTS_COL, patientId));
    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting patient:', error);
    return {
      success: false,
      message: getFriendlyErrorMessage(error, 'Gagal menghapus permanen data pasien.')
    };
  }
}

// ---------------------------------------------------------------------------
// subscribeToSoapNotes
// Listens to real-time notes in the subcollection patients/{patientId}/soapNotes.
// ---------------------------------------------------------------------------
export function subscribeToSoapNotes(patientId, onData, onError) {
  const notesRef = collection(db, PATIENTS_COL, patientId, 'soapNotes');
  const q = query(notesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      onData(notes);
    },
    (err) => {
      // If collection doesn't exist yet or offline, pass empty array
      if (onError) onError(err);
    }
  );
}

// ---------------------------------------------------------------------------
// addSoapEntry
// Writes to subcollection and updates parent patient summary.
// ---------------------------------------------------------------------------
export async function addSoapEntry(patientId, soapData, isDischarged, currentUserId) {
  const patientRef = doc(db, PATIENTS_COL, patientId);
  const now = Date.now();

  const fullSoapData = {
    ...soapData,
    authorId: currentUserId || null,
    createdAt: serverTimestamp(),
    localTimestamp: now
  };

  // 1. Write to subcollection (scalable, no 1MB limit)
  try {
    await addDoc(collection(db, PATIENTS_COL, patientId, 'soapNotes'), fullSoapData);
  } catch (err) {
    console.warn('Could not write to soapNotes subcollection, continuing with parent doc update:', err);
  }

  // 2. Update parent document status & lightweight history for backward-compatibility
  return updateDoc(patientRef, {
    status: isDischarged ? 'PULANG' : 'SUDAH FU',
    lastSoapDate: soapData.date,
    lastSoapDoctor: soapData.doctor,
    isFollowedUp: true,
    history: arrayUnion(soapData)
  });
}

// ---------------------------------------------------------------------------
// updateSoapEntry
// Updates an existing SOAP note with audit trail (isEdited, editedAt, editedBy).
// ---------------------------------------------------------------------------
export async function updateSoapEntry(patientId, editingSoapId, updatedSoapData, fullHistory, isDischarged, editorDoctorName) {
  const patientRef = doc(db, PATIENTS_COL, patientId);
  const editTimestamp = `${getFormattedDate()} ${getFormattedTime()}`;

  const auditedData = {
    ...updatedSoapData,
    isEdited: true,
    editedAt: editTimestamp,
    editedBy: editorDoctorName || 'Dokter'
  };

  // 1. Try to update in subcollection if editingSoapId is a subcollection doc ID
  if (typeof editingSoapId === 'string' && editingSoapId.length > 10) {
    try {
      const noteRef = doc(db, PATIENTS_COL, patientId, 'soapNotes', editingSoapId);
      await updateDoc(noteRef, {
        ...auditedData,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Subcollection note update skipped or not found:', err);
    }
  }

  // 2. Update in parent document history array
  const updatedHistory = (fullHistory || []).map((item) =>
    String(item.id) === String(editingSoapId) ? { ...item, ...auditedData } : item
  );

  return updateDoc(patientRef, {
    history: updatedHistory,
    ...(isDischarged && { status: 'PULANG' })
  });
}

// ---------------------------------------------------------------------------
// generateShareCode
// Generates a cryptographically secure 6-char code and registers in shareCodes collection.
// ---------------------------------------------------------------------------
export async function generateShareCode(patientId, patientName, ownerId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes confusable chars O,0,I,1
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const newCode = Array.from(randomBytes).map(b => chars[b % chars.length]).join('');

  // 1. Register in dedicated shareCodes collection
  await setDoc(doc(db, SHARE_CODES_COL, newCode), {
    patientId,
    patientName: patientName || 'Pasien',
    ownerId: ownerId || null,
    createdAt: serverTimestamp(),
    localTimestamp: Date.now()
  });

  // 2. Update patient document with shareCode
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
// First checks shareCodes collection (open to all authenticated doctors),
// with fallback to patients collection for legacy codes.
// ---------------------------------------------------------------------------
export async function findPatientByShareCode(shareCode) {
  const cleanCode = shareCode.trim().toUpperCase();

  try {
    // 1. Direct lookup in shareCodes collection
    const codeDoc = await getDoc(doc(db, SHARE_CODES_COL, cleanCode));
    if (codeDoc.exists()) {
      const codeData = codeDoc.data();
      const patientId = codeData.patientId;
      // Fetch minimal patient info or return codeData
      return { found: true, patientId, data: codeData };
    }
  } catch (err) {
    console.warn('Lookup in shareCodes collection error:', err);
  }

  // 2. Fallback query on patients collection
  try {
    const q = query(
      collection(db, PATIENTS_COL),
      where('shareCode', '==', cleanCode)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const first = snap.docs[0];
      return { found: true, patientId: first.id, data: first.data() };
    }
  } catch (err) {
    console.warn('Fallback patient query error:', err);
  }

  return { found: false };
}
