import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../src/styles/theme';
import { useStudentModule } from '../../src/features/student/useStudentModule';
import { useLeave } from '../../src/hooks/useLeave';

const StudentLayout = () => {
  const insets = useSafeAreaInsets();
  const { mySessions, myRecords, isAttended } = useStudentModule();
  const { pendingCount } = useLeave();

  // Jumlah sesi aktif yang belum dihadiri
  const todo = mySessions.filter(
    (session) => session.status === 'ACTIVE' && !isAttended(session.id)
  ).length;

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.mocha,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: -2,
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
            borderTopWidth: 1,
            height: 58 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: colors.mochaDark,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
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
            tabBarBadgeStyle: {
              backgroundColor: colors.primary,
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '800',
            },
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={22}
                color={focused ? colors.mochaDark : colors.textMuted}
              />
            ),
          }}
        />

        {/* TAB 2: RIWAYAT PRESENSI */}
        <Tabs.Screen
          name="history"
          options={{
            title: 'Riwayat',
            tabBarBadge: myRecords.length > 0 ? myRecords.length : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.sageDark,
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '800',
            },
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'time' : 'time-outline'}
                size={22}
                color={focused ? colors.mochaDark : colors.textMuted}
              />
            ),
          }}
        />

        {/* TAB 3: PENGAJUAN IZIN */}
        <Tabs.Screen
          name="leave"
          options={{
            title: 'Perizinan',
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.butterCreamDark,
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '800',
            },
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'document-text' : 'document-text-outline'}
                size={22}
                color={focused ? colors.mochaDark : colors.textMuted}
              />
            ),
          }}
        />

        {/* TAB 4: PETA LABORATORIUM */}
        <Tabs.Screen
          name="maps"
          options={{
            title: 'Peta Lab',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'map' : 'map-outline'}
                size={22}
                color={focused ? colors.mochaDark : colors.textMuted}
              />
            ),
          }}
        />

        {/* Sembunyikan tab presensi langsung dari bottom bar (dibuka via sesi) */}
        <Tabs.Screen
          name="attendance"
          options={{
            href: null,
            title: 'Presensi',
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
});

export default StudentLayout;
