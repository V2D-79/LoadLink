/**
 * src/ui/Card.tsx
 *
 * Card container with hairline border (no heavy shadows per spec).
 * Supports press handler for list items.
 */

import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { COLORS, SPACING, RADII } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export default function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.paperWhite,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: SPACING.md,
  },
  pressed: {
    backgroundColor: COLORS.offWhite,
  },
});
