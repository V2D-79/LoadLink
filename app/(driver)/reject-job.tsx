/**
 * app/(driver)/reject-job.tsx
 *
 * Feedback screen for rejecting a job offer or cancelling an accepted job
 * Collects reason from driver to inform factory
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAuthContext } from '../../src/hooks/AuthContext';
import { rejectAssignment, cancelAcceptedJob } from '../../src/services/bidService';
import { Button } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';

// Common rejection reasons
const COMMON_REASONS = [
  '🚗 Vehicle breakdown or maintenance issue',
  '🏥 Family emergency or personal health issue',
  '📅 Schedule conflict with another commitment',
  '💰 Found a better offer elsewhere',
  '📍 Distance or route not suitable',
  '⏰ Pickup/delivery timing doesn\'t work',
  '🔧 Don\'t have the required vehicle type',
  '💼 Business policy or regulation issue',
];

export default function RejectJobScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuthContext();
  const { jobId, assignmentId, isEmergency } = useLocalSearchParams<{
    jobId: string;
    assignmentId?: string;
    isEmergency: string;
  }>();

  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isEmergencyCancel = isEmergency === 'true';

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    setCustomReason(''); // Clear custom reason when selecting preset
  };

  const getFinalReason = () => {
    if (customReason.trim()) return customReason.trim();
    if (selectedReason) return selectedReason;
    return '';
  };

  const handleSubmit = async () => {
    const finalReason = getFinalReason();
    
    if (!finalReason) {
      Alert.alert('Reason Required', 'Please select or enter a reason for rejection.');
      return;
    }

    if (!jobId || !firebaseUser?.uid) {
      Alert.alert('Error', 'Missing job information');
      return;
    }

    setLoading(true);

    try {
      if (isEmergencyCancel) {
        // Cancel accepted job (emergency)
        await cancelAcceptedJob(jobId, firebaseUser.uid, finalReason);
        Alert.alert(
          'Job Cancelled',
          'The factory has been notified of your cancellation. Please contact them if needed.',
          [{ text: 'OK', onPress: () => router.replace('/(driver)/activity') }]
        );
      } else {
        // Reject offer
        if (!assignmentId) {
          Alert.alert('Error', 'Assignment information missing');
          return;
        }
        await rejectAssignment(jobId, assignmentId, firebaseUser.uid, finalReason);
        Alert.alert(
          'Offer Rejected',
          'The factory has been notified of your decision.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit. Please try again.');
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={COLORS.charcoal} />
            </Pressable>
          </View>

          {/* Icon and Title */}
          <View style={s.heroSection}>
            <View style={s.iconCircle}>
              <Ionicons 
                name={isEmergencyCancel ? "alert-circle" : "close-circle"} 
                size={56} 
                color={COLORS.brick} 
              />
            </View>
            <Text style={s.title}>
              {isEmergencyCancel ? 'Cancel Accepted Job' : 'Reject Job Offer'}
            </Text>
            <Text style={s.subtitle}>
              {isEmergencyCancel 
                ? 'We understand emergencies happen. Please help us notify the factory by providing a reason.'
                : 'Help us improve by letting the factory know why this job isn\'t a good fit.'}
            </Text>
          </View>

          {/* Warning for emergency cancel */}
          {isEmergencyCancel && (
            <View style={s.warningBox}>
              <Ionicons name="warning" size={20} color={COLORS.ochre} />
              <Text style={s.warningText}>
                Frequent cancellations may affect your rating and future job offers.
              </Text>
            </View>
          )}

          {/* Quick Reasons */}
          <Text style={s.sectionTitle}>Select a reason (optional)</Text>
          <View style={s.reasonsGrid}>
            {COMMON_REASONS.map((reason, index) => (
              <Pressable
                key={index}
                onPress={() => handleReasonSelect(reason)}
                style={[
                  s.reasonChip,
                  selectedReason === reason && s.reasonChipSelected,
                ]}
              >
                <Text style={[
                  s.reasonChipText,
                  selectedReason === reason && s.reasonChipTextSelected,
                ]}>
                  {reason}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom Reason */}
          <Text style={s.sectionTitle}>Or write your own reason</Text>
          <TextInput
            style={s.textInput}
            placeholder="Explain why you're rejecting this job..."
            placeholderTextColor={COLORS.steel}
            value={customReason}
            onChangeText={(text) => {
              setCustomReason(text);
              setSelectedReason(''); // Clear selected when typing
            }}
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{customReason.length}/500 characters</Text>

          {/* Preview */}
          {getFinalReason() && (
            <View style={s.previewBox}>
              <Text style={s.previewLabel}>Your feedback:</Text>
              <Text style={s.previewText}>{getFinalReason()}</Text>
            </View>
          )}

          {/* Buttons */}
          <Button
            title={isEmergencyCancel ? 'Confirm Cancellation' : 'Confirm Rejection'}
            onPress={handleSubmit}
            variant="danger"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!getFinalReason()}
            style={{ marginTop: SPACING.lg }}
          />

          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="ghost"
            size="md"
            fullWidth
            style={{ marginTop: SPACING.sm }}
          />

          <Text style={s.footerNote}>
            {isEmergencyCancel 
              ? 'The factory will be notified immediately and may contact you.'
              : 'Your feedback helps factories improve their job postings and understand driver preferences.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    paddingTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.brick + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.xxl,
    color: COLORS.charcoal,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.ochre + '15',
    borderWidth: 1,
    borderColor: COLORS.ochre,
    borderRadius: RADII.md,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  warningText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.charcoal,
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.charcoal,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  reasonsGrid: {
    gap: SPACING.xs,
  },
  reasonChip: {
    backgroundColor: COLORS.paperWhite,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    borderRadius: RADII.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  reasonChipSelected: {
    backgroundColor: COLORS.brick + '10',
    borderColor: COLORS.brick,
  },
  reasonChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.charcoal,
  },
  reasonChipTextSelected: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.brick,
  },
  textInput: {
    backgroundColor: COLORS.paperWhite,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    borderRadius: RADII.md,
    padding: SPACING.sm,
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.charcoal,
    minHeight: 120,
  },
  charCount: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.steel,
    textAlign: 'right',
    marginTop: SPACING.xxs,
  },
  previewBox: {
    backgroundColor: COLORS.olive + '10',
    borderWidth: 1,
    borderColor: COLORS.olive,
    borderRadius: RADII.md,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  previewLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
    marginBottom: SPACING.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.charcoal,
    lineHeight: 20,
  },
  footerNote: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
});
