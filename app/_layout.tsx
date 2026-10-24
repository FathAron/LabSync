// TASK-04 - ROOT LAYOUT SEMENTARA.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { DemoProvider } from '../src/dev/DemoProvider';

const RootLayout = () => (
  <DemoProvider>
    <StatusBar style="light" />
    <View style={styles.root}>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="student" />
        </Stack>
      </View>
    </View>
  </DemoProvider>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  content: { flex: 1 },
});

export default RootLayout;
