import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    !firebaseConfig.apiKey.includes('your_api_key')
);

const safeConfig = isFirebaseConfigured
  ? firebaseConfig
  : {
      apiKey: firebaseConfig.apiKey || 'unconfigured-api-key',
      authDomain: firebaseConfig.authDomain || 'unconfigured.firebaseapp.com',
      projectId: firebaseConfig.projectId || 'unconfigured-project',
      storageBucket: firebaseConfig.storageBucket || 'unconfigured.firebasestorage.app',
      messagingSenderId: firebaseConfig.messagingSenderId || '000000000000',
      appId: firebaseConfig.appId || '1:000000000000:web:0000000000000000',
    };

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(safeConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

