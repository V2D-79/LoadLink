/**
 * src/services/asyncStoragePersistence.ts
 *
 * Custom Firebase Auth persistence adapter for React Native / Expo Go.
 *
 * Firebase JS SDK v11 expects a specific class structure for persistence.
 * This implements the persistence class following Firebase's internal pattern.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Custom persistence class for React Native AsyncStorage.
 * Mimics Firebase's internal PersistenceInternal interface.
 */
class AsyncStoragePersistenceClass {
  static type: 'LOCAL' = 'LOCAL';
  readonly type: 'LOCAL' = 'LOCAL';

  async _get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      if (__DEV__) {
        console.warn('[AsyncStoragePersistence] _get error:', error);
      }
      return null;
    }
  }

  async _set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      if (__DEV__) {
        console.error('[AsyncStoragePersistence] _set error:', error);
      }
      throw error;
    }
  }

  async _remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (__DEV__) {
        console.warn('[AsyncStoragePersistence] _remove error:', error);
      }
    }
  }

  _addListener(_key: string, _listener: (value: string | null) => void): void {
    // AsyncStorage doesn't support listeners - no-op is correct
  }

  _removeListener(_key: string, _listener: (value: string | null) => void): void {
    // AsyncStorage doesn't support listeners - no-op is correct
  }

  async _isAvailable(): Promise<boolean> {
    try {
      const TEST_KEY = '__firebase_persistence_test__';
      await AsyncStorage.setItem(TEST_KEY, 'test');
      const result = await AsyncStorage.getItem(TEST_KEY);
      await AsyncStorage.removeItem(TEST_KEY);
      return result === 'test';
    } catch {
      return false;
    }
  }
}

// Create and export the class itself (not an instance)
// Firebase will instantiate it internally
export const ReactNativeAsyncStoragePersistence = AsyncStoragePersistenceClass;

// Also export an instance for direct usage
export const asyncStoragePersistence = new AsyncStoragePersistenceClass();

export default asyncStoragePersistence;
