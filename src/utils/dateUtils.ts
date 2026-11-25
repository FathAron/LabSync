/**
 * LABSYNC CENTRALIZED DATE & TIME UTILITY
 *
 * Menjamin sinkronisasi nama hari (weekday) dan tanggal kalender secara kanonikal.
 * Menggunakan zona waktu Indonesia Barat (WIB, UTC+7 / Asia/Jakarta).
 * Menghindari off-by-one-day error akibat konversi UTC pada parsing string tanggal.
 */

export const DAYS_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

export const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export const MONTHS_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface JakartaDateParts {
  year: number;
  monthIndex: number;
  monthName: string;
  monthShort: string;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekdayIndex: number;
  weekdayName: typeof DAYS_ID[number];
}

/**
 * Parsing input tanggal kanonikal ke komponen tanggal Asia/Jakarta (WIB).
 * Menerima:
 * - Firestore Timestamp (objek dengan toDate() atau { seconds, nanoseconds })
 * - JavaScript Date
 * - ISO string ("2026-11-20T14:30:00.000Z")
 * - Date-only string ("2026-11-20" atau "2026/11/20") — di-parse aman tanpa pergeseran UTC
 * - Timestamp milidetik (number)
 */
export const parseJakartaDate = (input: unknown): JakartaDateParts | null => {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  // 1. Tangani date-only string: "YYYY-MM-DD" atau "YYYY/MM/DD"
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const dateOnlyMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const monthIndex = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);

      if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) {
        return null;
      }

      // Gunakan Date.UTC agar deterministik dan tidak dipengaruhi timezone lokal perangkat
      const utcDate = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
      const weekdayIndex = utcDate.getUTCDay();

      return {
        year,
        monthIndex,
        monthName: MONTHS_ID[monthIndex],
        monthShort: MONTHS_SHORT_ID[monthIndex],
        day,
        hour: 0,
        minute: 0,
        second: 0,
        weekdayIndex,
        weekdayName: DAYS_ID[weekdayIndex],
      };
    }
  }

  // 2. Tangani Firestore Timestamp dengan method toDate()
  let ms: number;
  if (
    typeof input === 'object' &&
    input !== null &&
    'toDate' in input &&
    typeof (input as { toDate: () => unknown }).toDate === 'function'
  ) {
    const d = (input as { toDate: () => Date }).toDate();
    ms = d.getTime();
  } else if (
    typeof input === 'object' &&
    input !== null &&
    'seconds' in input &&
    typeof (input as { seconds: unknown }).seconds === 'number'
  ) {
    ms = (input as { seconds: number }).seconds * 1000;
  } else if (input instanceof Date) {
    ms = input.getTime();
  } else if (typeof input === 'number') {
    ms = input;
  } else if (typeof input === 'string') {
    ms = new Date(input).getTime();
  } else {
    return null;
  }

  if (Number.isNaN(ms)) {
    return null;
  }

  // Shift dengan offset WIB (+07:00)
  const shifted = new Date(ms + JAKARTA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const monthIndex = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  const second = shifted.getUTCSeconds();
  const weekdayIndex = shifted.getUTCDay();

  return {
    year,
    monthIndex,
    monthName: MONTHS_ID[monthIndex],
    monthShort: MONTHS_SHORT_ID[monthIndex],
    day,
    hour,
    minute,
    second,
    weekdayIndex,
    weekdayName: DAYS_ID[weekdayIndex],
  };
};

/**
 * Menghitung nama hari bahasa Indonesia dari tanggal kanonikal.
 * Contoh input: "2026-11-20" -> "Jumat"
 */
export const deriveWeekdayName = (
  dateInput: unknown
): typeof DAYS_ID[number] | null => {
  const parts = parseJakartaDate(dateInput);
  return parts ? parts.weekdayName : null;
};

/**
 * Format jadwal sesi kanonikal: "Hari, DD Bulan YYYY"
 * Contoh: "Senin, 15 November 2026"
 * Dijamin nama hari dan tanggal selalu sinkron.
 */
export const formatSessionDate = (
  dateInput: unknown,
  fallback = 'Tanggal belum diatur'
): string => {
  const parts = parseJakartaDate(dateInput);
  if (!parts) return fallback;
  return `${parts.weekdayName}, ${parts.day} ${parts.monthName} ${parts.year}`;
};

/**
 * Format tanggal ringkas: "DD Mon YYYY"
 * Contoh: "15 Nov 2026"
 */
export const formatShortDate = (
  dateInput: unknown,
  fallback = '-'
): string => {
  const parts = parseJakartaDate(dateInput);
  if (!parts) return fallback;
  return `${parts.day} ${parts.monthShort} ${parts.year}`;
};

/**
 * Format waktu WIB dari timestamp: "HH.mm WIB"
 * Contoh: "08.00 WIB"
 */
export const formatTimeWIB = (
  timeInput: unknown,
  fallback = '-'
): string => {
  if (typeof timeInput === 'string' && /^\d{2}[:.]\d{2}(\s*WIB)?$/i.test(timeInput.trim())) {
    const clean = timeInput.trim().replace(':', '.');
    return clean.toUpperCase().includes('WIB') ? clean : `${clean} WIB`;
  }

  const parts = parseJakartaDate(timeInput);
  if (!parts) return fallback;
  const h = String(parts.hour).padStart(2, '0');
  const m = String(parts.minute).padStart(2, '0');
  return `${h}.${m} WIB`;
};

/**
 * Format rentang waktu: "08.00 - 10.00 WIB"
 */
export const formatTimeRangeWIB = (
  startTime?: string | null,
  endTime?: string | null,
  fallback = 'Waktu belum diatur'
): string => {
  const clean = (val?: string | null) =>
    val ? val.trim().replace(':', '.').replace(/\s*WIB/i, '') : '';

  const s = clean(startTime);
  const e = clean(endTime);

  if (s && e) return `${s} - ${e} WIB`;
  if (s) return `${s} WIB`;
  return fallback;
};

/**
 * Format lengkap tanggal dan waktu: "Senin, 15 November 2026, 08.00 WIB"
 */
export const formatFullDateTime = (
  input: unknown,
  fallback = '-'
): string => {
  const parts = parseJakartaDate(input);
  if (!parts) return fallback;
  const h = String(parts.hour).padStart(2, '0');
  const m = String(parts.minute).padStart(2, '0');
  return `${parts.weekdayName}, ${parts.day} ${parts.monthName} ${parts.year}, ${h}.${m} WIB`;
};

/**
 * Mengambil tanggal hari ini dalam format YYYY-MM-DD berbasis zona waktu WIB (Asia/Jakarta).
 */
export const getJakartaTodayString = (): string => {
  const parts = parseJakartaDate(new Date());
  if (!parts) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const y = parts.year;
  const m = String(parts.monthIndex + 1).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Mengambil waktu saat ini dalam format HH:mm berbasis zona waktu WIB (Asia/Jakarta).
 */
export const getJakartaCurrentTimeString = (): string => {
  const parts = parseJakartaDate(new Date());
  if (!parts) {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
};

export interface SessionScheduleValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validasi apakah jadwal sesi berada di masa lalu (real-time check):
 * 1. Tanggal tidak boleh lebih lampau dari hari ini (WIB).
 * 2. Jika tanggal adalah hari ini, jam selesai (endTime) tidak boleh sudah lewat.
 * 3. Jika tanggal adalah hari ini, jam mulai (startTime) tidak boleh sudah lewat dari waktu sekarang.
 */
export const validateSessionScheduleRealtime = (
  date: string,
  startTime: string,
  endTime: string
): SessionScheduleValidation => {
  const today = getJakartaTodayString();
  const currentTime = getJakartaCurrentTimeString();

  if (date < today) {
    const todayParts = parseJakartaDate(today);
    const todayFormatted = todayParts
      ? `${todayParts.weekdayName}, ${todayParts.day} ${todayParts.monthName} ${todayParts.year}`
      : today;
    return {
      valid: false,
      error: `Tanggal praktikum tidak boleh di masa lalu. Minimal dijadwalkan pada hari ini (${todayFormatted}) atau yang akan datang.`,
    };
  }

  if (date === today) {
    if (endTime <= currentTime) {
      return {
        valid: false,
        error: `Jam praktikum (${startTime} - ${endTime} WIB) sudah lewat hari ini. Waktu saat ini menunjukkan pukul ${currentTime.replace(':', '.')} WIB.`,
      };
    }
    if (startTime < currentTime) {
      return {
        valid: false,
        error: `Jam mulai praktikum (${startTime} WIB) sudah berlalu hari ini. Waktu saat ini menunjukkan pukul ${currentTime.replace(':', '.')} WIB. Tentukan jam mulai yang belum lewat.`,
      };
    }
  }

  return { valid: true };
};
