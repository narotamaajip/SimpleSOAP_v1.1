/**
 * src/lib/billing.js
 * Modul Billing & Hak Akses (Entitlement) SimpleSOAP
 *
 * Catatan Arsitektur & Keamanan:
 * TODO: Status plan/proUntil kelak HANYA boleh ditulis oleh server (via Firebase Cloud Functions / webhook handler).
 * TODO: Penegakan batas pasien dan foto HARUS di sisi server (Security Rules & Cloud Functions), karena pembatasan di klien saja tidak aman.
 *
 * Implementasi saat ini sepenuhnya MOCK (state lokal tersimpan di browser)
 * dan dapat diganti dengan penyedia pembayaran nyata (Midtrans/Xendit/Stripe)
 * tanpa mengubah antarmuka komponen UI.
 */

import { PLANS_CONFIG } from '../config/plans.js';
import { track, setUserPlanProperty } from './analytics.js';

const ENTITLEMENT_STORAGE_KEY = 'simplesoap_entitlement';

// Default initial state: Paket Gratis
const DEFAULT_STATE = {
  plan: 'free', // 'free' | 'pro'
  proUntil: null, // ISO string atau null
  checkoutState: 'idle', // 'idle' | 'pending' | 'success' | 'failed'
  selectedPlanId: null // 'monthly' | 'semi_annual' | 'yearly' | null
};

const listeners = new Set();

function readStoredState() {
  try {
    const raw = localStorage.getItem(ENTITLEMENT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    console.warn('Failed to parse billing entitlement:', e);
    return { ...DEFAULT_STATE };
  }
}

function writeStoredState(state) {
  try {
    localStorage.setItem(ENTITLEMENT_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to write billing entitlement:', e);
  }
  notifyListeners();
}

function notifyListeners() {
  const current = getEntitlement();
  listeners.forEach((listener) => {
    try {
      listener(current);
    } catch (e) {
      console.warn('Billing listener notification error:', e);
    }
  });
}

/**
 * Mengambil status hak akses (entitlement) pengguna saat ini.
 * Memeriksa masa aktif Pro dan menghitung status kedaluwarsa & H-7.
 */
export function getEntitlement() {
  const state = readStoredState();
  const now = Date.now();

  let effectivePlan = state.plan;
  let isExpired = false;
  let isExpiringSoon = false;
  let daysRemaining = null;

  if (state.plan === 'pro') {
    if (state.proUntil) {
      const untilMs = new Date(state.proUntil).getTime();
      const diffMs = untilMs - now;

      if (diffMs <= 0) {
        // Pro telah berakhir: otomatis turun kembali ke batas Gratis
        effectivePlan = 'free';
        isExpired = true;
        daysRemaining = 0;
      } else {
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 7) {
          isExpiringSoon = true;
        }
      }
    }
  }

  return {
    rawPlan: state.plan,
    plan: effectivePlan, // 'free' | 'pro'
    proUntil: state.proUntil,
    isExpired,
    isExpiringSoon,
    daysRemaining,
    checkoutState: state.checkoutState,
    selectedPlanId: state.selectedPlanId
  };
}

/**
 * Berlangganan perubahan status hak akses.
 * @param {(entitlement: ReturnType<typeof getEntitlement>) => void} callback
 * @returns {() => void} fungsi unsubscribe
 */
export function subscribeEntitlement(callback) {
  listeners.add(callback);
  // Panggil langsung dengan status awal
  callback(getEntitlement());
  return () => listeners.delete(callback);
}

/**
 * Memulai alur checkout (MOCK).
 * Mengubah checkoutState menjadi 'pending' dan mencatat analitik checkout_started.
 *
 * @param {'monthly' | 'semi_annual' | 'yearly'} planId
 */
export function startCheckout(planId) {
  const currentState = readStoredState();

  // Validasi ID paket
  const planInfo = PLANS_CONFIG.pro.pricing.find((p) => p.id === planId);
  if (!planInfo) {
    console.error('Invalid planId:', planId);
    return;
  }

  // TODO: Di masa depan, hubungi Cloud Function untuk membuat payment token / Snap URL
  track('checkout_started', { plan_id: planId });

  writeStoredState({
    ...currentState,
    checkoutState: 'pending',
    selectedPlanId: planId
  });
}

/**
 * Menyelesaikan alur checkout mock (Simulasi Berhasil / Gagal).
 *
 * @param {'monthly' | 'semi_annual' | 'yearly'} [planId]
 * @param {boolean} [success=true]
 */
export function completeMockCheckout(planId, success = true) {
  const currentState = readStoredState();
  const targetPlanId = planId || currentState.selectedPlanId || 'monthly';
  const planInfo = PLANS_CONFIG.pro.pricing.find((p) => p.id === targetPlanId) || PLANS_CONFIG.pro.pricing[0];

  if (success) {
    // Hitung tanggal kedaluwarsa baru (misal sekarang + X bulan)
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + planInfo.months);

    writeStoredState({
      plan: 'pro',
      proUntil: expiryDate.toISOString(),
      checkoutState: 'success',
      selectedPlanId: targetPlanId
    });

    setUserPlanProperty('pro');
    track('checkout_succeeded', { plan_id: targetPlanId });
  } else {
    writeStoredState({
      ...currentState,
      checkoutState: 'failed',
      selectedPlanId: targetPlanId
    });

    track('checkout_failed', { plan_id: targetPlanId });
  }
}

/**
 * Reset state modal checkout setelah user selesai atau menutup dialog.
 */
export function resetCheckoutState() {
  const currentState = readStoredState();
  writeStoredState({
    ...currentState,
    checkoutState: 'idle',
    selectedPlanId: null
  });
}

/**
 * Helper pengubah state MOCK untuk Developer Panel & testing langsung.
 *
 * @param {Object} override
 * @param {'free' | 'pro'} [override.plan]
 * @param {string | null} [override.proUntil]
 * @param {'idle' | 'pending' | 'success' | 'failed'} [override.checkoutState]
 * @param {'monthly' | 'semi_annual' | 'yearly' | null} [override.selectedPlanId]
 */
export function setMockEntitlement(override) {
  const currentState = readStoredState();
  const newState = {
    ...currentState,
    ...override
  };

  writeStoredState(newState);

  // Sync user property
  const effective = getEntitlement();
  setUserPlanProperty(effective.plan);
}
