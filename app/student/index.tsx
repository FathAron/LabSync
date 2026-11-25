import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import AttendanceModal from '../../src/features/student/components/AttendanceModal';
import FeedbackBanner from '../../src/features/student/components/FeedbackBanner';
import SessionCard from '../../src/features/student/components/SessionCard';
import StudentEmptyState from '../../src/features/student/components/StudentEmptyState';
import WeeklyCalendarStrip from '../../src/components/WeeklyCalendarStrip';

import {
  CONTENT_MAX_WIDTH,
  colors,
  radius,
  spacing,
} from '../../src/styles/theme';

import type {
  FeedbackType,
  Id,
  SessionInfo,
  SubmitResult,
} from '../../src/features/student/types';

import {
  MESSAGES,
  SESSION_STATUS,
  sameId,
} from '../../src/features/student/studentUtils';

import { useStudentModule } from '../../src/features/student/useStudentModule';

interface Feedback {
  type: FeedbackType;
  message: string;
  withHistoryLink: boolean;
  key: number;
}

const FEEDBACK_DURATION_MS = 4000;

const pad = (n: number) => String(n).padStart(2, '0');
const getTodayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const SessionsScreen = () => {
  const router = useRouter();

  // Membaca sessionId dari notifikasi push atau URL params
  const params = useLocalSearchParams<{
    sessionId?: string | string[];
  }>();

  const notificationSessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;

  const {
    student,
    allSessions,
    mySessions,
    hasActiveSession,
    findRecord,
    isAttended,
    submitAttendance,
    externalNotify,
    dataLoading,
  } = useStudentModule();

  const [selectedSessionId, setSelectedSessionId] = useState<Id | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const lastHandledSessionId = useRef<string | null>(null);

  // Weekly calendar navigation state
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso);
  const [dateFilterActive, setDateFilterActive] = useState(false);

  // Section collapse state
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [closedExpanded, setClosedExpanded] = useState(true);

  const selectedSession =
    mySessions.find((s) => sameId(s.id, selectedSessionId)) ?? null;

  // ==========================================
  // FEEDBACK
  // ==========================================

  useEffect(() => {
    if (!feedback) return undefined;

    const timer = setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  const showFeedback = useCallback(
    (type: FeedbackType, message: string, withHistoryLink = false) => {
      if (externalNotify) {
        externalNotify({ type, message });
        return;
      }

      setFeedback({
        type,
        message,
        withHistoryLink,
        key: Date.now(),
      });
    },
    [externalNotify]
  );

  // ==========================================
  // OPEN ATTENDANCE FROM NOTIFICATION
  // ==========================================

  useEffect(() => {
    if (!notificationSessionId) {
      lastHandledSessionId.current = null;
      return;
    }

    if (dataLoading || !student) {
      return;
    }

    if (lastHandledSessionId.current === notificationSessionId) {
      return;
    }

    const targetSession = mySessions.find((session) =>
      sameId(session.id, notificationSessionId)
    );

    lastHandledSessionId.current = notificationSessionId;
    router.setParams({ sessionId: '' });

    if (!targetSession) {
      setTimeout(() => {
        showFeedback(
          'error',
          'Sesi praktikum tidak ditemukan. Periksa kembali jadwal praktikum.'
        );
      }, 0);
      return;
    }

    if (targetSession.status !== SESSION_STATUS.ACTIVE) {
      setTimeout(() => {
        showFeedback('error', 'Sesi praktikum sudah tidak aktif.');
      }, 0);
      return;
    }

    // Membuka modal presensi otomatis
    setTimeout(() => {
      setSelectedSessionId(targetSession.id);
    }, 0);
  }, [
    notificationSessionId,
    dataLoading,
    student,
    mySessions,
    router,
    showFeedback,
  ]);

  // ==========================================
  // MANUAL ATTENDANCE
  // ==========================================

  const handlePressAttend = (session: SessionInfo) => {
    if (!student) {
      showFeedback('error', MESSAGES.missingStudent);
      return;
    }

    if (session.status !== SESSION_STATUS.ACTIVE) {
      showFeedback('error', MESSAGES.sessionNotActive);
      return;
    }

    if (isAttended(session.id)) {
      showFeedback('info', MESSAGES.alreadyAttended);
      return;
    }

    // Arahkan ke layar presensi terdedikasi dengan validasi GPS & radius
    router.push({
      pathname: '/student/attendance',
      params: { sessionId: String(session.id) },
    });
  };

  // ==========================================
  // SUBMIT ATTENDANCE (MODAL FALLBACK)
  // ==========================================

  const handleSubmit = async (notes: string): Promise<SubmitResult> => {
    if (!selectedSession) {
      showFeedback('error', MESSAGES.missingSession);
      return { ok: false, closeModal: true };
    }

    const result = await submitAttendance(selectedSession.id, notes);

    if (result.ok) {
      showFeedback('success', result.message ?? MESSAGES.success, true);
    } else if (result.closeModal && result.message) {
      showFeedback(result.tone ?? 'error', result.message);
    }

    return result;
  };

  // ==========================================
  // SESSION DATES & FILTERING
  // ==========================================

  // Kumpulkan tanggal-tanggal sesi yang ada
  const sessionDates = useMemo(() => {
    const dates = new Set<string>();
    mySessions.forEach((s) => {
      if (typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date)) {
        dates.add(s.date);
      }
    });
    return Array.from(dates);
  }, [mySessions]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setDateFilterActive(true);
  };

  const handleResetDate = () => {
    setSelectedDate(getTodayIso());
    setDateFilterActive(false);
  };

  // Sesi yang difilter berdasarkan tanggal jika filter aktif
  const displayedSessions = useMemo(() => {
    if (!dateFilterActive) return mySessions;
    return mySessions.filter((s) => s.date === selectedDate);
  }, [mySessions, selectedDate, dateFilterActive]);

  // Kelompokkan sesi: Aktif, Mendatang, Selesai
  const activeSessions = useMemo(
    () => displayedSessions.filter((s) => s.status === SESSION_STATUS.ACTIVE),
    [displayedSessions]
  );

  const upcomingSessions = useMemo(
    () => displayedSessions.filter((s) => s.status === SESSION_STATUS.PENDING),
    [displayedSessions]
  );

  const closedSessions = useMemo(
    () => displayedSessions.filter((s) => s.status === SESSION_STATUS.CLOSED),
    [displayedSessions]
  );

  // ==========================================
  // LOADING / STUDENT CHECK
  // ==========================================

  if (dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat jadwal praktikum...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <StudentEmptyState
        icon="person-outline"
        title="Identitas Praktikan Belum Tersedia"
        message="Silakan masuk kembali dengan akun praktikan agar jadwal dapat ditampilkan."
      />
    );
  }

  return (
    <View style={styles.container}>
      {feedback ? (
        <View style={styles.feedbackWrap} key={feedback.key}>
          <FeedbackBanner
            type={feedback.type}
            message={feedback.message}
            actionLabel={
              feedback.withHistoryLink ? 'Lihat Riwayat Presensi' : undefined
            }
            onAction={
              feedback.withHistoryLink
                ? () => {
                    setFeedback(null);
                    router.push('/student/history');
                  }
                : undefined
            }
            onClose={() => setFeedback(null)}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly Calendar Navigation Strip */}
        <WeeklyCalendarStrip
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          sessionDates={sessionDates}
          onReset={dateFilterActive ? handleResetDate : undefined}
        />

        {/* Status Callout Banner */}
        {hasActiveSession ? (
          <View style={styles.liveBanner}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBannerText}>
              Ada sesi praktikum yang sedang aktif! Pastikan Anda berada di lab
              dan segera lakukan presensi.
            </Text>
          </View>
        ) : !dateFilterActive ? (
          <View style={styles.infoBanner}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.mochaDark}
            />
            <Text style={styles.infoBannerText}>
              Belum ada sesi yang dibuka saat ini. Presensi dibuka saat asisten
              memulai sesi praktikum.
            </Text>
          </View>
        ) : null}

        {/* Filter Status Indicator */}
        {dateFilterActive ? (
          <View style={styles.filterBar}>
            <Text style={styles.filterText}>
              Menampilkan jadwal tanggal: <Text style={styles.bold}>{selectedDate}</Text>
            </Text>
            <Pressable onPress={handleResetDate} style={styles.clearFilterBtn}>
              <Text style={styles.clearFilterText}>Tampilkan Semua</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Empty State when no sessions */}
        {allSessions.length === 0 ? (
          <StudentEmptyState
            icon="calendar-outline"
            title="Jadwal Praktikum Belum Tersedia"
            message="Belum ada jadwal praktikum yang terdaftar di sistem."
          />
        ) : displayedSessions.length === 0 ? (
          <StudentEmptyState
            icon="calendar-outline"
            title="Tidak Ada Sesi Pada Tanggal Ini"
            message="Pilih hari lain pada kalender di atas atau ketuk Tampilkan Semua."
          />
        ) : (
          <>
            {/* SECTION 1: SEDANG BERLANGSUNG */}
            {activeSessions.length > 0 ? (
              <View style={styles.sectionWrap}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveExpanded((prev) => !prev)}
                  style={styles.sectionHeader}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <View style={styles.activeDotSm} />
                    <Text style={styles.sectionTitle}>Sedang Berlangsung</Text>
                    <View style={styles.countBadgeActive}>
                      <Text style={styles.countTextActive}>
                        {activeSessions.length}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={activeExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.mochaDark}
                  />
                </Pressable>

                {activeExpanded ? (
                  <View style={styles.sectionCards}>
                    {activeSessions.map((session) => (
                      <SessionCard
                        key={String(session.id)}
                        session={session}
                        attended={isAttended(session.id)}
                        attendance={findRecord(session.id)}
                        onPressAttend={handlePressAttend}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* SECTION 2: AKAN DATANG */}
            {upcomingSessions.length > 0 ? (
              <View style={styles.sectionWrap}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setUpcomingExpanded((prev) => !prev)}
                  style={styles.sectionHeader}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <View style={styles.upcomingDotSm} />
                    <Text style={styles.sectionTitle}>Sesi Mendatang</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>
                        {upcomingSessions.length}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={upcomingExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.mochaDark}
                  />
                </Pressable>

                {upcomingExpanded ? (
                  <View style={styles.sectionCards}>
                    {upcomingSessions.map((session) => (
                      <SessionCard
                        key={String(session.id)}
                        session={session}
                        attended={isAttended(session.id)}
                        attendance={findRecord(session.id)}
                        onPressAttend={handlePressAttend}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* SECTION 3: SESI SELESAI */}
            {closedSessions.length > 0 ? (
              <View style={styles.sectionWrap}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setClosedExpanded((prev) => !prev)}
                  style={styles.sectionHeader}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <View style={styles.closedDotSm} />
                    <Text style={styles.sectionTitle}>Sesi Selesai</Text>
                    <View style={styles.countBadgeMuted}>
                      <Text style={styles.countTextMuted}>
                        {closedSessions.length}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={closedExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.mochaDark}
                  />
                </Pressable>

                {closedExpanded ? (
                  <View style={styles.sectionCards}>
                    {closedSessions.map((session) => (
                      <SessionCard
                        key={String(session.id)}
                        session={session}
                        attended={isAttended(session.id)}
                        attendance={findRecord(session.id)}
                        onPressAttend={handlePressAttend}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* FORMULIR PRESENSI MODAL FALLBACK */}
      <AttendanceModal
        visible={selectedSession !== null}
        session={selectedSession}
        student={student}
        onClose={() => setSelectedSessionId(null)}
        onSubmit={handleSubmit}
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  feedbackWrap: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sageSoft,
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  liveBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.successDark,
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mochaDark,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bold: {
    fontWeight: '800',
    color: colors.mochaDark,
  },
  clearFilterBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.sand,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  activeDotSm: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  upcomingDotSm: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.butterCreamDark,
  },
  closedDotSm: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
  },
  countBadgeActive: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.sageSoft,
    borderWidth: 1,
    borderColor: colors.sage,
  },
  countTextActive: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.successDark,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.butterCreamSoft,
    borderWidth: 1,
    borderColor: colors.butterCream,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.butterCreamDark,
  },
  countBadgeMuted: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  countTextMuted: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  sectionCards: {
    gap: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default SessionsScreen;
