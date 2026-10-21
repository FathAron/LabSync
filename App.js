import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  StatusBar,
  Platform,
} from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { Header } from './src/components/Header';
import { AssistantView } from './src/screens/AssistantView';
import { StudentView } from './src/screens/StudentView';
import { theme } from './src/styles/theme';

const MainScreen = () => {
  const { currentRole, feedbackToast } = useApp();

  return (
    <View style={styles.root}>
      {/* App Header with role & identity switcher */}
      <Header />

      {/* Main Content Area based on active Role */}
      <View style={styles.content}>
        {currentRole === 'assistant' ? <AssistantView /> : <StudentView />}
      </View>

      {/* Feedback Toast Notification */}
      {feedbackToast && (
        <View
          style={[
            styles.toast,
            feedbackToast.type === 'success' && styles.toastSuccess,
            feedbackToast.type === 'danger' && styles.toastDanger,
            feedbackToast.type === 'warning' && styles.toastWarning,
            feedbackToast.type === 'info' && styles.toastInfo,
          ]}
        >
          <Text style={styles.toastIcon}>
            {feedbackToast.type === 'success' && '✅'}
            {feedbackToast.type === 'danger' && '❌'}
            {feedbackToast.type === 'warning' && '⚠️'}
            {feedbackToast.type === 'info' && '💡'}
          </Text>
          <Text style={styles.toastMessage}>{feedbackToast.message}</Text>
        </View>
      )}
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.surface}
      />
      <AppProvider>
        <MainScreen />
      </AppProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    // On web or large screens, center like a modern mobile viewport or expand gracefully
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: theme.colors.border,
  },
  content: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.secondary,
    ...theme.shadows.modal,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: '#065F46',
  },
  toastDanger: {
    backgroundColor: '#991B1B',
  },
  toastWarning: {
    backgroundColor: '#92400E',
  },
  toastInfo: {
    backgroundColor: '#1E40AF',
  },
  toastIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  toastMessage: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
