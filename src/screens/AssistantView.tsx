import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import type {
  CreateSessionInput,
  Laboratory,
  LeaveRequest,
  Session,
  UserProfile,
} from '../types/models';
import {
  formatTimeRange,
} from '../features/student/studentUtils';
import { formatSessionDate } from '../utils/dateUtils';
import { formatDisplayClass, normalizeClassCode } from '../utils/classUtils';
import {
  CONTENT_MAX_WIDTH,
  colors,
  radius,
  spacing,
  theme,
} from '../styles/theme';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { usePracticum } from '../hooks/usePracticum';
import { useLaboratories } from '../hooks/useLaboratories';
import { useLeave } from '../hooks/useLeave';

import SessionControlModal from '../features/assistant/components/SessionControlModal';
import AttendanceSummaryModal from '../features/assistant/components/AttendanceSummaryModal';
import SessionFormModal from '../features/assistant/components/SessionFormModal';
import ClassManagementModal from '../features/assistant/components/ClassManagementModal';
import LaboratoryManagementModal from '../features/assistant/components/LaboratoryManagementModal';

import AssistantLeaveSection from '../features/leave/components/AssistantLeaveSection';
import LaboratoryMapsView from '../features/maps/components/LaboratoryMapsView';

type ConfirmAction = {
  type: 'open' | 'close';
  session: Session;
} | null;

type AssistantTab = 'practicum' | 'leave' | 'maps';

export const AssistantView = () => {
  const { currentUser, showToast, syncError } = useApp();

  const {
    classes,
    students,
    sessions,
    attendanceList,
    dataLoading,
    createSession,
    updateSession,
    deleteSession,
    openSession,
    closeSession,
    createClass,
    updateClass,
    deleteClass,
    assignStudentToClass,
    getAttendanceForSession,
  } = usePracticum();

  const {
    laboratories,
    createLaboratory,
    updateLaboratory,
    deleteLaboratory,
  } = useLaboratories();

  const { leaveRequests } = useLeave();

  const [activeTab, setActiveTab] = useState<AssistantTab>('practicum');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [recapSessionId, setRecapSessionId] = useState<string | null>(null);
  const [sessionFormVisible, setSessionFormVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [classManagementVisible, setClassManagementVisible] = useState(false);
  const [labManagementVisible, setLabManagementVisible] = useState(false);

  const assistantSubRole = currentUser?.assistantRole?.trim().toLowerCase();
  const isAslab = assistantSubRole === 'aslab';
  const isAsprak = !isAslab;
  const currentUid = currentUser?.uid ?? '';

  // Kumpulan ID laboratorium dan kelas yang menjadi penugasan Asprak
  const assignedLabIds = useMemo(() => {
    const ids = new Set<string>();
    const userAssigned = (currentUser as (UserProfile & { assignedLabIds?: string[] }) | null)
      ?.assignedLabIds;

    if (Array.isArray(userAssigned)) {
      userAssigned.forEach((id) => {
        if (typeof id === 'string' && id) ids.add(id);
      });
    }

    laboratories.forEach((lab) => {
      const assistantIds = (lab as Laboratory & { assistantIds?: string[] }).assistantIds;
      if (currentUid && Array.isArray(assistantIds) && assistantIds.includes(currentUid)) {
        ids.add(lab.id);
      }
    });

    return ids;
  }, [currentUser, currentUid, laboratories]);

  const assignedClassCodes = useMemo(() => {
    const codes = new Set<string>();
    const rawClasses = currentUser?.assignedClasses;
    if (Array.isArray(rawClasses)) {
      rawClasses.forEach((cls) => {
        const normalized = normalizeClassCode(cls);
        if (normalized) codes.add(normalized);
      });
    }
    return codes;
  }, [currentUser?.assignedClasses]);

  const scopedClasses = useMemo(() => {
    if (isAslab || !currentUid) return classes;
    return classes.filter((cls) => {
      if (cls.assistantId === currentUid) return true;
      const code = normalizeClassCode(cls.name);
      return Boolean(code && assignedClassCodes.has(code));
    });
  }, [assignedClassCodes, classes, currentUid, isAslab]);

  const assignedClassIds = useMemo(
    () => new Set(scopedClasses.map((cls) => cls.id)),
    [scopedClasses]
  );

  // Scope sesi sesuai penugasan Asprak (atau semua sesi untuk Aslab)
  const scopedSessions = useMemo(() => {
    if (isAslab || !currentUid) return sessions;

    return sessions.filter((session) => {
      if (session.assistantId === currentUid) return true;
      if (session.laboratoryId && assignedLabIds.has(session.laboratoryId)) return true;
      if (session.classId && assignedClassIds.has(session.classId)) return true;
      const sessionClassCode = normalizeClassCode(
        session.targetClassCode || session.groupCode || session.className || session.class
      );
      if (sessionClassCode && assignedClassCodes.has(sessionClassCode)) return true;
      return false;
    });
  }, [assignedClassCodes, assignedClassIds, assignedLabIds, currentUid, isAslab, sessions]);

  // Peta izin APPROVED per sessionId untuk penandaan excused absence (bebas denda)
  const approvedLeavesBySession = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    leaveRequests.forEach((req) => {
      if (req.status !== 'APPROVED') return;
      const list = map.get(req.sessionId) ?? [];
      list.push(req);
      map.set(req.sessionId, list);
    });
    return map;
  }, [leaveRequests]);

  // STATISTICS
  const stats = useMemo(() => {
    const activeCount = scopedSessions.filter((item) => item.status === 'ACTIVE').length;
    const closedCount = scopedSessions.filter((item) => item.status === 'CLOSED').length;
    const scopedSessionIds = new Set(scopedSessions.map((item) => item.id));
    const totalPresent = attendanceList.filter((record) =>
      scopedSessionIds.has(record.sessionId)
    ).length;

    return {
      activeCount,
      closedCount,
      totalPresent,
    };
  }, [scopedSessions, attendanceList]);

  // RECAP SESSION
  const recapSession = useMemo(
    () => scopedSessions.find((item) => item.id === recapSessionId) ?? null,
    [scopedSessions, recapSessionId]
  );

  const recapAttendees = useMemo(
    () => (recapSession ? getAttendanceForSession(recapSession.id) : []),
    [recapSession, getAttendanceForSession]
  );

  const recapApprovedLeaves = useMemo(
    () => (recapSession ? approvedLeavesBySession.get(recapSession.id) ?? [] : []),
    [recapSession, approvedLeavesBySession]
  );

  // OPEN / CLOSE ACTIONS
  const handleConfirm = async () => {
    if (!confirmAction || actionSubmitting) return;

    setActionSubmitting(true);
    try {
      const result =
        confirmAction.type === 'open'
          ? await openSession(confirmAction.session.id)
          : await closeSession(confirmAction.session.id);

      if (result.ok) {
        showToast(result.message, 'success');
        setConfirmAction(null);
      } else {
        showToast(result.message, 'error');
      }
    } finally {
      setActionSubmitting(false);
    }
  };

  // CREATE / UPDATE
  const handleSessionSubmit = async (input: CreateSessionInput) => {
    const result = editingSession
      ? await updateSession(editingSession.id, input)
      : await createSession(input);

    if (result.ok) {
      showToast(result.message, 'success');
      setSessionFormVisible(false);
      setEditingSession(null);
    }

    return result;
  };

  const handleAddSession = () => {
    setEditingSession(null);
    setSessionFormVisible(true);
  };

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    setSessionFormVisible(true);
  };

  const handleCloseSessionForm = () => {
    setSessionFormVisible(false);
    setEditingSession(null);
  };

  // DELETE
  const handleDeleteSession = (session: Session) => {
    Alert.alert(
      'Hapus Sesi Praktikum?',
      `Apakah kamu yakin ingin menghapus ${session.courseName} - ${session.moduleCode} untuk ${formatDisplayClass(session.className)}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteSession(session.id);
            if (result.ok) {
              showToast(result.message, 'success');
            }
          },
        },
      ]
    );
  };

  // RENDER HEADER
  const renderHeader = () => (
    <View style={styles.headerBlock}>
      {isAsprak ? (
        <View style={styles.roleScopeBanner}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.mochaDark} />
          <Text style={styles.roleScopeText}>
            Mode Asprak · Mengelola kelas & sesi praktikum penugasan Anda
          </Text>
        </View>
      ) : null}

      {/* QUICK ACTIONS ROW */}
      <View style={styles.managementRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setClassManagementVisible(true)}
          style={({ pressed }) => [
            styles.managementButton,
            pressed && styles.btnPressed,
          ]}
        >
          <Ionicons name="people-outline" size={17} color={colors.text} />
          <Text style={styles.managementButtonText}>Kelola Kelas</Text>
          <View style={styles.buttonCount}>
            <Text style={styles.buttonCountText}>{scopedClasses.length}</Text>
          </View>
        </Pressable>

        {isAslab ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setLabManagementVisible(true)}
            style={({ pressed }) => [
              styles.managementButton,
              pressed && styles.btnPressed,
            ]}
          >
            <Ionicons name="location-outline" size={17} color={colors.text} />
            <Text style={styles.managementButtonText}>Kelola Lab</Text>
            <View style={styles.buttonCount}>
              <Text style={styles.buttonCountText}>{laboratories.length}</Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={handleAddSession}
          style={({ pressed }) => [
            styles.addSessionButton,
            pressed && styles.btnPressed,
          ]}
        >
          <Ionicons name="add" size={19} color={colors.primaryText} />
          <Text style={styles.addSessionText}>Tambah Sesi</Text>
        </Pressable>
      </View>

      {/* METRICS ROW */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardActive]}>
          <Text style={[styles.statValue, { color: '#2B5A33' }]}>
            {stats.activeCount}
          </Text>
          <Text style={styles.statLabel}>Sesi Dibuka</Text>
        </View>

        <View style={[styles.statCard, styles.statCardPresent]}>
          <Text style={[styles.statValue, { color: '#6A4F1D' }]}>
            {stats.totalPresent}
          </Text>
          <Text style={styles.statLabel}>Total Hadir</Text>
        </View>

        <View style={[styles.statCard, styles.statCardClosed]}>
          <Text style={[styles.statValue, { color: colors.textSecondary }]}>
            {stats.closedCount}
          </Text>
          <Text style={styles.statLabel}>Sesi Selesai</Text>
        </View>
      </View>

      {/* SECTION TITLE */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Jadwal Sesi Praktikum</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{scopedSessions.length} Sesi</Text>
        </View>
      </View>

      {syncError ? (
        <View style={styles.syncError}>
          <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
          <Text style={styles.syncErrorText}>{syncError}</Text>
        </View>
      ) : null}
    </View>
  );

  // RENDER SESSION ITEM
  const renderSessionItem = ({ item }: { item: Session }) => {
    const attendees = getAttendanceForSession(item.id);
    const excusedLeaves = approvedLeavesBySession.get(item.id) ?? [];
    const presentCount = attendees.length;
    const excusedCount = excusedLeaves.length;
    const capacity = Math.max(0, item.totalStudents);
    const percentage =
      capacity > 0 ? Math.min(100, Math.round((presentCount / capacity) * 100)) : 0;

    const dateText = formatSessionDate(item.date);
    const timeText = formatTimeRange(item.startTime, item.endTime) ?? item.time;
    const subtitle = [item.moduleCode, item.moduleTitle].filter(Boolean).join(' · ');

    const isActive = item.status === 'ACTIVE';
    const isPending = item.status === 'PENDING';
    const isClosed = item.status === 'CLOSED';

    return (
      <View style={[styles.card, isActive && styles.cardActive]}>
        {/* TOP ROW */}
        <View style={styles.cardTopRow}>
          <View style={styles.classPill}>
            <Text style={styles.classPillText}>{formatDisplayClass(item.className)}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* TITLE */}
        <Text style={styles.courseTitle}>{item.courseName}</Text>
        {subtitle ? <Text style={styles.moduleSubtitle}>{subtitle}</Text> : null}

        {/* DETAILS */}
        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>
              {dateText}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>{timeText}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>{item.room}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>Asisten: {item.assistantName}</Text>
          </View>
        </View>

        {/* ATTENDANCE PROGRESS */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Kehadiran Mahasiswa</Text>
            <Text style={styles.progressValue}>
              {presentCount} / {capacity} ({percentage}%)
              {excusedCount > 0 ? ` · ${excusedCount} Izin` : ''}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: isActive
                    ? colors.success
                    : isClosed
                    ? colors.borderDark
                    : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionRow}>
          {isPending ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmAction({ type: 'open', session: item })}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnSuccess,
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="play-circle-outline" size={17} color="#2B5A33" />
                <Text style={styles.btnSuccessText}>Buka Sesi</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => handleEditSession(item)}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnSecondary,
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="create-outline" size={16} color={colors.text} />
                <Text style={styles.btnSecondaryText}>Ubah</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => handleDeleteSession(item)}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnDangerOutline,
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.btnDangerOutlineText}>Hapus</Text>
              </Pressable>
            </>
          ) : null}

          {isActive ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRecapSessionId(item.id)}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnPrimary,
                  { flex: 1.4 },
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="people-outline" size={17} color={colors.primaryText} />
                <Text style={styles.btnPrimaryText}>
                  Rekap Presensi ({presentCount})
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmAction({ type: 'close', session: item })}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnDangerOutline,
                  { flex: 1 },
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="lock-closed-outline" size={16} color={colors.danger} />
                <Text style={styles.btnDangerOutlineText}>Tutup Sesi</Text>
              </Pressable>
            </>
          ) : null}

          {isClosed ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setRecapSessionId(item.id)}
              style={({ pressed }) => [
                styles.btn,
                styles.btnSecondary,
                pressed && styles.btnPressed,
              ]}
            >
              <Ionicons name="document-text-outline" size={17} color={colors.text} />
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
      {/* TABS */}
      <View style={styles.tabContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveTab('practicum')}
          style={[
            styles.tabButton,
            activeTab === 'practicum' && styles.tabButtonActive,
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={17}
            color={activeTab === 'practicum' ? colors.text : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'practicum' && styles.tabTextActive,
            ]}
          >
            Praktikum
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveTab('leave')}
          style={[
            styles.tabButton,
            activeTab === 'leave' && styles.tabButtonActive,
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={17}
            color={activeTab === 'leave' ? colors.text : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'leave' && styles.tabTextActive,
            ]}
          >
            Pengajuan Izin
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveTab('maps')}
          style={[
            styles.tabButton,
            activeTab === 'maps' && styles.tabButtonActive,
          ]}
        >
          <Ionicons
            name="map-outline"
            size={17}
            color={activeTab === 'maps' ? colors.text : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'maps' && styles.tabTextActive,
            ]}
          >
            Peta Lab
          </Text>
        </Pressable>
      </View>

      {/* PRACTICUM TAB */}
      {activeTab === 'practicum' ? (
        <View style={styles.content}>
          {dataLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Memuat data praktikum...</Text>
            </View>
          ) : (
            <FlatList
              data={scopedSessions}
              keyExtractor={(item) => item.id}
              renderItem={renderSessionItem}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={
                <EmptyState
                  icon="calendar-outline"
                  title={isAsprak ? 'Belum Ada Sesi Penugasan' : 'Belum Ada Sesi Praktikum'}
                  message={
                    isAsprak
                      ? 'Tambahkan sesi praktikum untuk kelas penugasan Anda atau tunggu penugasan dari Aslab.'
                      : 'Tambahkan kelas dan sesi praktikum untuk mulai mengatur jadwal dan absensi.'
                  }
                />
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : activeTab === 'leave' ? (
        <View style={styles.content}>
          <AssistantLeaveSection />
        </View>
      ) : (
        <View style={styles.content}>
          <LaboratoryMapsView active={activeTab === 'maps'} />
        </View>
      )}

      {/* CONFIRMATION MODAL */}
      <SessionControlModal
        visible={confirmAction !== null}
        session={confirmAction?.session ?? null}
        action={confirmAction?.type ?? 'open'}
        attendanceCount={
          confirmAction
            ? getAttendanceForSession(confirmAction.session.id).length
            : 0
        }
        excusedCount={
          confirmAction
            ? (approvedLeavesBySession.get(confirmAction.session.id) ?? []).length
            : 0
        }
        capacity={confirmAction?.session.totalStudents ?? 0}
        submitting={actionSubmitting}
        onClose={() => {
          if (!actionSubmitting) setConfirmAction(null);
        }}
        onConfirm={handleConfirm}
      />

      {/* ATTENDANCE RECAP MODAL */}
      <AttendanceSummaryModal
        visible={recapSession !== null}
        session={recapSession}
        records={recapAttendees}
        approvedLeaves={recapApprovedLeaves}
        onClose={() => setRecapSessionId(null)}
      />

      {/* SESSION FORM MODAL */}
      <SessionFormModal
        visible={sessionFormVisible}
        session={editingSession}
        classes={scopedClasses}
        laboratories={laboratories}
        existingSessions={scopedSessions}
        allowedClassCodes={
          isAsprak && assignedClassCodes.size > 0
            ? Array.from(assignedClassCodes).sort()
            : undefined
        }
        onClose={handleCloseSessionForm}
        onSubmit={handleSessionSubmit}
      />

      {/* CLASS MANAGEMENT MODAL */}
      <ClassManagementModal
        visible={classManagementVisible}
        classes={scopedClasses}
        students={students}
        onClose={() => setClassManagementVisible(false)}
        onCreateClass={createClass}
        onUpdateClass={updateClass}
        onDeleteClass={deleteClass}
        onAssignStudentToClass={assignStudentToClass}
      />

      {/* LABORATORY MANAGEMENT MODAL (Hanya untuk Aslab) */}
      {isAslab ? (
        <LaboratoryManagementModal
          visible={labManagementVisible}
          laboratories={laboratories}
          onClose={() => setLabManagementVisible(false)}
          onCreateLaboratory={createLaboratory}
          onUpdateLaboratory={updateLaboratory}
          onDeleteLaboratory={deleteLaboratory}
        />
      ) : null}
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
  content: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  listContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  headerBlock: {
    marginBottom: spacing.sm,
  },
  roleScopeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.sageSoft,
    borderWidth: 1,
    borderColor: '#C6DEC8',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  roleScopeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  managementRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  managementButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  managementButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonCount: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonCountText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  addSessionButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  addSessionText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  statCardActive: {
    backgroundColor: '#EDF5EE',
    borderColor: '#C6DEC8',
  },
  statCardPresent: {
    backgroundColor: colors.warningSoft,
    borderColor: '#F5DEB3',
  },
  statCardClosed: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  syncError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
  },
  syncErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...theme.shadows.card,
  },
  cardActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  classPill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
  },
  moduleSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  infoList: {
    marginTop: spacing.md,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  progressTrack: {
    height: 7,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flexGrow: 1,
    minHeight: 44,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnSuccess: {
    backgroundColor: '#EDF5EE',
    borderWidth: 1,
    borderColor: '#C6DEC8',
  },
  btnDangerOutline: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
  },
  btnSecondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryText,
  },
  btnSuccessText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2B5A33',
  },
  btnDangerOutlineText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.danger,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});

export default AssistantView;
