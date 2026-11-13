import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FeedbackToast } from '../src/components/FeedbackToast';
import { Header } from '../src/components/Header';
import { AppProvider, useApp } from '../src/context/AppContext';
import { AssistantView } from '../src/screens/AssistantView';
import { colors, spacing } from '../src/styles/theme';

const AppShell = () => {
  const router = useRouter();
  const segments = useSegments();
  const { currentUser, currentRole, authLoading } = useApp();

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inStudentGroup = segments[0] === 'student';

    if (!currentUser) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (currentRole === 'student' && !inStudentGroup) {
      router.replace('/student');
    } else if (currentRole === 'assistant' && inAuthGroup) {
      router.replace('/');
    }
  }, [authLoading, currentRole, currentUser, router, segments]);

  if (authLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat sesi LabSync...</Text>
        <FeedbackToast />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {currentUser ? <Header /> : null}

      <View style={styles.content}>
        <View style={[styles.layer, currentUser && currentRole === 'assistant' ? styles.hidden : null]}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="student" />
          </Stack>
        </View>

        {currentUser && currentRole === 'assistant' ? (
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
  loadingRoot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

export default RootLayout;
