/**
 * src/services/firebase.ts
 *
 * Firebase initialization using the modular v9+ JS SDK (v11).
 *
 * For React Native, we need to use a workaround since Firebase v11
 * removed getReactNativePersistence but still expects browser-style persistence.
 *
 * NEVER import from 'react-native-firebase' — not compatible with Expo Go.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth, 
  browserLocalPersistence,
  type Auth 
} from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Module-level singletons — prevent duplicate initialization on hot-reload
let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Database | undefined;

/**
 * Polyfill localStorage for React Native using AsyncStorage.
 * Firebase's browserLocalPersistence expects localStorage API.
 */
if (typeof window !== 'undefined' && !window.localStorage) {
  // Create a localStorage polyfill
  const localStoragePolyfill = {
    _data: new Map<string, string>(),
    
    async _init() {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const stores = await AsyncStorage.multiGet(keys);
        stores.forEach(([key, value]) => {
          if (value !== null) {
            this._data.set(key, value);
          }
        });
      } catch (error) {
        console.warn('[localStorage polyfill] Init error:', error);
      }
    },

    getItem(key: string): string | null {
      return this._data.get(key) ?? null;
    },

    setItem(key: string, value: string): void {
      this._data.set(key, value);
      AsyncStorage.setItem(key, value).catch(err => {
        if (__DEV__) console.warn('[localStorage] setItem error:', err);
      });
    },

    removeItem(key: string): void {
      this._data.delete(key);
      AsyncStorage.removeItem(key).catch(err => {
        if (__DEV__) console.warn('[localStorage] removeItem error:', err);
      });
    },

    clear(): void {
      this._data.clear();
      AsyncStorage.clear().catch(err => {
        if (__DEV__) console.warn('[localStorage] clear error:', err);
      });
    },

    key(index: number): string | null {
      return Array.from(this._data.keys())[index] ?? null;
    },

    get length(): number {
      return this._data.size;
    },
  };

  // Initialize the polyfill
  localStoragePolyfill._init();

  // Assign to global window
  Object.defineProperty(window, 'localStorage', {
    value: localStoragePolyfill,
    writable: false,
    configurable: true,
  });

  if (__DEV__) {
    console.log('[Firebase] localStorage polyfill installed for React Native');
  }
}

// Suppress Firebase's AsyncStorage warning since we're using localStorage polyfill
// Firebase checks for React Native and shows a warning, but we've already implemented persistence
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    message.includes('You are initializing Firebase Auth for React Native without providing') &&
    message.includes('AsyncStorage')
  ) {
    // Suppress this specific warning - we've implemented persistence via localStorage polyfill
    return;
  }
  originalConsoleWarn(...args);
};

export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    const app = getFirebaseApp();
    try {
      // Use browserLocalPersistence which now works with our localStorage polyfill
      _auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
      });
      
      if (__DEV__) {
        console.log('[Firebase] Auth initialized with browserLocalPersistence (AsyncStorage polyfill)');
      }
    } catch (error: any) {
      // Auth already initialized (hot-reload or multiple calls)
      if (error?.code === 'auth/already-initialized') {
        _auth = getAuth(app);
        if (__DEV__) {
          console.log('[Firebase] Using existing Auth instance');
        }
      } else {
        console.error('[Firebase] Error initializing auth:', error);
        throw error;
      }
    }
  }
  return _auth;
}

export function getFirebaseDB(): Database {
  if (!_db) {
    _db = getDatabase(getFirebaseApp());
  }
  return _db;
}
