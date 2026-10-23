import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnalyticsEvent } from '../src/lib/analytics.js';

test('Analytics Privacy Guard: Menerima event resmi dengan parameter enum yang valid', () => {
  const result = validateAnalyticsEvent('paywall_viewed', { trigger: 'patient_limit' });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.eventName, 'paywall_viewed');
  assert.deepStrictEqual(result.sanitizedParams, { trigger: 'patient_limit' });
});

test('Analytics Privacy Guard: Menerima event tanpa parameter', () => {
  const result = validateAnalyticsEvent('soap_saved', {});
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.eventName, 'soap_saved');
  assert.deepStrictEqual(result.sanitizedParams, {});
});

test('Analytics Privacy Guard: Menolak event yang tidak ada dalam daftar izin', () => {
  const result = validateAnalyticsEvent('user_clicked_random_button', {});
  assert.strictEqual(result.valid, false);
  assert.match(result.reason, /not in the allowed events list/i);
});

test('Analytics Privacy Guard: Menyaring dan MEMBUANG parameter data medis / identitas dokter', () => {
  // Simulasi developer atau fungsi yang tidak sengaja menyisipkan data sensitif pasien & dokter
  const rawParamsWithPii = {
    trigger: 'photo',
    patient_name: 'Budi Santoso',
    initials: 'BS',
    rm: 'RM-99482',
    diagnosis: 'Pneumonia aspirasi',
    soap_content: 'S: sesak bertambah, O: SpO2 88%',
    share_code: 'XK92LP',
    doctor_name: 'dr. Andi Sp.PD',
    email: 'andi@dokter.id'
  };

  const result = validateAnalyticsEvent('paywall_viewed', rawParamsWithPii);
  assert.strictEqual(result.valid, true);

  // Pastikan SEMUA data medis dan identitas dibuang, HANYA parameter allowlist yang lolos
  assert.deepStrictEqual(result.sanitizedParams, { trigger: 'photo' });
  assert.strictEqual(result.sanitizedParams.patient_name, undefined);
  assert.strictEqual(result.sanitizedParams.rm, undefined);
  assert.strictEqual(result.sanitizedParams.diagnosis, undefined);
  assert.strictEqual(result.sanitizedParams.soap_content, undefined);
  assert.strictEqual(result.sanitizedParams.share_code, undefined);
  assert.strictEqual(result.sanitizedParams.doctor_name, undefined);
  assert.strictEqual(result.sanitizedParams.email, undefined);
});

test('Analytics Privacy Guard: Menolak nilai string di luar enum yang ditentukan (bukan teks bebas)', () => {
  // Nilai sembarangan tidak boleh lolos meskipun nama key diizinkan
  const result = validateAnalyticsEvent('paywall_viewed', { trigger: 'free_text_trigger_dari_input_user' });
  assert.strictEqual(result.valid, true);
  // Karena 'free_text_trigger_dari_input_user' bukan enum ('patient_limit' | 'photo' | 'settings'), nilainya harus dibuang
  assert.deepStrictEqual(result.sanitizedParams, {});
});

test('Analytics Privacy Guard: Validasi batas GA4 (snake_case, <= 40 karakter, max 25 params)', () => {
  // Event dengan huruf kapital harus ditolak
  const uppercaseResult = validateAnalyticsEvent('Paywall_Viewed', { trigger: 'patient_limit' });
  assert.strictEqual(uppercaseResult.valid, false);

  // Event > 40 karakter harus ditolak
  const longName = 'this_is_an_extremely_long_event_name_that_exceeds_ga4_limit_of_forty_characters';
  const longResult = validateAnalyticsEvent(longName, {});
  assert.strictEqual(longResult.valid, false);

  // Validasi active_bucket enum pada patient_added
  const validBucket = validateAnalyticsEvent('patient_added', { active_bucket: '6-10' });
  assert.strictEqual(validBucket.valid, true);
  assert.deepStrictEqual(validBucket.sanitizedParams, { active_bucket: '6-10' });

  const invalidBucket = validateAnalyticsEvent('patient_added', { active_bucket: 'random_text' });
  assert.strictEqual(invalidBucket.valid, true);
  assert.deepStrictEqual(invalidBucket.sanitizedParams, {});
});
