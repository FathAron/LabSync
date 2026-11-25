/**
 * LABSYNC CONTEXTUAL ERROR SYSTEM
 *
 * Menerjemahkan error teknis mentah (Firebase permission-denied, unavailable, timeout)
 * menjadi pesan berbahasa Indonesia yang jelas, kontekstual, dan informatif sesuai
 * operasi yang sedang dijalankan.
 */

export type ErrorCategory =
  | 'permission'
  | 'network'
  | 'auth'
  | 'notification'
  | 'storage'
  | 'general';

export interface FormattedError {
  category: ErrorCategory;
  message: string;
  technicalDetails: string;
}

const extractErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '';
};

const extractErrorCode = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code).toLowerCase();
  }
  return '';
};

export const isNetworkRelated = (code: string, message: string): boolean => {
  const target = `${code} ${message}`.toLowerCase();
  return (
    target.includes('unavailable') ||
    target.includes('deadline-exceeded') ||
    target.includes('network') ||
    target.includes('offline') ||
    target.includes('fetch failed') ||
    target.includes('timeout') ||
    target.includes('timed out') ||
    target.includes('connection')
  );
};

export const isPermissionRelated = (code: string, message: string): boolean => {
  const target = `${code} ${message}`.toLowerCase();
  return (
    target.includes('permission-denied') ||
    target.includes('insufficient permissions') ||
    target.includes('missing or insufficient') ||
    target.includes('unauthorized') ||
    target.includes('forbidden')
  );
};

export const isAuthRelated = (code: string, message: string): boolean => {
  const target = `${code} ${message}`.toLowerCase();
  return (
    target.includes('unauthenticated') ||
    target.includes('user-not-found') ||
    target.includes('auth/invalid-credential') ||
    target.includes('auth/user-token-expired') ||
    target.includes('auth/requires-recent-login') ||
    target.includes('auth/id-token-expired')
  );
};

export type OperationContext =
  | 'sessions'
  | 'profile'
  | 'leave'
  | 'attendance'
  | 'upload'
  | 'notification'
  | 'auth'
  | 'general';

export const formatContextualError = (
  rawError: unknown,
  context: OperationContext = 'general'
): FormattedError => {
  const message = extractErrorMessage(rawError);
  const code = extractErrorCode(rawError);
  const lowerMsg = message.toLowerCase();

  // 1. Gangguan Jaringan / Offline
  if (isNetworkRelated(code, lowerMsg)) {
    return {
      category: 'network',
      message: 'Koneksi internet bermasalah. Periksa jaringan Anda dan coba kembali.',
      technicalDetails: message || code,
    };
  }

  // 2. Sesi Login Berakhir / Masalah Autentikasi
  if (isAuthRelated(code, lowerMsg)) {
    return {
      category: 'auth',
      message: 'Sesi login Anda telah berakhir. Silakan login kembali.',
      technicalDetails: message || code,
    };
  }

  // 3. Konfigurasi Firebase Bermasalah
  if (lowerMsg.includes('konfigurasi firebase belum tersedia') || lowerMsg.includes('api key')) {
    return {
      category: 'general',
      message: 'Layanan belum dapat diakses. Silakan hubungi administrator.',
      technicalDetails: message,
    };
  }

  // 4. Masalah Hak Akses (Permission Denied)
  if (isPermissionRelated(code, lowerMsg)) {
    switch (context) {
      case 'sessions':
        return {
          category: 'permission',
          message: 'Tidak dapat memuat daftar sesi praktikum. Periksa akses akun Anda atau hubungi admin.',
          technicalDetails: message || code,
        };
      case 'profile':
        return {
          category: 'permission',
          message: 'Data profil belum dapat diakses. Silakan login kembali atau hubungi admin.',
          technicalDetails: message || code,
        };
      case 'leave':
        return {
          category: 'permission',
          message: 'Pengajuan izin belum dapat dikirim karena akses penyimpanan data ditolak.',
          technicalDetails: message || code,
        };
      case 'attendance':
        return {
          category: 'permission',
          message: 'Pencatatan presensi ditolak oleh sistem. Pastikan sesi sedang aktif dan Anda terdaftar di kelas ini.',
          technicalDetails: message || code,
        };
      case 'upload':
        return {
          category: 'storage',
          message: 'File pendukung belum berhasil diunggah. Izin penyimpanan ditolak.',
          technicalDetails: message || code,
        };
      case 'notification':
        return {
          category: 'notification',
          message: 'Izin notifikasi sudah aktif, tetapi perangkat belum berhasil didaftarkan di server. Silakan coba kembali.',
          technicalDetails: message || code,
        };
      default:
        return {
          category: 'permission',
          message: 'Akses ke data ditolak oleh sistem keamanan. Hubungi asisten atau admin jika kendala berlanjut.',
          technicalDetails: message || code,
        };
    }
  }

  // 5. Masalah Notifikasi
  if (context === 'notification') {
    if (lowerMsg.includes('expo go') || lowerMsg.includes('development build')) {
      return {
        category: 'notification',
        message: 'Notifikasi push belum tersedia pada lingkungan aplikasi yang sedang digunakan (pengujian remote push memerlukan development build).',
        technicalDetails: message,
      };
    }
    if (lowerMsg.includes('permission') || lowerMsg.includes('izin')) {
      return {
        category: 'notification',
        message: 'Notifikasi LabSync belum diizinkan. Aktifkan izin notifikasi melalui pengaturan perangkat agar tidak melewatkan informasi praktikum.',
        technicalDetails: message,
      };
    }
  }

  // 6. Masalah Upload Lampiran
  if (context === 'upload') {
    return {
      category: 'storage',
      message: 'File pendukung belum berhasil diunggah. Periksa koneksi dan coba kembali.',
      technicalDetails: message,
    };
  }

  // 7. Fallback Umum
  return {
    category: 'general',
    message: message || 'Terjadi kendala pada sinkronisasi data. Silakan coba kembali.',
    technicalDetails: message || code,
  };
};
