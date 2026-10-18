/**
 * app/(auth)/forgot-password.tsx
 *
 * Forgot-password screen. Accepts email, fires sendPasswordResetEmail.
 * Phone-based users don't have a direct email — we show a note.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StatusBar } from 'expo-status-bar';

import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../src/validation/auth';
import { sendReset } from '../../src/services/authService';
import { Input, Button } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { APP_NAME } from '../../src/constants/app';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError('');
    setLoading(true);
    try {
      await sendReset(data.email);
      setSent(true);
    } catch (err: any) {
      setServerError(err.message ?? 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor={COLORS.charcoal} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12} accessibilityLabel="Go back">
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
            <Text style={styles.screenTitle}>{APP_NAME}</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {sent ? (
              /* ── Success state ── */
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.body}>
                  We sent a password reset link to{'\n'}
                  <Text style={styles.email}>{getValues('email')}</Text>
                </Text>
                <Text style={[styles.body, { marginTop: SPACING.sm }]}>
                  If you signed up with a mobile number and don't have a linked email, please contact support.
                </Text>
                <Button
                  title="Back to Log In"
                  onPress={() => router.replace('/(auth)/login')}
                  variant="primary"
                  fullWidth
                  size="lg"
                  style={{ marginTop: SPACING.lg }}
                />
              </View>
            ) : (
              /* ── Form state ── */
              <>
                <Text style={styles.title}>Reset password</Text>
                <Text style={styles.body}>
                  Enter the email linked to your account and we'll send you a reset link.
                </Text>

                {serverError.length > 0 && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{serverError}</Text>
                  </View>
                )}

                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Email address"
                      placeholder="you@example.com"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="send"
                      onSubmitEditing={handleSubmit(onSubmit)}
                      error={errors.email?.message}
                      accessibilityLabel="Email address input"
                    />
                  )}
                />

                <Button
                  title="Send Reset Link"
                  onPress={handleSubmit(onSubmit)}
                  variant="primary"
                  fullWidth
                  size="lg"
                  loading={loading}
                  style={{ marginTop: SPACING.sm }}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.charcoal },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  header: { paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  backBtn: { marginBottom: SPACING.lg, alignSelf: 'flex-start' },
  backArrow: { fontSize: 22, color: COLORS.offWhite },
  screenTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.offWhite, letterSpacing: 0.5 },
  card: { backgroundColor: COLORS.paperWhite, borderRadius: RADII.xl, padding: SPACING.lg, gap: SPACING.sm },
  successBox: { alignItems: 'center', paddingVertical: SPACING.md },
  successIcon: { fontSize: 48, marginBottom: SPACING.md },
  title: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.charcoal, marginBottom: SPACING.xs },
  body: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, lineHeight: 20, textAlign: 'center' },
  email: { fontFamily: FONTS.bodySemiBold, color: COLORS.charcoal },
  errorBanner: {
    backgroundColor: COLORS.brick + '15',
    borderWidth: 1,
    borderColor: COLORS.brick,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
  },
  errorText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.brick },
});
