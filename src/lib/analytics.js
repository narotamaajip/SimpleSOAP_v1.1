/**
 * src/lib/analytics.js
 * Modul Pembungkus Firebase Analytics dengan Privacy Guard Ketat
 *
 * Kebijakan Privasi Medis:
 * 1. DILARANG KERAS mengirim data pasien (nama, inisial, no RM, diagnosis, SOAP, foto, alergi, dsb).
 * 2. DILARANG KERAS mengirim identitas dokter (nama dokter, email, SIP/STR).
 * 3. Parameter string hanya boleh bernilai ENUM yang telah terdaftar resmi di ALLOWED_EVENTS_SCHEMA.
 * 4. GA4 compliance: event snake_case <= 40 chars, max 25 params, nilai param <= 100 chars.
 */

import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserProperties,
  setUserId,
  setAnalyticsCollectionEnabled
} from 'firebase/analytics';
import app from './firebase.js';

// Schema resmi event & parameter yang DIIZINKAN (Strict Allowlist)
export const ALLOWED_EVENTS_SCHEMA = {
  sign_up: {
    allowedParams: {
      method: ['google', 'email']
    }
  },
  patient_added: {
    allowedParams: {
      active_bucket: ['1-5', '6-10', '11+']
    }
  },
  soap_saved: {
    allowedParams: {}
  },
  share_code_created: {
    allowedParams: {}
  },
  share_code_redeemed: {
    allowedParams: {}
  },
  paywall_viewed: {
    allowedParams: {
      trigger: ['patient_limit', 'photo', 'settings']
    }
  },
  paywall_dismissed: {
    allowedParams: {
      trigger: ['patient_limit', 'photo', 'settings']
    }
  },
  plan_selected: {
    allowedParams: {
      plan_id: ['monthly', 'semi_annual', 'yearly']
    }
  },
  checkout_started: {
    allowedParams: {
      plan_id: ['monthly', 'semi_annual', 'yearly']
    }
  },
  checkout_succeeded: {
    allowedParams: {
      plan_id: ['monthly', 'semi_annual', 'yearly']
    }
  },
  checkout_failed: {
    allowedParams: {
      plan_id: ['monthly', 'semi_annual', 'yearly']
    }
  }
};

// Storage key untuk preferensi privasi dokter
const ANALYTICS_CONSENT_KEY = 'simplesoap_analytics_enabled';

// Buffer event terakhir untuk Developer Panel (hanya dev/localhost)
export const recentAnalyticsEvents = [];
const MAX_RECENT_EVENTS = 20;
const subscribers = new Set();

export function subscribeToAnalyticsEvents(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb([...recentAnalyticsEvents]);
    } catch (e) {
      console.warn('Analytics subscriber error:', e);
    }
  });
}

/**
 * Validasi dan sanitasi event analytics dengan guard ketat.
 * Fungsi murni (pure function) yang dapat diuji dengan unit test.
 *
 * @param {string} eventName
 * @param {Record<string, any>} rawParams
 * @returns {{ valid: boolean, eventName?: string, sanitizedParams?: Record<string, any>, reason?: string }}
 */
export function validateAnalyticsEvent(eventName, rawParams = {}) {
  // 1. Validasi nama event
  if (typeof eventName !== 'string') {
    return { valid: false, reason: 'Event name must be a string' };
  }

  if (eventName.length > 40) {
    return { valid: false, reason: `Event name "${eventName}" exceeds 40 characters limit` };
  }

  if (!/^[a-z0-9_]+$/.test(eventName)) {
    return { valid: false, reason: `Event name "${eventName}" must be lowercase snake_case` };
  }

  const schema = ALLOWED_EVENTS_SCHEMA[eventName];
  if (!schema) {
    return { valid: false, reason: `Event "${eventName}" is not in the allowed events list` };
  }

  // 2. Validasi jumlah parameter
  const rawEntries = Object.entries(rawParams || {});
  if (rawEntries.length > 25) {
    return { valid: false, reason: `Event "${eventName}" exceeds maximum of 25 parameters` };
  }

  // 3. Sanitasi parameter: hanya teruskan key yang ada di allowedParams dan nilainya valid enum
  const sanitizedParams = {};
  const allowedKeys = Object.keys(schema.allowedParams);

  for (const [key, value] of rawEntries) {
    // Parameter di luar allowlist ditolak/dibuang
    if (!allowedKeys.includes(key)) {
      continue;
    }

    // Nilai string harus berada dalam set enum yang ditentukan
    const allowedEnums = schema.allowedParams[key];
    if (typeof value === 'string') {
      if (value.length > 100) {
        continue; // Tolak nilai yang melebihi 100 karakter
      }
      if (!allowedEnums.includes(value)) {
        // Nilai tidak valid dalam enum yang diizinkan
        continue;
      }
      sanitizedParams[key] = value;
    } else if (typeof value === 'number') {
      // Nilai numerik aman jika ada kebutuhan di masa depan
      sanitizedParams[key] = value;
    }
  }

  return {
    valid: true,
    eventName,
    sanitizedParams
  };
}

// Inisialisasi Firebase Analytics
let analyticsInstance = null;
let isInitialized = false;

export async function initAnalytics() {
  if (isInitialized) return analyticsInstance;

  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);

      // Cek preferensi user yang tersimpan
      const isEnabled = isAnalyticsEnabled();
      setAnalyticsCollectionEnabled(analyticsInstance, isEnabled);
    }
  } catch (err) {
    console.warn('Firebase Analytics not supported in this environment:', err);
  } finally {
    isInitialized = true;
  }

  return analyticsInstance;
}

/**
 * Cek apakah koleksi analitik diaktifkan oleh pengguna.
 * Default: true.
 * TODO: Default aktif perlu ditinjau penasihat hukum / legal counsel untuk kepatuhan regulasi lokal.
 */
export function isAnalyticsEnabled() {
  try {
    const stored = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (stored === null) {
      return true; // Default aktif
    }
    return stored === 'true';
  } catch (e) {
    return true;
  }
}

/**
 * Ubah persetujuan pengguna untuk analitik anonim.
 */
export function setAnalyticsConsent(enabled) {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, enabled ? 'true' : 'false');
    if (analyticsInstance) {
      setAnalyticsCollectionEnabled(analyticsInstance, enabled);
    }
  } catch (e) {
    console.warn('Failed to save analytics consent:', e);
  }
}

/**
 * Mengirim event analytics dengan perlindungan privasi.
 * Ini adalah SATU-SATUNYA jalur resmi pengiriman event analytics di SimpleSOAP.
 *
 * @param {string} eventName
 * @param {Record<string, any>} [params={}]
 */
export function track(eventName, params = {}) {
  // Cek apakah analitik dinonaktifkan oleh pengguna
  if (!isAnalyticsEnabled()) {
    if (import.meta.env.DEV) {
      console.log(`[Analytics Blocked (User Disabled)]`, eventName, params);
    }
    return;
  }

  const result = validateAnalyticsEvent(eventName, params);

  if (!result.valid) {
    if (import.meta.env.DEV) {
      console.warn(`[Analytics REJECTED] ${result.reason}`, { eventName, params });
    }
    return;
  }

  const { eventName: validName, sanitizedParams } = result;

  // Catat ke in-memory buffer untuk Developer Panel
  const logEntry = {
    id: Date.now() + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toLocaleTimeString(),
    eventName: validName,
    params: sanitizedParams,
    rawRejected: Object.keys(params).filter((k) => !Object.keys(sanitizedParams).includes(k))
  };
  recentAnalyticsEvents.unshift(logEntry);
  if (recentAnalyticsEvents.length > MAX_RECENT_EVENTS) {
    recentAnalyticsEvents.pop();
  }
  notifySubscribers();

  // Log ke console pada lingkungan localhost/dev
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local'));

  if (isLocalhost || import.meta.env.DEV) {
    console.log(
      `%c[Analytics Log]%c ${validName}`,
      'background: #0e7490; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
      'font-weight: bold; color: #0f172a;',
      sanitizedParams
    );

    if (logEntry.rawRejected.length > 0) {
      console.warn(
        `[Analytics Guard] Dibuang karena tidak terdaftar:`,
        logEntry.rawRejected
      );
    }
  }

  // Kirim ke Firebase Analytics HANYA jika ada flag env debug atau di production non-localhost
  const shouldSendToFirebase =
    import.meta.env.VITE_ANALYTICS_DEBUG === '1' || (!isLocalhost && !import.meta.env.DEV);

  if (shouldSendToFirebase && analyticsInstance) {
    try {
      const eventPayload =
        import.meta.env.VITE_ANALYTICS_DEBUG === '1'
          ? { ...sanitizedParams, debug_mode: true }
          : sanitizedParams;
      logEvent(analyticsInstance, validName, eventPayload);
    } catch (err) {
      console.warn('Analytics logEvent error:', err);
    }
  }
}

/**
 * Atur User Property: hanya 'plan' ('free' | 'pro') yang diperbolehkan.
 */
export function setUserPlanProperty(plan) {
  if (plan !== 'free' && plan !== 'pro') {
    console.warn(`[Analytics Guard] Invalid plan property: "${plan}". Must be "free" or "pro".`);
    return;
  }
  if (analyticsInstance && isAnalyticsEnabled()) {
    try {
      setUserProperties(analyticsInstance, { plan });
    } catch (e) {
      console.warn('Failed to set user plan property:', e);
    }
  }
}

/**
 * Atur User ID acak Firebase Auth saja (dilarang email atau nama dokter).
 */
export function setAuthUserId(uid) {
  if (!uid || typeof uid !== 'string') return;
  // Pastikan bukan email
  if (uid.includes('@')) {
    console.warn('[Analytics Guard] Dilarang menggunakan email sebagai user ID!');
    return;
  }
  if (analyticsInstance && isAnalyticsEnabled()) {
    try {
      setUserId(analyticsInstance, uid);
    } catch (e) {
      console.warn('Failed to set user ID:', e);
    }
  }
}
