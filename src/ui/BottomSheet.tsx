/**
 * src/ui/BottomSheet.tsx
 *
 * Sliding bottom sheet using react-native-reanimated.
 * Handles Android back button to dismiss.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  BackHandler,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII, DURATIONS } from '../constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: number;
  style?: ViewStyle;
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeight = SCREEN_HEIGHT * 0.85,
  style,
}: BottomSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);

  const open = useCallback(() => {
    translateY.value = withTiming(0, { duration: DURATIONS.medium });
    overlayOpacity.value = withTiming(0.5, { duration: DURATIONS.medium });
  }, [translateY, overlayOpacity]);

  const close = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: DURATIONS.medium });
    overlayOpacity.value = withTiming(0, { duration: DURATIONS.medium }, () => {
      runOnJS(onClose)();
    });
  }, [translateY, overlayOpacity, onClose]);

  useEffect(() => {
    if (visible) {
      open();
    } else {
      close();
    }
  }, [visible, open, close]);

  // Handle Android hardware back button
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [visible, close]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 800) {
        runOnJS(close)();
      } else {
        translateY.value = withTiming(0, { duration: DURATIONS.fast });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible && translateY.value >= SCREEN_HEIGHT) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, { maxHeight }, sheetStyle, style]}>
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {title && (
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close sheet">
                <View style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </View>
              </Pressable>
            </View>
          )}

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: COLORS.charcoal,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.paperWhite,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingBottom: SPACING.xxl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: RADII.round,
    backgroundColor: COLORS.hairline,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.primaryText,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: RADII.round,
    backgroundColor: COLORS.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    color: COLORS.steel,
  },
});
