
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
  Session,
} from '../types/models';

import {
  STATUS_META,
  formatDateID,
  formatTimeRange,
} from '../features/student/studentUtils';

import {
  CONTENT_MAX_WIDTH,
  colors,
  radius,
  spacing,
} from '../styles/theme';

import { usePracticum } from '../hooks/usePracticum';
import { useLaboratories } from '../hooks/useLaboratories';

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
  const { showToast, syncError } = useApp();

  // ==========================================
  // FIRESTORE DATA AND ACTIONS
  // ==========================================

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

  // ==========================================
  // LOCAL UI STATE
  // ==========================================

  const [activeTab, setActiveTab] =
    useState<AssistantTab>('practicum');

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction>(null);

  const [recapSessionId, setRecapSessionId] =
    useState<string | null>(null);

  const [sessionFormVisible, setSessionFormVisible] =
    useState(false);

  const [editingSession, setEditingSession] =
    useState<Session | null>(null);

  const [classManagementVisible, setClassManagementVisible] =
    useState(false);

  const [labManagementVisible, setLabManagementVisible] =
    useState(false);

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = useMemo(() => {
    const activeCount = sessions.filter(
      (item) => item.status === 'ACTIVE'
    ).length;

    const closedCount = sessions.filter(
      (item) => item.status === 'CLOSED'
    ).length;

    return {
      activeCount,
      closedCount,
      totalPresent: attendanceList.length,
    };
  }, [sessions, attendanceList]);

  // ==========================================
  // ATTENDANCE RECAP
  // ==========================================

  const recapSession = useMemo(
    () =>
      sessions.find(
        (item) => item.id === recapSessionId
      ) ?? null,
    [sessions, recapSessionId]
  );

  const recapAttendees = useMemo(
    () =>
      recapSession
        ? getAttendanceForSession(recapSession.id)
        : [],
    [recapSession, getAttendanceForSession]
  );

  // ==========================================
  // OPEN / CLOSE SESSION
  // ==========================================

  const handleConfirm = async () => {
    if (!confirmAction) return;

    const result =
      confirmAction.type === 'open'
        ? await openSession(confirmAction.session.id)
        : await closeSession(confirmAction.session.id);

    if (result.ok) {
      showToast(result.message, 'success');
      setConfirmAction(null);
    }
  };

  // ==========================================
  // CREATE / UPDATE SESSION
  // ==========================================

  const handleSessionSubmit = async (
    input: CreateSessionInput
  ) => {
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

  // ==========================================
  // DELETE SESSION
  // ==========================================

  const handleDeleteSession = (session: Session) => {
    Alert.alert(
      'Hapus Sesi Praktikum?',
      `Apakah kamu yakin ingin menghapus ${session.courseName} - ${session.moduleCode} untuk kelas ${session.className}?`,
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
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

  // ==========================================
  // HEADER
  // ==========================================

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      {/* MANAGEMENT BUTTONS */}
      <View style={styles.managementRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setClassManagementVisible(true)}
          style={styles.managementButton}
        >
          <Ionicons
            name="people-outline"
            size={17}
            color={colors.primary}
          />

          <Text style={styles.managementButtonText}>
            Kelas
          </Text>

          <View style={styles.buttonCount}>
            <Text style={styles.buttonCountText}>
              {classes.length}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setLabManagementVisible(true)}
          style={styles.managementButton}
        >
          <Ionicons
            name="location-outline"
            size={17}
            color={colors.primary}
          />

          <Text style={styles.managementButtonText}>
            Lab
          </Text>

          <View style={styles.buttonCount}>
            <Text style={styles.buttonCountText}>
              {laboratories.length}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleAddSession}
          style={styles.addSessionButton}
        >
          <Ionicons
            name="add"
            size={19}
            color="#FFFFFF"
          />

          <Text style={styles.addSessionText}>
            Tambah Sesi
          </Text>
        </Pressable>
      </View>

      {/* STATISTICS */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: colors.primary }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {stats.activeCount}
          </Text>

          <Text style={styles.statLabel}>
            Sesi Aktif
          </Text>
        </View>

        <View style={[styles.statCard, { borderColor: colors.success }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {stats.totalPresent}
          </Text>

          <Text style={styles.statLabel}>
            Total Hadir
          </Text>
        </View>

        <View style={[styles.statCard, { borderColor: colors.neutral }]}>
          <Text style={[styles.statValue, { color: colors.neutralDark }]}>
            {stats.closedCount}
          </Text>

          <Text style={styles.statLabel}>
            Sesi Selesai
          </Text>
        </View>
      </View>

      {/* SESSION LIST TITLE */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Daftar Sesi Praktikum
        </Text>

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {sessions.length} Sesi
          </Text>
        </View>
      </View>

      {syncError ? (
        <View style={styles.syncError}>
          <Ionicons
            name="cloud-offline-outline"
            size={17}
            color={colors.dangerDark}
          />

          <Text style={styles.syncErrorText}>
            {syncError}
          </Text>
        </View>
      ) : null}
    </View>
  );

  // ==========================================
  // SESSION CARD
  // ==========================================

  const renderSessionItem = ({
    item,
  }: {
    item: Session;
  }) => {
    const meta = STATUS_META[item.status];

    const attendees = getAttendanceForSession(item.id);

    const presentCount = attendees.length;
    const capacity = Math.max(0, item.totalStudents);

    const percentage =
      capacity > 0
        ? Math.min(
            100,
            Math.round((presentCount / capacity) * 100)
          )
        : 0;

    const dateText =
      formatDateID(item.date) ?? item.date;

    const timeText =
      formatTimeRange(
        item.startTime,
        item.endTime
      ) ?? item.time;

    const subtitle = [
      item.moduleCode,
      item.moduleTitle,
    ]
      .filter(Boolean)
      .join(' - ');

    return (
      <View style={styles.card}>
        {/* CLASS AND STATUS */}
        <View style={styles.cardTopRow}>
          <View style={styles.classPill}>
            <Text style={styles.classPillText}>
              Kelas {item.className}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: meta.bg },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: meta.dot },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                { color: meta.fg },
              ]}
            >
              {meta.label}
            </Text>
          </View>
        </View>

        {/* SESSION INFORMATION */}
        <Text style={styles.courseTitle}>
          {item.courseName}
        </Text>

        {subtitle ? (
          <Text style={styles.moduleSubtitle}>
            {subtitle}
          </Text>
        ) : null}

        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color={colors.textMuted}
            />

            <Text style={styles.infoText}>
              {dateText} ({item.day})
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="time-outline"
              size={15}
              color={colors.textMuted}
            />

            <Text style={styles.infoText}>
              {timeText}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={15}
              color={colors.textMuted}
            />

            <Text style={styles.infoText}>
              {item.room}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="person-outline"
              size={15}
              color={colors.textMuted}
            />

            <Text style={styles.infoText}>
              Asisten: {item.assistantName}
            </Text>
          </View>
        </View>

        {/* ATTENDANCE PROGRESS */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Kehadiran Praktikan
            </Text>

            <Text style={styles.progressValue}>
              {presentCount} / {capacity} Praktikan ({percentage}%)
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor:
                    item.status === 'ACTIVE'
                      ? colors.success
                      : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* SESSION ACTIONS */}
        <View style={styles.actionRow}>
          {item.status === 'PENDING' ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setConfirmAction({
                    type: 'open',
                    session: item,
                  })
                }
                style={[styles.btn, styles.btnSuccess]}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.btnPrimaryText}>
                  Buka Sesi
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => handleEditSession(item)}
                style={[styles.btn, styles.btnSecondary]}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={colors.neutralDark}
                />

                <Text style={styles.btnSecondaryText}>
                  Ubah
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => handleDeleteSession(item)}
                style={[styles.btn, styles.btnDangerOutline]}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.danger}
                />

                <Text style={styles.btnDangerOutlineText}>
                  Hapus
                </Text>
              </Pressable>
            </>
          ) : null}

          {item.status === 'ACTIVE' ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setRecapSessionId(item.id)
                }
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  { flex: 1.4 },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={17}
                  color="#FFFFFF"
                />

                <Text style={styles.btnPrimaryText}>
                  Rekap Presensi ({presentCount})
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setConfirmAction({
                    type: 'close',
                    session: item,
                  })
                }
                style={[
                  styles.btn,
                  styles.btnDangerOutline,
                  { flex: 1 },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={colors.danger}
                />

                <Text style={styles.btnDangerOutlineText}>
                  Tutup Sesi
                </Text>
              </Pressable>
            </>
          ) : null}

          {item.status === 'CLOSED' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setRecapSessionId(item.id)
              }
              style={[
                styles.btn,
                styles.btnSecondary,
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={17}
                color={colors.neutralDark}
              />

              <Text style={styles.btnSecondaryText}>
                Lihat Rekap Akhir ({presentCount} Hadir)
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  // ==========================================
  // MAIN VIEW
  // ==========================================

  return (
    <View style={styles.container}>
      {/* ASSISTANT NAVIGATION */}
      <View style={styles.tabContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setActiveTab('practicum')}
          style={[
            styles.tabButton,
            activeTab === 'practicum' &&
              styles.tabButtonActive,
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={17}
            color={
              activeTab === 'practicum'
                ? colors.primary
                : colors.textMuted
            }
          />

          <Text
            style={[
              styles.tabText,
              activeTab === 'practicum' &&
                styles.tabTextActive,
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
            activeTab === 'leave' &&
              styles.tabButtonActive,
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={17}
            color={
              activeTab === 'leave'
                ? colors.primary
                : colors.textMuted
            }
          />

          <Text
            style={[
              styles.tabText,
              activeTab === 'leave' &&
                styles.tabTextActive,
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
            activeTab === 'maps' &&
              styles.tabButtonActive,
          ]}
        >
          <Ionicons
            name="map-outline"
            size={17}
            color={
              activeTab === 'maps'
                ? colors.primary
                : colors.textMuted
            }
          />

          <Text
            style={[
              styles.tabText,
              activeTab === 'maps' &&
                styles.tabTextActive,
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
              <ActivityIndicator
                size="large"
                color={colors.primary}
              />

              <Text style={styles.loadingText}>
                Memuat data praktikum dari Firestore...
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              renderItem={renderSessionItem}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="calendar-outline"
                    size={36}
                    color={colors.textMuted}
                  />

                  <Text style={styles.emptyTitle}>
                    Belum Ada Sesi Praktikum
                  </Text>

                  <Text style={styles.emptyText}>
                    Tambahkan kelas dan sesi praktikum untuk
                    mulai mengelola jadwal serta presensi.
                  </Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : activeTab === 'leave' ? (
        /* LEAVE TAB */
        <View style={styles.content}>
          <AssistantLeaveSection />
        </View>
      ) : (
        /* MAPS TAB */
        <View style={styles.content}>
          <LaboratoryMapsView active={activeTab === 'maps'} />
        </View>
      )}

      {/* SESSION CONFIRMATION MODAL */}
      <SessionControlModal
        visible={confirmAction !== null}
        session={confirmAction?.session ?? null}
        action={confirmAction?.type ?? 'open'}
        attendanceCount={
          confirmAction
            ? getAttendanceForSession(
                confirmAction.session.id
              ).length
            : 0
        }
        capacity={confirmAction?.session.totalStudents ?? 0}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
      />

      {/* ATTENDANCE RECAP MODAL */}
      <AttendanceSummaryModal
        visible={recapSession !== null}
        session={recapSession}
        records={recapAttendees}
        onClose={() => setRecapSessionId(null)}
      />

      {/* CREATE / UPDATE SESSION MODAL */}
      <SessionFormModal
        visible={sessionFormVisible}
        session={editingSession}
        classes={classes}
        laboratories={laboratories}
        onClose={handleCloseSessionForm}
        onSubmit={handleSessionSubmit}
      />

      {/* CLASS MANAGEMENT MODAL */}
      <ClassManagementModal
        visible={classManagementVisible}
        classes={classes}
        students={students}
        onClose={() => setClassManagementVisible(false)}
        onCreateClass={createClass}
        onUpdateClass={updateClass}
        onDeleteClass={deleteClass}
        onAssignStudentToClass={assignStudentToClass}
      />

      {/* LABORATORY MANAGEMENT MODAL */}
      <LaboratoryManagementModal
        visible={labManagementVisible}
        laboratories={laboratories}
        onClose={() => setLabManagementVisible(false)}
        onCreateLaboratory={createLaboratory}
        onUpdateLaboratory={updateLaboratory}
        onDeleteLaboratory={deleteLaboratory}
      />
    </View>
  );
};

// ==========================================
// STYLES
// ==========================================

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
    paddingTop: spacing.md,
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
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  tabButtonActive: {
    borderBottomColor: colors.primary,
  },

  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  listContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },

  headerBlock: {
    marginBottom: spacing.sm,
  },

  managementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  managementButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },

  managementButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },

  buttonCount: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  buttonCountText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },

  addSessionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },

  addSessionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

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

  syncError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
  },

  syncErrorText: {
    flex: 1,
    color: colors.dangerDark,
    fontSize: 12,
    lineHeight: 18,
  },

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

  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  btn: {
    flexGrow: 1,
    flexBasis: 110,
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
    textAlign: 'center',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default AssistantView;
