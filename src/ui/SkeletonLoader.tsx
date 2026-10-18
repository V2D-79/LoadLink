/**
 * src/ui/SkeletonLoader.tsx
 *
 * Shimmer skeleton for loading states.
 * Uses react-native-reanimated for smooth animation.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { COLORS, RADII, DURATIONS } from '../constants/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 16, borderRadius = RADII.xs, style }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700 }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: COLORS.hairline,
        },
        animStyle,
        style,
      ]}
    />
  );
}

/** Pre-built job card skeleton */
export function JobCardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.row}>
        <SkeletonBox width="60%" height={18} />
        <SkeletonBox width="25%" height={22} borderRadius={RADII.round} />
      </View>
      <SkeletonBox width="40%" height={14} style={{ marginTop: 10 }} />
      <SkeletonBox width="80%" height={14} style={{ marginTop: 8 }} />
      <View style={[styles.row, { marginTop: 12 }]}>
        <SkeletonBox width="30%" height={14} />
        <SkeletonBox width="30%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardSkeleton: {
    backgroundColor: COLORS.paperWhite,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: 16,
    marginBottom: 12,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
