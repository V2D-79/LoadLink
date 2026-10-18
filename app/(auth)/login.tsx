/**
 * app/(auth)/login.tsx
 *
 * Full login screen. Accepts mobile number or email + password.
 * Links to forgot-password and signup.
 * Uses react-hook-form + Zod for validation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { loginSchema, type LoginFormData } from '../../src/validation/auth';
import { loginUser } from '../../src/services/authService';
import { Input } from '../../src/ui';
import Button from '../../src/ui/Button';
import { Logo } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII, DURATIONS } from '../../src/constants/theme';
import { APP_NAME } from '../../src/constants/app';
import { useAuthContext } from '../../src/hooks/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { firebaseUser, role } = useAuthContext();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Navigate when auth state updates after successful login
  useEffect(() => {
    // Only navigate if we have both user and role loaded
    if (firebaseUser && role) {
      console.log('[LoginScreen] Auth state updated, navigating based on role:', role);
      if (role === 'factory') {
        router.replace('/(factory)/jobs');
      } else if (role === 'driver') {
        router.replace('/(driver)/find');
      }
    }
  }, [firebaseUser, role, router]);

  const shakeX = useSharedValue(0);
  const errorShake = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrPhone: '', password: '' },
  });

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  };

  const onSubmit = async (data: LoginFormData) => {
    console.log('[LoginScreen] Submit with data:', data.emailOrPhone);
    setServerError('');
    setLoading(true);
    try {
      console.log('[LoginScreen] Calling loginUser...');
      const user = await loginUser(data.emailOrPhone, data.password);
      console.log('[LoginScreen] Login successful! User UID:', user.uid);
      console.log('[LoginScreen] Waiting for auth state to propagate...');
      
      // The useAuth hook will detect the login and update the context
      // The useEffect above will then navigate when firebaseUser and role are set
      
    } catch (err: any) {
      console.error('[LoginScreen] Login error:', err);
      setServerError(err.message ?? 'Login failed. Please try again.');
      shake();
      setLoading(false);
    }
    // Note: loading stays true on success, will be reset when component unmounts during navigation
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor={COLORS.charcoal} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ─────────────────────────────── */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityLabel="Go back"
              hitSlop={12}
            >
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
            <View style={styles.logoRow}>
              <Logo size={32} color={COLORS.offWhite} accentColor={COLORS.ochre} />
              <Text style={styles.appName}>{APP_NAME}</Text>
            </View>
          </View>

          {/* ── Form card ──────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Enter your mobile number or email and password
            </Text>

            {/* Server error */}
            {serverError.length > 0 && (
              <Animated.View style={[styles.errorBanner, errorShake]}>
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </Animated.View>
            )}

            {/* Mobile / Email field */}
            <Controller
              control={control}
              name="emailOrPhone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mobile Number or Email"
                  placeholder="e.g., 9876543210 or user@email.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="tel"
                  returnKeyType="next"
                  error={errors.emailOrPhone?.message}
                  accessibilityLabel="Mobile number or email input"
                />
              )}
            />

            {/* Password field */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  error={errors.password?.message}
                  accessibilityLabel="Password input"
                  rightElement={
                    <Pressable
                      onPress={() => setShowPassword((p) => !p)}
                      hitSlop={8}
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                    </Pressable>
                  }
                />
              )}
            />

            {/* Forgot password */}
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotBtn}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {/* Submit */}
            <Button
              title={loading ? '' : 'Log In'}
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              fullWidth
              size="lg"
              disabled={loading}
              accessibilityLabel="Log in button"
              style={{ marginTop: SPACING.sm }}
            >
              {loading && <ActivityIndicator color={COLORS.paperWhite} />}
            </Button>
          </View>

          {/* ── Footer ─────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/signup')}
              accessibilityRole="link"
              accessibilityLabel="Create account"
            >
              <Text style={styles.footerLink}>Create account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.charcoal,
  },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  backBtn: {
    marginBottom: SPACING.lg,
    alignSelf: 'flex-start',
  },
  backArrow: {
    fontSize: 22,
    color: COLORS.offWhite,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  appName: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.offWhite,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.paperWhite,
    borderRadius: RADII.xl,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  title: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.charcoal,
    marginBottom: SPACING.xxs,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: COLORS.brick + '15',
    borderWidth: 1,
    borderColor: COLORS.brick,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  errorBannerText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brick,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: SPACING.xxs,
    paddingVertical: SPACING.xxs,
  },
  forgotText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.ochre,
  },
  eyeIcon: {
    fontSize: 18,
    paddingHorizontal: SPACING.xxs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
    flexWrap: 'wrap',
  },
  footerText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
  },
  footerLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.ochre,
  },
});
