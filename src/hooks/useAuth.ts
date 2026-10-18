/**
 * src/hooks/useAuth.ts
 *
 * Auth state hook. Listens to Firebase Auth state changes and
 * fetches the user's public profile from RTDB.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  ref,
  get,
  onValue,
} from 'firebase/database';
import { getFirebaseAuth, getFirebaseDB } from '../services/firebase';
import { DB_PATHS, INTERNAL_EMAIL_DOMAIN } from '../constants/app';
import type { UserPublic, UserRole } from '../types';

export interface AuthState {
  /** Firebase Auth user (null when signed out, undefined while loading) */
  firebaseUser: FirebaseUser | null | undefined;
  /** Public user profile from RTDB */
  userProfile: UserPublic | null;
  /** Loading state */
  loading: boolean;
  /** Current role for route guards */
  role: UserRole | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: undefined,
    userProfile: null,
    loading: true,
    role: null,
  });

  useEffect(() => {
    console.log('[useAuth] Setting up auth state listener...');
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[useAuth] Auth state changed:', user ? `User: ${user.uid}` : 'No user');
      
      if (user) {
        // Fetch user profile from RTDB
        console.log('[useAuth] Fetching user profile from RTDB...');
        const db = getFirebaseDB();
        const profileRef = ref(db, `${DB_PATHS.users}/${user.uid}`);
        
        try {
          const snapshot = await get(profileRef);
          console.log('[useAuth] Profile snapshot exists:', snapshot.exists());
          
          if (snapshot.exists()) {
            const profile = snapshot.val() as UserPublic;
            console.log('[useAuth] Profile loaded:', { uid: profile.uid, role: profile.role, displayName: profile.displayName });
            
            setState({
              firebaseUser: user,
              userProfile: profile,
              loading: false,
              role: profile?.role ?? null,
            });
          } else {
            console.warn('[useAuth] Profile does not exist in RTDB for user:', user.uid);
            setState({
              firebaseUser: user,
              userProfile: null,
              loading: false,
              role: null,
            });
          }
        } catch (error) {
          console.error('[useAuth] Error fetching profile:', error);
          setState({
            firebaseUser: user,
            userProfile: null,
            loading: false,
            role: null,
          });
        }
      } else {
        console.log('[useAuth] No user logged in');
        setState({
          firebaseUser: null,
          userProfile: null,
          loading: false,
          role: null,
        });
      }
    });

    return () => {
      console.log('[useAuth] Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (emailOrPhone: string, password: string) => {
    const auth = getFirebaseAuth();
    // If input looks like a phone number, derive the internal email
    const cleaned = emailOrPhone.replace(/[\s\-+]/g, '');
    let email = emailOrPhone;
    if (/^(\+91)?[6-9]\d{9}$/.test(cleaned)) {
      const phone = cleaned.replace(/^\+91/, '');
      email = `${phone}@${INTERNAL_EMAIL_DOMAIN}`;
    }
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    return createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    return firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    return sendPasswordResetEmail(auth, email);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('Not authenticated');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    return updatePassword(user, newPassword);
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    changePassword,
  };
}
