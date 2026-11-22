import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  auth,
  db,
  isFirebaseConfigured,
} from './firebaseConfig';
import {
  checkNotificationPermission,
  getNotificationErrorMessage,
  requestNotificationPermission,
} from './permissionService';

type NotificationServiceErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'CONFIGURATION_ERROR'
  | 'NETWORK_ERROR'
  | 'FIRESTORE_ERROR'
  | 'TOKEN_ERROR';

export type NotificationServiceResult = {
  success: boolean;
  message: string;
  token?: string;
  errorCode?: NotificationServiceErrorCode;
};

type RegisterOptions = {
  /** Minta izin hanya pada alur login/aktivasi awal, bukan setiap app kembali aktif. */
  requestPermission?: boolean;
};

const STORAGE_KEY_PREFIX = 'labsync:expo-push-token:';

let registrationInFlight: {
  uid: string;
  promise: Promise<NotificationServiceResult>;
} | null = null;

const getStorageKey = (uid: string): string =>
  `${STORAGE_KEY_PREFIX}${uid}`;

const getTokenDocumentId = (token: string): string =>
  encodeURIComponent(token);

const getProjectId = (): string | null =>
  Constants.easConfig?.projectId ??
  Constants.expoConfig?.extra?.eas?.projectId ??
  null;

const readFirebaseErrorCode = (error: unknown): string => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return '';
  }

  return String((error as { code?: unknown }).code ?? '').toLowerCase();
};

const getServiceErrorCode = (error: unknown): NotificationServiceErrorCode => {
  const code = readFirebaseErrorCode(error);

  if (
    [
      'unavailable',
      'deadline-exceeded',
      'network-request-failed',
      'webchannel-connection',
    ].some((value) => code.includes(value))
  ) {
    return 'NETWORK_ERROR';
  }

  if (code === 'permission-denied') return 'FIRESTORE_ERROR';
  if (code.startsWith('messaging/')) return 'TOKEN_ERROR';
  return 'FIRESTORE_ERROR';
};

const makeFailure = (
  message: string,
  errorCode: NotificationServiceErrorCode
): NotificationServiceResult => ({
  success: false,
  message,
  errorCode,
});

const disableTokenForUser = async (
  uid: string,
  token: string
): Promise<void> => {
  const tokenRef = doc(
    db,
    'users',
    uid,
    'pushTokens',
    getTokenDocumentId(token)
  );
  const snapshot = await getDoc(tokenRef);

  if (snapshot.exists()) {
    await updateDoc(tokenRef, {
      enabled: false,
      updatedAt: serverTimestamp(),
    });
  }
};

const disableStoredTokenForUser = async (
  uid: string
): Promise<NotificationServiceResult> => {
  const storageKey = getStorageKey(uid);
  let token: string | null;

  try {
    token = await AsyncStorage.getItem(storageKey);
  } catch {
    return makeFailure(
      'Cache token perangkat tidak dapat dibaca. Token lama belum dapat dinonaktifkan.',
      'TOKEN_ERROR'
    );
  }

  if (!token) {
    return {
      success: true,
      message: 'Tidak ada token perangkat tersimpan pada perangkat ini.',
    };
  }

  try {
    await disableTokenForUser(uid, token);
    await AsyncStorage.removeItem(storageKey);

    return {
      success: true,
      message: 'Token perangkat berhasil dinonaktifkan.',
    };
  } catch (error) {
    return makeFailure(
      getNotificationErrorMessage(error),
      getServiceErrorCode(error)
    );
  }
};

const performRegistration = async (
  uid: string,
  options: RegisterOptions
): Promise<NotificationServiceResult> => {
  const user = auth.currentUser;

  if (!user || user.uid !== uid) {
    return makeFailure(
      'Sesi login berubah. Silakan coba sinkronisasi notifikasi kembali.',
      'UNAUTHENTICATED'
    );
  }

  if (!isFirebaseConfigured) {
    return makeFailure(
      'Firebase belum dikonfigurasi. Token notifikasi belum dapat disimpan.',
      'CONFIGURATION_ERROR'
    );
  }

  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return makeFailure(
      'Push notification hanya tersedia pada aplikasi Android dan iOS.',
      'UNSUPPORTED'
    );
  }

  const existingPermission = await checkNotificationPermission();
  const permission = existingPermission.granted
    ? existingPermission
    : options.requestPermission
      ? await requestNotificationPermission()
      : existingPermission;

  if (!permission.granted) {
    // Jika izin dicabut, token lama tidak boleh terus dianggap aktif.
    const disabled = await disableStoredTokenForUser(uid);

    return makeFailure(
      disabled.success
        ? permission.message
        : `${permission.message} ${disabled.message}`,
      'PERMISSION_DENIED'
    );
  }

  const projectId = getProjectId();

  if (!projectId) {
    return makeFailure(
      'EAS Project ID tidak ditemukan. Periksa konfigurasi app.json.',
      'CONFIGURATION_ERROR'
    );
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenResponse.data;

    if (!token) {
      return makeFailure(
        'Expo Push Token tidak berhasil diperoleh dari perangkat.',
        'TOKEN_ERROR'
      );
    }

    // Jangan menyimpan token untuk akun lama jika akun berubah saat request berjalan.
    if (auth.currentUser?.uid !== uid) {
      return makeFailure(
        'Akun berubah ketika token sedang diproses. Silakan coba kembali.',
        'UNAUTHENTICATED'
      );
    }

    const storageKey = getStorageKey(uid);
    let previousToken: string | null = null;
    let storageWarning = '';

    try {
      previousToken = await AsyncStorage.getItem(storageKey);
    } catch {
      storageWarning = ' Cache token lokal tidak dapat dibaca.';
    }

    // Nonaktifkan token lama jika provider mengeluarkan token baru.
    if (previousToken && previousToken !== token) {
      try {
        await disableTokenForUser(uid, previousToken);
      } catch (error) {
        storageWarning += ` Token lama belum berhasil dinonaktifkan: ${getNotificationErrorMessage(error)}`;
      }
    }

    const tokenRef = doc(
      db,
      'users',
      uid,
      'pushTokens',
      getTokenDocumentId(token)
    );
    const existingSnapshot = await getDoc(tokenRef);
    const existingData = existingSnapshot.exists()
      ? existingSnapshot.data()
      : undefined;

    await setDoc(tokenRef, {
      token,
      platform: Platform.OS,
      enabled: true,
      createdAt: existingData?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await AsyncStorage.setItem(storageKey, token);
    } catch {
      storageWarning += ' Token tersimpan di Firestore, tetapi cache lokal perangkat gagal diperbarui.';
    }

    return {
      success: true,
      token,
      message: storageWarning
        ? `Push notification aktif, tetapi ada catatan sinkronisasi.${storageWarning}`
        : 'Push notification berhasil didaftarkan dan disinkronkan.',
    };
  } catch (error) {
    return makeFailure(
      getNotificationErrorMessage(error),
      getServiceErrorCode(error)
    );
  }
};

/**
 * Mendaftarkan Expo Push Token milik akun yang sedang login.
 * Request permission dapat dimatikan ketika aplikasi hanya melakukan refresh token.
 */
export const registerPushTokenForCurrentUser = (
  options: RegisterOptions = {}
): Promise<NotificationServiceResult> => {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    return Promise.resolve(
      makeFailure('Pengguna belum login.', 'UNAUTHENTICATED')
    );
  }

  if (registrationInFlight?.uid === uid) {
    return registrationInFlight.promise;
  }

  const promise = performRegistration(uid, options).finally(() => {
    if (registrationInFlight?.promise === promise) {
      registrationInFlight = null;
    }
  });

  registrationInFlight = { uid, promise };
  return promise;
};

/** Menonaktifkan token perangkat sebelum Firebase melakukan logout. */
export const disablePushTokenForCurrentUser = async (): Promise<NotificationServiceResult> => {
  const user = auth.currentUser;

  if (!user) {
    return makeFailure(
      'Pengguna belum login. Token tidak dapat dinonaktifkan.',
      'UNAUTHENTICATED'
    );
  }

  if (!isFirebaseConfigured) {
    return {
      success: true,
      message: 'Firebase belum dikonfigurasi; tidak ada token server yang dapat dinonaktifkan.',
    };
  }

  return disableStoredTokenForUser(user.uid);
};
