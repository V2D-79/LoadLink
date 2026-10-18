/**
 * app/index.tsx
 *
 * Entry point: reads auth state and routes to the correct group.
 * - Not logged in → (auth)/landing
 * - Logged in, factory → (factory)/jobs
 * - Logged in, driver → (driver)/find
 */

import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../src/hooks/AuthContext';
import { COLORS } from '../src/constants/theme';

export default function Index() {
  const { firebaseUser, role, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    console.log('[Index] Auth state:', { 
      loading, 
      firebaseUser: firebaseUser ? firebaseUser.uid : 'null',
      role 
    });
    
    if (loading) {
      console.log('[Index] Still loading, waiting...');
      return; // Wait for auth to resolve
    }

    // Ensure we have a definitive state before navigating
    if (firebaseUser === null || firebaseUser === undefined) {
      console.log('[Index] No user, navigating to landing');
      router.replace('/(auth)/landing');
    } else if (role === 'factory') {
      console.log('[Index] Factory user, navigating to jobs');
      router.replace('/(factory)/jobs');
    } else if (role === 'driver') {
      console.log('[Index] Driver user, navigating to find');
      router.replace('/(driver)/find');
    } else if (firebaseUser && !role) {
      // User is authenticated but role hasn't loaded yet - wait a bit more
      console.log('[Index] User authenticated but role not yet loaded, waiting...');
    } else {
      console.log('[Index] User logged in but no role in RTDB, navigating to landing');
      router.replace('/(auth)/landing');
    }
  }, [firebaseUser, role, loading, router]);

  // Show spinner while auth state resolves
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.ochre} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
