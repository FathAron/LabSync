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

import type { Session } from '../../../data/mockData';

import {
  colors,
  radius,
  spacing,
  theme,
} from '../../../styles/theme';

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
      ? Math.min(
          100,
          Math.round((attendanceCount / capacity) * 100),
        )
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
              width: isCompact
                ? width
                : Math.min(width - 32, 440),
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
                backgroundColor: isOpening
                  ? colors.successSoft
                  : colors.dangerSoft,
              },
            ]}
          >
            <Ionicons
              name={
                isOpening
                  ? 'play-circle-outline'
                  : 'lock-closed-outline'
              }
              size={27}
              color={
                isOpening ? colors.success : colors.danger
              }
            />
          </View>

          <Text style={styles.title}>
            {isOpening
              ? 'Buka Sesi Praktikum?'
              : 'Tutup Sesi Praktikum?'}
          </Text>

          <Text style={styles.description}>
            {isOpening
              ? `Sesi ${session.courseName} untuk kelas ${session.className} akan dibuka. Praktikan dapat mulai melakukan presensi.`
              : `Sesi ${session.courseName} untuk kelas ${session.className} akan ditutup. Praktikan tidak dapat mengirim presensi baru.`}
          </Text>

          <View style={styles.sessionInfo}>
            <Text style={styles.moduleCode}>
              {session.moduleCode} · Kelas {session.className}
            </Text>

            <Text style={styles.courseName}>
              {session.courseName}
            </Text>

            <Text style={styles.moduleTitle}>
              {session.moduleTitle}
            </Text>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={colors.textMuted}
              />
              <Text style={styles.detailText}>
                {session.date}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="time-outline"
                size={15}
                color={colors.textMuted}
              />
              <Text style={styles.detailText}>
                {session.time}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={15}
                color={colors.textMuted}
              />
              <Text style={styles.detailText}>
                {session.room}
              </Text>
            </View>
          </View>

          {!isOpening && (
            <View style={styles.attendanceSummary}>
              <View style={styles.summaryTop}>
                <Text style={styles.summaryLabel}>
                  Kehadiran saat ini
                </Text>

                <Text style={styles.summaryPercentage}>
                  {percentage}%
                </Text>
              </View>

              <Text style={styles.summaryCount}>
                {attendanceCount} dari {capacity} mahasiswa hadir
              </Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percentage}%` },
                  ]}
                />
              </View>

              <Text style={styles.summaryNote}>
                Rekap akhir tetap dapat dilihat setelah sesi ditutup.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.button, styles.secondaryButton]}
            >
              <Text style={styles.secondaryText}>
                Batal
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={[
                styles.button,
                {
                  backgroundColor: isOpening
                    ? colors.success
                    : colors.danger,
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
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...theme.shadows.modal,
  },
  bottomSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  handleContainer: {
    alignItems: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  iconCircle: {
    width: 52,
    height: 52,
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
    marginTop: spacing.sm,
  },
  sessionInfo: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  moduleCode: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  courseName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: spacing.xs,
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
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detailText: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  attendanceSummary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryPercentage: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: '800',
  },
  summaryCount: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
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
    backgroundColor: colors.danger,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
    flexBasis: 130,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.neutralSoft,
  },
  secondaryText: {
    color: colors.neutralDark,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default SessionControlModal;