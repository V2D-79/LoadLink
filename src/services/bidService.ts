/**
 * src/services/bidService.ts
 *
 * Bidding operations on top of Firebase RTDB.
 *
 * Spec rules enforced here:
 *   D3 — bid amount must be strictly < factory budgetInr (if set)
 *   D5 — factory offer expires after OFFER_TTL_HOURS
 *   Bid visibility is 'partial': count + lowest + own bids
 *
 * Path layout (see KNOWLEDGE.md §4):
 *   bids/{jobId}/{bidId}
 *   bidsByDriver/{driverId}/{jobId}  → quick lookup
 *   jobs/{jobId}/bidCount            → denormalized counter
 *   assignments/{jobId}/{slotId}     → offer record
 */

import {
  ref,
  push,
  set,
  get,
  update,
  serverTimestamp,
  increment,
  runTransaction,
} from 'firebase/database';
import { getFirebaseDB } from './firebase';
import {
  DB_PATHS,
  BID_RULE,
  OFFER_TTL_HOURS,
  BID_RATE_LIMIT_SECONDS,
} from '../constants/app';

// ── Types ─────────────────────────────────────────────────────

export interface BidPayload {
  jobId: string;
  driverUid: string;
  truckId: string;
  amountInr: number;
  notes?: string;
}

export interface Bid {
  bidId: string;
  jobId: string;
  driverUid: string;
  truckId: string;
  amountInr: number;
  notes: string | null;
  status: 'active' | 'superseded' | 'withdrawn' | 'declined' | 'selected';
  createdAt: number;
  updatedAt: number;
}

export interface Assignment {
  assignmentId: string;
  jobId: string;
  driverUid: string;
  truckId: string;
  bidId: string;
  status: 'offered' | 'accepted' | 'rejected' | 'expired';
  offeredAt: number;
  expiresAt: number;
  acceptedAt?: number;
  rejectedAt?: number;
}

// ── Place bid ─────────────────────────────────────────────────

export async function placeBid(payload: BidPayload): Promise<string> {
  const db = getFirebaseDB();

  // Fetch job to validate budget rule
  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${payload.jobId}`));
  if (!jobSnap.exists()) throw new Error('Job not found or no longer available.');

  const job = jobSnap.val();
  if (job.status !== 'open') {
    throw new Error('This job is no longer open for bids.');
  }

  // D3: bid must be < budget (if set)
  if (job.budgetInr != null) {
    const rule = BID_RULE === 'lt' ? payload.amountInr >= job.budgetInr : payload.amountInr > job.budgetInr;
    if (rule) {
      throw new Error(
        `Your bid (₹${payload.amountInr.toLocaleString('en-IN')}) must be less than the factory's budget (₹${job.budgetInr.toLocaleString('en-IN')}).`,
      );
    }
  }

  // Rate-limit: check if driver bid recently
  const lastBidSnap = await get(
    ref(db, `${DB_PATHS.bidsByDriver}/${payload.driverUid}/${payload.jobId}`),
  );
  if (lastBidSnap.exists()) {
    const lastBid = lastBidSnap.val();
    if (lastBid.updatedAt) {
      const elapsedSec = (Date.now() - lastBid.updatedAt) / 1000;
      if (elapsedSec < BID_RATE_LIMIT_SECONDS) {
        throw new Error(
          `Please wait ${Math.ceil(BID_RATE_LIMIT_SECONDS - elapsedSec)} seconds before bidding again.`,
        );
      }
      // Mark previous bid as superseded
      await update(ref(db, `${DB_PATHS.bids}/${payload.jobId}/${lastBid.bidId}`), {
        status: 'superseded',
        updatedAt: serverTimestamp(),
      });
    }
  }

  // Write new bid
  const bidRef = push(ref(db, `${DB_PATHS.bids}/${payload.jobId}`));
  const bidId = bidRef.key!;
  const now = serverTimestamp();

  await set(bidRef, {
    bidId,
    jobId: payload.jobId,
    driverUid: payload.driverUid,
    truckId: payload.truckId,
    amountInr: payload.amountInr,
    notes: payload.notes ?? null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  // Quick-lookup index
  await set(ref(db, `${DB_PATHS.bidsByDriver}/${payload.driverUid}/${payload.jobId}`), {
    bidId,
    amountInr: payload.amountInr,
    updatedAt: Date.now(),
  });

  // Increment job bid counter
  await update(ref(db, `${DB_PATHS.jobs}/${payload.jobId}`), {
    bidCount: increment(1),
    updatedAt: now,
  });

  return bidId;
}

// ── Revise bid ────────────────────────────────────────────────

export async function reviseBid(
  jobId: string,
  bidId: string,
  driverUid: string,
  newAmountInr: number,
  notes?: string,
): Promise<void> {
  const db = getFirebaseDB();

  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  if (!jobSnap.exists()) throw new Error('Job not found.');
  const job = jobSnap.val();

  if (job.budgetInr != null) {
    const rule = BID_RULE === 'lt' ? newAmountInr >= job.budgetInr : newAmountInr > job.budgetInr;
    if (rule) {
      throw new Error(`Revised bid must be less than the factory's budget (₹${job.budgetInr.toLocaleString('en-IN')}).`);
    }
  }

  await update(ref(db, `${DB_PATHS.bids}/${jobId}/${bidId}`), {
    amountInr: newAmountInr,
    notes: notes ?? null,
    status: 'active',
    updatedAt: serverTimestamp(),
  });

  await set(ref(db, `${DB_PATHS.bidsByDriver}/${driverUid}/${jobId}`), {
    bidId,
    amountInr: newAmountInr,
    updatedAt: Date.now(),
  });
}

// ── Withdraw bid ──────────────────────────────────────────────

export async function withdrawBid(
  jobId: string,
  bidId: string,
  driverUid: string,
): Promise<void> {
  const db = getFirebaseDB();
  await update(ref(db, `${DB_PATHS.bids}/${jobId}/${bidId}`), {
    status: 'withdrawn',
    updatedAt: serverTimestamp(),
  });
  // Remove quick-lookup
  await set(ref(db, `${DB_PATHS.bidsByDriver}/${driverUid}/${jobId}`), null);
}

// ── Factory: offer assignment to a driver ─────────────────────

export async function offerAssignment(
  jobId: string,
  bidId: string,
  driverUid: string,
  truckId: string,
  factoryUid: string,
): Promise<string> {
  const db = getFirebaseDB();

  // Verify factory owns job
  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  if (!jobSnap.exists()) throw new Error('Job not found.');
  const job = jobSnap.val();
  if (job.factoryUid !== factoryUid) throw new Error('Not authorized.');
  if (job.status !== 'open') throw new Error('Job is no longer open.');

  const assignRef = push(ref(db, `${DB_PATHS.assignments}/${jobId}`));
  const assignId = assignRef.key!;
  const now = Date.now();
  const expiresAt = now + OFFER_TTL_HOURS * 60 * 60 * 1000;

  await set(assignRef, {
    assignmentId: assignId,
    jobId,
    driverUid,
    truckId,
    bidId,
    status: 'offered',
    offeredAt: serverTimestamp(),
    expiresAt,
  });

  // Mark job status as offered
  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), {
    status: 'offered',
    assignedDriverUid: driverUid,
    assignedTruckId: truckId,
    currentAssignmentId: assignId,
    updatedAt: serverTimestamp(),
  });

  // Mark selected bid
  await update(ref(db, `${DB_PATHS.bids}/${jobId}/${bidId}`), {
    status: 'selected',
    updatedAt: serverTimestamp(),
  });

  return assignId;
}

// ── Driver: accept assignment ─────────────────────────────────

export async function acceptAssignment(
  jobId: string,
  assignmentId: string,
  driverUid: string,
): Promise<void> {
  const db = getFirebaseDB();

  const snap = await get(ref(db, `${DB_PATHS.assignments}/${jobId}/${assignmentId}`));
  if (!snap.exists()) throw new Error('Assignment not found.');
  const assignment = snap.val() as Assignment;

  if (assignment.driverUid !== driverUid) throw new Error('Not your assignment.');
  if (assignment.status !== 'offered') throw new Error('This offer is no longer valid.');
  if (Date.now() > assignment.expiresAt) {
    await update(ref(db, `${DB_PATHS.assignments}/${jobId}/${assignmentId}`), { status: 'expired' });
    throw new Error('This offer has expired.');
  }

  const now = serverTimestamp();
  await update(ref(db, `${DB_PATHS.assignments}/${jobId}/${assignmentId}`), {
    status: 'accepted',
    acceptedAt: now,
  });

  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), {
    status: 'accepted',
    updatedAt: now,
  });
}

// ── Driver: reject assignment ────────────────────────────────

export async function rejectAssignment(
  jobId: string,
  assignmentId: string,
  driverUid: string,
): Promise<void> {
  const db = getFirebaseDB();
  const now = serverTimestamp();
  await update(ref(db, `${DB_PATHS.assignments}/${jobId}/${assignmentId}`), {
    status: 'rejected',
    rejectedAt: now,
  });
  // Reopen job
  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), {
    status: 'open',
    assignedDriverUid: null,
    assignedTruckId: null,
    currentAssignmentId: null,
    updatedAt: now,
  });
}

// ── Fetch active bid for driver on a job ─────────────────────

export async function getDriverBidForJob(
  driverUid: string,
  jobId: string,
): Promise<{ bidId: string; amountInr: number } | null> {
  const db = getFirebaseDB();
  const snap = await get(ref(db, `${DB_PATHS.bidsByDriver}/${driverUid}/${jobId}`));
  return snap.exists() ? snap.val() : null;
}
