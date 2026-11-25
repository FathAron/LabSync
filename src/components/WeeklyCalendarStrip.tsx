import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, theme } from '../styles/theme';

interface WeeklyCalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  sessionDates?: string[]; // Array of YYYY-MM-DD that have practicum sessions
  onReset?: () => void;
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const pad = (n: number) => String(n).padStart(2, '0');

const WeeklyCalendarStrip: React.FC<WeeklyCalendarStripProps> = ({
  selectedDate,
  onSelectDate,
  sessionDates = [],
  onReset,
}) => {
  // Hitung rentang 7 hari (Senin sampai Minggu) dari selectedDate
  const { weekDays, weekRangeLabel } = useMemo(() => {
    const base = new Date(selectedDate);
    const validBase = Number.isNaN(base.getTime()) ? new Date() : base;

    // Tentukan hari dalam minggu (0 = Min, 1 = Sen, dst)
    const dayOfWeek = validBase.getDay();
    // Jadikan Senin sebagai hari pertama (offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(validBase);
    monday.setDate(validBase.getDate() + mondayOffset);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const year = d.getFullYear();
      const month = d.getMonth();
      const dateNum = d.getDate();
      const iso = `${year}-${pad(month + 1)}-${pad(dateNum)}`;
      const dayName = DAY_NAMES[d.getDay()];

      days.push({
        iso,
        dayName,
        dateNum,
        month,
        year,
      });
    }

    const first = days[0];
    const last = days[6];
    const rangeText = `${first.dateNum} ${MONTH_NAMES[first.month]} – ${last.dateNum} ${
      MONTH_NAMES[last.month]
    } ${last.year}`;

    return { weekDays: days, weekRangeLabel: rangeText };
  }, [selectedDate]);

  const handlePrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    onSelectDate(iso);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    onSelectDate(iso);
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  return (
    <View style={styles.container}>
      {/* Week Navigator Bar */}
      <View style={styles.navBar}>
        <View style={styles.navControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minggu sebelumnya"
            onPress={handlePrevWeek}
            style={({ pressed }) => [styles.arrowBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={16} color={colors.mochaDark} />
          </Pressable>

          <View style={styles.rangeBadge}>
            <Text style={styles.rangeText}>{weekRangeLabel}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minggu berikutnya"
            onPress={handleNextWeek}
            style={({ pressed }) => [styles.arrowBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.mochaDark} />
          </Pressable>
        </View>

        {onReset ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke hari ini"
            onPress={onReset}
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.resetText}>Hari Ini</Text>
          </Pressable>
        ) : null}
      </View>

      {/* 7 Days Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysRow}
      >
        {weekDays.map((day) => {
          const isSelected = selectedDate === day.iso;
          const isToday = todayIso === day.iso;
          const hasSession = sessionDates.includes(day.iso);

          return (
            <Pressable
              key={day.iso}
              accessibilityRole="button"
              accessibilityLabel={`${day.dayName}, ${day.dateNum}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectDate(day.iso)}
              style={({ pressed }) => [
                styles.dayPill,
                isSelected && styles.dayPillSelected,
                isToday && !isSelected && styles.dayPillToday,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                  isToday && !isSelected && styles.dayNameToday,
                ]}
              >
                {day.dayName}
              </Text>
              <Text
                style={[
                  styles.dateNum,
                  isSelected && styles.dateNumSelected,
                  isToday && !isSelected && styles.dateNumToday,
                ]}
              >
                {day.dateNum}
              </Text>

              {/* Indicator dot */}
              <View
                style={[
                  styles.dotPlaceholder,
                  hasSession && (isSelected ? styles.dotSelected : styles.dotActive),
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  resetBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.butterCreamSoft,
    borderWidth: 1,
    borderColor: colors.butterCream,
  },
  resetText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.butterCreamDark,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 2,
  },
  dayPill: {
    flex: 1,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dayPillToday: {
    borderColor: colors.sage,
    backgroundColor: colors.sageSoft,
  },
  dayPillSelected: {
    backgroundColor: colors.mocha,
    borderColor: colors.mochaDark,
    transform: [{ scale: 1.03 }],
    ...theme.shadows.card,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  dayNameSelected: {
    color: colors.sand,
    fontWeight: '700',
  },
  dayNameToday: {
    color: colors.sageDark,
    fontWeight: '700',
  },
  dateNum: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  dateNumSelected: {
    color: '#FFFFFF',
  },
  dateNumToday: {
    color: colors.sageDark,
  },
  dotPlaceholder: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotSelected: {
    backgroundColor: colors.butterCream,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default WeeklyCalendarStrip;
