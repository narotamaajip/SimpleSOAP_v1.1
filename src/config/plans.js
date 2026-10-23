/**
 * src/config/plans.js
 * Konfigurasi Tunggal Model Paket SimpleSOAP
 * 
 * Semua batasan angka, harga contoh, dan terminologi paket dikelola terpusat di sini.
 * Persentase penghematan dihitung secara dinamis dari harga paket bulanan.
 */

export const PLANS_CONFIG = {
  // Paket Gratis
  free: {
    id: 'free',
    name: 'Gratis',
    badgeText: 'Paket Gratis',
    maxActivePatients: 10,
    photoStorage: false,
    collaboratorAccess: true, // Kolaborator kode 6 digit tetap gratis
    description: 'Cocok untuk dokter jaga ruangan dengan rotasi bangsal reguler.'
  },

  // Paket Pro
  pro: {
    id: 'pro',
    name: 'Pro',
    badgeText: 'SimpleSOAP Pro',
    maxActivePatients: Infinity,
    photoStorage: true,
    collaboratorAccess: true,
    headline: 'Dokumentasi Pasien Lebih Cepat, Lengkap, dan Bebas Batas',
    subheadline: 'Dirancang khusus untuk ritme visite bangsal, follow-up harian, dan operan jaga residen/DPJP.',
    benefits: [
      {
        title: 'Pasien Aktif Tanpa Batas',
        description: 'Kelola seluruh pasien bangsal, ICU, dan konsulan tanpa terhalang kuota 10 pasien.'
      },
      {
        title: 'Penyimpanan Foto Klinis',
        description: 'Lampirkan foto luka, serial EKG, hasil lab, dan ekspertise radiologi langsung di catatan SOAP.'
      },
      {
        title: 'Kolaborasi Tim Tanpa Hambatan',
        description: 'Operan jaga dan ronde bangsal lancar bersama rekan sejawat lewat kode akses cepat.'
      },
      {
        title: 'Bebas Khawatir Saat Visite',
        description: 'Data pasien tersimpan aman di cloud dan siap diekspor kapan saja tanpa risiko terkunci.'
      }
    ],
    // Daftar opsi periode pembayaran
    pricing: [
      {
        id: 'monthly',
        period: 'bulanan',
        name: 'Bulanan',
        periodLabel: '1 Bulan',
        months: 1,
        price: 99000,
        formattedPrice: 'Rp99.000',
        perMonthText: 'Rp99.000 / bln',
        tag: null
      },
      {
        id: 'semi_annual',
        period: '6_bulan',
        name: '6 Bulan',
        periodLabel: '6 Bulan',
        months: 6,
        price: 499000,
        formattedPrice: 'Rp499.000',
        perMonthText: 'Rp83.167 / bln',
        tag: 'Pilihan Populer'
      },
      {
        id: 'yearly',
        period: 'tahunan',
        name: 'Tahunan',
        periodLabel: '1 Tahun',
        months: 12,
        price: 790000,
        formattedPrice: 'Rp790.000',
        perMonthText: 'Rp65.833 / bln',
        tag: 'Paling Hemat'
      }
    ]
  },

  // Placeholder metode pembayaran (kosong secara default, belum diputuskan)
  paymentMethodsPlaceholder: '',

  // Klausul transparansi penagihan & keselamatan pasien
  billingTerms: 'Bayar per periode, tidak diperpanjang otomatis. Data pasien tetap bisa dibuka kapan saja.'
};

/**
 * Menghitung persentase hemat secara dinamis dari harga bulanan dasar.
 * @param {number} planPrice - Harga total paket
 * @param {number} months - Durasi paket dalam bulan
 * @returns {number} Persentase diskon bulat (misal 16 atau 34)
 */
export function calculateSavingsPercent(planPrice, months) {
  if (months <= 1) return 0;
  const monthlyPlan = PLANS_CONFIG.pro.pricing.find((p) => p.months === 1);
  if (!monthlyPlan || !monthlyPlan.price) return 0;

  const standardTotal = monthlyPlan.price * months;
  if (standardTotal <= planPrice) return 0;

  const savings = ((standardTotal - planPrice) / standardTotal) * 100;
  return Math.round(savings);
}

/**
 * Format mata uang Rupiah
 */
export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}
