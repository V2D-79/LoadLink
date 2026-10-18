/**
 * src/services/tripService.ts
 *
 * Trip lifecycle operations.
 *
 * Status transitions (spec §6):
 *   accepted → heading_to_pickup (driver action)
 *   heading_to_pickup → loaded  (factory enters pickup handover code)
 *   loaded → in_transit          (driver action — confirms loaded)
 *   in_transit → delivered       (factory enters delivery handover code)
 *   delivered → completed        (auto or manual confirm)
 *
 * Handover codes:
 *   - Pickup code: factory generates on job detail → writes to jobPrivate
 *   - Driver enters code → system verifies → marks loaded
 *   - Delivery code: driver generates on arrival → writes to jobPrivate
 *   - Factory enters code → marks delivered
 *
 * Location writes:
 *   liveLocation/{driverUid} → { lat, lng, accuracy, heading, updatedAt }
 */

import {
  ref,
  update,
  set,
  get,
  serverTimestamp,
  push,
} from 'firebase/database';
import { getFirebaseDB } from './firebase';
import { DB_PATHS } from '../constants/app';
import { generateHandoverCode, sha256Hex } from '../utils/crypto';

// ── Types ─────────────────────────────────────────────────────

export interface TripStatusUpdate {
  jobId: string;
  actorUid: string;
  newStatus: string;
}

export interface LiveLocationUpdate {
  driverUid: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
}

// ── Status transitions ────────────────────────────────────────

/** Driver: confirm heading to pickup */
export async function markHeadingToPickup(jobId: string, driverUid: string): Promise<void> {
  const db = getFirebaseDB();
  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  if (!jobSnap.exists()) throw new Error('Job not found.');
  const job = jobSnap.val();
  if (job.assignedDriverUid !== driverUid) throw new Error('Not authorized.');
  if (job.status !== 'accepted') throw new Error(`Cannot transition from ${job.status}.`);

  const now = serverTimestamp();
  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), { status: 'heading_to_pickup', updatedAt: now });
  await logTripEvent(jobId, driverUid, 'heading_to_pickup', 'Driver is heading to pickup location');
}

/** Driver: confirm truck is loaded (requires valid pickup handover code) */
export async function markLoaded(
  jobId: string,
  driverUid: string,
  enteredCode: string,
): Promise<void> {
  const db = getFirebaseDB();
  const privateSnap = await get(ref(db, `${DB_PATHS.jobPrivate}/${jobId}`));
  if (!privateSnap.exists()) throw new Error('Job data not found.');
  const priv = privateSnap.val();

  // Verify pickup handover code (compare hashes)
  const enteredHash = await sha256Hex(enteredCode.trim().toUpperCase());
  if (priv.pickupCodeHash !== enteredHash) {
    throw new Error('Incorrect pickup code. Please ask the factory contact to confirm.');
  }

  const now = serverTimestamp();
  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), { status: 'loaded', updatedAt: now });
  await update(ref(db, `${DB_PATHS.jobPrivate}/${jobId}`), { pickupConfirmedAt: now });
  await logTripEvent(jobId, driverUid, 'loaded', 'Goods loaded — pickup confirmed');
}

/** Driver: start transit after loading */
export async function markInTransit(jobId: string, driverUid: string): Promise<void> {
  const db = getFirebaseDB();
  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  if (!jobSnap.exists()) throw new Error('Job not found.');
  const job = jobSnap.val();
  if (job.assignedDriverUid !== driverUid) throw new Error('Not authorized.');
  if (job.status !== 'loaded') throw new Error(`Cannot transition from ${job.status}.`);

  const now = serverTimestamp();
  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), { status: 'in_transit', updatedAt: now });
  await logTripEvent(jobId, driverUid, 'in_transit', 'In transit to delivery');
}

/** Factory: confirm delivery (requires valid delivery handover code) */
export async function markDelivered(
  jobId: string,
  factoryUid: string,
  enteredCode: string,
): Promise<void> {
  const db = getFirebaseDB();
  const privateSnap = await get(ref(db, `${DB_PATHS.jobPrivate}/${jobId}`));
  if (!privateSnap.exists()) throw new Error('Job data not found.');
  const priv = privateSnap.val();

  const enteredHash = await sha256Hex(enteredCode.trim().toUpperCase());
  if (priv.deliveryCodeHash !== enteredHash) {
    throw new Error('Incorrect delivery code. Please get the 6-digit code from the driver.');
  }

  const now = serverTimestamp();
  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), { status: 'delivered', updatedAt: now });
  await update(ref(db, `${DB_PATHS.jobPrivate}/${jobId}`), { deliveryConfirmedAt: now });
  await logTripEvent(jobId, factoryUid, 'delivered', 'Delivery confirmed — goods received');
}

/** Auto-complete after delivery confirmed */
export async function markCompleted(jobId: string): Promise<void> {
  const db = getFirebaseDB();
  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), {
    status: 'completed',
    updatedAt: serverTimestamp(),
  });
}

// ── Handover code generation ──────────────────────────────────

/**
 * Factory generates a 6-digit pickup code for the driver.
 * Stores the HASH in jobPrivate; returns the plain code to display.
 */
export async function generatePickupCode(jobId: string, factoryUid: string): Promise<string> {
  const db = getFirebaseDB();
  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  if (!jobSnap.exists()) throw new Error('Job not found.');
  if (jobSnap.val().factoryUid !== factoryUid) throw new Error('Not authorized.');

  const code = generateHandoverCode();
  const hash = await sha256Hex(code);
  await update(ref(db, `${DB_PATHS.jobPrivate}/${jobId}`), {
    pickupCodeHash: hash,
    pickupCodeGeneratedAt: serverTimestamp(),
  });
  return code;
}

/**
 * Driver generates a 6-digit delivery code on arrival.
 * Stores the HASH in jobPrivate; returns the plain code to show to factory.
 */
export async function generateDeliveryCode(jobId: string, driverUid: string): Promise<string> {
  const db = getFirebaseDB();
  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  if (!jobSnap.exists()) throw new Error('Job not found.');
  if (jobSnap.val().assignedDriverUid !== driverUid) throw new Error('Not authorized.');

  const code = generateHandoverCode();
  const hash = await sha256Hex(code);
  await update(ref(db, `${DB_PATHS.jobPrivate}/${jobId}`), {
    deliveryCodeHash: hash,
    deliveryCodeGeneratedAt: serverTimestamp(),
  });
  return code;
}

// ── Live location ─────────────────────────────────────────────

/** Write driver's current GPS location to RTDB (throttled by caller). */
export async function writeLiveLocation(update_: LiveLocationUpdate): Promise<void> {
  const db = getFirebaseDB();
  await set(ref(db, `${DB_PATHS.liveLocation}/${update_.driverUid}`), {
    lat: update_.lat,
    lng: update_.lng,
    accuracy: update_.accuracy ?? null,
    heading: update_.heading ?? null,
    updatedAt: Date.now(),
  });
}

// ── Trip event log ────────────────────────────────────────────

async function logTripEvent(
  jobId: string,
  actorUid: string,
  status: string,
  note: string,
): Promise<void> {
  const db = getFirebaseDB();
  const eventRef = push(ref(db, `${DB_PATHS.tripEvents}/${jobId}`));
  await set(eventRef, {
    status,
    actorUid,
    note,
    ts: serverTimestamp(),
  });
}

// ── Rating ────────────────────────────────────────────────────

export interface ReviewPayload {
  jobId: string;
  reviewerUid: string;
  revieweeUid: string;
  role: 'factory' | 'driver'; // role of REVIEWER
  stars: number; // 1-5
  comment?: string;
}

export async function submitReview(payload: ReviewPayload): Promise<void> {
  if (payload.stars < 1 || payload.stars > 5) throw new Error('Stars must be between 1 and 5.');
  const db = getFirebaseDB();
  const reviewRef = push(ref(db, `${DB_PATHS.reviews}/${payload.revieweeUid}`));
  await set(reviewRef, {
    jobId: payload.jobId,
    reviewerUid: payload.reviewerUid,
    role: payload.role,
    stars: payload.stars,
    comment: payload.comment ?? null,
    createdAt: serverTimestamp(),
  });

  // Fetch current rating and update average
  const userSnap = await get(ref(db, `${DB_PATHS.users}/${payload.revieweeUid}`));
  if (userSnap.exists()) {
    const user = userSnap.val();
    const currentRating = user.averageRating ?? 0;
    const ratingCount = user.ratingCount ?? 0;
    const newCount = ratingCount + 1;
    const newAvg = parseFloat(
      ((currentRating * ratingCount + payload.stars) / newCount).toFixed(2),
    );
    await update(ref(db, `${DB_PATHS.users}/${payload.revieweeUid}`), {
      averageRating: newAvg,
      ratingCount: newCount,
    });
  }
}
