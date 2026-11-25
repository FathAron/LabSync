import { useCallback, useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FeedbackToast } from '../src/components/FeedbackToast';
import { Header } from '../src/components/Header';
import { AppProvider, useApp } from '../src/context/AppContext';
import { AssistantView } from '../src/screens/AssistantView';
import { colors, spacing } from '../src/styles/theme';

type PendingNotification =
  | {
      type: 'SESSION_OPENED';
      sessionId: string;
    }
  | {
      type: 'PATH';
      path: string;
    };

const isAllowedNotificationPath = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return false;
  }

  const pathname = value.split('?')[0];

  return [
    '/student',
    '/student/leave',
    '/student/history',
  ].includes(pathname);
};

// Notification handler hanya untuk Android dan iOS.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const AppShell = () => {
  const router = useRouter();
  const segments = useSegments();

  const {
    currentUser,
    currentRole,
    authLoading,
  } = useApp();

  const pendingNotification = useRef<PendingNotification | null>(null);

  // Navigasi berdasarkan data notifikasi.
  const navigateFromNotification = useCallback(
    (target: PendingNotification) => {
      // Tunggu autentikasi selesai jika aplikasi belum siap.
      if (authLoading || !currentUser) {
        pendingNotification.current = target;
        return;
      }

      if (target.type === 'SESSION_OPENED') {
        if (currentRole !== 'student') {
          console.warn(
            '[LabSync] Notifikasi sesi hanya ditujukan kepada praktikan.'
          );
          return;
        }

        console.log(
          '[LabSync] Membuka sesi dari notifikasi:',
          target.sessionId
        );

        router.push({
          pathname: '/student',
          params: {
            sessionId: target.sessionId,
          },
        });

        return;
      }

      // Notifikasi Sprint 3 hanya membuka area praktikan.
      if (
        target.path.startsWith('/student') &&
        currentRole !== 'student'
      ) {
        console.warn(
          '[LabSync] Notifikasi praktikan diabaikan untuk akun non-praktikan.'
        );
        return;
      }

      router.push(target.path as Href);
    },
    [authLoading, currentUser, currentRole, router]
  );

  // Membaca data ketika pengguna mengetuk notifikasi.
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const notificationData =
        response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;

      console.log(
        '[LabSync] Notification payload:',
        notificationData
      );

      if (
        notificationData?.type === 'SESSION_OPENED' &&
        typeof notificationData.sessionId === 'string'
      ) {
        navigateFromNotification({
          type: 'SESSION_OPENED',
          sessionId: notificationData.sessionId,
        });
      } else {
        // SCHEDULE_CHANGED dan keputusan izin menggunakan route internal.
        const notificationPath = notificationData?.url;
        const fallbackPath =
          notificationData?.type === 'SCHEDULE_CHANGED'
            ? '/student'
            : notificationData?.type === 'LEAVE_APPROVED' ||
                notificationData?.type === 'LEAVE_REJECTED'
              ? '/student/leave'
              : null;
        const targetPath = isAllowedNotificationPath(notificationPath)
          ? notificationPath
          : fallbackPath;

        if (targetPath) {
          navigateFromNotification({
            type: 'PATH',
            path: targetPath,
          });
        }
      }

      if (Platform.OS !== 'web') {
        Notifications.clearLastNotificationResponse();
      }
    },
    [navigateFromNotification]
  );

  // Inisialisasi channel dan listener notifikasi khusus perangkat native.
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    // Android 8.0+ (API 26+) WAJIB mendaftarkan channel notifikasi sebelum notifikasi dapat ditampilkan
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync('default', {
        name: 'Notifikasi LabSync',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    const receivedSubscription =
      Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log(
            '[LabSync] Notifikasi diterima:',
            notification.request.content.title
          );
        }
      );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

    // Menangani notifikasi ketika aplikasi sebelumnya tertutup.
    const lastResponse =
      Notifications.getLastNotificationResponse();

    if (lastResponse) {
      console.log(
        '[LabSync] Membaca notifikasi terakhir.'
      );

      handleNotificationResponse(lastResponse);
    }

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [handleNotificationResponse]);

  // Jalankan notifikasi tertunda setelah login selesai.
  useEffect(() => {
    if (authLoading || !currentUser) {
      return;
    }

    const pending = pendingNotification.current;

    if (!pending) {
      return;
    }

    pendingNotification.current = null;

    if (pending.type === 'SESSION_OPENED') {
      if (currentRole !== 'student') {
        return;
      }

      console.log(
        '[LabSync] Menjalankan navigasi tertunda:',
        pending.sessionId
      );

      router.push({
        pathname: '/student',
        params: {
          sessionId: pending.sessionId,
        },
      });

      return;
    }

    if (
      pending.path.startsWith('/student') &&
      currentRole !== 'student'
    ) {
      return;
    }

    router.push(pending.path as Href);
  }, [authLoading, currentUser, currentRole, router]);

  // Pengaturan navigasi berdasarkan role.
  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inStudentGroup = segments[0] === 'student';

    if (!currentUser) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (currentRole === 'student' && !inStudentGroup) {
      router.replace('/student');
    } else if (currentRole === 'assistant' && inAuthGroup) {
      router.replace('/');
    }
  }, [
    authLoading,
    currentRole,
    currentUser,
    router,
    segments,
  ]);

  if (authLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Memuat sesi LabSync...
        </Text>

        <FeedbackToast />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {currentUser ? <Header /> : null}

      <View style={styles.content}>
        <View
          style={[
            styles.layer,
            currentUser && currentRole === 'assistant'
              ? styles.hidden
              : null,
          ]}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="student" />
          </Stack>
        </View>

        {currentUser && currentRole === 'assistant' ? (
          <View style={styles.layer}>
            <AssistantView />
          </View>
        ) : null}
      </View>

      <FeedbackToast />
    </View>
  );
};

const RootLayout = () => (
  <AppProvider>
    <StatusBar style="dark" />
    <AppShell />
  </AppProvider>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  layer: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

export default RootLayout;
