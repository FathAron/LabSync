import { View, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';

const NotFoundScreen = () => (
  <>
    <Stack.Screen options={{ title: 'Oops! Not Found', headerShown: true }} />
    <View style={styles.container}>
      <Link href="/student" style={styles.button}>
        Kembali ke halaman praktikan
      </Link>
    </View>
  </>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    fontSize: 20,
    textDecorationLine: 'underline',
    color: '#fff',
  },
});

export default NotFoundScreen;
