/**
 * friendlyError.js — User-friendly error message translator for Firebase Auth & Firestore.
 * Converts raw technical error codes into polite, informative Indonesian messages.
 */

const ERROR_MESSAGES = {
  // Firebase Auth Error Codes
  'auth/email-already-in-use': 'Alamat email ini sudah terdaftar. Silakan langsung masuk.',
  'auth/invalid-email': 'Format alamat email tidak valid. Mohon periksa kembali.',
  'auth/user-not-found': 'Akun dengan email tersebut tidak ditemukan. Silakan periksa kembali atau daftar.',
  'auth/wrong-password': 'Kata sandi salah. Silakan coba lagi atau gunakan opsi lupa kata sandi.',
  'auth/invalid-credential': 'Email atau kata sandi tidak sesuai. Silakan periksa kembali data Anda.',
  'auth/weak-password': 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.',
  'auth/too-many-requests': 'Terlalu banyak percobaan masuk yang gagal. Demi keamanan, silakan tunggu beberapa saat.',
  'auth/network-request-failed': 'Gagal terhubung ke server. Pastikan koneksi internet Anda aktif dan stabil.',
  'auth/popup-closed-by-user': 'Pendaftaran/masuk via Google dibatalkan sebelum selesai.',
  'auth/popup-blocked': 'Jendela Google Login diblokir oleh browser. Mohon izinkan pop-up untuk melanjutkan.',
  'auth/cancelled-popup-request': 'Proses masuk Google dibatalkan.',
  'auth/user-disabled': 'Akun ini telah dinonaktifkan. Silakan hubungi tim administrator.',
  'auth/operation-not-allowed': 'Metode masuk ini sedang dinonaktifkan sementara.',
  'auth/requires-recent-login': 'Sesi keamanan Anda telah berakhir. Silakan keluar dan masuk kembali.',

  // Firestore / App Error Codes
  'permission-denied': 'Anda tidak memiliki izin untuk mengakses atau mengubah data ini.',
  'permission_denied_client': 'Anda tidak memiliki izin untuk menghapus data pasien ini. Hanya dokter yang mendaftarkan pasien yang dapat menghapusnya.',
  'permission_denied_firestore': 'Gagal memproses: Anda tidak memiliki izin resmi pada data ini.',
  'unavailable': 'Koneksi database sedang offline. Data Anda tersimpan di memori lokal dan akan tersinkronisasi otomatis.',
  'not-found': 'Data yang dicari tidak ditemukan atau telah dihapus.'
};

/**
 * Returns a user-friendly error message in Indonesian.
 * @param {Error|string} error - The error object or error code string.
 * @param {string} [defaultMessage] - Optional custom fallback message.
 * @returns {string}
 */
export function getFriendlyErrorMessage(error, defaultMessage = 'Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.') {
  if (!error) return defaultMessage;

  // Extract code if it's an Error or Firebase object
  const code = typeof error === 'string' 
    ? error 
    : (error.code || error.message || '');

  if (ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  // Check if error code is contained within the message string
  for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
    if (code.includes(key)) {
      return msg;
    }
  }

  return defaultMessage;
}

export default getFriendlyErrorMessage;
