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
import { AttendanceModal } from '../components/AttendanceModal';
import { EmptyState } from '../components/EmptyState';

export const StudentView = () => {
  const {
    currentStudent,
    sessions,
    recordAttendance,
    hasStudentAttended,
    getStudentAttendanceRecord,
    getStudentHistory,
  } = useApp();

  const [activeTab, setActiveTab] = useState('SCHEDULE'); // 'SCHEDULE' | 'HISTORY'
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const myHistory = getStudentHistory(currentStudent.id);

  const handleOpenAttendance = (session) => {
    setSelectedSession(session);
    setAttendanceModalVisible(true);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Student Profile Card */}
      <View style={styles.profileBanner}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{currentStudent.avatar}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.profileName}>{currentStudent.name}</Text>
          <Text style={styles.profileMeta}>
            NIM: {currentStudent.nim} • Kelas: {currentStudent.class}
          </Text>
        </View>
        <View style={styles.statusBadgeStudent}>
          <Text style={styles.statusBadgeStudentText}>Mahasiswa Aktif</Text>
        </View>
      </View>

      {/* Tabs Navigation (Jadwal Sesi vs Riwayat Kehadiran) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'SCHEDULE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('SCHEDULE')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'SCHEDULE' && styles.tabButtonTextActive,
            ]}
          >
            📅 Sesi Praktikum
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'HISTORY' && styles.tabButtonActive]}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'HISTORY' && styles.tabButtonTextActive,
            ]}
          >
            📋 Riwayat Presensi ({myHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content: SCHEDULE */}
      {activeTab === 'SCHEDULE' && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Jadwal Praktikum Anda</Text>
            <Text style={styles.sectionNotice}>
              Presensi dibuka saat praktikum dimulai
            </Text>
          </View>

          {sessions.map((session) => {
            const isAttended = hasStudentAttended(session.id, currentStudent.id);
            const myRecord = getStudentAttendanceRecord(session.id, currentStudent.id);
            const isPending = session.status === 'PENDING';
            const isActive = session.status === 'ACTIVE';
            const isClosed = session.status === 'CLOSED';

            return (
              <View
                key={session.id}
                style={[
                  styles.sessionCard,
                  isAttended && styles.sessionCardAttended,
                  isActive && !isAttended && styles.sessionCardReady,
                ]}
              >
                {/* Header card */}
                <View style={styles.cardHeader}>
                  <View style={styles.classPill}>
                    <Text style={styles.classPillText}>{session.className}</Text>
                  </View>

                  {/* Status Pills */}
                  {isPending && (
                    <View style={[styles.pill, styles.pillWarning]}>
                      <Text style={styles.pillWarningText}>⏳ Belum Dibuka</Text>
                    </View>
                  )}
                  {isActive && !isAttended && (
                    <View style={[styles.pill, styles.pillSuccess]}>
                      <Text style={styles.pillSuccessText}>
                        🟢 Presensi Dibuka!
                      </Text>
                    </View>
                  )}
                  {isAttended && (
                    <View style={[styles.pill, styles.pillDone]}>
                      <Text style={styles.pillDoneText}>✓ Sudah Presensi</Text>
                    </View>
                  )}
                  {isClosed && !isAttended && (
                    <View style={[styles.pill, styles.pillClosed]}>
                      <Text style={styles.pillClosedText}>🔒 Sesi Ditutup</Text>
                    </View>
                  )}
                </View>

                {/* Course and Module */}
                <Text style={styles.courseTitle}>{session.courseName}</Text>
                <Text style={styles.moduleSubtitle}>{session.moduleTitle}</Text>

                {/* Details info */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoColLabel}>Waktu:</Text>
                    <Text style={styles.infoColValue}>
                      {session.day}, {session.time}
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoColLabel}>Ruang:</Text>
                    <Text style={styles.infoColValue}>{session.room}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoColLabel}>Asisten:</Text>
                    <Text style={styles.infoColValue}>{session.assistantName}</Text>
                  </View>
                </View>

                {/* Presensi Action / Result Box */}
                {isAttended ? (
                  <View style={styles.attendedFeedbackBox}>
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkCircleText}>✓</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.attendedFeedbackTitle}>
                        Presensi Berhasil Dicatat
                      </Text>
                      <Text style={styles.attendedFeedbackTime}>
                        Waktu hadir: {myRecord?.timestamp} • {myRecord?.notes}
                      </Text>
                      <Text style={styles.attendedFeedbackNotice}>
                        * Presensi sudah terkunci (tidak dapat presensi ulang).
                      </Text>
                    </View>
                  </View>
                ) : isActive ? (
                  <TouchableOpacity
                    style={styles.presensiNowBtn}
                    onPress={() => handleOpenAttendance(session)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.presensiNowBtnText}>
                      📝 Lakukan Presensi Sekarang
                    </Text>
                  </TouchableOpacity>
                ) : isPending ? (
                  <View style={styles.waitingBox}>
                    <Text style={styles.waitingText}>
                      ⏳ Menunggu Asisten membuka sesi praktikum...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.closedBox}>
                    <Text style={styles.closedText}>
                      🔒 Sesi praktikum telah ditutup. Tidak dapat melakukan presensi.
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Tab Content: HISTORY */}
      {activeTab === 'HISTORY' && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Catatan Kehadiran Saya</Text>
            <Text style={styles.sectionNotice}>
              Total {myHistory.length} sesi dihadiri
            </Text>
          </View>

          {myHistory.length === 0 ? (
            <EmptyState
              icon="📝"
              title="Belum Ada Riwayat"
              message="Anda belum melakukan presensi di sesi praktikum manapun. Lakukan presensi saat sesi dibuka!"
            />
          ) : (
            myHistory.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <View style={styles.historyIconCircle}>
                    <Text style={styles.historyIcon}>✓</Text>
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.historyCourse}>
                    {item.session?.courseName || 'Praktikum'}
                  </Text>
                  <Text style={styles.historyModule}>
                    {item.session?.moduleTitle || 'Modul Praktikum'}
                  </Text>
                  <Text style={styles.historyRoom}>
                    📍 {item.session?.room} • Kelas {item.session?.className}
                  </Text>
                  <Text style={styles.historyNotes}>💬 {item.notes}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyTimestamp}>{item.timestamp}</Text>
                  <View style={styles.historyBadge}>
                    <Text style={styles.historyBadgeText}>Tepat Waktu</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Attendance Form Modal */}
      <AttendanceModal
        visible={attendanceModalVisible}
        onClose={() => setAttendanceModalVisible(false)}
        session={selectedSession}
        student={currentStudent}
        onSubmit={recordAttendance}
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
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.studentTag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  profileMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadgeStudent: {
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeStudentText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.success,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  sectionNotice: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
  sessionCardReady: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  sessionCardAttended: {
    borderColor: theme.colors.success,
    backgroundColor: '#F0FDF4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  classPill: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  pillWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  pillSuccess: {
    backgroundColor: theme.colors.successLight,
  },
  pillSuccessText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.success,
  },
  pillDone: {
    backgroundColor: theme.colors.successLight,
  },
  pillDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success,
  },
  pillClosed: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  pillClosedText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  moduleSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  infoGrid: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 14,
    gap: 4,
  },
  infoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoColLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  infoColValue: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  presensiNowBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  presensiNowBtnText: {
    color: theme.colors.textLight,
    fontWeight: '700',
    fontSize: 13,
  },
  attendedFeedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  attendedFeedbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  attendedFeedbackTime: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  attendedFeedbackNotice: {
    fontSize: 10,
    color: '#166534',
    marginTop: 4,
    fontStyle: 'italic',
  },
  waitingBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  waitingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  closedBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  closedText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    ...theme.shadows.card,
  },
  historyLeft: {},
  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.success,
  },
  historyCourse: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  historyModule: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  historyRoom: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  historyNotes: {
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 3,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyTimestamp: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  historyBadge: {
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  historyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.success,
  },
});
