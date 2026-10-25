import React, { useMemo } from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import type {
  Session,
  AttendanceRecord,
} from '../../../data/mockData';

import {
  colors,
  radius,
  spacing,
  theme,
} from '../../../styles/theme';

import { formatTimeWIB } from '../../student/studentUtils';

interface AttendanceSummaryModalProps {
  visible: boolean;
  session: Session | null;
  records: AttendanceRecord[];
  onClose: () => void;
}

const AttendanceSummaryModal = ({
  visible,
  session,
  records,
  onClose,
}: AttendanceSummaryModalProps) => {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 600;

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() -
          new Date(b.timestamp).getTime(),
      ),
    [records],
  );

  if (!session) return null;

  const capacity = Math.max(0, session.totalStudents);
  const presentCount = records.length;
  const percentage =
    capacity > 0
      ? Math.min(
          100,
          Math.round((presentCount / capacity) * 100),
        )
      : 0;

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
          accessibilityLabel="Tutup rekap presensi"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.panel,
            {
              width: isCompact
                ? width
                : Math.min(width - 32, 620),
              maxHeight: height * 0.85,
            },
            isCompact && styles.bottomSheet,
          ]}
        >
          {isCompact && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                REKAP KEHADIRAN
              </Text>

              <Text style={styles.title}>
                Rekap Presensi Sesi
              </Text>

              <Text style={styles.subtitle}>
                {session.courseName} · Kelas {session.className}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={20}
                color={colors.neutralDark}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.metrics}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>
                  Mahasiswa hadir
                </Text>

                <Text style={styles.metricValue}>
                  {presentCount}
                  <Text style={styles.metricTotal}>
                    {' '}/ {capacity}
                  </Text>
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>
                  Persentase hadir
                </Text>

                <Text style={styles.metricValue}>
                  {percentage}%
                </Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  Tingkat kehadiran
                </Text>

                <Text style={styles.progressValue}>
                  {percentage}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percentage}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                Daftar praktikan hadir
              </Text>

              <Text style={styles.listCount}>
                {presentCount} catatan
              </Text>
            </View>

            {sortedRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="people-outline"
                  size={30}
                  color={colors.textMuted}
                />

                <Text style={styles.emptyTitle}>
                  Belum ada praktikan yang presensi
                </Text>

                <Text style={styles.emptyDescription}>
                  Catatan kehadiran akan muncul di sini setelah
                  praktikan berhasil melakukan presensi.
                </Text>
              </View>
            ) : (
              sortedRecords.map((record, index) => {
                const time =
                  formatTimeWIB(record.timestamp) ??
                  record.attendedAt ??
                  '—';

                return (
                  <View
                    key={record.id}
                    style={styles.attendeeRow}
                  >
                    <View style={styles.indexBadge}>
                      <Text style={styles.indexText}>
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.attendeeInfo}>
                      <Text style={styles.attendeeName}>
                        {record.studentName}
                      </Text>

                      <Text style={styles.attendeeNim}>
                        NIM {record.studentNim}
                      </Text>

                      {record.notes ? (
                        <Text style={styles.attendeeNotes}>
                          Catatan meja: {record.notes}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.attendanceTime}>
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={colors.success}
                      />

                      <Text style={styles.timeText}>
                        {time}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeAction}
            >
              <Text style={styles.closeActionText}>
                Tutup Rekap
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
  panel: {
    maxWidth: 620,
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...theme.shadows.modal,
  },
  bottomSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.neutralSoft,
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    flexBasis: 140,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  metricTotal: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  progressValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 7,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.neutralSoft,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: radius.pill,
  },
  listHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  listTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  listCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 330,
    marginTop: spacing.xs,
  },
  attendeeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  indexBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  attendeeInfo: {
    flex: 1,
    flexBasis: 150,
    minWidth: 0,
  },
  attendeeName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  attendeeNim: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  attendeeNotes: {
    color: colors.primaryDark,
    fontSize: 11,
    marginTop: 3,
  },
  attendanceTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  timeText: {
    color: colors.successDark,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeAction: {
    width: '100%',
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  closeActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default AttendanceSummaryModal;