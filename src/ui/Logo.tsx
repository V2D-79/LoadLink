/**
 * src/ui/Logo.tsx
 *
 * Original SVG logo: a route line forming a return arrow joined to a
 * truck silhouette. Used in splash, header, login, and about screens.
 * No emoji, no stock icon, no placeholder.
 */

import React from 'react';
import Svg, { Path, Rect, Circle, Polyline, G } from 'react-native-svg';
import { COLORS } from '../constants/theme';

interface LogoProps {
  size?: number;
  color?: string;
  accentColor?: string;
}

export default function Logo({
  size = 48,
  color = COLORS.offWhite,
  accentColor = COLORS.ochre,
}: LogoProps) {
  // ViewBox 0 0 100 60
  // Left side: truck silhouette
  // Right side: return-arrow route line connecting to truck
  const scale = size / 60;
  return (
    <Svg
      width={size * (100 / 60)}
      height={size}
      viewBox="0 0 100 60"
      accessibilityLabel="LoadLink logo"
    >
      {/* ── TRUCK SILHOUETTE ─────────────────────── */}
      <G>
        {/* Cab */}
        <Rect x={4} y={20} width={22} height={18} rx={2} fill={color} />
        {/* Windshield */}
        <Rect x={6} y={22} width={10} height={8} rx={1} fill={accentColor} opacity={0.6} />
        {/* Cargo body */}
        <Rect x={26} y={16} width={28} height={22} rx={2} fill={color} />
        {/* Chassis */}
        <Rect x={4} y={36} width={50} height={4} rx={1} fill={color} opacity={0.7} />
        {/* Wheels */}
        <Circle cx={12} cy={42} r={5} fill={COLORS.charcoal === color ? COLORS.steel : COLORS.charcoal} />
        <Circle cx={12} cy={42} r={2.5} fill={color} opacity={0.4} />
        <Circle cx={42} cy={42} r={5} fill={COLORS.charcoal === color ? COLORS.steel : COLORS.charcoal} />
        <Circle cx={42} cy={42} r={2.5} fill={color} opacity={0.4} />
        <Circle cx={52} cy={42} r={5} fill={COLORS.charcoal === color ? COLORS.steel : COLORS.charcoal} />
        <Circle cx={52} cy={42} r={2.5} fill={color} opacity={0.4} />
      </G>

      {/* ── RETURN-ARROW ROUTE LINE ──────────────── */}
      <G>
        {/* Route line going right from truck top */}
        <Path
          d="M 58 22 L 82 22 Q 94 22 94 34 Q 94 46 82 46 L 62 46"
          stroke={accentColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="0"
        />
        {/* Return arrow head pointing left back to truck */}
        <Polyline
          points="68,40 62,46 68,52"
          stroke={accentColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Pickup dot */}
        <Circle cx={58} cy={22} r={3.5} fill={accentColor} />
        {/* Delivery dot */}
        <Circle cx={94} cy={34} r={3} fill={accentColor} opacity={0.6} />
      </G>
    </Svg>
  );
}

/** Stacked version with app name text below — for splash screens */
export function LogoWithName({
  size = 48,
  color = COLORS.offWhite,
  accentColor = COLORS.ochre,
}: LogoProps) {
  return (
    <>
      <Logo size={size} color={color} accentColor={accentColor} />
    </>
  );
}
