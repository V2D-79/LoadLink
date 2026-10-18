/**
 * src/types/database.ts
 *
 * TypeScript interfaces for every Firebase Realtime Database node.
 * These mirror the flat, denormalised schema from Section 3 of the spec.
 */

import type {
  AssignmentStatus,
  BidStatus,
  BodyType,
  CargoType,
  FacilityType,
  GoodsCategory,
  JobStatus,
  LoadingEquipment,
  LoadingResponsibility,
  NotificationType,
  PaymentTerms,
  TripStatus,
  UserRole,
  VehicleType,
} from '../constants/app';

// ── Users ─────────────────────────────────────────────────────

export interface UserPublic {
  uid: string;
  role: UserRole;
  displayName: string;
  orgName?: string;
  orgDescription?: string;
  city: string;
  state: string;
  phone?: string;
  whatsapp?: string;
  averageRating: number; // Changed from ratingAvg to match database
  ratingCount: number;
  tripsCompleted?: number; // Made optional since old records don't have it
  isVerified: boolean; // Changed from verified to match database
  isBlocked?: boolean; // Added to match database
  profileImageUrl?: string | null; // Added to match database
  thumbnailId?: string;
  language: string;
  createdAt: number; // server timestamp
  lastActiveAt?: number; // Added to match database
}

export interface UserPrivate {
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  businessAddress?: string;
  gstNumber?: string; // encrypted with tweetnacl
  expoPushToken?: string;
  language: string;
}

// ── Trucks ────────────────────────────────────────────────────

export interface Truck {
  truckId: string;
  driverId: string;
  registrationNumber: string; // encrypted with tweetnacl
  vehicleType: VehicleType;
  bodyType: BodyType;
  maxCapacityTonnes: number;
  lengthMetres?: number;
  widthMetres?: number;
  heightMetres?: number;
  photoId?: string;
  isActive: boolean;
  createdAt: number;
}

// ── Images ────────────────────────────────────────────────────

export interface StoredImage {
  imageId: string;
  thumb: string; // base64 <= 15 KB
  full: string; // base64 <= 200 KB
  mime: string;
  w: number;
  h: number;
  createdAt: number;
}

// ── Jobs ──────────────────────────────────────────────────────

export interface Job {
  jobId: string;
  ownerId: string;
  status: JobStatus;

  // Goods
  goodsName: string;
  goodsCategory: GoodsCategory;
  cargoDescription?: string;
  cargoWeightTonnes: number;
  numberOfPackages?: number;
  cargoLengthM?: number;
  cargoWidthM?: number;
  cargoHeightM?: number;
  cargoType: CargoType;
  specialHandlingInstructions?: string;

  // Pickup (approximate for public)
  pickupCity: string;
  pickupState: string;
  pickupLat: number; // rounded to ~0.05 degrees
  pickupLng: number;
  pickupDate: string; // ISO date string YYYY-MM-DD
  preferredPickupTime?: string;
  loadingFacilityType?: FacilityType;

  // Delivery (approximate for public)
  deliveryCity: string;
  deliveryState: string;
  deliveryLat: number;
  deliveryLng: number;
  expectedDeliveryDate?: string;
  preferredDeliveryTime?: string;
  unloadingFacilityType?: FacilityType;

  // Truck requirements
  requiredVehicleType: VehicleType;
  minimumPayloadTonnes: number;
  truckBodyType?: BodyType;
  trucksRequired: number;
  slotsAccepted: number;
  requiredLoadingEquipment?: LoadingEquipment[];
  minTruckLengthM?: number;
  minTruckWidthM?: number;
  minTruckHeightM?: number;
  specialVehicleRequirements?: string;

  // Budget & extras
  budgetINR?: number;
  paymentTerms?: PaymentTerms;
  loadingResponsibility?: LoadingResponsibility;
  imageIds?: string[];
  additionalInstructions?: string;
  ewayBillNumber?: string;

  createdAt: number;
  updatedAt: number;
}

export interface JobPrivate {
  jobId: string;
  pickupAddress: string;
  pickupPinCode?: string;
  deliveryAddress: string;
  deliveryPinCode?: string;
  specialHandlingInstructions?: string;
  additionalInstructions?: string;
  pickupContactPhone?: string;
  deliveryContactPhone?: string;
}

// ── Bids ──────────────────────────────────────────────────────

export interface Bid {
  bidId: string;
  jobId: string;
  driverId: string;
  amount: number;
  note?: string;
  status: BidStatus;
  createdAt: number;
}

export interface BidByDriver {
  latestBidId: string;
  latestAmount: number;
  jobStatus: JobStatus;
  updatedAt: number;
}

// ── Assignments ───────────────────────────────────────────────

export interface Assignment {
  slotId: string;
  jobId: string;
  driverId: string;
  bidId: string;
  status: AssignmentStatus;
  offeredAt: number;
  expiresAt: number;
  acceptedAt?: number;
  pickupCodeHash?: string;
  deliveryCodeHash?: string;
  proofPhotoId?: string;
}

// ── Driver Routes ─────────────────────────────────────────────

export interface DriverRoute {
  driverId: string;
  startCity: string;
  startState: string;
  startLat: number;
  startLng: number;
  endCity: string;
  endState: string;
  endLat: number;
  endLng: number;
  stops?: RouteStop[];
  truckId: string;
  availableFrom: string; // ISO date
  availableUntil?: string;
  availableCapacityTonnes: number;
  tripStatus: TripStatus;
  polyline?: [number, number][]; // simplified lat/lng pairs
  alertsEnabled: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RouteStop {
  city: string;
  state: string;
  lat: number;
  lng: number;
  order: number;
}

// ── Cell Index ────────────────────────────────────────────────

export interface CellIndexEntry {
  /** true to indicate presence; null/missing to remove */
  [id: string]: true | null;
}

// ── Suggestions ───────────────────────────────────────────────

export interface Suggestion {
  jobId: string;
  score: number;
  reasons: string[];
  computedAt: number;
}

// ── Notifications ─────────────────────────────────────────────

export interface AppNotification {
  notifId: string;
  type: NotificationType;
  title: string;
  body: string;
  refs?: {
    jobId?: string;
    driverId?: string;
    bidId?: string;
    slotId?: string;
  };
  read: boolean;
  createdAt: number;
}

// ── Live Location ─────────────────────────────────────────────

export interface LiveLocation {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
  status: JobStatus;
  ts: number;
}

// ── Trip Events ───────────────────────────────────────────────

export interface TripEvent {
  eventId: string;
  jobId: string;
  status: JobStatus;
  timestamp: number;
  note?: string;
  actorId: string;
}

// ── Reviews ───────────────────────────────────────────────────

export interface Review {
  reviewerId: string;
  reviewerRole: UserRole;
  jobId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: number;
}

// ── Reports ───────────────────────────────────────────────────

export interface Report {
  reportId: string;
  reporterId: string;
  reportedUserId: string;
  jobId?: string;
  reason: string;
  details?: string;
  createdAt: number;
}

// ── Blocks ────────────────────────────────────────────────────

export interface Block {
  blockedUid: string;
  createdAt: number;
}

// ── Counters (live stats for the home screen) ─────────────────

export interface Counters {
  totalUsers: number;
  totalJobs: number;
  completedTrips: number;
}

// ── City Data (bundled GeoNames dataset) ──────────────────────
export interface CityData {
  name: string;
  state: string;
  lat: number;
  lng: number;
  /** Approximate population (0 for industrial zones / new towns) */
  population: number;
}

// ── Match Result ──────────────────────────────────────────────
export interface MatchResult {
  matched: boolean;
  score: number; // 0-100
  reasons: string[];
  rejectionReasons: string[];
}
