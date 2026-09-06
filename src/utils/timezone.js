/**
 * timezone.js — Dynamic Indonesian Timezone & Medical Timestamp Utility.
 * Automatically resolves WIB (UTC+7), WITA (UTC+8), WIT (UTC+9) or device local time.
 */

export function getIndonesianTimezoneSuffix() {
  const offsetMinutes = new Date().getTimezoneOffset(); // in minutes from UTC (negative if ahead of UTC)
  const offsetHours = -offsetMinutes / 60;

  if (offsetHours === 7) return 'WIB';
  if (offsetHours === 8) return 'WITA';
  if (offsetHours === 9) return 'WIT';

  // Fallback for non-standard or foreign offsets
  const sign = offsetHours >= 0 ? '+' : '';
  return `UTC${sign}${offsetHours}`;
}

/**
 * Returns formatted date in Indonesian locale (e.g., "7 Sep 2026").
 */
export function getFormattedDate(date = new Date()) {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Returns formatted time with accurate Indonesian timezone suffix (e.g., "04:52 WIB", "14:30 WITA").
 */
export function getFormattedTime(date = new Date()) {
  const timeStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const tzSuffix = getIndonesianTimezoneSuffix();
  return `${timeStr} ${tzSuffix}`;
}

export default {
  getIndonesianTimezoneSuffix,
  getFormattedDate,
  getFormattedTime
};
