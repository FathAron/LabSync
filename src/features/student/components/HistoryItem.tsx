// TASK-04 - Satu baris riwayat kehadiran praktikan.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../studentTokens';
import type { HistoryEntry } from '../types';
import { formatDateID, formatTimeWIB } from '../studentUtils';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const Row = ({ icon, text }: { icon: IconName; text: string }) => (
  <View style={styles.row}>
    <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.rowIcon} />
    <Text style={styles.rowText}>{text}</Text>
  </View>
);

const HistoryItem = ({ record, session }: HistoryEntry) => {
  const title = session ? session.courseName : 'Data sesi tidak ditemukan';
  const subtitle = session
    ? [session.moduleCode, session.moduleTitle].filter(Boolean).join(' - ')
    : record.sessionId !== undefined
    ? `ID sesi: ${record.sessionId}`
    : '';

  const dateText = formatDateID(record.timestamp) ?? 'Tanggal tidak valid';
  const timeText = formatTimeWIB(record.timestamp) ?? 'Jam tidak valid';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.badge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.successDark} />
          <Text style={styles.badgeText}>Hadir</Text>
        </View>
      </View>

      <View style={styles.body}>
        {session && session.className ? <Row icon="people-outline" text={`Kelas ${session.className}`} /> : null}
        <Row icon="calendar-outline" text={dateText} />
        <Row icon="time-outline" text={timeText} />
        {session && session.room ? <Row icon="location-outline" text={session.room} /> : null}
        {record.notes ? <Row icon="document-text-outline" text={`Posisi: ${record.notes}`} /> : null}
      </View>
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
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1, marginRight: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22 },
  subtitle: { marginTop: 2, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: { marginLeft: 4, fontSize: 12, fontWeight: '700', color: colors.successDark },
  body: { marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  rowIcon: { marginTop: 2, marginRight: spacing.sm },
  rowText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
});

export default HistoryItem;
