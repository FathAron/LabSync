import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import type { StudentInfo } from '../types';

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};

export const StudentProfileCard = ({ student }: { student: StudentInfo }) => (
  <View style={styles.card}>
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{getInitials(student.name)}</Text>
    </View>
    <View style={styles.textWrap}>
      <Text style={styles.name}>{student.name}</Text>
      <Text style={styles.meta}>
        NIM {student.nim}
        {student.className ? `  •  Kelas ${student.className}` : ''}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...theme.shadows.card,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.mochaDark,
    lineHeight: 20,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});

export default StudentProfileCard;
