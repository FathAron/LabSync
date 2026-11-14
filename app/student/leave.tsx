import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LeaveRequestModal from '../../src/features/leave/components/LeaveRequestModal';
import LeaveStatusCard from '../../src/features/leave/components/LeaveStatusCard';
import StudentEmptyState from '../../src/features/student/components/StudentEmptyState';

import { useStudentModule } from '../../src/features/student/useStudentModule';
import { useLeave } from '../../src/hooks/useLeave';
import { useApp } from '../../src/context/AppContext';

import type { Session as LeaveSession } from '../../src/types/models';
import type { SessionInfo } from '../../src/features/student/types';

import {
  CONTENT_MAX_WIDTH,
  colors,
  spacing,
  radius,
} from '../../src/features/student/studentTokens';

// Mengubah nilai unknown menjadi string yang aman.
const toText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;

    if (typeof toDate === 'function') {
      return toDate().toISOString();
    }
  }

  return '';
};

// Adapter SessionInfo Sprint 1 ke Session Sprint 2.
const toLeaveSession = (session: SessionInfo): LeaveSession => {
  const raw =
    typeof session.raw === 'object' && session.raw !== null
      ? (session.raw as Partial<LeaveSession>)
      : {};

  const startTime = toText(session.startTime) || raw.startTime || '';
  const endTime = toText(session.endTime) || raw.endTime || '';

  return {
    ...raw,
    id: String(session.id),
    courseName: session.courseName,
    courseCode: raw.courseCode ?? '',
    moduleCode: session.moduleCode,
    moduleTitle: session.moduleTitle,
    className: session.className,
    class: raw.class ?? session.className,
    day: raw.day ?? '',
    date: toText(session.date) || raw.date || '',
    startTime,
    endTime,
    time: raw.time ?? (
      startTime && endTime
        ? `${startTime} - ${endTime} WIB`
        : ''
    ),
    room: session.room,
    assistantId: raw.assistantId ?? '',
    assistantName: session.assistantName,
    totalStudents: raw.totalStudents ?? 0,
    status: session.status,
    openedAt: raw.openedAt ?? null,
    closedAt: raw.closedAt ?? null,
    notes: raw.notes ?? '',
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  };
};

const LeaveScreen = () => {
  const { currentUser } = useApp();
  const { student, mySessions } = useStudentModule();

  const {
    leaveRequests,
    pendingCount,
    loading,
    submitting,
    submitLeaveRequest,
  } = useLeave();

  const [modalVisible, setModalVisible] = useState(false);

  const availableSessions = useMemo(
    () => mySessions.map(toLeaveSession),
    [mySessions]
  );

  if (!student || currentUser?.role !== 'student') {
    return (
      <StudentEmptyState
        icon="person-outline"
        title="Identitas praktikan belum tersedia"
        message="Silakan login menggunakan akun praktikan."
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={leaveRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LeaveStatusCard request={item} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}

        ListHeaderComponent={
          <View>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="document-text-outline"
                  size={25}
                  color={colors.primary}
                />

                <Text style={styles.infoTitle}>
                  Pengajuan Izin Praktikum
                </Text>
              </View>

              <Text style={styles.infoDescription}>
                Ajukan izin apabila tidak dapat mengikuti
                sesi praktikum. AI akan membantu mengklasifikasikan
                alasan izin sebagai informasi pendukung.
              </Text>

              <View style={styles.pendingContainer}>
                <Text style={styles.pendingLabel}>
                  Menunggu pemeriksaan
                </Text>

                <Text style={styles.pendingCount}>
                  {pendingCount}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons
                name="add-circle-outline"
                size={21}
                color="#FFFFFF"
              />

              <Text style={styles.addButtonText}>
                Buat Pengajuan Izin
              </Text>
            </Pressable>

            <Text style={styles.sectionTitle}>
              Riwayat Pengajuan Izin
            </Text>
          </View>
        }

        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator
                size="large"
                color={colors.primary}
              />
              <Text style={styles.emptyText}>
                Memuat riwayat pengajuan...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-outline"
                size={42}
                color={colors.textMuted}
              />

              <Text style={styles.emptyTitle}>
                Belum Ada Pengajuan
              </Text>

              <Text style={styles.emptyText}>
                Riwayat pengajuan izinmu akan muncul di sini.
              </Text>
            </View>
          )
        }
      />

      <LeaveRequestModal
        visible={modalVisible}
        sessions={availableSessions}
        submitting={submitting}
        onClose={() => setModalVisible(false)}
        onSubmit={submitLeaveRequest}
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
    backgroundColor: colors.background,
  },

  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    flexGrow: 1,
  },

  infoCard: {
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
    flex: 1,
  },

  infoDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.primaryDark,
    marginTop: spacing.md,
  },

  pendingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  pendingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  pendingCount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },

  addButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: spacing.md,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default LeaveScreen;
