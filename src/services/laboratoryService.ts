import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import type {
  ApiErrorCode,
  ApiResponse,
  CreateLaboratoryInput,
  Laboratory,
  UserProfile,
} from '../types/models';

import { db, isFirebaseConfigured } from './firebaseConfig';

// ==========================================
// RESPONSE & ERROR HELPER
// ==========================================

const makeSuccess = <T>(
  message: string,
  data?: T
): ApiResponse<T> => ({
  ok: true,
  success: true,
  message,
  data,
});

const makeError = <T = never>(
  message: string,
  errorCode: ApiErrorCode
): ApiResponse<T> => ({
  ok: false,
  success: false,
  message,
  errorCode,
});

class LaboratoryError extends Error {
  errorCode: ApiErrorCode;

  constructor(message: string, errorCode: ApiErrorCode) {
    super(message);
    this.name = 'LaboratoryError';
    this.errorCode = errorCode;
  }
}

const mapError = (
  error: unknown,
  fallback: string
): ApiResponse<never> => {
  if (error instanceof LaboratoryError) {
    return makeError(error.message, error.errorCode);
  }

  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  if (code === 'unauthenticated') {
    return makeError(
      'Sesi login tidak valid. Silakan login kembali.',
      'UNAUTHENTICATED'
    );
  }

  if (code === 'permission-denied') {
    return makeError(
      'Anda tidak memiliki izin untuk mengelola data laboratorium.',
      'FORBIDDEN'
    );
  }

  if (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'network-request-failed'
  ) {
    return makeError(
      'Koneksi ke Firestore bermasalah. Periksa internet lalu coba lagi.',
      'NETWORK_ERROR'
    );
  }

  if (code === 'not-found') {
    return makeError(
      'Data laboratorium tidak ditemukan.',
      'NOT_FOUND'
    );
  }

  console.warn(
    '[laboratoryService] Firestore error:',
    code,
    error
  );

  return makeError(fallback, 'INTERNAL_ERROR');
};

const requireFirebase = (): void => {
  if (!isFirebaseConfigured) {
    throw new LaboratoryError(
      'Konfigurasi Firebase belum tersedia. Lengkapi file .env terlebih dahulu.',
      'INTERNAL_ERROR'
    );
  }
};

const requireAssistant = (
  user: UserProfile | null
): UserProfile => {
  if (!user) {
    throw new LaboratoryError(
      'Silakan login terlebih dahulu.',
      'UNAUTHENTICATED'
    );
  }

  if (user.role !== 'assistant') {
    throw new LaboratoryError(
      'Hanya asisten yang dapat mengelola lokasi laboratorium.',
      'FORBIDDEN'
    );
  }

  return user;
};

// ==========================================
// NORMALIZATION & VALIDATION
// ==========================================

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;

export const normalizeLaboratory = (
  raw: Record<string, unknown>,
  id: string
): Laboratory => {
  const description = asString(raw.description).trim();

  return {
    id,
    name: asString(raw.name),
    latitude: asNumber(raw.latitude),
    longitude: asNumber(raw.longitude),
    radiusMeters: asNumber(raw.radiusMeters, 50),
    ...(description ? { description } : {}),
    createdAt: asString(raw.createdAt),
    updatedAt: asString(raw.updatedAt),
  };
};

export const MIN_LAB_RADIUS_METERS = 10;
export const MAX_LAB_RADIUS_METERS = 5000;

export const validateLaboratoryInput = (
  input: CreateLaboratoryInput
): string | null => {
  const name = input.name.trim();

  if (name.length < 2) {
    return 'Nama laboratorium minimal terdiri dari 2 karakter.';
  }

  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90
  ) {
    return 'Latitude harus berupa angka valid antara -90 sampai 90.';
  }

  if (
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    return 'Longitude harus berupa angka valid antara -180 sampai 180.';
  }

  if (
    !Number.isFinite(input.radiusMeters) ||
    input.radiusMeters < MIN_LAB_RADIUS_METERS ||
    input.radiusMeters > MAX_LAB_RADIUS_METERS
  ) {
    return `Radius presensi harus antara ${MIN_LAB_RADIUS_METERS} sampai ${MAX_LAB_RADIUS_METERS} meter.`;
  }

  return null;
};

const nowIso = (): string => new Date().toISOString();

// ==========================================
// REAL-TIME LISTENER
// ==========================================

export const subscribeLaboratories = (
  onData: (laboratories: Laboratory[]) => void,
  onError: (message: string) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    onError(
      'Konfigurasi Firebase belum tersedia. Data laboratorium belum dapat dimuat.'
    );
    return () => undefined;
  }

  return onSnapshot(
    collection(db, 'laboratories'),
    (snapshot) => {
      const items = snapshot.docs
        .map((item) =>
          normalizeLaboratory(
            item.data() as Record<string, unknown>,
            item.id
          )
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name, 'id-ID')
        );

      onData(items);
    },
    (error) => {
      onError(
        error.message ||
          'Gagal memuat data laboratorium dari Firestore.'
      );
    }
  );
};

// ==========================================
// LABORATORY CRUD
// ==========================================

export const createLaboratory = async (
  input: CreateLaboratoryInput,
  currentUser: UserProfile | null
): Promise<ApiResponse<Laboratory>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const normalizedInput: CreateLaboratoryInput = {
      name: input.name.trim(),
      latitude: Number(input.latitude),
      longitude: Number(input.longitude),
      radiusMeters: Math.round(Number(input.radiusMeters)),
      description: input.description?.trim() ?? '',
    };

    const validation = validateLaboratoryInput(
      normalizedInput
    );

    if (validation) {
      return makeError(validation, 'VALIDATION_ERROR');
    }

    const existingSnap = await getDocs(
      collection(db, 'laboratories')
    );

    const duplicate = existingSnap.docs.some(
      (item) =>
        asString(item.data().name)
          .trim()
          .toLowerCase() ===
        normalizedInput.name.toLowerCase()
    );

    if (duplicate) {
      return makeError(
        'Laboratorium dengan nama tersebut sudah terdaftar.',
        'ALREADY_EXISTS'
      );
    }

    const createdAt = nowIso();

    const payload: Record<string, unknown> = {
      name: normalizedInput.name,
      latitude: normalizedInput.latitude,
      longitude: normalizedInput.longitude,
      radiusMeters: normalizedInput.radiusMeters,
      createdAt,
      updatedAt: createdAt,
    };

    if (normalizedInput.description) {
      payload.description = normalizedInput.description;
    }

    const ref = await addDoc(
      collection(db, 'laboratories'),
      payload
    );

    return makeSuccess(
      'Data laboratorium berhasil ditambahkan.',
      normalizeLaboratory(payload, ref.id)
    );
  } catch (error) {
    return mapError(
      error,
      'Data laboratorium gagal ditambahkan.'
    );
  }
};

export const updateLaboratory = async (
  laboratoryId: string,
  patch: Partial<CreateLaboratoryInput>,
  currentUser: UserProfile | null
): Promise<ApiResponse<void>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const ref = doc(db, 'laboratories', laboratoryId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return makeError(
        'Data laboratorium tidak ditemukan.',
        'NOT_FOUND'
      );
    }

    const current = normalizeLaboratory(
      snap.data() as Record<string, unknown>,
      snap.id
    );

    const nextInput: CreateLaboratoryInput = {
      name: (patch.name ?? current.name).trim(),
      latitude:
        patch.latitude !== undefined
          ? Number(patch.latitude)
          : current.latitude,
      longitude:
        patch.longitude !== undefined
          ? Number(patch.longitude)
          : current.longitude,
      radiusMeters:
        patch.radiusMeters !== undefined
          ? Math.round(Number(patch.radiusMeters))
          : current.radiusMeters,
      description:
        patch.description !== undefined
          ? patch.description.trim()
          : (current.description ?? ''),
    };

    const validation = validateLaboratoryInput(nextInput);

    if (validation) {
      return makeError(validation, 'VALIDATION_ERROR');
    }

    if (
      nextInput.name.toLowerCase() !==
      current.name.trim().toLowerCase()
    ) {
      const existingSnap = await getDocs(
        collection(db, 'laboratories')
      );

      const duplicate = existingSnap.docs.some(
        (item) =>
          item.id !== laboratoryId &&
          asString(item.data().name)
            .trim()
            .toLowerCase() === nextInput.name.toLowerCase()
      );

      if (duplicate) {
        return makeError(
          'Laboratorium dengan nama tersebut sudah terdaftar.',
          'ALREADY_EXISTS'
        );
      }
    }

    await updateDoc(ref, {
      name: nextInput.name,
      latitude: nextInput.latitude,
      longitude: nextInput.longitude,
      radiusMeters: nextInput.radiusMeters,
      description: nextInput.description ?? '',
      updatedAt: nowIso(),
    });

    return makeSuccess(
      'Data laboratorium berhasil diperbarui.'
    );
  } catch (error) {
    return mapError(
      error,
      'Data laboratorium gagal diperbarui.'
    );
  }
};

export const deleteLaboratory = async (
  laboratoryId: string,
  currentUser: UserProfile | null
): Promise<ApiResponse<void>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const ref = doc(db, 'laboratories', laboratoryId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return makeError(
        'Data laboratorium tidak ditemukan.',
        'NOT_FOUND'
      );
    }

    const linkedSessions = await getDocs(
      query(
        collection(db, 'sessions'),
        where('laboratoryId', '==', laboratoryId)
      )
    );

    if (!linkedSessions.empty) {
      return makeError(
        'Laboratorium tidak dapat dihapus karena masih digunakan oleh sesi praktikum.',
        'FORBIDDEN'
      );
    }

    await deleteDoc(ref);

    return makeSuccess('Data laboratorium berhasil dihapus.');
  } catch (error) {
    return mapError(
      error,
      'Data laboratorium gagal dihapus.'
    );
  }
};
