import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

const EmptyState = ({
  icon = 'file-tray-outline',
  title,
  message,
  action,
}: EmptyStateProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon}
          size={26}
          color={colors.mocha}
        />
      </View>

      <Text style={styles.title}>{title}</Text>

      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}

      {action ? (
        <View style={styles.action}>{action}</View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.mochaDark,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: spacing.xs,
  },
  action: {
    marginTop: spacing.md,
  },
});

export default EmptyState;
