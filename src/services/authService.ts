/**
 * src/services/authService.ts
 *
 * Higher-level auth operations built on top of Firebase Auth + RTDB.
 * Handles: signup (factory & driver), login (email or phone→email),
 * phone uniqueness check, and RTDB profile write.
 *
 * All functions throw a plain Error with a user-readable message on failure.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { getFirebaseAuth, getFirebaseDB } from './firebase';
import { phoneToInternalEmail, sha256Hex } from '../utils/crypto';
import {
  APP_DOMAIN,
  INTERNAL_EMAIL_DOMAIN,
  DB_PATHS,
  ROLES,
} from '../constants/app';
import type { FactorySignupFormData, DriverSignupFormData } from '../validation/auth';

// ── Phone uniqueness ──────────────────────────────────────────

/**
 * Returns true if the phone number already has a user record in the phoneIndex.
 * The index stores sha256(normalizedPhone) → uid mappings.
 */
export async function isPhoneRegistered(phone: string): Promise<boolean> {
  const normalized = phone.replace(/\D/g, '');
  const hash = await sha256Hex(normalized);
  const db = getFirebaseDB();
  const snap = await get(ref(db, `${DB_PATHS.phoneIndex}/${hash}`));
  return snap.exists();
}

// ── Internal email derivation ─────────────────────────────────

function isEmail(input: string): boolean {
  return input.includes('@');
}

export async function resolveToEmail(emailOrPhone: string): Promise<string> {
  console.log('[resolveToEmail] Input:', emailOrPhone);
  const cleaned = emailOrPhone.trim();
  console.log('[resolveToEmail] Cleaned:', cleaned);
  
  if (isEmail(cleaned)) {
    console.log('[resolveToEmail] Detected as email, returning:', cleaned);
    return cleaned;
  }
  
  // Normalize phone number (remove all non-digits) before converting to email
  const normalized = cleaned.replace(/\D/g, '');
  console.log('[resolveToEmail] Normalized phone:', normalized);
  
  const internalEmail = await phoneToInternalEmail(normalized, INTERNAL_EMAIL_DOMAIN);
  console.log('[resolveToEmail] Generated internal email:', internalEmail);
  
  return internalEmail;
}

// ── RTDB profile write ────────────────────────────────────────

async function writeBaseProfile(
  uid: string,
  data: {
    role: 'factory' | 'driver';
    displayName: string;
    phone: string;
    city: string;
    state: string;
    language: string;
    whatsapp?: string;
  },
) {
  const db = getFirebaseDB();
  const now = serverTimestamp();
  const normalized = data.phone.replace(/\D/g, '');
  const phoneHash = await sha256Hex(normalized);

  // Public profile
  await set(ref(db, `${DB_PATHS.users}/${uid}`), {
    uid,
    role: data.role,
    displayName: data.displayName,
    phone: normalized,
    city: data.city,
    state: data.state,
    language: data.language,
    whatsapp: data.whatsapp ?? null,
    averageRating: 0,
    ratingCount: 0,
    tripsCompleted: 0,
    isVerified: false,
    isBlocked: false,
    profileImageUrl: null,
    createdAt: now,
    lastActiveAt: now,
  });

  // Phone index: hash → uid (for uniqueness checks)
  await set(ref(db, `${DB_PATHS.phoneIndex}/${phoneHash}`), uid);
}

// ── Factory signup ────────────────────────────────────────────

export async function signUpFactory(data: FactorySignupFormData): Promise<User> {
  console.log('[signUpFactory] Starting signup with data:', { 
    phone: data.phone, 
    email: data.email,
    displayName: data.displayName 
  });
  
  // Check phone uniqueness first
  console.log('[signUpFactory] Checking if phone is registered...');
  if (await isPhoneRegistered(data.phone)) {
    console.log('[signUpFactory] Phone already registered');
    throw new Error('This mobile number is already registered. Please log in.');
  }
  console.log('[signUpFactory] Phone is available');

  // Use email if provided, otherwise use phone-based internal email
  let authEmail: string;
  if (data.email && data.email.trim().length > 0) {
    authEmail = data.email.trim();
    console.log('[signUpFactory] Using provided email for auth:', authEmail);
  } else {
    authEmail = await phoneToInternalEmail(data.phone, INTERNAL_EMAIL_DOMAIN);
    console.log('[signUpFactory] Generated internal email from phone:', authEmail);
  }

  console.log('[signUpFactory] Creating Firebase user...');
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, authEmail, data.password);
  const user = cred.user;
  console.log('[signUpFactory] Firebase user created with UID:', user.uid);

  // Update Firebase Auth display name
  console.log('[signUpFactory] Updating display name...');
  await updateProfile(user, { displayName: data.displayName });

  // Write RTDB public profile
  console.log('[signUpFactory] Writing base profile to RTDB...');
  await writeBaseProfile(user.uid, {
    role: ROLES.FACTORY,
    displayName: data.displayName,
    phone: data.phone,
    city: data.city,
    state: data.state,
    language: data.language,
    whatsapp: data.whatsapp,
  });

  // Write factory-specific private profile
  console.log('[signUpFactory] Writing factory private profile...');
  const db = getFirebaseDB();
  await set(ref(db, `${DB_PATHS.userPrivate}/${user.uid}`), {
    uid: user.uid,
    orgName: data.orgName ?? null,
    orgDescription: data.orgDescription ?? null,
    businessAddress: data.businessAddress ?? null,
    gstNumber: data.gstNumber ?? null,
    internalEmail: authEmail,
    realEmail: data.email && data.email.trim().length > 0 ? data.email.trim() : null,
    emailVerified: false,
    createdAt: serverTimestamp(),
  });

  console.log('[signUpFactory] Signup completed successfully');
  return user;
}

// ── Driver signup ─────────────────────────────────────────────

export async function signUpDriver(data: DriverSignupFormData): Promise<User> {
  console.log('[signUpDriver] Starting signup with data:', { 
    phone: data.phone, 
    email: data.email,
    displayName: data.displayName 
  });
  
  // Check phone uniqueness first
  console.log('[signUpDriver] Checking if phone is registered...');
  if (await isPhoneRegistered(data.phone)) {
    console.log('[signUpDriver] Phone already registered');
    throw new Error('This mobile number is already registered. Please log in.');
  }
  console.log('[signUpDriver] Phone is available');

  // Use email if provided, otherwise use phone-based internal email
  let authEmail: string;
  if (data.email && data.email.trim().length > 0) {
    authEmail = data.email.trim();
    console.log('[signUpDriver] Using provided email for auth:', authEmail);
  } else {
    authEmail = await phoneToInternalEmail(data.phone, INTERNAL_EMAIL_DOMAIN);
    console.log('[signUpDriver] Generated internal email from phone:', authEmail);
  }

  console.log('[signUpDriver] Creating Firebase user...');
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, authEmail, data.password);
  const user = cred.user;
  console.log('[signUpDriver] Firebase user created with UID:', user.uid);

  console.log('[signUpDriver] Updating display name...');
  await updateProfile(user, { displayName: data.displayName });

  console.log('[signUpDriver] Writing base profile to RTDB...');
  await writeBaseProfile(user.uid, {
    role: ROLES.DRIVER,
    displayName: data.displayName,
    phone: data.phone,
    city: data.city,
    state: data.state,
    language: data.language,
    whatsapp: data.whatsapp,
  });

  // Write driver truck record
  console.log('[signUpDriver] Creating truck record...');
  const db = getFirebaseDB();
  const truckId = `${user.uid}_truck_01`;
  await set(ref(db, `${DB_PATHS.trucks}/${user.uid}/${truckId}`), {
    truckId,
    ownerUid: user.uid,
    registrationNumber: data.truck.registrationNumber,
    vehicleType: data.truck.vehicleType,
    bodyType: data.truck.bodyType,
    maxCapacityTonnes: data.truck.maxCapacityTonnes,
    isActive: true,
    isVerified: false,
    createdAt: serverTimestamp(),
  });

  // Write driver private profile
  console.log('[signUpDriver] Writing driver private profile...');
  await set(ref(db, `${DB_PATHS.userPrivate}/${user.uid}`), {
    uid: user.uid,
    primaryTruckId: truckId,
    internalEmail: authEmail,
    realEmail: data.email && data.email.trim().length > 0 ? data.email.trim() : null,
    emailVerified: false,
    createdAt: serverTimestamp(),
  });

  console.log('[signUpDriver] Signup completed successfully');
  return user;
}

// ── Login ─────────────────────────────────────────────────────

export async function loginUser(emailOrPhone: string, password: string): Promise<User> {
  console.log('[loginUser] Starting login with:', emailOrPhone);
  
  const email = await resolveToEmail(emailOrPhone);
  console.log('[loginUser] Resolved to email:', email);
  
  const auth = getFirebaseAuth();
  try {
    console.log('[loginUser] Attempting signInWithEmailAndPassword...');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log('[loginUser] Login successful! User UID:', cred.user.uid);
    return cred.user;
  } catch (err: any) {
    console.error('[loginUser] Login failed with error:', err.code, err.message);
    // Map Firebase error codes to friendly messages
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        throw new Error('Incorrect mobile number or password. Please try again.');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again in a few minutes.');
      case 'auth/user-disabled':
        throw new Error('Your account has been disabled. Please contact support.');
      default:
        throw new Error('Login failed. Please check your connection and try again.');
    }
  }
}

// ── Password reset ────────────────────────────────────────────

export async function sendReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      // Don't reveal whether the email exists
      return;
    }
    throw new Error('Failed to send reset email. Please try again.');
  }
}

// ── Fetch role from RTDB ─────────────────────────────────────

export async function fetchUserRole(uid: string): Promise<'factory' | 'driver' | null> {
  const db = getFirebaseDB();
  const snap = await get(ref(db, `${DB_PATHS.users}/${uid}/role`));
  if (!snap.exists()) return null;
  const role = snap.val();
  if (role === 'factory' || role === 'driver') return role;
  return null;
}
