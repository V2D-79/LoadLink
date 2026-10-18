/**
 * src/ui/EmptyState.tsx
 *
 * Designed empty state with vector illustration, heading and sub-text.
 * No lorem ipsum; each usage provides real copy.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Line, Circle, Rect, Path } from 'react-native-svg';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../constants/theme';
import Button from './Button';

type IllustrationType = 'jobs' | 'bids' | 'route' | 'notifications' | 'history' | 'generic';

interface EmptyStateProps {
  type?: IllustrationType;
  heading: string;
  subText?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

/** Road-line dashed illustration for empty job lists */
function RoadIllustration({ type }: { type: IllustrationType }) {
  return (
    <Svg width={160} height={100} viewBox="0 0 160 100">
      {/* Road */}
      <Rect x={20} y={44} width={120} height={12} rx={2} fill={COLORS.hairline} />
      {/* Road markings */}
      {[30, 50, 70, 90, 110].map((x) => (
        <Rect key={x} x={x} y={49} width={10} height={2} rx={1} fill={COLORS.offWhite} />
      ))}
      {/* Pickup pin */}
      <Circle cx={35} cy={35} r={10} fill={COLORS.ochre + '30'} />
      <Circle cx={35} cy={35} r={5} fill={COLORS.ochre} />
      {/* Delivery pin */}
      <Circle cx={125} cy={35} r={10} fill={COLORS.rust + '30'} />
      <Circle cx={125} cy={35} r={5} fill={COLORS.rust} />
      {/* Route line */}
      <Line x1={35} y1={35} x2={125} y2={35} stroke={COLORS.ochre} strokeWidth={2} strokeDasharray="6,4" />
      {/* Truck silhouette (only for certain types) */}
      {type === 'jobs' && (
        <>
          <Rect x={68} y={22} width={24} height={14} rx={2} fill={COLORS.charcoal} />
          <Rect x={60} y={28} width={12} height={8} rx={1} fill={COLORS.steel} />
          <Circle cx={66} cy={38} r={3} fill={COLORS.charcoal} />
          <Circle cx={86} cy={38} r={3} fill={COLORS.charcoal} />
        </>
      )}
      {type === 'bids' && (
        <Path
          d="M72 18 L80 10 L88 18 L85 18 L85 30 L75 30 L75 18 Z"
          fill={COLORS.ochre}
          opacity={0.7}
        />
      )}
      {type === 'notifications' && (
        <>
          <Rect x={68} y={12} width={24} height={20} rx={3} fill={COLORS.steel} opacity={0.5} />
          <Circle cx={80} cy={36} r={3} fill={COLORS.steel} opacity={0.5} />
        </>
      )}
    </Svg>
  );
}

export default function EmptyState({
  type = 'generic',
  heading,
  subText,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <RoadIllustration type={type} />
      <Text style={styles.heading}>{heading}</Text>
      {subText && <Text style={styles.subText}>{subText}</Text>}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="sm"
          style={{ marginTop: SPACING.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  heading: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.primaryText,
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  subText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
    textAlign: 'center',
    lineHeight: 20,
  },
});
