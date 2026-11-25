import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  AndroidNotificationVisibility,
  IosAuthorizationStatus,
} from 'expo-notifications';

export type PermissionCheckResult = {
  granted: boolean;
  status: string;
  canAskAgain: boolean;
  message: string;
  servicesEnabled?: boolean;
  shouldOpenSettings?: boolean;
};

export type DeviceSettingsResult = {
  success: boolean;
  message: string;
};

const isNotificationGranted = (
  permission: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>
): boolean => {
  const iosStatus = permission.ios?.status;

  return (
    permission.granted ||
    iosStatus === IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === IosAuthorizationStatus.EPHEMERAL
  );
};

const readErrorCode = (error: unknown): string => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return '';
  }

  return String((error as { code?: unknown }).code ?? '').toLowerCase();
};

const readErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message.toLowerCase();
  return String(error ?? '').toLowerCase();
};

/** Membantu modul lokasi dan notifikasi mengenali gangguan jaringan. */
export const isNetworkError = (error: unknown): boolean => {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);

  return (
    [
      'unavailable',
      'deadline-exceeded',
      'network-request-failed',
      'webchannel-connection',
      'network_error',
      'e_network_error',
    ].some((value) => code.includes(value)) ||
    /network|internet|offline|fetch failed|connection|timed out|timeout/.test(message)
  );
};

/** Mengubah error lokasi menjadi pesan yang dapat dipahami pengguna. */
export const getLocationErrorMessage = (error: unknown): string => {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);
  const combined = `${code} ${message}`;

  if (combined.includes('permission')) {
    return 'Izin lokasi belum tersedia. Aktifkan izin lokasi LabSync melalui pengaturan perangkat.';
  }

  if (
    combined.includes('services_disabled') ||
    combined.includes('location services') ||
    combined.includes('gps')
  ) {
    return 'GPS atau layanan lokasi perangkat sedang nonaktif. Aktifkan lokasi lalu coba kembali.';
  }

  if (combined.includes('timeout') || combined.includes('timed out')) {
    return 'Lokasi perangkat belum berhasil diperoleh karena waktu tunggu habis. Coba kembali di area terbuka.';
  }

  if (combined.includes('unavailable') || combined.includes('position unavailable')) {
    return 'Lokasi perangkat belum tersedia. Pastikan GPS aktif dan coba kembali.';
  }

  if (isNetworkError(error)) {
    return 'Koneksi internet bermasalah. Periksa jaringan sebelum melanjutkan.';
  }

  return 'Lokasi perangkat gagal diperoleh. Periksa izin dan pengaturan lokasi, lalu coba kembali.';
};

/** Mengubah error notifikasi/token menjadi pesan yang dapat dipahami pengguna. */
export const getNotificationErrorMessage = (error: unknown): string => {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);
  const combined = `${code} ${message}`;

  if (code.includes('permission-denied')) {
    return 'Firebase menolak penyimpanan token notifikasi. Periksa Security Rules untuk users/{uid}/pushTokens.';
  }

  if (combined.includes('permission')) {
    return 'Izin notifikasi belum diberikan. Aktifkan notifikasi LabSync melalui pengaturan perangkat.';
  }

  if (isNetworkError(error)) {
    return 'Koneksi internet bermasalah. Token notifikasi belum dapat disinkronkan. Coba kembali saat online.';
  }

  if (combined.includes('projectid') || combined.includes('project id')) {
    return 'Konfigurasi EAS Project ID belum tersedia. Periksa konfigurasi aplikasi.';
  }

  return 'Layanan notifikasi belum dapat digunakan. Periksa pengaturan perangkat lalu coba kembali.';
};

export const checkNotificationPermission = async (): Promise<PermissionCheckResult> => {
  try {
    if (Platform.OS === 'web') {
      return {
        granted: false,
        status: 'unsupported',
        canAskAgain: false,
        message: 'Push notification hanya tersedia pada aplikasi Android dan iOS.',
      };
    }

    const permission = await Notifications.getPermissionsAsync();
    const granted = isNotificationGranted(permission);

    return {
      granted,
      status: permission.status,
      canAskAgain: permission.canAskAgain,
      shouldOpenSettings: !granted && !permission.canAskAgain,
      message: granted
        ? 'Izin notifikasi sudah aktif.'
        : permission.canAskAgain
          ? 'Izin notifikasi belum diberikan.'
          : 'Izin notifikasi ditolak. Aktifkan melalui pengaturan perangkat.',
    };
  } catch {
    return {
      granted: false,
      status: 'error',
      canAskAgain: false,
      message: 'Tidak dapat memeriksa izin notifikasi perangkat.',
    };
  }
};

export const requestNotificationPermission = async (): Promise<PermissionCheckResult> => {
  try {
    if (Platform.OS === 'web') {
      return {
        granted: false,
        status: 'unsupported',
        canAskAgain: false,
        message: 'Push notification hanya tersedia pada aplikasi Android dan iOS.',
      };
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifikasi LabSync',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const permission = isNotificationGranted(existing)
      ? existing
      : await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });

    const granted = isNotificationGranted(permission);

    return {
      granted,
      status: permission.status,
      canAskAgain: permission.canAskAgain,
      shouldOpenSettings: !granted && !permission.canAskAgain,
      message: granted
        ? 'Izin notifikasi berhasil diaktifkan.'
        : permission.canAskAgain
          ? 'Izin notifikasi belum diberikan.'
          : 'Izin notifikasi ditolak. Aktifkan melalui pengaturan perangkat.',
    };
  } catch (error) {
    return {
      granted: false,
      status: 'error',
      canAskAgain: false,
      message: getNotificationErrorMessage(error),
    };
  }
};

export const checkLocationPermission = async (): Promise<PermissionCheckResult> => {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    const granted = permission.granted && servicesEnabled;

    let message = 'Izin lokasi belum diberikan.';

    if (!permission.granted) {
      message = permission.canAskAgain
        ? 'LabSync membutuhkan izin lokasi saat aplikasi digunakan.'
        : 'Izin lokasi ditolak. Aktifkan melalui pengaturan perangkat.';
    } else if (!servicesEnabled) {
      message = 'Layanan GPS perangkat tidak aktif. Silakan aktifkan lokasi.';
    } else {
      message = 'Izin lokasi dan layanan GPS sudah aktif.';
    }

    return {
      granted,
      status: permission.status,
      canAskAgain: permission.canAskAgain,
      servicesEnabled,
      shouldOpenSettings: !permission.granted && !permission.canAskAgain,
      message,
    };
  } catch {
    return {
      granted: false,
      status: 'error',
      canAskAgain: false,
      servicesEnabled: false,
      message: 'Tidak dapat memeriksa kondisi lokasi perangkat.',
    };
  }
};

export const requestLocationPermission = async (): Promise<PermissionCheckResult> => {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    const permission = existing.granted
      ? existing
      : await Location.requestForegroundPermissionsAsync();
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    const granted = permission.granted && servicesEnabled;

    let message = 'Izin lokasi belum diberikan.';

    if (!permission.granted) {
      message = permission.canAskAgain
        ? 'Izin lokasi diperlukan untuk menggunakan presensi dan posisi pengguna pada Maps.'
        : 'Izin lokasi ditolak. Aktifkan melalui pengaturan perangkat.';
    } else if (!servicesEnabled) {
      message = 'Izin lokasi sudah diberikan, tetapi GPS belum aktif.';
    } else {
      message = 'Izin lokasi berhasil diaktifkan.';
    }

    return {
      granted,
      status: permission.status,
      canAskAgain: permission.canAskAgain,
      servicesEnabled,
      shouldOpenSettings: !permission.granted && !permission.canAskAgain,
      message,
    };
  } catch (error) {
    return {
      granted: false,
      status: 'error',
      canAskAgain: false,
      servicesEnabled: false,
      message: getLocationErrorMessage(error),
    };
  }
};

/** Membuka pengaturan perangkat ketika izin tidak dapat diminta lagi. */
export const openDeviceSettings = async (): Promise<DeviceSettingsResult> => {
  try {
    await Linking.openSettings();
    return {
      success: true,
      message: 'Pengaturan perangkat berhasil dibuka.',
    };
  } catch {
    return {
      success: false,
      message: 'Pengaturan perangkat tidak dapat dibuka otomatis. Buka Settings secara manual.',
    };
  }
};
