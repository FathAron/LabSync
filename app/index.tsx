import { Redirect } from 'expo-router';
import { useApp } from '../src/context/AppContext';

const Index = () => {
  const { currentUser, currentRole, authLoading } = useApp();

  if (authLoading) {
    return null;
  }

  if (!currentUser) {
    return <Redirect href="/(auth)/login" />;
  }

  if (currentRole === 'student') {
    return <Redirect href="/student" />;
  }

  return null;
};

export default Index;
