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
  arrayRemove,
  deleteDoc,
  getDocs
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
  const isInitialDischarged = !!initialSoapItem?.isDischarged;

  const docRef = await addDoc(collection(db, PATIENTS_COL), {
    ...patientData,
    ownerId: userId,
    accessList: [userId],
    history: historyItem,
    isFollowedUp: !!initialSoapItem,
    status: isInitialDischarged ? 'PULANG' : (initialSoapItem ? 'SUDAH FU' : 'BELUM FU'),
    lastSoapDate: initialSoapItem ? initialSoapItem.date : null,
    lastSoapDoctor: initialSoapItem ? initialSoapItem.doctor : null,
    isDeleted: false,
    createdAt: serverTimestamp(),
    localTimestamp: now
  });

  // Also write initial SOAP to subcollection if provided (using same ID for lean consistency)
  if (initialSoapItem) {
    try {
      const noteDocId = String(initialSoapItem.id || now);
      await setDoc(doc(db, PATIENTS_COL, docRef.id, 'soapNotes', noteDocId), {
        ...initialSoapItem,
        id: initialSoapItem.id || now,
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
// getNoteTimestamp
// Helper for consistent chronological sorting (works both online & offline).
// ---------------------------------------------------------------------------
function getNoteTimestamp(note) {
  if (note.localTimestamp && typeof note.localTimestamp === 'number') {
    return note.localTimestamp;
  }
  if (note.createdAt?.toMillis) {
    return note.createdAt.toMillis();
  }
  const numId = Number(note.id);
  if (!isNaN(numId) && numId > 1000000000000) {
    return numId;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// mergeSoapHistory
// Merges legacy patient.history and subcollection soapNotes without losing
// older entries, deduplicating by note id, and sorting newest-first.
// ---------------------------------------------------------------------------
export function mergeSoapHistory(historyArray = [], subcollectionNotes = []) {
  const map = new Map();

  for (const item of historyArray) {
    if (item && item.id !== undefined) {
      map.set(String(item.id), item);
    }
  }

  for (const note of subcollectionNotes) {
    if (note && note.id !== undefined) {
      const key = String(note.id);
      const existing = map.get(key) || {};
      map.set(key, { ...existing, ...note });
    }
  }

  return Array.from(map.values()).sort((a, b) => getNoteTimestamp(b) - getNoteTimestamp(a));
}

// ---------------------------------------------------------------------------
// subscribeToSoapNotes
// Listens to real-time notes in the subcollection patients/{patientId}/soapNotes.
// ---------------------------------------------------------------------------
export function subscribeToSoapNotes(patientId, onData, onError) {
  const notesRef = collection(db, PATIENTS_COL, patientId, 'soapNotes');

  return onSnapshot(
    notesRef,
    (snapshot) => {
      const notes = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: data.id !== undefined ? data.id : d.id,
          _docId: d.id
        };
      });
      notes.sort((a, b) => getNoteTimestamp(b) - getNoteTimestamp(a));
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
  const noteId = soapData.id || now;

  const fullSoapData = {
    ...soapData,
    id: noteId,
    authorId: currentUserId || null,
    createdAt: serverTimestamp(),
    localTimestamp: now
  };

  // 1. Write to subcollection using consistent ID
  try {
    await setDoc(doc(db, PATIENTS_COL, patientId, 'soapNotes', String(noteId)), fullSoapData);
  } catch (err) {
    console.warn('Could not write to soapNotes subcollection, continuing with parent doc update:', err);
  }

  // 2. Update parent document status & lightweight history for backward-compatibility
  return updateDoc(patientRef, {
    status: isDischarged ? 'PULANG' : 'SUDAH FU',
    lastSoapDate: soapData.date,
    lastSoapDoctor: soapData.doctor,
    isFollowedUp: true,
    history: arrayUnion({ ...soapData, id: noteId })
  });
}

// ---------------------------------------------------------------------------
// updateSoapEntry
// Updates an existing SOAP note with audit trail (isEdited, editedAt, editedBy).
// ---------------------------------------------------------------------------
export async function updateSoapEntry(patientId, editingSoapId, updatedSoapData, fullHistory, isDischarged, editorDoctorName, subcollectionDocId) {
  const patientRef = doc(db, PATIENTS_COL, patientId);
  const editTimestamp = `${getFormattedDate()} ${getFormattedTime()}`;

  const auditedData = {
    ...updatedSoapData,
    isEdited: true,
    editedAt: editTimestamp,
    editedBy: editorDoctorName || 'Dokter'
  };

  // 1. Update in subcollection (matching either _docId or String(editingSoapId))
  const targetDocId = subcollectionDocId || String(editingSoapId);
  try {
    const noteRef = doc(db, PATIENTS_COL, patientId, 'soapNotes', targetDocId);
    await updateDoc(noteRef, {
      ...auditedData,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Subcollection note update skipped or not found:', err);
  }

  // 2. Update in parent document history array
  const updatedHistory = (fullHistory || []).map((item) =>
    String(item.id) === String(editingSoapId) ? { ...item, ...auditedData } : item
  );

  return updateDoc(patientRef, {
    history: updatedHistory,
    ...(typeof isDischarged === 'boolean' && { status: isDischarged ? 'PULANG' : 'SUDAH FU' })
  });
}

// ---------------------------------------------------------------------------
// generateShareCode
// Generates a cryptographically secure 6-char code and registers in shareCodes collection.
// If previousCode is provided, cleanly removes the old shareCode document.
// ---------------------------------------------------------------------------
export async function generateShareCode(patientId, patientName, ownerId, previousCode) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes confusable chars O,0,I,1
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const newCode = Array.from(randomBytes).map(b => chars[b % chars.length]).join('');

  // 1. If previous code existed, clean it up from shareCodes collection
  if (previousCode && previousCode !== newCode) {
    try {
      await deleteDoc(doc(db, SHARE_CODES_COL, previousCode.trim().toUpperCase()));
    } catch (e) {
      console.warn('Could not clean up previous shareCode document:', e);
    }
  }

  // 2. Register in dedicated shareCodes collection
  await setDoc(doc(db, SHARE_CODES_COL, newCode), {
    patientId,
    patientName: patientName || 'Pasien',
    ownerId: ownerId || null,
    createdAt: serverTimestamp(),
    localTimestamp: Date.now()
  });

  // 3. Update patient document with shareCode
  await updateDoc(doc(db, PATIENTS_COL, patientId), { shareCode: newCode });
  return newCode;
}

// ---------------------------------------------------------------------------
// ensureShareCodeRegistered
// Guarantees that an existing shareCode on a patient is registered in the
// shareCodes collection (fixes older patients created before shareCodes was introduced).
// ---------------------------------------------------------------------------
export async function ensureShareCodeRegistered(patientId, patientName, ownerId, existingCode) {
  if (!existingCode || typeof existingCode !== 'string') return null;
  const cleanCode = existingCode.trim().toUpperCase();
  if (cleanCode.length < 4) return null;

  try {
    const codeRef = doc(db, SHARE_CODES_COL, cleanCode);
    const snap = await getDoc(codeRef);
    if (!snap.exists()) {
      await setDoc(codeRef, {
        patientId,
        patientName: patientName || 'Pasien',
        ownerId: ownerId || null,
        createdAt: serverTimestamp(),
        localTimestamp: Date.now()
      });
    }
    return cleanCode;
  } catch (err) {
    console.warn('ensureShareCodeRegistered warning:', err);
    return cleanCode;
  }
}

// ---------------------------------------------------------------------------
// revokeShareCode
// Inactivates an existing share code so no new doctors can use it.
// ---------------------------------------------------------------------------
export async function revokeShareCode(patientId, existingCode) {
  if (existingCode) {
    try {
      await deleteDoc(doc(db, SHARE_CODES_COL, existingCode.trim().toUpperCase()));
    } catch (e) {
      console.warn('Could not delete revoked share code from collection:', e);
    }
  }
  return updateDoc(doc(db, PATIENTS_COL, patientId), { shareCode: null });
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
// removeFromAccessList
// Collaborator leaves a patient: removes user UID from accessList via arrayRemove.
// ---------------------------------------------------------------------------
export async function removeFromAccessList(patientId, userId) {
  return updateDoc(doc(db, PATIENTS_COL, patientId), {
    accessList: arrayRemove(userId)
  });
}

// ---------------------------------------------------------------------------
// findPatientByShareCode
// Looks up a 6-digit code in the shareCodes collection (open to all doctors via getDoc).
// ---------------------------------------------------------------------------
export async function findPatientByShareCode(shareCode) {
  if (!shareCode || typeof shareCode !== 'string') return { found: false };
  const cleanCode = shareCode.trim().toUpperCase();
  if (cleanCode.length < 4) return { found: false, reason: 'invalid_format' };

  try {
    const codeDoc = await getDoc(doc(db, SHARE_CODES_COL, cleanCode));
    if (codeDoc.exists()) {
      const codeData = codeDoc.data();
      const patientId = codeData.patientId;
      return { found: true, patientId, data: codeData };
    }
  } catch (err) {
    console.warn('Lookup in shareCodes collection error:', err);
    return { found: false, error: err };
  }

  return { found: false };
}
