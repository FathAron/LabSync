// TASK-04 - Feedback ringan (toast lokal) untuk modul praktikan.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../studentTokens';
import type { FeedbackType } from '../types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  type: FeedbackType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

const tone = (type: FeedbackType): { bg: string; fg: string; icon: IconName } => {
  if (type === 'success') return { bg: colors.successSoft, fg: colors.successDark, icon: 'checkmark-circle' };
  if (type === 'error') return { bg: colors.dangerSoft, fg: colors.dangerDark, icon: 'alert-circle-outline' };
  return { bg: colors.primarySoft, fg: colors.primaryDark, icon: 'information-circle-outline' };
};

const FeedbackBanner = ({ type, message, actionLabel, onAction, onClose }: Props) => {
  const t = tone(type);
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]} accessibilityLiveRegion="polite">
      <Ionicons name={t.icon} size={20} color={t.fg} />
      <View style={styles.textWrap}>
        <Text style={[styles.message, { color: t.fg }]}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="link" onPress={onAction} hitSlop={8}>
            <Text style={[styles.action, { color: t.fg }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Tutup pesan" onPress={onClose} hitSlop={10}>
        <Ionicons name="close" size={18} color={t.fg} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.md,
    padding: spacing.md,
    elevation: 4,
  },
  textWrap: { flex: 1, marginHorizontal: spacing.sm },
  message: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  action: { marginTop: 4, fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
});

export default FeedbackBanner;
