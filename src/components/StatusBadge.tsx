import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

export interface StatusBadgeProps {
  status?: string;
  label?: string;
  dotColor?: string;
  bg?: string;
  fg?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

const STATUS_MAP: Record<
  string,
  { label: string; bg: string; fg: string; dot: string }
> = {
  ACTIVE: {
    label: 'Sedang Berlangsung',
    bg: '#E2EDE3',
    fg: '#2A5731',
    dot: colors.sage,
  },
  PENDING: {
    label: 'Belum Dibuka',
    bg: '#FDF5E6',
    fg: '#7D5711',
    dot: colors.butterCream,
  },
  CLOSED: {
    label: 'Selesai',
    bg: '#EDE8DF',
    fg: '#5E5745',
    dot: colors.neutral,
  },
  APPROVED: {
    label: 'Disetujui',
    bg: '#E2EDE3',
    fg: '#2A5731',
    dot: colors.sage,
  },
  REJECTED: {
    label: 'Ditolak',
    bg: '#FCE8EC',
    fg: '#A31D36',
    dot: colors.danger,
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  dotColor,
  bg,
  fg,
  size = 'md',
  style,
}) => {
  const isSm = size === 'sm';
  const meta = status && STATUS_MAP[status] ? STATUS_MAP[status] : null;

  const displayLabel = label ?? meta?.label ?? status ?? '';
  const displayBg = bg ?? meta?.bg ?? colors.surfaceSubtle;
  const displayFg = fg ?? meta?.fg ?? colors.text;
  const displayDot = dotColor ?? meta?.dot;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: displayBg },
        isSm && styles.badgeSm,
        style,
      ]}
    >
      {displayDot ? (
        <View
          style={[
            styles.dot,
            { backgroundColor: displayDot },
            isSm && styles.dotSm,
          ]}
        />
      ) : null}
      <Text style={[styles.label, { color: displayFg }, isSm && styles.labelSm]}>
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    marginRight: 6,
  },
  dotSm: {
    width: 5,
    height: 5,
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  labelSm: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default StatusBadge;
