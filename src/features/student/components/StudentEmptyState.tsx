// TASK-04 - Empty state khusus modul praktikan.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../studentTokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon?: IconName;
  title: string;
  message?: string;
}

const StudentEmptyState = ({ icon = 'information-circle-outline', title, message }: Props) => (
  <View style={styles.wrap}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={30} color={colors.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  message: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 360,
  },
});

export default StudentEmptyState;
