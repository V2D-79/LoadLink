/**
 * src/validation/auth.ts
 *
 * Zod schemas for authentication forms.
 * Shared between screens and the service layer.
 */

import { z } from 'zod';

const PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const REG_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;

// ── Shared fields ─────────────────────────────────────────────

const phoneField = z
  .string()
  .min(10, 'Enter a valid 10-digit mobile number')
  .refine((v) => PHONE_REGEX.test(v.replace(/\s/g, '')), 'Enter a valid 10-digit mobile number');

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v),
    'Password must contain at least one letter and one number',
  );

const nameField = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name must be less than 80 characters')
  .trim();

const cityField = z.string().min(1, 'City is required').max(100).trim();
const stateField = z.string().min(1, 'State is required').max(100).trim();

// ── Login ─────────────────────────────────────────────────────

export const loginSchema = z.object({
  emailOrPhone: z
    .string()
    .min(1, 'Email or mobile number is required')
    .trim(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

// ── Common signup base ────────────────────────────────────────

export const baseSignupSchema = z.object({
  displayName: nameField,
  phone: phoneField,
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'Enter a valid email address'
    ),
  city: cityField,
  state: stateField,
  language: z.enum(['en', 'mr', 'hi']).default('en'),
  password: passwordField,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
});

// ── Factory signup ────────────────────────────────────────────

export const factorySignupSchema = baseSignupSchema
  .extend({
    role: z.literal('factory'),
    orgName: z
      .string()
      .max(200, 'Organisation name too long')
      .trim()
      .optional(),
    orgDescription: z.string().max(1000).trim().optional(),
    businessAddress: z.string().max(500).trim().optional(),
    gstNumber: z
      .string()
      .optional()
      .refine(
        (v) => !v || GST_REGEX.test(v.toUpperCase()),
        'Enter a valid 15-character GSTIN',
      ),
    whatsapp: z
      .string()
      .optional()
      .refine(
        (v) => !v || PHONE_REGEX.test(v.replace(/\s/g, '')),
        'Enter a valid WhatsApp number',
      ),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type FactorySignupFormData = z.infer<typeof factorySignupSchema>;

// ── Driver signup ─────────────────────────────────────────────

export const truckSchema = z.object({
  registrationNumber: z
    .string()
    .min(6, 'Enter a valid registration number')
    .max(12)
    .trim()
    .transform((v) => v.toUpperCase()),
  vehicleType: z.enum([
    'mini_truck',
    'pickup_truck',
    'lcv',
    'medium_truck',
    'heavy_truck',
    'container_truck',
    'trailer',
  ]),
  bodyType: z.enum(['open', 'closed', 'container', 'flatbed', 'refrigerated', 'tipper']),
  maxCapacityTonnes: z
    .number({ invalid_type_error: 'Enter a valid capacity' })
    .min(0.1, 'Capacity must be greater than 0')
    .max(100, 'Capacity cannot exceed 100 tonnes'),
});
export type TruckFormData = z.infer<typeof truckSchema>;

export const driverSignupSchema = baseSignupSchema
  .extend({
    role: z.literal('driver'),
    truck: truckSchema,
    whatsapp: z
      .string()
      .optional()
      .refine(
        (v) => !v || PHONE_REGEX.test(v.replace(/\s/g, '')),
        'Enter a valid WhatsApp number',
      ),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type DriverSignupFormData = z.infer<typeof driverSignupSchema>;

// ── Forgot password ───────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address').trim(),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ── Change password ───────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
