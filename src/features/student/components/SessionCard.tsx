// TASK-04 - Kartu sesi praktikum untuk praktikan.
// Menangani 4 kondisi: PENDING, ACTIVE belum presensi, ACTIVE sudah presensi, CLOSED.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../studentTokens';
import type { AttendanceInfo, SessionInfo } from '../types';
import {
  SESSION_STATUS,
  STATUS_META,
  formatDateID,
  formatTimeRange,
  formatTimeWIB,
} from '../studentUtils';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const DetailRow = ({ icon, text }: { icon: IconName; text: string }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.detailIcon} />
    <Text style={styles.detailText}>{text}</Text>
  </View>
);

interface Props {
  session: SessionInfo;
  attendance: AttendanceInfo | null; // catatan presensi milik praktikan aktif untuk sesi ini
  attended: boolean;
  onPressAttend: (session: SessionInfo) => void;
}

const SessionCard = ({ session, attendance, attended, onPressAttend }: Props) => {
  const meta = STATUS_META[session.status];
  const canAttend = session.status === SESSION_STATUS.ACTIVE && !attended;

  const subtitle = [session.moduleCode, session.moduleTitle].filter(Boolean).join(' - ');
  const dateText = formatDateID(session.date ?? session.startTime) ?? 'Tanggal belum tersedia';
  const timeText = formatTimeRange(session.startTime, session.endTime) ?? 'Waktu belum tersedia';
  const attendedTime = attendance ? formatTimeWIB(attendance.timestamp) : null;

  return (
    <View style={styles.card}>
      <View style={[styles.badge, { backgroundColor: meta.bg }]}>
        <View style={[styles.badgeDot, { backgroundColor: meta.dot }]} />
        <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
      </View>

      <Text style={styles.title}>{session.courseName}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.details}>
        {session.className ? <DetailRow icon="people-outline" text={`Kelas ${session.className}`} /> : null}
        <DetailRow icon="calendar-outline" text={dateText} />
        <DetailRow icon="time-outline" text={timeText} />
        {session.room ? <DetailRow icon="location-outline" text={session.room} /> : null}
        {session.assistantName ? (
          <DetailRow icon="person-outline" text={`Asisten: ${session.assistantName}`} />
        ) : null}
      </View>

      {attended && session.status === SESSION_STATUS.CLOSED ? (
        <Text style={styles.note}>{meta.description}</Text>
      ) : null}

      {attended ? (
        <View style={styles.attendedBox} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <View style={styles.attendedTextWrap}>
            <Text style={styles.attendedTitle}>Sudah Presensi</Text>
            <Text style={styles.attendedMeta}>
              {attendedTime ? `Hadir pukul ${attendedTime}` : 'Waktu kehadiran tidak tersedia'}
            </Text>
            {attendance && attendance.notes ? (
              <Text style={styles.attendedMeta}>{`Posisi: ${attendance.notes}`}</Text>
            ) : null}
          </View>
        </View>
      ) : (
        <>
          {!canAttend ? <Text style={styles.note}>{meta.description}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={meta.buttonLabel}
            accessibilityState={{ disabled: !canAttend }}
            disabled={!canAttend}
            onPress={() => {
              if (canAttend) onPressAttend(session);
            }}
            style={({ pressed }) => [
              styles.button,
              canAttend ? styles.buttonEnabled : styles.buttonDisabled,
              canAttend && pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={[styles.buttonText, !canAttend && styles.buttonTextDisabled]}>
              {meta.buttonLabel}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  badgeDot: { width: 8, height: 8, borderRadius: radius.pill, marginRight: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, lineHeight: 23 },
  subtitle: { marginTop: 2, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  details: { marginTop: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  detailIcon: { marginTop: 2, marginRight: spacing.sm },
  detailText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  note: { marginTop: spacing.sm, fontSize: 13, color: colors.textMuted },
  button: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonEnabled: { backgroundColor: colors.primary },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonDisabled: { backgroundColor: colors.neutralSoft },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  buttonTextDisabled: { color: colors.textMuted },
  attendedBox: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  attendedTextWrap: { flex: 1, marginLeft: spacing.sm },
  attendedTitle: { fontSize: 15, fontWeight: '700', color: colors.successDark },
  attendedMeta: { marginTop: 2, fontSize: 13, color: colors.successDark },
});

export default SessionCard;
