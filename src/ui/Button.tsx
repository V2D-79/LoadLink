/**
 * src/ui/Button.tsx
 *
 * Primary button component with press feedback animation.
 * Variants: primary, secondary, outline, ghost, danger.
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII, MIN_TOUCH_TARGET, DURATIONS } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: COLORS.ochre, text: COLORS.paperWhite },
  secondary: { bg: COLORS.rust, text: COLORS.paperWhite },
  outline: { bg: 'transparent', text: COLORS.ochre, border: COLORS.ochre },
  ghost: { bg: 'transparent', text: COLORS.ochre },
  danger: { bg: COLORS.brick, text: COLORS.paperWhite },
};

const SIZE_STYLES: Record<ButtonSize, { py: number; px: number; fontSize: number }> = {
  sm: { py: SPACING.xs, px: SPACING.sm, fontSize: FONT_SIZES.sm },
  md: { py: SPACING.sm, px: SPACING.md, fontSize: FONT_SIZES.md },
  lg: { py: SPACING.md, px: SPACING.lg, fontSize: FONT_SIZES.md },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <AnimatedPressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: DURATIONS.fast });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: DURATIONS.fast });
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        {
          backgroundColor: disabled ? COLORS.hairline : v.bg,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: disabled ? COLORS.steel : v.text,
                fontSize: s.fontSize,
                marginLeft: icon ? SPACING.xs : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  text: {
    fontFamily: FONTS.bodySemiBold,
    textAlign: 'center',
  },
});
