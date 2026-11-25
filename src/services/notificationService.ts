import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { Session, UserProfile } from '../types/models';

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

// ==========================================
// PUSH DISPATCHER (DIRECT CLIENT-TO-EXPO)
// Enables instant push notifications even if the local PC backend is not running
// ==========================================

export const sendExpoPushMessages = async (
  messages: {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
  }[]
): Promise<{ success: boolean; sentCount: number; errors: string[] }> => {
  if (messages.length === 0) {
    return { success: true, sentCount: 0, errors: [] };
  }

  const errors: string[] = [];
  let sentCount = 0;
  const chunkSize = 100;

  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const text = await response.text();
        errors.push(`Expo Push API error (${response.status}): ${text}`);
        continue;
      }

      const result = await response.json();
      const tickets = Array.isArray(result?.data) ? result.data : [];
      tickets.forEach(
        (
          ticket: { status: string; message?: string; details?: { error?: string } },
          index: number
        ) => {
          if (ticket?.status === 'ok') {
            sentCount++;
          } else if (ticket?.status === 'error') {
            errors.push(
              `Token ${chunk[index]?.to}: ${ticket?.message || ticket?.details?.error}`
            );
          }
        }
      );
    } catch (err) {
      errors.push(`Network error sending push: ${String(err)}`);
    }
  }

  return { success: errors.length === 0, sentCount, errors };
};

const normalizeClassStr = (val: unknown): string =>
  String(val ?? '')
    .trim()
    .toUpperCase()
    .replace(/^KELAS\s+/i, '');

export const getStudentPushTokensForSession = async (
  session: Session
): Promise<string[]> => {
  if (!isFirebaseConfigured) return [];

  const candidateUids = new Set<string>();

  // 1. Jika session memiliki classId, periksa studentIds dari koleksi classes
  if (session.classId) {
    try {
      const classSnap = await getDoc(doc(db, 'classes', session.classId));
      if (classSnap.exists()) {
        const studentIds = classSnap.data()?.studentIds;
        if (Array.isArray(studentIds)) {
          studentIds.forEach((id: string) => candidateUids.add(id));
        }
      }
    } catch (err) {
      console.warn('[Push] Error fetching class studentIds:', err);
    }
  }

  // 2. Query koleksi users dengan role 'student'
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student')
    );
    const usersSnap = await getDocs(usersQuery);

    const sessionClasses = new Set(
      [
        session.className,
        session.class,
        session.groupCode,
        session.mainClass,
      ]
        .map(normalizeClassStr)
        .filter(Boolean)
    );

    for (const uDoc of usersSnap.docs) {
      const data = uDoc.data();
      const userClass = normalizeClassStr(data.className || data.class);

      const matches =
        candidateUids.has(uDoc.id) ||
        (userClass && sessionClasses.has(userClass)) ||
        [...sessionClasses].some(
          (sc) => sc && (userClass.includes(sc) || sc.includes(userClass))
        );

      if (matches) {
        candidateUids.add(uDoc.id);
      }
    }

    // Fallback: Jika tidak ada siswa yang cocok dengan filter spesifik, sertakan semua siswa aktif
    if (candidateUids.size === 0 && usersSnap.docs.length > 0) {
      for (const uDoc of usersSnap.docs) {
        candidateUids.add(uDoc.id);
      }
    }
  } catch (err) {
    console.warn('[Push] Error resolving student users:', err);
  }

  // 3. Ambil active pushTokens untuk setiap user calon penerima
  const tokens = new Set<string>();
  const tokenPromises = Array.from(candidateUids).map(async (uid) => {
    try {
      const tokenSnap = await getDocs(
        query(
          collection(db, 'users', uid, 'pushTokens'),
          where('enabled', '==', true)
        )
      );
      for (const tDoc of tokenSnap.docs) {
        const tokenVal = tDoc.data()?.token;
        if (
          typeof tokenVal === 'string' &&
          (tokenVal.startsWith('ExponentPushToken[') ||
            tokenVal.startsWith('ExpoPushToken['))
        ) {
          tokens.add(tokenVal);
        }
      }
    } catch (err) {
      console.warn(`[Push] Error fetching tokens for ${uid}:`, err);
    }
  });

  await Promise.all(tokenPromises);
  return Array.from(tokens);
};

export const dispatchSessionOpenedPush = async (
  session: Session,
  assistant: UserProfile | null
): Promise<{ success: boolean; sentCount: number }> => {
  if (!isFirebaseConfigured) {
    return { success: false, sentCount: 0 };
  }

  const dispatchId = `session-${session.id}-opened`;
  const dispatchRef = doc(db, 'notificationDispatches', dispatchId);

  try {
    const existingSnap = await getDoc(dispatchRef);
    if (existingSnap.exists() && existingSnap.data()?.status === 'COMPLETED') {
      console.log(`[Push] Session ${session.id} already dispatched.`);
      return { success: true, sentCount: existingSnap.data()?.sentCount ?? 0 };
    }

    // Catat in-progress lock
    await setDoc(
      dispatchRef,
      {
        status: 'IN_PROGRESS',
        sessionId: session.id,
        createdAt: serverTimestamp(),
        dispatchedBy: assistant?.uid ?? 'system',
      },
      { merge: true }
    );

    const tokens = await getStudentPushTokensForSession(session);
    console.log(`[Push] Ditemukan ${tokens.length} token aktif untuk sesi ${session.id}`);

    if (tokens.length === 0) {
      await updateDoc(dispatchRef, {
        status: 'COMPLETED',
        sentCount: 0,
        completedAt: serverTimestamp(),
        notes: 'Tidak ditemukan token push praktikan yang aktif.',
      });
      return { success: true, sentCount: 0 };
    }

    const courseName = session.courseName || 'Praktikum';
    const moduleName = session.moduleCode
      ? `${session.moduleCode}${session.moduleTitle ? ` - ${session.moduleTitle}` : ''}`
      : session.moduleTitle || 'Sesi Praktikum';
    const className = session.className || session.class || session.groupCode || 'Kelas Terkait';

    const title = 'Sesi Praktikum Dibuka';
    const body = `${courseName} (${moduleName}) untuk ${className} telah dibuka! Segera masuk ke laboratorium dan lakukan presensi.`;

    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      data: {
        type: 'SESSION_OPENED',
        sessionId: session.id,
        url: '/student',
        courseName,
        moduleCode: session.moduleCode,
        className,
      },
      channelId: 'default',
      priority: 'high' as const,
      // PENTING: Jangan sertakan sound: 'default' pada payload Android
    }));

    const result = await sendExpoPushMessages(messages);

    await updateDoc(dispatchRef, {
      status: 'COMPLETED',
      sentCount: result.sentCount,
      completedAt: serverTimestamp(),
      errors: result.errors,
    });

    return { success: result.success, sentCount: result.sentCount };
  } catch (error) {
    console.error('[Push] Gagal mengirim push notifikasi sesi dibuka:', error);
    try {
      await updateDoc(dispatchRef, {
        status: 'FAILED',
        error: String(error),
        failedAt: serverTimestamp(),
      });
    } catch {
      // Abaikan jika pencatatan error gagal
    }
    return { success: false, sentCount: 0 };
  }
};

export const dispatchLeaveReviewedPush = async (
  leave: {
    id: string;
    studentId: string;
    sessionId: string;
    status: 'APPROVED' | 'REJECTED';
  },
  assistant: UserProfile
): Promise<{ success: boolean; sentCount: number }> => {
  if (!isFirebaseConfigured || !leave.studentId) {
    return { success: false, sentCount: 0 };
  }

  const dispatchId = `leave-${leave.id}-${leave.status.toLowerCase()}`;
  const dispatchRef = doc(db, 'notificationDispatches', dispatchId);

  try {
    const existingSnap = await getDoc(dispatchRef);
    if (existingSnap.exists() && existingSnap.data()?.status === 'COMPLETED') {
      return { success: true, sentCount: existingSnap.data()?.sentCount ?? 0 };
    }

    const tokenSnap = await getDocs(
      query(
        collection(db, 'users', leave.studentId, 'pushTokens'),
        where('enabled', '==', true)
      )
    );

    const tokens: string[] = [];
    for (const tDoc of tokenSnap.docs) {
      const val = tDoc.data()?.token;
      if (
        typeof val === 'string' &&
        (val.startsWith('ExponentPushToken[') || val.startsWith('ExpoPushToken['))
      ) {
        tokens.push(val);
      }
    }

    if (tokens.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const isApproved = leave.status === 'APPROVED';
    const title = isApproved
      ? 'Izin Praktikum Disetujui'
      : 'Izin Praktikum Ditolak';
    const body = `Pengajuan perizinan praktikum Anda telah ${isApproved ? 'disetujui' : 'ditolak'} oleh asisten (${assistant.name}).`;

    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      data: {
        type: isApproved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        leaveId: leave.id,
        sessionId: leave.sessionId,
        url: '/student/leave',
      },
      channelId: 'default',
      priority: 'high' as const,
    }));

    const result = await sendExpoPushMessages(messages);

    await setDoc(
      dispatchRef,
      {
        status: 'COMPLETED',
        leaveId: leave.id,
        studentId: leave.studentId,
        sentCount: result.sentCount,
        dispatchedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: result.success, sentCount: result.sentCount };
  } catch (err) {
    console.error('[Push] Gagal mengirim push notifikasi keputusan izin:', err);
    return { success: false, sentCount: 0 };
  }
};
