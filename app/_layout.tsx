// TASK-01 - Root Layout dengan AppProvider (Central Context Store).

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { AppProvider } from '../src/context/AppContext';

const RootLayout = () => (
  <AppProvider>
    <StatusBar style="dark" />
    <View style={styles.root}>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="student" />
        </Stack>
      </View>
    </View>
  </AppProvider>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FB' },
  content: { flex: 1 },
});

export default RootLayout;
