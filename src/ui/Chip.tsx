/**
 * src/ui/Chip.tsx
 *
 * Status chip / tag component for job statuses, filters, etc.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII, MIN_TOUCH_TARGET } from '../constants/theme';
import type { JobStatus } from '../constants/app';

type ColorEntry = { bg: string; text: string };

const STATUS_COLORS: Partial<Record<string, ColorEntry>> & { default: ColorEntry } = {
  open: { bg: '#B8741A20', text: COLORS.ochre },
  offered: { bg: '#9C4A2B20', text: COLORS.rust },
  accepted: { bg: '#5B6B3A20', text: COLORS.olive },
  heading_to_pickup: { bg: '#1E222420', text: COLORS.charcoal },
  loaded: { bg: '#5B6B3A20', text: COLORS.olive },
  in_transit: { bg: '#1E222420', text: COLORS.charcoal },
  delivered: { bg: '#5B6B3A20', text: COLORS.olive },
  completed: { bg: '#5B6B3A20', text: COLORS.olive },
  cancelled: { bg: '#A33A2E20', text: COLORS.brick },
  expired: { bg: '#6B737820', text: COLORS.steel },
  default: { bg: COLORS.hairline, text: COLORS.primaryText },
};

interface ChipProps {
  label: string;
  status?: string;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
}

export default function Chip({
  label,
  status,
  onPress,
  selected = false,
  style,
}: ChipProps) {
  const colors = status
    ? (STATUS_COLORS[status] ?? STATUS_COLORS.default)
    : selected
      ? { bg: COLORS.ochre, text: COLORS.paperWhite }
      : STATUS_COLORS.default;

  const chipStyle = [
    styles.chip,
    {
      backgroundColor: colors.bg,
      borderColor: selected ? COLORS.ochre : 'transparent',
      borderWidth: selected ? 1 : 0,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={chipStyle}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={chipStyle}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADII.round,
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
  },
});
