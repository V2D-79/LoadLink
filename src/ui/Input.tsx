/**
 * src/ui/Input.tsx
 *
 * Text input component with label, error state, icon support,
 * keyboard-aware number pad switching, and full TextInput prop passthrough.
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type ViewStyle,
  type TextInputSubmitEditingEventData,
  type NativeSyntheticEvent,
} from 'react-native';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII, MIN_TOUCH_TARGET } from '../constants/theme';

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onSubmitEditing?: (e?: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** @deprecated use autoComplete from TextInput directly */
  autoComplete?: string;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  leftIcon?: React.ReactNode;
  /** Replaces rightIcon + right icon press; renders any element in the right slot */
  rightElement?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
  helperText?: string;
}

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  onFocus,
  onSubmitEditing,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  returnKeyType,
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  leftIcon,
  rightElement,
  rightIcon,
  onRightIconPress,
  style,
  accessibilityLabel,
  helperText,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? COLORS.brick
    : focused
      ? COLORS.ochre
      : COLORS.hairline;

  const rightSlot = rightElement ?? rightIcon;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor: editable ? COLORS.paperWhite : COLORS.offWhite,
          },
          multiline && { minHeight: numberOfLines * 24 + SPACING.md * 2, alignItems: 'flex-start' },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
            !editable && styles.disabledInput,
          ]}
          value={value}
          onChangeText={onChangeText}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={COLORS.steel}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          accessibilityLabel={accessibilityLabel ?? label}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {rightSlot && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.iconRight}
            hitSlop={8}
            accessibilityRole="button"
            disabled={!onRightIconPress && !rightElement}
          >
            {rightSlot}
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {helperText && !error && <Text style={styles.helper}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryText,
    marginBottom: SPACING.xxs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADII.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.md,
    color: COLORS.primaryText,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  multilineInput: {
    paddingTop: SPACING.sm,
  },
  disabledInput: {
    color: COLORS.steel,
  },
  iconLeft: {
    paddingLeft: SPACING.sm,
  },
  iconRight: {
    paddingRight: SPACING.sm,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brick,
    marginTop: SPACING.xxs,
  },
  helper: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
    marginTop: SPACING.xxs,
  },
});
