// TASK-04 - Tab "Sesi Praktikum".

import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AttendanceModal from '../../src/features/student/components/AttendanceModal';
import FeedbackBanner from '../../src/features/student/components/FeedbackBanner';
import SessionCard from '../../src/features/student/components/SessionCard';
import StudentEmptyState from '../../src/features/student/components/StudentEmptyState';
import { CONTENT_MAX_WIDTH, colors, radius, spacing } from '../../src/features/student/studentTokens';
import type { FeedbackType, Id, SessionInfo, SubmitResult } from '../../src/features/student/types';
import { MESSAGES, SESSION_STATUS, sameId } from '../../src/features/student/studentUtils';
import { useStudentModule } from '../../src/features/student/useStudentModule';

interface Feedback {
  type: FeedbackType;
  message: string;
  withHistoryLink: boolean;
  key: number;
}

const FEEDBACK_DURATION_MS = 4000;

const SessionsScreen = () => {
  const router = useRouter();
  const {
    student,
    allSessions,
    mySessions,
    hasActiveSession,
    findRecord,
    isAttended,
    submitAttendance,
    externalNotify,
  } = useStudentModule();

  const [selectedSessionId, setSelectedSessionId] = useState<Id | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const selectedSession = mySessions.find((s) => sameId(s.id, selectedSessionId)) ?? null;

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
      setFeedback({ type, message, withHistoryLink, key: Date.now() });
    },
    [externalNotify]
  );

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
    setSelectedSessionId(session.id);
  };

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

  if (!student) {
    return (
      <StudentEmptyState
        icon="person-outline"
        title="Identitas praktikan belum tersedia"
        message="Pilih identitas praktikan terlebih dahulu agar jadwal praktikum dapat ditampilkan."
      />
    );
  }

  const header =
    hasActiveSession || mySessions.length === 0 ? undefined : (
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.infoBannerText}>
          Belum ada sesi yang dibuka. Presensi bisa dilakukan setelah asisten membuka sesi.
        </Text>
      </View>
    );

  const empty =
    allSessions.length === 0 ? (
      <StudentEmptyState
        icon="calendar-outline"
        title="Jadwal praktikum belum tersedia"
        message="Belum ada jadwal praktikum yang terdaftar."
      />
    ) : (
      <StudentEmptyState
        icon="calendar-outline"
        title="Belum ada sesi untuk kelasmu"
        message={
          student.className
            ? `Tidak ada sesi praktikum untuk kelas ${student.className} saat ini.`
            : 'Tidak ada sesi praktikum yang sesuai saat ini.'
        }
      />
    );

  return (
    <View style={styles.container}>
      {feedback ? (
        <View style={styles.feedbackWrap} key={feedback.key}>
          <FeedbackBanner
            type={feedback.type}
            message={feedback.message}
            actionLabel={feedback.withHistoryLink ? 'Lihat Riwayat Presensi' : undefined}
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

      <FlatList
        data={mySessions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            attended={isAttended(item.id)}
            attendance={findRecord(item.id)}
            onPressAttend={handlePressAttend}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

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
  container: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  feedbackWrap: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primaryDark,
  },
});

export default SessionsScreen;
