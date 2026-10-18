/**
 * src/constants/theme.ts
 *
 * Design system tokens from Section 12.
 * Road-sign and freight palette. No blue gradients, no purple,
 * no glossy gradients, no glassmorphism.
 */

export const COLORS = {
  // Core palette
  charcoal: '#1E2224',
  offWhite: '#F3EFE6',
  paperWhite: '#FBF9F4',
  ochre: '#B8741A',
  rust: '#9C4A2B',
  olive: '#5B6B3A',
  brick: '#A33A2E',
  steel: '#6B7378',
  hairline: '#D9D3C5',

  // Semantic aliases
  primaryText: '#1E2224',
  secondaryText: '#6B7378',
  background: '#F3EFE6',
  card: '#FBF9F4',
  primary: '#B8741A',
  primaryDark: '#96600F',
  secondary: '#9C4A2B',
  success: '#5B6B3A',
  error: '#A33A2E',
  border: '#D9D3C5',
  divider: '#D9D3C5',

  // Status chips
  statusOpen: '#B8741A',
  statusOffered: '#9C4A2B',
  statusAccepted: '#5B6B3A',
  statusInTransit: '#1E2224',
  statusDelivered: '#5B6B3A',
  statusCompleted: '#5B6B3A',
  statusCancelled: '#A33A2E',
  statusExpired: '#6B7378',

  // Dark theme variants
  dark: {
    charcoal: '#F3EFE6',
    offWhite: '#1E2224',
    paperWhite: '#2A2E30',
    ochre: '#D4923A',
    rust: '#C06A4A',
    olive: '#7E9050',
    brick: '#C45A4E',
    steel: '#9EA3A8',
    hairline: '#3A3E40',
    primaryText: '#F3EFE6',
    secondaryText: '#9EA3A8',
    background: '#1E2224',
    card: '#2A2E30',
    primary: '#D4923A',
    primaryDark: '#B8741A',
    secondary: '#C06A4A',
    success: '#7E9050',
    error: '#C45A4E',
    border: '#3A3E40',
    divider: '#3A3E40',
  },
} as const;

export const FONTS = {
  // Headings — Source Serif 4
  headingRegular: 'SourceSerif4_400Regular',
  headingSemiBold: 'SourceSerif4_600SemiBold',
  headingBold: 'SourceSerif4_700Bold',

  // Body — IBM Plex Sans
  bodyRegular: 'IBMPlexSans_400Regular',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemiBold: 'IBMPlexSans_600SemiBold',
  bodyBold: 'IBMPlexSans_700Bold',
} as const;

export const FONT_SIZES = {
  xxs: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const LINE_HEIGHTS = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 40,
} as const;

export const SPACING = {
  /** 4px */
  xxs: 4,
  /** 8px */
  xs: 8,
  /** 12px */
  sm: 12,
  /** 16px */
  md: 16,
  /** 24px */
  lg: 24,
  /** 32px */
  xl: 32,
  /** 48px */
  xxl: 48,
} as const;

export const RADII = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
} as const;

export const SHADOWS = {
  /** Minimal shadow for cards — using hairline borders instead per spec */
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  /** Slightly elevated for bottom sheets */
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

/** Minimum touch target per Android guidelines. */
export const MIN_TOUCH_TARGET = 48;

/** Maximum font scale to prevent layout breakage. */
export const MAX_FONT_SCALE = 1.3;

/** Animation durations in milliseconds (150-350ms range, per spec). */
export const DURATIONS = {
  fast: 150,
  medium: 250,
  slow: 350,
} as const;
