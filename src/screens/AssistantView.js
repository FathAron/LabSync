import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../styles/theme';
import { StatCard } from '../components/StatCard';
import { SessionControlModal } from '../components/SessionControlModal';
import { AttendanceSummaryModal } from '../components/AttendanceSummaryModal';
import { EmptyState } from '../components/EmptyState';

export const AssistantView = () => {
  const {
    currentAssistant,
    sessions,
    openSession,
    closeSession,
    getAttendanceForSession,
  } = useApp();

  const [controlModalVisible, setControlModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [actionType, setActionType] = useState('OPEN'); // 'OPEN' | 'CLOSE'
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);

  // Compute stats
  const activeSessionsCount = sessions.filter((s) => s.status === 'ACTIVE').length;
  const closedSessionsCount = sessions.filter((s) => s.status === 'CLOSED').length;
  const totalPresensiCount = sessions.reduce(
    (acc, s) => acc + getAttendanceForSession(s.id).length,
    0
  );

  const handleOpenPrompt = (session) => {
    setSelectedSession(session);
    setActionType('OPEN');
    setControlModalVisible(true);
  };

  const handleClosePrompt = (session) => {
    setSelectedSession(session);
    setActionType('CLOSE');
    setControlModalVisible(true);
  };

  const handleViewSummary = (session) => {
    setSelectedSession(session);
    setSummaryModalVisible(true);
  };

  const handleConfirmAction = (sessionId) => {
    if (actionType === 'OPEN') {
      openSession(sessionId);
    } else {
      closeSession(sessionId);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerGreeting}>Halo, Kak {currentAssistant.name}! 👋</Text>
          <Text style={styles.bannerSub}>
            Kelola sesi praktikum hari ini. Buka sesi ketika praktikum dimulai dan pantau kehadiran mahasiswa.
          </Text>
        </View>
      </View>

      {/* Summary Metrics */}
      <View style={styles.statsContainer}>
        <StatCard
          label="Sesi Aktif"
          value={activeSessionsCount}
          subtext="Berlangsung"
          color={theme.colors.success}
        />
        <StatCard
          label="Total Hadir"
          value={totalPresensiCount}
          subtext="Mahasiswa"
          color={theme.colors.primary}
        />
        <StatCard
          label="Sesi Selesai"
          value={closedSessionsCount}
          subtext="Ditutup"
          color={theme.colors.secondary}
        />
      </View>

      {/* Sessions Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Jadwal & Pengelolaan Sesi</Text>
        <Text style={styles.sectionBadge}>{sessions.length} Sesi Terjadwal</Text>
      </View>

      {sessions.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Tidak Ada Jadwal"
          message="Belum ada jadwal sesi praktikum yang terdaftar saat ini."
        />
      ) : (
        sessions.map((session) => {
          const attendees = getAttendanceForSession(session.id);
          const isPending = session.status === 'PENDING';
          const isActive = session.status === 'ACTIVE';
          const isClosed = session.status === 'CLOSED';

          return (
            <View
              key={session.id}
              style={[
                styles.sessionCard,
                isActive && styles.sessionCardActive,
                isClosed && styles.sessionCardClosed,
              ]}
            >
              {/* Card Top: Status & Class */}
              <View style={styles.cardTopRow}>
                <View style={styles.classBadge}>
                  <Text style={styles.classBadgeText}>{session.className}</Text>
                  <Text style={styles.courseCode}>{session.courseCode}</Text>
                </View>

                {/* Status Badge */}
                {isPending && (
                  <View style={[styles.statusBadge, styles.statusPending]}>
                    <Text style={styles.statusPendingText}>⏳ Belum Dibuka</Text>
                  </View>
                )}
                {isActive && (
                  <View style={[styles.statusBadge, styles.statusActive]}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.statusActiveText}>🟢 Sesi Aktif</Text>
                  </View>
                )}
                {isClosed && (
                  <View style={[styles.statusBadge, styles.statusClosed]}>
                    <Text style={styles.statusClosedText}>🔒 Sesi Ditutup</Text>
                  </View>
                )}
              </View>

              {/* Course Title & Module */}
              <Text style={styles.courseName}>{session.courseName}</Text>
              <Text style={styles.moduleTitle}>{session.moduleTitle}</Text>

              {/* Meta details */}
              <View style={styles.metaBox}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Waktu:</Text>
                  <Text style={styles.metaValue}>
                    {session.day}, {session.time}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Ruang:</Text>
                  <Text style={styles.metaValue}>{session.room}</Text>
                </View>
                {isActive && session.openedAt && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Dibuka pada:</Text>
                    <Text style={[styles.metaValue, { color: theme.colors.success }]}>
                      {session.openedAt}
                    </Text>
                  </View>
                )}
                {isClosed && session.closedAt && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Ditutup pada:</Text>
                    <Text style={styles.metaValue}>{session.closedAt}</Text>
                  </View>
                )}
              </View>

              {/* Attendance Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Presensi Mahasiswa:</Text>
                  <Text style={styles.progressNumbers}>
                    <Text style={{ fontWeight: '800', color: theme.colors.primary }}>
                      {attendees.length}
                    </Text>{' '}
                    / {session.totalStudents} Hadir
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          (attendees.length / session.totalStudents) * 100,
                          100
                        )}%`,
                        backgroundColor: isClosed
                          ? theme.colors.textMuted
                          : theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Card Action Buttons */}
              <View style={styles.cardActions}>
                {isPending && (
                  <TouchableOpacity
                    style={styles.openSessionBtn}
                    onPress={() => handleOpenPrompt(session)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.openSessionBtnText}>
                      🚀 Buka Sesi Praktikum
                    </Text>
                  </TouchableOpacity>
                )}

                {isActive && (
                  <View style={styles.activeActionsRow}>
                    <TouchableOpacity
                      style={styles.viewRecapBtn}
                      onPress={() => handleViewSummary(session)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewRecapBtnText}>
                        📊 Rekap Presensi ({attendees.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.closeSessionBtn}
                      onPress={() => handleClosePrompt(session)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.closeSessionBtnText}>🛑 Tutup Sesi</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isClosed && (
                  <TouchableOpacity
                    style={styles.viewFinalRecapBtn}
                    onPress={() => handleViewSummary(session)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewFinalRecapBtnText}>
                      📊 Lihat Rekap Akhir Kehadiran
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Spacing bottom */}
      <View style={{ height: 40 }} />

      {/* Control Modal (Open/Close) */}
      <SessionControlModal
        visible={controlModalVisible}
        onClose={() => setControlModalVisible(false)}
        session={selectedSession}
        actionType={actionType}
        onConfirm={handleConfirmAction}
        attendanceCount={
          selectedSession ? getAttendanceForSession(selectedSession.id).length : 0
        }
      />

      {/* Summary Modal (Recap List) */}
      <AttendanceSummaryModal
        visible={summaryModalVisible}
        onClose={() => setSummaryModalVisible(false)}
        session={selectedSession}
        attendees={
          selectedSession ? getAttendanceForSession(selectedSession.id) : []
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  banner: {
    backgroundColor: theme.colors.assistantTagBg,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  bannerContent: {},
  bannerGreeting: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5B21B6',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: '#6D28D9',
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  sessionCardActive: {
    borderColor: theme.colors.success,
    borderWidth: 1.5,
  },
  sessionCardClosed: {
    opacity: 0.9,
    backgroundColor: '#FAFAFA',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  classBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  courseCode: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusPending: {
    backgroundColor: theme.colors.warningLight,
  },
  statusPendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  statusActive: {
    backgroundColor: theme.colors.successLight,
  },
  statusActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success,
  },
  statusClosed: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  statusClosedText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  moduleTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  metaBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  progressNumbers: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardActions: {
    marginTop: 4,
  },
  openSessionBtn: {
    backgroundColor: theme.colors.success,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  openSessionBtnText: {
    color: theme.colors.textLight,
    fontWeight: '700',
    fontSize: 13,
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewRecapBtn: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  viewRecapBtnText: {
    color: theme.colors.textLight,
    fontWeight: '700',
    fontSize: 12,
  },
  closeSessionBtn: {
    flex: 1,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  closeSessionBtnText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  viewFinalRecapBtn: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  viewFinalRecapBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
});
