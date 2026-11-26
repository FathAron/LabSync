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
  AttendanceRecord,
  LeaveRequest,
  Session,
} from '../../../types/models';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import { formatTimeWIB } from '../../student/studentUtils';
import { formatDisplayClass } from '../../../utils/classUtils';

type AttendanceWithPunctuality = AttendanceRecord & {
  attendanceStatus?: 'ON_TIME' | 'LATE' | 'EXCUSED';
  lateMinutes?: number;
};

interface AttendanceSummaryModalProps {
  visible: boolean;
  session: Session | null;
  records: AttendanceRecord[];
  approvedLeaves?: LeaveRequest[];
  onClose: () => void;
}

const AttendanceSummaryModal = ({
  visible,
  session,
  records,
  approvedLeaves = [],
  onClose,
}: AttendanceSummaryModalProps) => {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 600;

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [records]
  );

  if (!session) return null;

  const capacity = Math.max(0, session.totalStudents);
  const presentCount = records.length;
  const excusedCount = approvedLeaves.length;
  const percentage =
    capacity > 0 ? Math.min(100, Math.round((presentCount / capacity) * 100)) : 0;

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
              width: isCompact ? width : Math.min(width - 32, 620),
              maxHeight: height * 0.88,
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
              <Text style={styles.eyebrow}>REKAP KEHADIRAN</Text>
              <Text style={styles.title}>Rekap Presensi Sesi</Text>
              <Text style={styles.subtitle}>
                {session.courseName} · {formatDisplayClass(session.className)}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* METRICS */}
            <View style={styles.metrics}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Mahasiswa Hadir</Text>
                <Text style={styles.metricValue}>
                  {presentCount}
                  <Text style={styles.metricTotal}> / {capacity}</Text>
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Persentase Hadir</Text>
                <Text style={styles.metricValue}>{percentage}%</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Izin (Excused)</Text>
                <Text style={[styles.metricValue, { color: colors.warningDark }]}>
                  {excusedCount}
                </Text>
              </View>
            </View>

            {/* PROGRESS SECTION */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Tingkat Kehadiran</Text>
                <Text style={styles.progressValue}>{percentage}%</Text>
              </View>

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
            </View>

            {/* ATTENDEE LIST HEADER */}
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Daftar Praktikan Hadir</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{presentCount} Mahasiswa</Text>
              </View>
            </View>

            {sortedRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="people-outline" size={26} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Belum ada presensi tercatat</Text>
                <Text style={styles.emptyDescription}>
                  Catatan presensi akan otomatis muncul di sini setelah praktikan berhasil memvalidasi kehadiran.
                </Text>
              </View>
            ) : (
              sortedRecords.map((record, index) => {
                const time =
                  formatTimeWIB(record.timestamp) ?? record.attendedAt ?? '—';
                const ext = record as AttendanceWithPunctuality;
                const isLate = ext.attendanceStatus === 'LATE';
                const isOnTime = ext.attendanceStatus === 'ON_TIME';

                return (
                  <View key={record.id} style={styles.attendeeRow}>
                    <View style={styles.indexBadge}>
                      <Text style={styles.indexText}>{index + 1}</Text>
                    </View>

                    <View style={styles.attendeeInfo}>
                      <Text style={styles.attendeeName}>{record.studentName}</Text>
                      <Text style={styles.attendeeNim}>NIM: {record.studentNim}</Text>

                      {record.notes ? (
                        <View style={styles.notesRow}>
                          <Ionicons name="desktop-outline" size={13} color={colors.textMuted} />
                          <Text style={styles.attendeeNotes}>{record.notes}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.statusColumn}>
                      <View
                        style={[
                          styles.attendanceTime,
                          isLate && styles.attendanceTimeLate,
                        ]}
                      >
                        <Ionicons
                          name={isLate ? 'time' : 'checkmark-circle'}
                          size={14}
                          color={isLate ? colors.warningDark : colors.success}
                        />
                        <Text
                          style={[
                            styles.timeText,
                            isLate && styles.timeTextLate,
                          ]}
                        >
                          {time}
                        </Text>
                      </View>
                      {isLate ? (
                        <Text style={styles.punctualityLateText}>
                          Terlambat{typeof ext.lateMinutes === 'number' && ext.lateMinutes > 0 ? ` ${ext.lateMinutes} mnt` : ''}
                        </Text>
                      ) : isOnTime ? (
                        <Text style={styles.punctualityOnTimeText}>Tepat Waktu</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}

            {/* EXCUSED ABSENCE LIST (APPROVED LEAVE) */}
            {approvedLeaves.length > 0 ? (
              <View style={styles.excusedSection}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>Izin Disetujui (Excused Absence)</Text>
                  <View style={styles.excusedBadge}>
                    <Text style={styles.excusedBadgeText}>{excusedCount} Mahasiswa</Text>
                  </View>
                </View>

                <Text style={styles.excusedNote}>
                  Praktikan berikut tidak dihitung hadir namun dibebaskan dari denda keterlambatan.
                </Text>

                {approvedLeaves.map((leave, index) => (
                  <View key={leave.id} style={styles.attendeeRow}>
                    <View style={[styles.indexBadge, styles.excusedIndexBadge]}>
                      <Text style={[styles.indexText, { color: colors.warningDark }]}>
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.attendeeInfo}>
                      <Text style={styles.attendeeName}>{leave.studentName}</Text>
                      <Text style={styles.attendeeNim}>NIM: {leave.studentNim}</Text>
                      <Text style={styles.attendeeNotes} numberOfLines={2}>
                        Alasan: {leave.reason}
                      </Text>
                    </View>

                    <View style={styles.excusedStatusPill}>
                      <Ionicons name="document-text-outline" size={13} color={colors.warningDark} />
                      <Text style={styles.excusedStatusText}>Excused · Bebas Denda</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeFooterBtn}
            >
              <Text style={styles.closeFooterText}>Tutup Rekap</Text>
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
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.lg,
    ...theme.shadows.modal,
    overflow: 'hidden',
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
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  metricTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressSection: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  progressTrack: {
    height: 7,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emptyDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  attendeeInfo: {
    flex: 1,
    minWidth: 0,
  },
  attendeeName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  attendeeNim: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  attendeeNotes: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  statusColumn: {
    alignItems: 'flex-end',
    gap: 3,
  },
  attendanceTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  attendanceTimeLate: {
    backgroundColor: colors.warningSoft,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  timeTextLate: {
    color: colors.warningDark,
  },
  punctualityOnTimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  punctualityLateText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warningDark,
  },
  excusedSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  excusedBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  excusedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warningDark,
  },
  excusedNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  excusedIndexBadge: {
    backgroundColor: colors.warningSoft,
    borderColor: '#F5DEB3',
  },
  excusedStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  excusedStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warningDark,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeFooterBtn: {
    minHeight: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFooterText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});

export default AttendanceSummaryModal;
