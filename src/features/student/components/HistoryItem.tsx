import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import type { HistoryEntry } from '../types';
import { formatDateID, formatTimeWIB } from '../studentUtils';
import { formatDisplayClass } from '../../../utils/classUtils';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const Row = ({ icon, text }: { icon: IconName; text: string }) => (
  <View style={styles.row}>
    <Ionicons
      name={icon}
      size={14}
      color={colors.textMuted}
      style={styles.rowIcon}
    />
    <Text style={styles.rowText}>{text}</Text>
  </View>
);

const HistoryItem = ({ record, session }: HistoryEntry) => {
  const title = session ? session.courseName : 'Sesi Praktikum';
  const subtitle = session
    ? [session.moduleCode, session.moduleTitle].filter(Boolean).join(' — ')
    : record.sessionId !== undefined
    ? `ID sesi: ${record.sessionId}`
    : '';

  const dateText = formatDateID(record.timestamp) ?? 'Tanggal tidak valid';
  const timeText = formatTimeWIB(record.timestamp) ?? 'Waktu tidak valid';

  return (
    <View style={styles.card}>
      {/* Header Row: Course & Hadir Badge */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.badge}>
          <Ionicons
            name="checkmark-circle"
            size={13}
            color={colors.successDark}
          />
          <Text style={styles.badgeText}>Hadir</Text>
        </View>
      </View>

      {/* Details Box */}
      <View style={styles.body}>
        {session && session.className ? (
          <Row icon="people-outline" text={formatDisplayClass(session.className)} />
        ) : null}
        <Row icon="calendar-outline" text={dateText} />
        <Row icon="time-outline" text={`Waktu kehadiran: ${timeText}`} />
        {session && session.room ? (
          <Row icon="location-outline" text={session.room} />
        ) : null}
        {record.notes ? (
          <Row icon="document-text-outline" text={`Catatan: ${record.notes}`} />
        ) : null}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
    lineHeight: 22,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sageSoft,
    borderWidth: 1,
    borderColor: colors.sage,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.successDark,
  },
  body: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: spacing.sm,
  },
  rowText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
  },
});

export default HistoryItem;
