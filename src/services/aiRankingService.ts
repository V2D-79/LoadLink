/**
 * src/services/aiRankingService.ts
 *
 * AI-powered job ranking service for drivers.
 * Analyzes jobs based on multiple factors including:
 * - Distance match with driver's route
 * - Profitability (budget vs distance)
 * - Urgency (time until pickup)
 * - Driver's truck compatibility
 * - Historical success rate
 */

export interface JobForRanking {
  jobId: string;
  pickupCity: string;
  pickupState: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryCity: string;
  deliveryState: string;
  deliveryLat?: number;
  deliveryLng?: number;
  weightTonnes: number;
  budgetInr?: number;
  goodsCategory: string;
  requiredVehicleType?: string;
  requiredBodyType?: string;
  availableFrom: number;
  availableUntil: number;
  bidCount: number;
  createdAt: number;
  status: string;
}

export interface DriverProfile {
  uid: string;
  city?: string;
  state?: string;
  currentLat?: number;
  currentLng?: number;
  truckType?: string;
  bodyType?: string;
  maxCapacityTonnes?: number;
}

export interface RankedJob {
  jobId: string;
  job: JobForRanking;
  aiScore: number;
  distanceScore: number;
  profitabilityScore: number;
  urgencyScore: number;
  compatibilityScore: number;
  competitionScore: number;
  reasoning: string;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Score based on distance from driver's current location to pickup
 */
function scoreDistance(
  driverLat?: number,
  driverLng?: number,
  pickupLat?: number,
  pickupLng?: number
): number {
  if (!driverLat || !driverLng || !pickupLat || !pickupLng) {
    return 50; // Neutral score if no location data
  }

  const distance = calculateDistance(driverLat, driverLng, pickupLat, pickupLng);

  // Optimal: 0-100km = 100 points
  // Good: 100-300km = 80 points
  // Fair: 300-500km = 60 points
  // Poor: >500km = lower points
  if (distance <= 100) return 100;
  if (distance <= 300) return 80;
  if (distance <= 500) return 60;
  if (distance <= 800) return 40;
  return Math.max(20, 100 - distance / 20);
}

/**
 * Score based on profitability (budget per tonne per km)
 */
function scoreProfitability(
  budgetInr?: number,
  weightTonnes?: number,
  pickupLat?: number,
  pickupLng?: number,
  deliveryLat?: number,
  deliveryLng?: number
): number {
  if (!budgetInr || !weightTonnes) {
    return 50; // Neutral if no budget info
  }

  let distance = 500; // Default assumption
  if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
    distance = calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
  }

  // Calculate rate per tonne-km
  const ratePerTonneKm = budgetInr / (weightTonnes * distance);

  // Industry benchmarks (₹/tonne-km):
  // Excellent: >5
  // Good: 3-5
  // Fair: 2-3
  // Poor: <2
  if (ratePerTonneKm >= 5) return 100;
  if (ratePerTonneKm >= 3) return 80;
  if (ratePerTonneKm >= 2) return 60;
  if (ratePerTonneKm >= 1) return 40;
  return Math.max(20, ratePerTonneKm * 20);
}

/**
 * Score based on urgency (time until pickup)
 */
function scoreUrgency(availableFrom: number, availableUntil: number): number {
  const now = Date.now();
  const timeUntilPickup = availableFrom - now;
  const timeWindow = availableUntil - availableFrom;

  // Immediate (0-24h): High urgency = high score
  // Soon (1-3 days): Medium urgency = good score
  // Later (>3 days): Low urgency = lower score
  const hoursUntilPickup = timeUntilPickup / (1000 * 60 * 60);

  if (hoursUntilPickup < 0) return 30; // Past due
  if (hoursUntilPickup <= 24) return 100;
  if (hoursUntilPickup <= 72) return 80;
  if (hoursUntilPickup <= 168) return 60; // Within a week
  return Math.max(30, 100 - hoursUntilPickup / 24);
}

/**
 * Score based on truck compatibility
 */
function scoreCompatibility(
  job: JobForRanking,
  driver: DriverProfile
): number {
  let score = 100;

  // Check weight capacity
  if (driver.maxCapacityTonnes && job.weightTonnes > driver.maxCapacityTonnes) {
    return 0; // Cannot carry this load
  }

  // Check vehicle type match
  if (job.requiredVehicleType && driver.truckType) {
    if (job.requiredVehicleType !== driver.truckType) {
      score -= 30;
    }
  }

  // Check body type match
  if (job.requiredBodyType && driver.bodyType) {
    if (job.requiredBodyType !== driver.bodyType) {
      score -= 20;
    }
  }

  return Math.max(0, score);
}

/**
 * Score based on competition (lower bid count = better)
 */
function scoreCompetition(bidCount: number): number {
  // 0 bids = 100 points (no competition!)
  // 1-3 bids = 80 points
  // 4-6 bids = 60 points
  // 7-10 bids = 40 points
  // >10 bids = lower points
  if (bidCount === 0) return 100;
  if (bidCount <= 3) return 80;
  if (bidCount <= 6) return 60;
  if (bidCount <= 10) return 40;
  return Math.max(10, 100 - bidCount * 5);
}

/**
 * Generate reasoning text for the AI score
 */
function generateReasoning(scores: {
  distance: number;
  profitability: number;
  urgency: number;
  compatibility: number;
  competition: number;
}): string {
  const reasons: string[] = [];

  if (scores.distance >= 80) reasons.push('Very close to your location');
  else if (scores.distance >= 60) reasons.push('Reasonable distance');
  else if (scores.distance < 40) reasons.push('Far from current location');

  if (scores.profitability >= 80) reasons.push('Excellent pay rate');
  else if (scores.profitability >= 60) reasons.push('Good profitability');
  else if (scores.profitability < 40) reasons.push('Lower pay rate');

  if (scores.urgency >= 80) reasons.push('Urgent pickup needed');
  else if (scores.urgency < 40) reasons.push('Flexible timeline');

  if (scores.compatibility === 100) reasons.push('Perfect truck match');
  else if (scores.compatibility === 0) reasons.push('Truck incompatible');
  else if (scores.compatibility < 70) reasons.push('Partial truck match');

  if (scores.competition >= 80) reasons.push('Low competition');
  else if (scores.competition < 40) reasons.push('High competition');

  return reasons.join(' • ');
}

/**
 * AI-powered job ranking
 * Weights: Distance 25%, Profitability 30%, Urgency 15%, Compatibility 20%, Competition 10%
 */
export async function rankJobsWithAI(
  jobs: JobForRanking[],
  driver: DriverProfile
): Promise<RankedJob[]> {
  const rankedJobs: RankedJob[] = [];

  for (const job of jobs) {
    // Skip non-open jobs
    if (job.status !== 'open') continue;

    // Calculate individual scores
    const distanceScore = scoreDistance(
      driver.currentLat,
      driver.currentLng,
      job.pickupLat,
      job.pickupLng
    );

    const profitabilityScore = scoreProfitability(
      job.budgetInr,
      job.weightTonnes,
      job.pickupLat,
      job.pickupLng,
      job.deliveryLat,
      job.deliveryLng
    );

    const urgencyScore = scoreUrgency(job.availableFrom, job.availableUntil);

    const compatibilityScore = scoreCompatibility(job, driver);

    const competitionScore = scoreCompetition(job.bidCount);

    // Calculate weighted AI score
    const aiScore = Math.round(
      distanceScore * 0.25 +
        profitabilityScore * 0.30 +
        urgencyScore * 0.15 +
        compatibilityScore * 0.20 +
        competitionScore * 0.10
    );

    const reasoning = generateReasoning({
      distance: distanceScore,
      profitability: profitabilityScore,
      urgency: urgencyScore,
      compatibility: compatibilityScore,
      competition: competitionScore,
    });

    rankedJobs.push({
      jobId: job.jobId,
      job,
      aiScore,
      distanceScore,
      profitabilityScore,
      urgencyScore,
      compatibilityScore,
      competitionScore,
      reasoning,
    });
  }

  // Sort by AI score descending
  return rankedJobs.sort((a, b) => b.aiScore - a.aiScore);
}
