/**
 * src/engine/match.ts
 *
 * Core matching & scoring engine.
 *
 * scorePair(job, route) → MatchResult (0-100 score + reasons)
 * writeJobCellIndex(jobId, job) → writes to RTDB cellIndexJobs
 * writeRouteCellIndex(driverId, route) → writes to RTDB cellIndexRoutes
 * findMatchingJobs(route) → queries cell index, scores, returns ranked list
 * findMatchingRoutes(job) → queries cell index, scores, returns ranked list
 *
 * Algorithm per spec:
 *   routeFit   35: corridor check (pickup AND delivery within CORRIDOR_KM of route)
 *   capacityFit 20: job weight ≤ truck maxCapacity
 *   dateFit    15: job window overlaps driver availability
 *   detour     15: added detour ≤ MAX_DETOUR_KM (linear decay)
 *   priceVsBudget 10: driver bid history vs factory budget
 *   driverRating   5: average rating / 5
 */

import { ref, get, set, remove } from 'firebase/database';
import { getFirebaseDB } from '../services/firebase';
import {
  CORRIDOR_KM,
  MAX_DETOUR_KM,
  SCORE_WEIGHTS,
  DB_PATHS,
} from '../constants/app';
import {
  haversineKm,
  isNearRoute,
  detourKm,
  cellKey,
  cellsInRadius,
  type LatLng,
} from './geo';
import type { MatchResult } from '../types/database';

// ── Types ─────────────────────────────────────────────────────

export interface JobSnapshot {
  jobId: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  weightTonnes: number;
  budgetInr?: number;
  availableFrom: number; // Unix ms
  availableUntil: number;
  requiredVehicleType?: string;
  requiredBodyType?: string;
  status: string;
}

export interface RouteSnapshot {
  driverId: string;
  truckId: string;
  currentLat: number;
  currentLng: number;
  destinationLat: number;
  destinationLng: number;
  polyline?: [number, number][]; // [[lat, lng], ...]
  maxCapacityTonnes: number;
  vehicleType: string;
  bodyType: string;
  availableFrom: number;
  availableUntil: number;
  averageRating: number;
  lastBidInr?: number;
}

// ── Scoring ───────────────────────────────────────────────────

export function scorePair(job: JobSnapshot, route: RouteSnapshot): MatchResult {
  const reasons: string[] = [];
  const rejectionReasons: string[] = [];

  const pickup: LatLng = { lat: job.pickupLat, lng: job.pickupLng };
  const delivery: LatLng = { lat: job.deliveryLat, lng: job.deliveryLng };
  const from: LatLng = { lat: route.currentLat, lng: route.currentLng };
  const to: LatLng = { lat: route.destinationLat, lng: route.destinationLng };

  // Build effective polyline (2-point straight line if no detailed poly)
  const poly: [number, number][] = route.polyline && route.polyline.length >= 2
    ? route.polyline
    : [[from.lat, from.lng], [to.lat, to.lng]];

  // ── 1. Route fit (35 pts) ────────────────────────────────

  const pickupNear = isNearRoute(pickup, poly, CORRIDOR_KM);
  const deliveryNear = isNearRoute(delivery, poly, CORRIDOR_KM);

  if (!pickupNear || !deliveryNear) {
    rejectionReasons.push(
      !pickupNear
        ? `Pickup is >  ${CORRIDOR_KM} km from driver's route`
        : `Delivery is > ${CORRIDOR_KM} km from driver's route`,
    );
    return { matched: false, score: 0, reasons, rejectionReasons };
  }

  const pickupDistKm = Math.min(...poly.slice(0, -1).map((_, i) => {
    const a = poly[i]!;
    const b = poly[i + 1]!;
    return Math.min(
      haversineKm(pickup, { lat: a[0], lng: a[1] }),
      haversineKm(pickup, { lat: b[0], lng: b[1] }),
    );
  }));

  const pickupFit = Math.max(0, 1 - pickupDistKm / CORRIDOR_KM);
  const deliveryDistKm = Math.min(...poly.slice(0, -1).map((_, i) => {
    const a = poly[i]!;
    const b = poly[i + 1]!;
    return Math.min(
      haversineKm(delivery, { lat: a[0], lng: a[1] }),
      haversineKm(delivery, { lat: b[0], lng: b[1] }),
    );
  }));
  const deliveryFit = Math.max(0, 1 - deliveryDistKm / CORRIDOR_KM);
  const routeScore = ((pickupFit + deliveryFit) / 2) * SCORE_WEIGHTS.routeFit;
  reasons.push(`Route fit: ${Math.round(routeScore)}/${SCORE_WEIGHTS.routeFit} pts`);

  // ── 2. Capacity fit (20 pts) ─────────────────────────────

  if (job.weightTonnes > route.maxCapacityTonnes) {
    rejectionReasons.push(
      `Cargo weight ${job.weightTonnes}t exceeds truck capacity ${route.maxCapacityTonnes}t`,
    );
    return { matched: false, score: 0, reasons, rejectionReasons };
  }
  const capRatio = job.weightTonnes / route.maxCapacityTonnes;
  // Optimal fill: 70-100% capacity → full points; 0% → 0 pts
  const capScore = (capRatio >= 0.7 ? 1 : capRatio / 0.7) * SCORE_WEIGHTS.capacityFit;
  reasons.push(`Capacity: ${Math.round(capScore)}/${SCORE_WEIGHTS.capacityFit} pts`);

  // ── 3. Date fit (15 pts) ─────────────────────────────────

  const overlapStart = Math.max(job.availableFrom, route.availableFrom);
  const overlapEnd = Math.min(job.availableUntil, route.availableUntil);
  if (overlapStart > overlapEnd) {
    rejectionReasons.push('Availability windows do not overlap');
    return { matched: false, score: 0, reasons, rejectionReasons };
  }
  const overlapMs = overlapEnd - overlapStart;
  const jobWindowMs = job.availableUntil - job.availableFrom;
  const dateFit = jobWindowMs > 0 ? Math.min(1, overlapMs / jobWindowMs) : 1;
  const dateScore = dateFit * SCORE_WEIGHTS.dateFit;
  reasons.push(`Date overlap: ${Math.round(dateScore)}/${SCORE_WEIGHTS.dateFit} pts`);

  // ── 4. Detour (15 pts) ───────────────────────────────────

  const addedDetour = detourKm(pickup, from, delivery);
  if (addedDetour > MAX_DETOUR_KM) {
    rejectionReasons.push(`Added detour ${Math.round(addedDetour)} km exceeds ${MAX_DETOUR_KM} km limit`);
    return { matched: false, score: 0, reasons, rejectionReasons };
  }
  const detourFit = 1 - addedDetour / MAX_DETOUR_KM;
  const detourScore = detourFit * SCORE_WEIGHTS.detour;
  reasons.push(`Detour: ${Math.round(addedDetour)} km → ${Math.round(detourScore)}/${SCORE_WEIGHTS.detour} pts`);

  // ── 5. Price vs budget (10 pts) ──────────────────────────

  let priceScore = SCORE_WEIGHTS.priceVsBudget / 2; // default mid
  if (job.budgetInr && route.lastBidInr) {
    if (route.lastBidInr >= job.budgetInr) {
      priceScore = 0; // Bid must be LESS than budget (D3)
      reasons.push('Price: bid exceeds budget (0 pts)');
    } else {
      const priceFit = 1 - route.lastBidInr / job.budgetInr;
      priceScore = priceFit * SCORE_WEIGHTS.priceVsBudget;
    }
  }
  reasons.push(`Price: ${Math.round(priceScore)}/${SCORE_WEIGHTS.priceVsBudget} pts`);

  // ── 6. Driver rating (5 pts) ─────────────────────────────

  const ratingScore = (route.averageRating / 5) * SCORE_WEIGHTS.driverRating;
  reasons.push(`Rating: ${route.averageRating.toFixed(1)} → ${Math.round(ratingScore)}/${SCORE_WEIGHTS.driverRating} pts`);

  // ── Total ────────────────────────────────────────────────

  const total = Math.round(routeScore + capScore + dateScore + detourScore + priceScore + ratingScore);

  return {
    matched: true,
    score: Math.min(100, total),
    reasons,
    rejectionReasons: [],
  };
}

// ── Cell index writers ────────────────────────────────────────

/**
 * Write a job to the 0.5° cell index.
 * Indexes:
 * - Pickup and delivery locations
 * - Corridor cells around both endpoints (to catch nearby routes)
 * - Intermediate cells along the straight-line job route
 * 
 * This ensures jobs are discoverable by drivers whose routes pass nearby,
 * even if the driver's start/end points are different from the job's.
 * 
 * Call after job creation or coord update.
 */
export async function writeJobCellIndex(jobId: string, job: Pick<JobSnapshot, 'pickupLat' | 'pickupLng' | 'deliveryLat' | 'deliveryLng'>): Promise<void> {
  const db = getFirebaseDB();
  const cells = new Set<string>();
  
  const pickup: LatLng = { lat: job.pickupLat, lng: job.pickupLng };
  const delivery: LatLng = { lat: job.deliveryLat, lng: job.deliveryLng };
  
  // 1. Index at pickup and delivery cells
  cells.add(cellKey(pickup));
  cells.add(cellKey(delivery));
  
  // 2. Index in corridor cells around pickup and delivery (to catch nearby routes)
  cellsInRadius(pickup, CORRIDOR_KM).forEach(c => cells.add(c));
  cellsInRadius(delivery, CORRIDOR_KM).forEach(c => cells.add(c));
  
  // 3. Index along the job route (interpolate intermediate points)
  // This catches drivers whose routes pass through the job's path
  const distance = haversineKm(pickup, delivery);
  if (distance > 10) { // Only interpolate if route is long enough
    // Add intermediate points every ~50 km along straight-line route
    const numPoints = Math.ceil(distance / 50);
    for (let i = 1; i < numPoints; i++) {
      const fraction = i / numPoints;
      const interLat = pickup.lat + (delivery.lat - pickup.lat) * fraction;
      const interLng = pickup.lng + (delivery.lng - pickup.lng) * fraction;
      const interPoint: LatLng = { lat: interLat, lng: interLng };
      cells.add(cellKey(interPoint));
      // Also add corridor cells around intermediate points
      cellsInRadius(interPoint, CORRIDOR_KM).forEach(c => cells.add(c));
    }
  }
  
  const writes: Promise<void>[] = [];
  for (const key of cells) {
    writes.push(set(ref(db, `${DB_PATHS.cellIndexJobs}/${key}/${jobId}`), true));
  }
  await Promise.all(writes);
}

/**
 * Write a driver route to the 0.5° cell index.
 * Call when driver updates their active route.
 */
export async function writeRouteCellIndex(
  driverId: string,
  route: Pick<RouteSnapshot, 'currentLat' | 'currentLng' | 'destinationLat' | 'destinationLng'>,
): Promise<void> {
  const db = getFirebaseDB();
  const cells = new Set([
    cellKey({ lat: route.currentLat, lng: route.currentLng }),
    cellKey({ lat: route.destinationLat, lng: route.destinationLng }),
    ...cellsInRadius({ lat: route.currentLat, lng: route.currentLng }, CORRIDOR_KM),
    ...cellsInRadius({ lat: route.destinationLat, lng: route.destinationLng }, CORRIDOR_KM),
  ]);
  const writes: Promise<void>[] = [];
  for (const key of cells) {
    writes.push(set(ref(db, `${DB_PATHS.cellIndexRoutes}/${key}/${driverId}`), true));
  }
  await Promise.all(writes);
}

/**
 * Remove all cell index entries for a driver route (on route expiry/clear).
 */
export async function clearRouteCellIndex(driverId: string): Promise<void> {
  const db = getFirebaseDB();
  // Fetch all cells this driver is indexed in (scan approach for small data)
  // In production this would use a reverse index; here we use the simple approach.
  const routeSnap = await get(ref(db, `${DB_PATHS.driverRoutes}/${driverId}`));
  if (!routeSnap.exists()) return;
  const r = routeSnap.val() as RouteSnapshot;
  const cells = new Set([
    cellKey({ lat: r.currentLat, lng: r.currentLng }),
    cellKey({ lat: r.destinationLat, lng: r.destinationLng }),
    ...cellsInRadius({ lat: r.currentLat, lng: r.currentLng }, CORRIDOR_KM),
    ...cellsInRadius({ lat: r.destinationLat, lng: r.destinationLng }, CORRIDOR_KM),
  ]);
  const removes: Promise<void>[] = [];
  for (const key of cells) {
    removes.push(remove(ref(db, `${DB_PATHS.cellIndexRoutes}/${key}/${driverId}`)));
  }
  await Promise.all(removes);
}

/**
 * Query cell index for jobs near a driver route, fetch job snapshots,
 * score each pair, and return ranked matches (score ≥ 1).
 */
export async function findMatchingJobsForRoute(
  route: RouteSnapshot,
): Promise<Array<{ jobId: string; score: number; result: MatchResult }>> {
  const db = getFirebaseDB();
  const pickup: LatLng = { lat: route.currentLat, lng: route.currentLng };
  const delivery: LatLng = { lat: route.destinationLat, lng: route.destinationLng };

  const cells = new Set([
    ...cellsInRadius(pickup, CORRIDOR_KM),
    ...cellsInRadius(delivery, CORRIDOR_KM),
  ]);

  const jobIds = new Set<string>();
  for (const key of cells) {
    const snap = await get(ref(db, `${DB_PATHS.cellIndexJobs}/${key}`));
    if (snap.exists()) {
      Object.keys(snap.val()).forEach((id) => jobIds.add(id));
    }
  }

  const scored: Array<{ jobId: string; score: number; result: MatchResult }> = [];

  for (const jobId of jobIds) {
    const snap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
    if (!snap.exists()) continue;
    const job = snap.val() as JobSnapshot;
    if (job.status !== 'open') continue;
    const result = scorePair(job, route);
    if (result.matched && result.score > 0) {
      scored.push({ jobId, score: result.score, result });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}
