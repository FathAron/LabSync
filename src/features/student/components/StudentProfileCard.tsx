// TASK-04 - Kartu identitas praktikan aktif (dari state pusat, bukan input manual).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../studentTokens';
import type { StudentInfo } from '../types';

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};

const StudentProfileCard = ({ student }: { student: StudentInfo }) => (
  <View style={styles.card}>
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{getInitials(student.name)}</Text>
    </View>
    <View style={styles.textWrap}>
      <Text style={styles.name}>{student.name}</Text>
      <Text style={styles.meta}>
        NIM {student.nim}
        {student.className ? `  |  Kelas ${student.className}` : ''}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  textWrap: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: 17, fontWeight: '700', color: colors.text, lineHeight: 23 },
  meta: { marginTop: 2, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
});

export default StudentProfileCard;
