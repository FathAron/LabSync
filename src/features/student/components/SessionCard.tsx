import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import type { AttendanceInfo, SessionInfo } from '../types';
import {
  SESSION_STATUS,
  STATUS_META,
  formatDateID,
  formatTimeRange,
  formatTimeWIB,
} from '../studentUtils';
import { formatDisplayClass } from '../../../utils/classUtils';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const DetailRow = ({ icon, text }: { icon: IconName; text: string }) => (
  <View style={styles.detailRow}>
    <Ionicons
      name={icon}
      size={15}
      color={colors.textMuted}
      style={styles.detailIcon}
    />
    <Text style={styles.detailText}>{text}</Text>
  </View>
);

interface Props {
  session: SessionInfo;
  attendance: AttendanceInfo | null;
  attended: boolean;
  onPressAttend: (session: SessionInfo) => void;
}

const SessionCard = ({
  session,
  attendance,
  attended,
  onPressAttend,
}: Props) => {
  const meta = STATUS_META[session.status];
  const canAttend = session.status === SESSION_STATUS.ACTIVE && !attended;

  const subtitle = [session.moduleCode, session.moduleTitle]
    .filter(Boolean)
    .join(' — ');

  const dateText =
    formatDateID(session.date ?? session.startTime) ?? 'Tanggal belum diatur';

  const timeText =
    formatTimeRange(session.startTime, session.endTime) ?? 'Waktu belum diatur';

  const attendedTime = attendance
    ? formatTimeWIB(attendance.timestamp)
    : null;

  return (
    <View style={styles.card}>
      {/* Top Meta: Status Badge & Class Pill */}
      <View style={styles.cardTopRow}>
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <View style={[styles.badgeDot, { backgroundColor: meta.dot }]} />
          <Text style={[styles.badgeText, { color: meta.fg }]}>
            {meta.label}
          </Text>
        </View>

        {session.className ? (
          <View style={styles.classPill}>
            <Text style={styles.classPillText}>{formatDisplayClass(session.className)}</Text>
          </View>
        ) : null}
      </View>

      {/* Course Title & Module Information */}
      <Text style={styles.title}>{session.courseName}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {/* Details List */}
      <View style={styles.detailsContainer}>
        <DetailRow icon="calendar-outline" text={dateText} />
        <DetailRow icon="time-outline" text={timeText} />
        {session.room ? (
          <DetailRow icon="location-outline" text={session.room} />
        ) : null}
        {session.assistantName ? (
          <DetailRow
            icon="person-outline"
            text={`Asisten: ${session.assistantName}`}
          />
        ) : null}
      </View>

      {/* Attended Banner OR Action Button */}
      {attended ? (
        <View style={styles.attendedBox} accessibilityLiveRegion="polite">
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={colors.success}
          />
          <View style={styles.attendedTextWrap}>
            <Text style={styles.attendedTitle}>Kehadiran Tercatat</Text>
            <Text style={styles.attendedMeta}>
              {attendedTime
                ? `Hadir pukul ${attendedTime}`
                : 'Status kehadiran tersimpan di server'}
            </Text>
            {attendance && attendance.notes ? (
              <Text style={styles.attendedSubMeta}>
                Catatan: {attendance.notes}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.actionContainer}>
          {!canAttend ? (
            <Text style={styles.note}>{meta.description}</Text>
          ) : null}

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
            {canAttend ? (
              <Ionicons
                name="finger-print-outline"
                size={18}
                color="#FFFFFF"
                style={styles.btnIcon}
              />
            ) : null}
            <Text
              style={[
                styles.buttonText,
                !canAttend && styles.buttonTextDisabled,
              ]}
            >
              {meta.buttonLabel}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...theme.shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  classPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.mochaDark,
    lineHeight: 24,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  detailsContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: spacing.sm,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  actionContainer: {
    marginTop: spacing.md,
  },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  btnIcon: {
    marginRight: 6,
  },
  buttonEnabled: {
    backgroundColor: colors.primary,
    ...theme.shadows.button,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  buttonTextDisabled: {
    color: colors.textMuted,
  },
  attendedBox: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.sageSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.sage,
  },
  attendedTextWrap: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  attendedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.successDark,
  },
  attendedMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.successDark,
  },
  attendedSubMeta: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default SessionCard;
