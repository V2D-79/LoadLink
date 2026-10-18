/**
 * src/utils/crypto.ts
 *
 * Cryptographic helpers used across the app.
 *
 * - sha256Hex: deterministic phone-number → internal-email hashing
 * - generateHandoverCode: random 6-digit numeric code for delivery confirmation
 * - hashHandoverCode: sha256 of the code stored in RTDB for verification
 *
 * Uses expo-crypto for SHA-256 hashing (compatible with Expo Go).
 */

import 'react-native-get-random-values'; // ensure CSPRNG polyfill
import * as Crypto from 'expo-crypto';

/**
 * Compute SHA-256 of a UTF-8 string and return the lower-hex digest.
 * Used for: phone-to-internal-email mapping, handover-code storage.
 */
export async function sha256Hex(input: string): Promise<string> {
  try {
    // Use expo-crypto which works reliably in Expo Go
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash.toLowerCase();
  } catch (error) {
    console.error('[sha256Hex] Error:', error);
    throw new Error('Failed to compute SHA-256 hash');
  }
}

/**
 * Generate a cryptographically random 6-digit delivery handover code.
 * The factory shows this to the driver after receipt confirmation.
 */
export function generateHandoverCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const val = array[0] ?? 0;
  // Map to 100000-999999 range (6 digits, no leading zero)
  return String(100000 + (val % 900000));
}

/**
 * Hash a handover code for safe storage in Firebase RTDB.
 * Returns the sha256 hex of `code:jobId` to prevent cross-job replay.
 */
export async function hashHandoverCode(code: string, jobId: string): Promise<string> {
  return sha256Hex(`${code}:${jobId}`);
}

/**
 * Derive the internal email address from a phone number.
 * Format: sha256(normalized_phone)@users.loadlink.app
 * This is stable, deterministic, and does not expose the actual phone number.
 */
export async function phoneToInternalEmail(
  phone: string,
  domain: string,
): Promise<string> {
  const normalized = phone.replace(/\D/g, '');
  const hash = await sha256Hex(normalized);
  // Use first 32 chars of hash to keep email length reasonable
  return `${hash.slice(0, 32)}@${domain}`;
}
