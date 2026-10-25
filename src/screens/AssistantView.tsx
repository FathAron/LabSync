// TASK-02 / Integrasi Shell - Layar Sudut Pandang Asisten (AssistantView)
// Terhubung ke AppContext (openSession, closeSession, getAttendanceForSession)
// untuk memfasilitasi peralihan peran dan pengujian skenario Sprint 1 secara utuh.

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import type { Session } from '../data/mockData';
import {
  STATUS_META,
  formatDateID,
  formatTimeRange,
  formatTimeWIB,
} from '../features/student/studentUtils';
import { CONTENT_MAX_WIDTH, colors, radius, spacing, theme } from '../styles/theme';
import SessionControlModal from '../features/assistant/components/SessionControlModal';
import AttendanceSummaryModal from '../features/assistant/components/AttendanceSummaryModal';

type ConfirmAction = {
  type: 'open' | 'close';
  session: Session;
} | null;

export const AssistantView = () => {
  const {
    sessions,
    attendanceList,
    openSession,
    closeSession,
    getAttendanceForSession,
  } = useApp();

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [recapSessionId, setRecapSessionId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const activeCount = sessions.filter((s) => s.status === 'ACTIVE').length;
    const closedCount = sessions.filter((s) => s.status === 'CLOSED').length;
    const totalPresent = attendanceList.length;
    return { activeCount, closedCount, totalPresent };
  }, [sessions, attendanceList]);

  const recapSession = useMemo(
    () => sessions.find((s) => s.id === recapSessionId) ?? null,
    [sessions, recapSessionId]
  );

  const recapAttendees = useMemo(
    () => (recapSession ? getAttendanceForSession(recapSession.id) : []),
    [recapSession, getAttendanceForSession]
  );

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'open') {
      openSession(confirmAction.session.id);
    } else {
      closeSession(confirmAction.session.id);
    }
    setConfirmAction(null);
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      {/* Ringkasan Statistik Sesi */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: colors.primary }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.activeCount}</Text>
          <Text style={styles.statLabel}>Sesi Aktif</Text>
        </View>
        <View style={[styles.statCard, { borderColor: colors.success }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.totalPresent}</Text>
          <Text style={styles.statLabel}>Total Hadir</Text>
        </View>
        <View style={[styles.statCard, { borderColor: colors.neutral }]}>
          <Text style={[styles.statValue, { color: colors.neutralDark }]}>{stats.closedCount}</Text>
          <Text style={styles.statLabel}>Sesi Selesai</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daftar Sesi Praktikum</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{sessions.length} Sesi</Text>
        </View>
      </View>
    </View>
  );

  const renderSessionItem = ({ item }: { item: Session }) => {
    const meta = STATUS_META[item.status];
    const attendees = getAttendanceForSession(item.id);
    const presentCount = attendees.length;
    const capacity = item.totalStudents || 30;
    const percentage = Math.min(100, Math.round((presentCount / capacity) * 100));

    const dateText = formatDateID(item.date) ?? item.date;
    const timeText = formatTimeRange(item.startTime, item.endTime) ?? item.time;
    const subtitle = [item.moduleCode, item.moduleTitle].filter(Boolean).join(' - ');

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.classPill}>
            <Text style={styles.classPillText}>Kelas {item.className}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
            <Text style={[styles.statusText, { color: meta.fg }]}>{meta.label}</Text>
          </View>
        </View>

        <Text style={styles.courseTitle}>{item.courseName}</Text>
        {subtitle ? <Text style={styles.moduleSubtitle}>{subtitle}</Text> : null}

        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>{dateText}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>{timeText}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>{item.room}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>Asisten: {item.assistantName}</Text>
          </View>
        </View>

        {/* Progress Bar Kehadiran */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Kehadiran Praktikan</Text>
            <Text style={styles.progressValue}>
              {presentCount} / {capacity} Mahasiswa ({percentage}%)
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor:
                    item.status === 'ACTIVE' ? colors.success : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Tombol Aksi Kontekstual Asisten */}
        <View style={styles.actionRow}>
          {item.status === 'PENDING' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmAction({ type: 'open', session: item })}
              style={[styles.btn, styles.btnSuccess]}
            >
              <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>Buka Sesi Praktikum</Text>
            </Pressable>
          ) : null}

          {item.status === 'ACTIVE' ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRecapSessionId(item.id)}
                style={[styles.btn, styles.btnPrimary, { flex: 1.4 }]}
              >
                <Ionicons name="people-outline" size={17} color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>
                  Rekap Presensi ({presentCount})
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmAction({ type: 'close', session: item })}
                style={[styles.btn, styles.btnDangerOutline, { flex: 1 }]}
              >
                <Ionicons name="lock-closed-outline" size={16} color={colors.danger} />
                <Text style={styles.btnDangerOutlineText}>Tutup Sesi</Text>
              </Pressable>
            </>
          ) : null}

          {item.status === 'CLOSED' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setRecapSessionId(item.id)}
              style={[styles.btn, styles.btnSecondary]}
            >
              <Ionicons name="document-text-outline" size={17} color={colors.neutralDark} />
              <Text style={styles.btnSecondaryText}>
                Lihat Rekap Akhir ({presentCount} Hadir)
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSessionItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal konfirmasi sesi — TASK-03 */}
      <SessionControlModal
        visible={confirmAction !== null}
        session={confirmAction?.session ?? null}
        action={confirmAction?.type ?? 'open'}
        attendanceCount={
          confirmAction
            ? getAttendanceForSession(confirmAction.session.id).length
            : 0
        }
        capacity={confirmAction?.session.totalStudents ?? 0}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
      />

      {/* Modal rekap presensi — TASK-03 */}
      <AttendanceSummaryModal
        visible={recapSession !== null}
        session={recapSession}
        records={recapAttendees}
        onClose={() => setRecapSessionId(null)}
      />
          </View>
        );
      };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  listContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  headerBlock: {
    marginBottom: spacing.sm,
  },

  // Statistik
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: 96,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Header daftar sesi
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.neutralSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutralDark,
  },

  // Kartu sesi
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  classPill: {
    backgroundColor: colors.assistantTagBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  classPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.assistantTagDark,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 23,
  },
  moduleSubtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },

  // Informasi sesi
  infoList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },

  // Progress presensi
  progressSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 6,
  },
  progressLabel: {
    flex: 1,
    minWidth: 110,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  progressTrack: {
    height: 7,
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },

  // Tombol aksi
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 0,
    minHeight: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnSuccess: {
    backgroundColor: colors.success,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnDangerOutline: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  btnSecondary: {
    backgroundColor: colors.neutralSoft,
  },
  btnPrimaryText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  btnDangerOutlineText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.dangerDark,
    textAlign: 'center',
  },
  btnSecondaryText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutralDark,
    textAlign: 'center',
  },

  // Ikon konfirmasi pada AppModal
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  confirmFooter: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  // Daftar rekap kehadiran
  attendeeItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  attendeeIndex: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  attendeeInfo: {
    flex: 1,
    flexBasis: 150,
    minWidth: 0,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  attendeeNim: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  attendeeNotes: {
    marginTop: 2,
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  attendeeTimeBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginLeft: 'auto',
  },
  attendeeTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.successDark,
  },
  recapCloseButton: {
  flex: 0,
  width: '100%',
  height: 44,
  minHeight: 44,
  padding: 0,
  margin: 0,
  borderRadius: radius.md,
  alignSelf: 'stretch',
  alignItems: 'center',
  justifyContent: 'center',
  },
});

export default AssistantView;

