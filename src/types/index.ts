/**
 * src/types/index.ts
 * Re-export all type definitions.
 */

export * from './database';

// Re-export enum types from constants so screens can import from @types
export type {
  UserRole,
  JobStatus,
  AssignmentStatus,
  BidStatus,
  TripStatus,
  VehicleType,
  BodyType,
  CargoType,
  GoodsCategory,
  PaymentTerms,
  LoadingResponsibility,
  FacilityType,
  LoadingEquipment,
  NotificationType,
} from '../constants/app';
