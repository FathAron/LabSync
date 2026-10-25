// TASK-02 - Root App Shell Layout (Aron Sorimuda Johanes Pasaribu)
// Menyediakan AppProvider, Header (Role Switcher & Persona Selector),
// peralihan tampilan utama (AssistantView <-> Student Stack), serta FeedbackToast.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import FeedbackToast from '../src/components/FeedbackToast';
import Header from '../src/components/Header';
import { AppProvider, useApp } from '../src/context/AppContext';
import AssistantView from '../src/screens/AssistantView';
import { colors } from '../src/styles/theme';

const AppShell = () => {
  const { currentRole } = useApp();

  return (
    <View style={styles.root}>
      <Header />

      <View style={styles.content}>
        <View style={[styles.layer, currentRole !== 'student' && styles.hidden]}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="student" />
          </Stack>
        </View>

        {currentRole === 'assistant' ? (
          <View style={styles.layer}>
            <AssistantView />
          </View>
        ) : null}
      </View>

      <FeedbackToast />
    </View>
  );
};

const RootLayout = () => (
  <AppProvider>
    <StatusBar style="dark" />
    <AppShell />
  </AppProvider>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  layer: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});

export default RootLayout;
