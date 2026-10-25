// TASK-02 - Global Notification System (FeedbackToast)
// Penanggung Jawab: Aron Sorimuda Johanes Pasaribu

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp, type ToastTone } from '../context/AppContext';
import { CONTENT_MAX_WIDTH, colors, radius, spacing, theme } from '../styles/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const getToastMeta = (
  type: ToastTone
): { bg: string; border: string; fg: string; icon: IconName } => {
  switch (type) {
    case 'success':
      return {
        bg: colors.successSoft,
        border: colors.success,
        fg: colors.successDark,
        icon: 'checkmark-circle',
      };
    case 'error':
    case 'danger':
      return {
        bg: colors.dangerSoft,
        border: colors.danger,
        fg: colors.dangerDark,
        icon: 'alert-circle',
      };
    case 'warning':
      return {
        bg: colors.warningSoft,
        border: colors.warning,
        fg: colors.warningDark,
        icon: 'warning',
      };
    case 'info':
    default:
      return {
        bg: colors.primarySoft,
        border: colors.primary,
        fg: colors.primaryDark,
        icon: 'information-circle',
      };
  }
};

export const FeedbackToast = () => {
  const router = useRouter();
  const { feedbackToast, hideToast, currentRole, setCurrentRole } = useApp();

  if (!feedbackToast) return null;

  const meta = getToastMeta(feedbackToast.type);

  const handleViewHistory = () => {
    hideToast();
    if (currentRole !== 'student') {
      setCurrentRole('student');
    }
    router.push('/student/history');
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View
        style={[
          styles.toastCard,
          { backgroundColor: meta.bg, borderColor: meta.border },
        ]}
        accessibilityLiveRegion="polite"
      >
        <Ionicons name={meta.icon} size={20} color={meta.fg} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: meta.fg }]}>{feedbackToast.message}</Text>
          {feedbackToast.withHistoryLink ? (
            <Pressable
              accessibilityRole="link"
              onPress={handleViewHistory}
              hitSlop={8}
              style={styles.actionBtn}
            >
              <Text style={[styles.actionText, { color: meta.fg }]}>
                Lihat Riwayat Presensi →
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup notifikasi"
          onPress={hideToast}
          hitSlop={10}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={18} color={meta.fg} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 999,
  },
  toastCard: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH - spacing.lg * 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    ...theme.shadows.modal,
  },
  icon: {
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  message: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  actionBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  closeBtn: {
    padding: 2,
  },
});

export default FeedbackToast;

