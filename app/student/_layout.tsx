// Sprint 2 - Layout Praktikan
// Integrasi tab Sesi Praktikum, Riwayat Presensi, dan Pengajuan Izin.

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import StudentProfileCard from '../../src/features/student/components/StudentProfileCard';

import {
  CONTENT_MAX_WIDTH,
  colors,
  spacing,
} from '../../src/features/student/studentTokens';

import { useStudentModule } from '../../src/features/student/useStudentModule';
import { useLeave } from '../../src/hooks/useLeave';

const toColor = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const StudentLayout = () => {
  const {
    student,
    mySessions,
    myRecords,
    isAttended,
  } = useStudentModule();

  // Data izin praktikan secara real-time.
  const { pendingCount } = useLeave();

  // Jumlah sesi aktif yang belum dihadiri.
  const todo = mySessions.filter(
    (session) =>
      session.status === 'ACTIVE' &&
      !isAttended(session.id)
  ).length;

  return (
    <View style={styles.root}>
      {student ? (
        <View style={styles.profileWrap}>
          <StudentProfileCard student={student} />
        </View>
      ) : null}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          sceneStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {/* TAB 1: SESI PRAKTIKUM */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Sesi Praktikum',
            tabBarBadge: todo > 0 ? todo : undefined,
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="calendar-outline"
                size={size}
                color={toColor(color, colors.primary)}
              />
            ),
          }}
        />

        {/* TAB 2: RIWAYAT PRESENSI */}
        <Tabs.Screen
          name="history"
          options={{
            title: 'Riwayat Presensi',
            tabBarBadge:
              myRecords.length > 0
                ? myRecords.length
                : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.success,
            },
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="time-outline"
                size={size}
                color={toColor(color, colors.primary)}
              />
            ),
          }}
        />

        {/* TAB 3: PENGAJUAN IZIN - ADELIA */}
        <Tabs.Screen
          name="leave"
          options={{
            title: 'Pengajuan Izin',
            tabBarBadge:
              pendingCount > 0
                ? pendingCount
                : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.primary,
            },
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="document-text-outline"
                size={size}
                color={toColor(color, colors.primary)}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  profileWrap: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
});

export default StudentLayout;