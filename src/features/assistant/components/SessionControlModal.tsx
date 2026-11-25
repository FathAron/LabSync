import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Session } from '../../../types/models';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import { formatSessionDate } from '../../../utils/dateUtils';
import { formatDisplayClass } from '../../../utils/classUtils';

export type SessionAction = 'open' | 'close';

interface SessionControlModalProps {
  visible: boolean;
  session: Session | null;
  action: SessionAction;
  attendanceCount: number;
  capacity: number;
  onClose: () => void;
  onConfirm: () => void;
}

const SessionControlModal = ({
  visible,
  session,
  action,
  attendanceCount,
  capacity,
  onClose,
  onConfirm,
}: SessionControlModalProps) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 600;
  const isOpening = action === 'open';

  const percentage =
    capacity > 0
      ? Math.min(100, Math.round((attendanceCount / capacity) * 100))
      : 0;

  if (!session) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isCompact ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            justifyContent: isCompact ? 'flex-end' : 'center',
            padding: isCompact ? 0 : spacing.lg,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup dialog"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.card,
            {
              width: isCompact ? width : Math.min(width - 32, 440),
            },
            isCompact && styles.bottomSheet,
          ]}
        >
          {isCompact && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isOpening ? '#E2EDE3' : '#FCE8EC',
              },
            ]}
          >
            <Ionicons
              name={isOpening ? 'play-circle-outline' : 'lock-closed-outline'}
              size={28}
              color={isOpening ? '#4D7A54' : '#C53051'}
            />
          </View>

          <Text style={styles.title}>
            {isOpening ? 'Buka Sesi Praktikum?' : 'Tutup Sesi Praktikum?'}
          </Text>

          <Text style={styles.description}>
            {isOpening
              ? `Sesi ${session.courseName} untuk ${formatDisplayClass(session.className)} akan dibuka. Praktikan yang berada di radius laboratorium dapat mulai mengirim presensi.`
              : `Sesi ${session.courseName} untuk ${formatDisplayClass(session.className)} akan ditutup. Praktikan tidak dapat lagi melakukan presensi mandiri.`}
          </Text>

          <View style={styles.sessionInfo}>
            <View style={styles.moduleTag}>
              <Text style={styles.moduleCode}>
                {session.moduleCode} · {formatDisplayClass(session.className)}
              </Text>
            </View>

            <Text style={styles.courseName}>{session.courseName}</Text>

            {session.moduleTitle ? (
              <Text style={styles.moduleTitle}>{session.moduleTitle}</Text>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
              <Text style={styles.detailText}>{formatSessionDate(session.date)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={15} color={colors.textMuted} />
              <Text style={styles.detailText}>{session.time}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={15} color={colors.textMuted} />
              <Text style={styles.detailText}>{session.room}</Text>
            </View>
          </View>

          {!isOpening && (
            <View style={styles.attendanceSummary}>
              <View style={styles.summaryTop}>
                <Text style={styles.summaryLabel}>Kehadiran Mahasiswa</Text>
                <Text style={styles.summaryPercentage}>{percentage}%</Text>
              </View>

              <Text style={styles.summaryCount}>
                {attendanceCount} dari {capacity} praktikan terdaftar hadir
              </Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${percentage}%`,
                      backgroundColor: percentage >= 75 ? colors.success : colors.primary,
                    },
                  ]}
                />
              </View>

              <Text style={styles.summaryNote}>
                Rekap lengkap daftar hadir tetap dapat dilihat dan diunduh setelah sesi ditutup.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.button, styles.secondaryButton]}
            >
              <Text style={styles.secondaryText}>Batal</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={[
                styles.button,
                {
                  backgroundColor: isOpening ? colors.success : colors.primary,
                },
              ]}
            >
              <Text style={styles.primaryText}>
                {isOpening ? 'Ya, Buka Sesi' : 'Ya, Tutup Sesi'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  card: {
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.modal,
  },
  bottomSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  handleContainer: {
    alignItems: 'center',
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderDark,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 25,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sessionInfo: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  moduleTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    marginBottom: 6,
  },
  moduleCode: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  courseName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  moduleTitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  detailText: {
    flex: 1,
    minWidth: 0,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  attendanceSummary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#F5DEB3',
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryPercentage: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryCount: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginTop: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  summaryNote: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default SessionControlModal;
