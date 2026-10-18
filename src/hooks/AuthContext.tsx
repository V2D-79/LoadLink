/**
 * src/hooks/AuthContext.tsx
 *
 * Global auth context that wraps the app.
 * Provides auth state and methods to all screens.
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import { useAuth, type AuthState } from './useAuth';
import type { UserCredential } from 'firebase/auth';

interface AuthContextValue extends AuthState {
  signIn: (emailOrPhone: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
