import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { colors, radius, spacing, theme } from '../styles/theme';
import {
  checkNotificationPermission,
  openDeviceSettings,
  requestNotificationPermission,
} from '../services/permissionService';

export type NotificationStatusType =
  | 'checking'
  | 'granted'
  | 'undetermined'
  | 'denied'
  | 'permanently_denied'
  | 'expo_go_limited'
  | 'unsupported';

interface NotificationPermissionBannerProps {
  onStatusChange?: (status: NotificationStatusType) => void;
}

export const isRunningInExpoGo = (): boolean => {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
};

export const NotificationPermissionBanner = ({
  onStatusChange,
}: NotificationPermissionBannerProps) => {
  const [status, setStatus] = useState<NotificationStatusType>('checking');
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Periksa saat pertama kali mount & saat pengguna kembali ke aplikasi dari background
  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      if (Platform.OS === 'web') {
        if (isMounted) setStatus('unsupported');
        onStatusChange?.('unsupported');
        return;
      }

      try {
        const res = await checkNotificationPermission();
        if (!isMounted) return;

        if (res.granted) {
          setStatus('granted');
          onStatusChange?.('granted');
          return;
        }

        if (isRunningInExpoGo() && Platform.OS === 'android') {
          setStatus('expo_go_limited');
          onStatusChange?.('expo_go_limited');
          return;
        }

        if (res.canAskAgain) {
          const next = res.status === 'undetermined' ? 'undetermined' : 'denied';
          setStatus(next);
          onStatusChange?.(next);
        } else {
          setStatus('permanently_denied');
          onStatusChange?.('permanently_denied');
        }
      } catch {
        if (isMounted) {
          setStatus('denied');
          onStatusChange?.('denied');
        }
      }
    };

    void check();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void check();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [onStatusChange]);

  const handleActivate = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (status === 'permanently_denied') {
        // Izin ditolak permanen, arahkan ke pengaturan aplikasi di OS
        await openDeviceSettings();
      } else {
        // Tampilkan prompt izin sistem operasi
        const res = await requestNotificationPermission();
        if (res.granted) {
          setStatus('granted');
          onStatusChange?.('granted');
        } else if (!res.canAskAgain) {
          setStatus('permanently_denied');
          onStatusChange?.('permanently_denied');
          await openDeviceSettings();
        } else {
          setStatus('denied');
          onStatusChange?.('denied');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Jangan tampilkan jika sudah aktif, sedang loading awal, atau pengguna memilih "Nanti"
  if (status === 'granted' || status === 'checking' || status === 'unsupported' || dismissed) {
    return null;
  }

  // Tampilan khusus jika berjalan di Expo Go
  if (status === 'expo_go_limited') {
    return (
      <View style={styles.bannerContainer}>
        <View style={styles.expoGoBox}>
          <View style={styles.iconCircleInfo}>
            <Ionicons name="information" size={16} color="#1E40AF" />
          </View>
          <View style={styles.contentColumn}>
            <Text style={styles.bannerTitle}>Lingkungan Expo Go Terdeteksi</Text>
            <Text style={styles.bannerDesc}>
              Notifikasi lokal aktif. Pengujian remote push notification di Android memerlukan development build (APK/AAB).
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup pemberitahuan"
            onPress={() => setDismissed(true)}
            hitSlop={8}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bannerContainer} accessibilityLiveRegion="polite">
      <View style={styles.bannerCard}>
        <View style={styles.topRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={18} color="#C27803" />
          </View>

          <View style={styles.contentColumn}>
            <Text style={styles.bannerTitle}>Notifikasi Belum Aktif</Text>
            <Text style={styles.bannerDesc}>
              Anda belum mengizinkan LabSync mengirim notifikasi. Aktifkan notifikasi agar tidak melewatkan pengingat sesi praktikum dan pembaruan pengajuan izin.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup banner notifikasi"
            onPress={() => setDismissed(true)}
            hitSlop={8}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={handleActivate}
            disabled={loading}
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="notifications" size={14} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>
                  {status === 'permanently_denied'
                    ? 'Buka Pengaturan HP'
                    : 'Aktifkan Notifikasi'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setDismissed(true)}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Nanti</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    backgroundColor: 'transparent',
  },
  bannerCard: {
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    borderRadius: radius.lg,
    padding: spacing.md,
    ...theme.shadows.card,
  },
  expoGoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleInfo: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentColumn: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  bannerDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  closeBtn: {
    padding: 2,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingLeft: 40,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default NotificationPermissionBanner;
