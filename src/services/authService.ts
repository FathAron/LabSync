import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { ApiErrorCode, ApiResponse, UserProfile, UserRole } from '../types/models';
import { auth, db, isFirebaseConfigured } from './firebaseConfig';
import { normalizeMainClass } from '../utils/classUtils';

let isRegistering = false;

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  assistantRole?: 'asprak' | 'aslab';
  assignedClasses?: string[];
  nim: string;
  className: string;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const makeError = <T = never>(
  message: string,
  errorCode: ApiErrorCode
): ApiResponse<T> => ({
  ok: false,
  success: false,
  message,
  errorCode,
});

const makeSuccess = <T>(message: string, data?: T): ApiResponse<T> => ({
  ok: true,
  success: true,
  message,
  data,
});

const mapFirebaseError = (error: unknown, fallbackMessage: string): { message: string; errorCode: ApiErrorCode } => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return { message: 'Email sudah terdaftar. Silakan gunakan email lain atau login.', errorCode: 'ALREADY_EXISTS' };
    case 'auth/invalid-email':
      return { message: 'Format email tidak valid.', errorCode: 'VALIDATION_ERROR' };
    case 'auth/weak-password':
      return { message: 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.', errorCode: 'VALIDATION_ERROR' };
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return { message: 'Email atau kata sandi salah.', errorCode: 'UNAUTHENTICATED' };
    case 'auth/too-many-requests':
      return { message: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.', errorCode: 'FORBIDDEN' };
    case 'auth/network-request-failed':
    case 'unavailable':
      return { message: 'Koneksi jaringan bermasalah. Periksa internet Anda dan coba lagi.', errorCode: 'NETWORK_ERROR' };
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return {
        message: 'Metode autentikasi Email/Password belum diaktifkan di Firebase Console.',
        errorCode: 'FORBIDDEN',
      };
    case 'failed-precondition':
    case 'not-found':
      return {
        message: 'Database Cloud Firestore belum dibuat atau belum siap di Firebase Console.',
        errorCode: 'INTERNAL_ERROR',
      };
    case 'permission-denied':
      return { message: 'Anda tidak memiliki izin untuk mengakses data ini.', errorCode: 'FORBIDDEN' };
    default:
      console.warn('[authService] Unmapped Firebase error:', code, error);
      return {
        message: code ? `${fallbackMessage} (${code})` : fallbackMessage,
        errorCode: 'INTERNAL_ERROR',
      };
  }
};

const normalizeUserProfile = (uid: string, raw: Record<string, unknown>): UserProfile => {
  const role: UserRole = raw.role === 'assistant' ? 'assistant' : 'student';
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Pengguna LabSync';
  const className =
    role === 'student' && typeof raw.className === 'string'
      ? raw.className.trim()
      : role === 'student' && typeof raw.class === 'string'
      ? raw.class.trim()
      : '';
  const classCode =
    role === 'student' && typeof raw.classCode === 'string'
      ? raw.classCode.trim()
      : role === 'student'
      ? normalizeMainClass(className)
      : '';
  const nowIso = new Date().toISOString();

  return {
    uid,
    id: uid,
    email: typeof raw.email === 'string' ? raw.email : '',
    name,
    role,
    nim: typeof raw.nim === 'string' ? raw.nim : '',
    classCode,
    className,
    class: className,
    assistantRole:
      typeof raw.assistantRole === 'string' && raw.assistantRole.trim()
        ? raw.assistantRole.trim()
        : role === 'assistant'
        ? 'Asisten Laboratorium'
        : undefined,
    assignedClasses: Array.isArray(raw.assignedClasses)
      ? raw.assignedClasses
          .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
          .map((item) => normalizeMainClass(item) || item.trim().toUpperCase())
      : undefined,
    avatar: typeof raw.avatar === 'string' && raw.avatar.trim() ? raw.avatar : getInitials(name),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : nowIso,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowIso,
  };
};

export const fetchUserProfile = async (uid: string): Promise<ApiResponse<UserProfile>> => {
  if (!isFirebaseConfigured) {
    return makeError('Konfigurasi Firebase belum diatur. Lengkapi file .env terlebih dahulu.', 'INTERNAL_ERROR');
  }

  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      return makeError('Profil pengguna tidak ditemukan di database.', 'NOT_FOUND');
    }
    const profile = normalizeUserProfile(uid, snap.data() as Record<string, unknown>);
    return makeSuccess('Profil pengguna berhasil dimuat.', profile);
  } catch (error) {
    const mapped = mapFirebaseError(error, 'Gagal mengambil profil pengguna dari Firestore.');
    return makeError(mapped.message, mapped.errorCode);
  }
};

export const registerUser = async (payload: RegisterPayload): Promise<ApiResponse<UserProfile>> => {
  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;
  const role = payload.role;
  const nim = payload.nim.trim();
  const className = payload.className.trim().toUpperCase();

  if (!name) {
    return makeError('Nama lengkap wajib diisi.', 'VALIDATION_ERROR');
  }
  if (!email || !isValidEmail(email)) {
    return makeError('Masukkan alamat email yang valid.', 'VALIDATION_ERROR');
  }
  if (!password || password.length < 6) {
    return makeError('Kata sandi minimal 6 karakter.', 'VALIDATION_ERROR');
  }
  if (role !== 'student' && role !== 'assistant') {
    return makeError('Peran pengguna tidak valid.', 'VALIDATION_ERROR');
  }
  if (role === 'student' && !nim) {
    return makeError('NIM wajib diisi untuk praktikan.', 'VALIDATION_ERROR');
  }
  if (role === 'student' && !className) {
    return makeError('Kelas wajib dipilih untuk praktikan (pilih A, B, C, D, E, atau F).', 'VALIDATION_ERROR');
  }
  if (!isFirebaseConfigured) {
    return makeError('Konfigurasi Firebase belum diatur. Lengkapi file .env terlebih dahulu.', 'INTERNAL_ERROR');
  }

  try {
    isRegistering = true;
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;
    const nowIso = new Date().toISOString();
    const normalizedClass = normalizeMainClass(className) || className;
    const resolvedClass = role === 'student' ? normalizedClass : '';

    const profileData: Record<string, unknown> = {
      uid,
      id: uid,
      email,
      name,
      role,
      nim,
      classCode: role === 'student' ? normalizedClass : '',
      className: resolvedClass,
      class: resolvedClass,
      avatar: getInitials(name),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (role === 'assistant') {
      const resolvedSubRole =
        payload.assistantRole === 'aslab' ? 'aslab' : 'asprak';
      profileData.assistantRole = resolvedSubRole;

      if (resolvedSubRole === 'asprak' && Array.isArray(payload.assignedClasses)) {
        const cleanedClasses = Array.from(
          new Set(
            payload.assignedClasses
              .map((item) => normalizeMainClass(item) || item.trim().toUpperCase())
              .filter(Boolean)
          )
        );
        profileData.assignedClasses = cleanedClasses;
      }
    }

    try {
      await setDoc(doc(db, 'users', uid), profileData);
    } catch (firestoreError) {
      // Rollback akun Auth yang baru dibuat jika penulisan profil Firestore ditolak
      await credential.user.delete().catch(() => undefined);
      const mapped = mapFirebaseError(
        firestoreError,
        'Gagal menyimpan profil pengguna ke Firestore.'
      );
      if (mapped.errorCode === 'FORBIDDEN' && role === 'assistant') {
        return makeError(
          'Email ini tidak diizinkan mendaftar sebagai Asisten di Firestore Rules. Gunakan email asisten yang terdaftar atau perbarui whitelist di firestore.rules.',
          'FORBIDDEN'
        );
      }
      return makeError(mapped.message, mapped.errorCode);
    }

    const profile = normalizeUserProfile(uid, profileData);
    return makeSuccess('Registrasi berhasil. Selamat datang di LabSync!', profile);
  } catch (error) {
    const mapped = mapFirebaseError(error, 'Registrasi gagal. Silakan coba lagi.');
    return makeError(mapped.message, mapped.errorCode);
  } finally {
    isRegistering = false;
  }
};

export const loginUser = async (
  emailInput: string,
  password: string
): Promise<ApiResponse<UserProfile>> => {
  const email = emailInput.trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return makeError('Masukkan alamat email yang valid.', 'VALIDATION_ERROR');
  }
  if (!password) {
    return makeError('Kata sandi wajib diisi.', 'VALIDATION_ERROR');
  }
  if (!isFirebaseConfigured) {
    return makeError('Konfigurasi Firebase belum diatur. Lengkapi file .env terlebih dahulu.', 'INTERNAL_ERROR');
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profileRes = await fetchUserProfile(credential.user.uid);
    if (!profileRes.ok || !profileRes.data) {
      return makeError(
        profileRes.message || 'Profil pengguna tidak ditemukan di database.',
        profileRes.errorCode ?? 'NOT_FOUND'
      );
    }
    return makeSuccess(`Selamat datang kembali, ${profileRes.data.name}!`, profileRes.data);
  } catch (error) {
    const mapped = mapFirebaseError(error, 'Login gagal. Periksa kembali email dan kata sandi Anda.');
    return makeError(mapped.message, mapped.errorCode);
  }
};

export const logoutUser = async (): Promise<ApiResponse<void>> => {
  if (!isFirebaseConfigured) {
    return makeSuccess('Berhasil keluar.');
  }

  try {
    await signOut(auth);
    return makeSuccess('Anda telah keluar dari akun.');
  } catch (error) {
    const mapped = mapFirebaseError(error, 'Gagal keluar dari akun. Silakan coba lagi.');
    return makeError(mapped.message, mapped.errorCode);
  }
};

export const subscribeAuthState = (
  onChange: (user: UserProfile | null, errorMessage?: string) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    onChange(null);
    return () => undefined;
  }

  return onAuthStateChanged(
    auth,
    async (firebaseUser) => {
      if (isRegistering) {
        return;
      }
      if (!firebaseUser) {
        onChange(null);
        return;
      }

      const profileRes = await fetchUserProfile(firebaseUser.uid);
      if (profileRes.ok && profileRes.data) {
        onChange(profileRes.data);
      } else {
        onChange(null, profileRes.message);
      }
    },
    (error) => {
      const mapped = mapFirebaseError(error, 'Terjadi gangguan pada sesi autentikasi.');
      onChange(null, mapped.message);
    }
  );
};

