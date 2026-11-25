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
  radius,
  spacing,
  theme,
} from '../../src/styles/theme';
import { deriveWeekdayName } from '../../src/utils/dateUtils';

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
    day: deriveWeekdayName(session.date) || raw.day || '',
    date: toText(session.date) || raw.date || '',
    startTime,
    endTime,
    time: raw.time ?? (startTime && endTime ? `${startTime} - ${endTime} WIB` : ''),
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
        title="Identitas Praktikan Belum Tersedia"
        message="Silakan masuk menggunakan akun praktikan."
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={leaveRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LeaveStatusCard request={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* Info & Policy Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color={colors.mochaDark}
                />
                <Text style={styles.infoTitle}>Pengajuan Izin Praktikum</Text>
              </View>

              <Text style={styles.infoDescription}>
                Ajukan izin apabila tidak dapat menghadiri sesi praktikum.
                Sistem AI akan menganalisis alasan sebagai informasi pendukung.
                Keputusan sepenuhnya ditentukan oleh asisten.
              </Text>

              <View style={styles.pendingContainer}>
                <Text style={styles.pendingLabel}>Menunggu Pemeriksaan Asisten</Text>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingCount}>{pendingCount}</Text>
                </View>
              </View>
            </View>

            {/* Create Leave Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buat pengajuan izin baru"
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Buat Pengajuan Izin Baru</Text>
            </Pressable>

            {/* Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Riwayat Pengajuan Izin</Text>
              <Text style={styles.sectionSubtitle}>
                {leaveRequests.length} Pengajuan
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>Memuat riwayat pengajuan...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>Belum Ada Pengajuan Izin</Text>
              <Text style={styles.emptyText}>
                Riwayat pengajuan izin praktikum Anda akan muncul di sini setelah dikirimkan.
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
    paddingBottom: spacing.xxl * 2,
    flexGrow: 1,
  },
  headerBlock: {
    marginBottom: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...theme.shadows.card,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
    flex: 1,
  },
  infoDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  pendingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  pendingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  pendingBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.butterCreamSoft,
    borderWidth: 1,
    borderColor: colors.butterCream,
  },
  pendingCount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.butterCreamDark,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...theme.shadows.button,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.mochaDark,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default LeaveScreen;
