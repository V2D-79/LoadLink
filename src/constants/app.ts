/**
 * src/constants/app.ts
 *
 * Single source of truth for app-wide constants.
 * Every tunable value referenced in the spec lives here.
 */

// ── App Identity ──────────────────────────────────────────────
/** Change this single constant to rename the app everywhere. */
export const APP_NAME = 'LoadLink';
export const APP_DOMAIN = 'loadlink.app';
export const APP_VERSION = '1.0.0';

// ── User Roles ────────────────────────────────────────────────
export const ROLES = {
  FACTORY: 'factory',
  DRIVER: 'driver',
} as const;
export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// ── Bidding Rules ─────────────────────────────────────────────
/**
 * D3: Bid amount must be strictly LESS THAN the factory's expected budget.
 * Change to 'lte' to allow equal bids.
 */
export const BID_RULE: 'lt' | 'lte' = 'lt';

/** Maximum bid when no budget is set (INR). */
export const MAX_BID_NO_BUDGET = 9_999_999;

/** Rate limit: minimum seconds between bids on the same job per driver. */
export const BID_RATE_LIMIT_SECONDS = 10;

/** Rate limit: minimum seconds between job posts per factory. */
export const POST_RATE_LIMIT_SECONDS = 15;

// ── Bid Visibility ────────────────────────────────────────────
/**
 * D4: Controls what drivers see about other bids.
 * 'partial' — count, lowest, anonymous amounts, own bids marked.
 * 'public'  — all bids with driver names visible.
 * 'sealed'  — only own bids visible, no info about others.
 */
export const BID_VISIBILITY: 'partial' | 'public' | 'sealed' = 'partial';

// ── Offer / Assignment ────────────────────────────────────────
/** D5: Hours before an offered assignment expires and returns to the pool. */
export const OFFER_TTL_HOURS = 12;

// ── Matching Engine ───────────────────────────────────────────
/** Corridor width (km) for matching pickups/deliveries to a driver route. */
export const CORRIDOR_KM = 25;

/** Maximum total added detour (km) before rejecting the match. */
export const MAX_DETOUR_KM = 40;

/** Default days added to availableFrom when availableUntil is not set. */
export const DEFAULT_AVAILABILITY_DAYS = 7;

/** Score weights — must sum to 100. */
export const SCORE_WEIGHTS = {
  routeFit: 35,
  capacityFit: 20,
  dateFit: 15,
  detour: 15,
  priceVsBudget: 10,
  driverRating: 5,
} as const;

// ── Job State Machine ─────────────────────────────────────────
export const JOB_STATUSES = [
  'open',
  'offered',
  'accepted',
  'heading_to_pickup',
  'loaded',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'expired',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const ASSIGNMENT_STATUSES = [
  'offered',
  'accepted',
  'rejected',
  'expired',
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const BID_STATUSES = [
  'active',
  'superseded',
  'withdrawn',
  'declined',
  'selected',
] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

export const TRIP_STATUSES = [
  'empty_returning',
  'partially_loaded',
  'loaded_traveling',
  'available_at_location',
  'not_available',
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

// ── Vehicle Types & Body Types ────────────────────────────────
export const VEHICLE_TYPES = [
  'mini_truck',
  'pickup_truck',
  'lcv',
  'medium_truck',
  'heavy_truck',
  'container_truck',
  'trailer',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  mini_truck: 'Mini Truck',
  pickup_truck: 'Pickup Truck',
  lcv: 'Light Commercial Vehicle',
  medium_truck: 'Medium Truck',
  heavy_truck: 'Heavy Truck',
  container_truck: 'Container Truck',
  trailer: 'Trailer',
};

/** Ordered by capacity: index 0 is smallest, 6 is largest. */
export const VEHICLE_TYPE_ORDER: Record<VehicleType, number> = {
  mini_truck: 0,
  pickup_truck: 1,
  lcv: 2,
  medium_truck: 3,
  heavy_truck: 4,
  container_truck: 5,
  trailer: 6,
};

export const BODY_TYPES = [
  'open',
  'closed',
  'container',
  'flatbed',
  'refrigerated',
  'tipper',
] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  open: 'Open Body',
  closed: 'Closed Body',
  container: 'Container',
  flatbed: 'Flatbed',
  refrigerated: 'Refrigerated',
  tipper: 'Tipper',
};

// ── Goods Categories ──────────────────────────────────────────
export const GOODS_CATEGORIES = [
  'agricultural',
  'automobile_parts',
  'building_materials',
  'chemicals',
  'consumer_goods',
  'electronics',
  'food_beverages',
  'furniture',
  'garments_textiles',
  'industrial_machinery',
  'metals_alloys',
  'packaging',
  'paper_products',
  'petroleum',
  'pharmaceuticals',
  'plastics_rubber',
  'raw_materials',
  'other',
] as const;
export type GoodsCategory = (typeof GOODS_CATEGORIES)[number];

export const GOODS_CATEGORY_LABELS: Record<GoodsCategory, string> = {
  agricultural: 'Agricultural Products',
  automobile_parts: 'Automobile Parts',
  building_materials: 'Building Materials',
  chemicals: 'Chemicals',
  consumer_goods: 'Consumer Goods',
  electronics: 'Electronics',
  food_beverages: 'Food & Beverages',
  furniture: 'Furniture',
  garments_textiles: 'Garments & Textiles',
  industrial_machinery: 'Industrial Machinery',
  metals_alloys: 'Metals & Alloys',
  packaging: 'Packaging Materials',
  paper_products: 'Paper Products',
  petroleum: 'Petroleum Products',
  pharmaceuticals: 'Pharmaceuticals',
  plastics_rubber: 'Plastics & Rubber',
  raw_materials: 'Raw Materials',
  other: 'Other',
};

// ── Cargo Types ───────────────────────────────────────────────
export const CARGO_TYPES = [
  'general',
  'fragile',
  'perishable',
  'hazardous',
  'weather_sensitive',
  'heavy_machinery',
  'liquid',
  'bulk',
  'oversized',
] as const;
export type CargoType = (typeof CARGO_TYPES)[number];

// ── Loading Equipment ─────────────────────────────────────────
export const LOADING_EQUIPMENT = [
  'tail_lift',
  'crane',
  'forklift_access',
  'tarpaulin',
  'ropes_straps',
  'pallet_jack',
  'loading_ramp',
] as const;
export type LoadingEquipment = (typeof LOADING_EQUIPMENT)[number];

// ── Loading Facility Types ────────────────────────────────────
export const FACILITY_TYPES = [
  'warehouse',
  'factory_floor',
  'open_yard',
  'dock',
  'roadside',
  'container_yard',
] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

// ── Payment Terms ─────────────────────────────────────────────
export const PAYMENT_TERMS = [
  'advance',
  'on_delivery',
  'credit_7',
  'credit_15',
  'credit_30',
  'to_be_discussed',
] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  advance: 'Full Advance',
  on_delivery: 'On Delivery',
  credit_7: '7 Days Credit',
  credit_15: '15 Days Credit',
  credit_30: '30 Days Credit',
  to_be_discussed: 'To Be Discussed',
};

// ── Loading Responsibility ────────────────────────────────────
export const LOADING_RESPONSIBILITY = [
  'factory',
  'driver',
  'shared',
  'third_party',
] as const;
export type LoadingResponsibility = (typeof LOADING_RESPONSIBILITY)[number];

// ── Image Constraints ─────────────────────────────────────────
export const IMAGE_CONSTRAINTS = {
  profileMaxPx: 400,
  truckCargoMaxPx: 1024,
  jpegQuality: 0.55,
  maxFullBase64Bytes: 200_000, // 200 KB
  maxThumbBase64Bytes: 15_000, // 15 KB
  thumbMaxPx: 100,
  maxCargoImages: 4,
} as const;

// ── Location Tracking ─────────────────────────────────────────
export const LOCATION_CONFIG = {
  /** Seconds between location writes to the database. */
  writeThrottleSeconds: 30,
  /** Metres between location updates from the OS. */
  distanceInterval: 25,
  /** Milliseconds between location updates from the OS. */
  timeIntervalMs: 30_000,
  /** Metres — skip writes when accuracy is worse than this. */
  maxAccuracyMetres: 100,
  /** Minutes after which a location point is considered stale. */
  staleMinutes: 3,
  /** Minutes between history point appends. */
  historyIntervalMinutes: 5,
} as const;

// ── Matching Engine Automation ────────────────────────────────
/** Seconds between foreground matching engine runs. */
export const ENGINE_RUN_INTERVAL_SECONDS = 60;

// ── Grid Cell Size ────────────────────────────────────────────
/**
 * Degrees for the spatial grid index (cellIndexJobs / cellIndexRoutes).
 * 0.5 degrees ≈ 55 km at the equator; good balance between query fan-out
 * and match coverage for India's geography.
 */
export const GRID_CELL_SIZE_DEGREES = 0.5;

// ── Handover Codes ────────────────────────────────────────────
/** Number of digits in pickup / delivery handover codes. */
export const HANDOVER_CODE_DIGITS = 6;

// ── Notification Types ────────────────────────────────────────
export const NOTIFICATION_TYPES = [
  'new_match',
  'new_bid',
  'bid_revised',
  'bid_withdrawn',
  'job_assigned',
  'driver_accepted',
  'driver_rejected',
  'offer_expired',
  'bid_not_selected',
  'status_change',
  'job_completed',
  'rating_received',
  'route_match',
  'job_cancelled',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ── Auth ──────────────────────────────────────────────────────
/**
 * D11: Drivers without an email get a deterministic internal address.
 * Format: <mobile>@users.loadlink.app
 */
export const INTERNAL_EMAIL_DOMAIN = `users.${APP_DOMAIN}`;

// ── Privacy ───────────────────────────────────────────────────
/**
 * D7: Before assignment, coordinates are rounded to this precision
 * to show only city-level location. 0.05 degrees ≈ 5.5 km.
 */
export const APPROXIMATE_COORD_PRECISION = 0.05;

// ── Database Paths ────────────────────────────────────────────
export const DB_PATHS = {
  users: 'users',
  userPrivate: 'userPrivate',
  trucks: 'trucks',
  images: 'images',
  jobs: 'jobs',
  jobPrivate: 'jobPrivate',
  bids: 'bids',
  bidsByDriver: 'bidsByDriver',
  assignments: 'assignments',
  driverRoutes: 'driverRoutes',
  cellIndexJobs: 'cellIndexJobs',
  cellIndexRoutes: 'cellIndexRoutes',
  suggestions: 'suggestions',
  notifications: 'notifications',
  liveLocation: 'liveLocation',
  tripEvents: 'tripEvents',
  reviews: 'reviews',
  reports: 'reports',
  blocks: 'blocks',
  phoneIndex: 'phoneIndex',
  emailByPhone: 'emailByPhone',
  counters: 'counters',
} as const;
