/**
 * app/(factory)/edit-job.tsx
 *
 * Edit existing job - simplified form for editing job details
 * Only allows editing certain fields while job is in 'open' status
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ref, get, update } from 'firebase/database';
import { StatusBar } from 'expo-status-bar';

import { getFirebaseDB } from '../../src/services/firebase';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { Input, Button, Card } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import {
  DB_PATHS,
  GOODS_CATEGORIES,
  VEHICLE_TYPES,
  BODY_TYPES,
  VEHICLE_TYPE_LABELS,
  BODY_TYPE_LABELS,
} from '../../src/constants/app';

// ── Zod schema ────────────────────────────────────────────────

const editJobSchema = z.object({
  goodsDescription: z.string().max(500).optional(),
  weightTonnes: z
    .number({ invalid_type_error: 'Enter weight' })
    .min(0.01, 'Weight must be > 0')
    .max(200),
  volumeCbm: z.number().min(0).max(1000).optional(),
  requiredBodyType: z.string().optional(),
  requiredVehicleType: z.string().optional(),
  budgetInr: z.number().min(100).max(9999999).optional(),
  availableFrom: z.string().min(1, 'Available-from date is required'),
  availableUntil: z.string().min(1, 'Available-until date is required'),
  specialInstructions: z.string().max(1000).optional(),
});

type EditJobFormData = z.infer<typeof editJobSchema>;

// ── Chip selector ─────────────────────────────────────────────

function ChipSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: SPACING.sm }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => onChange(value === o.value ? '' : o.value)}
            style={[
              s.chip,
              value === o.value && s.chipSelected,
            ]}
          >
            <Text style={[s.chipText, value === o.value && s.chipTextSelected]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '';
  return iso;
}

const VEHICLE_OPTIONS = VEHICLE_TYPES.map((v) => ({ value: v, label: VEHICLE_TYPE_LABELS[v] }));
const BODY_OPTIONS = BODY_TYPES.map((b) => ({ value: b, label: BODY_TYPE_LABELS[b] }));

// ── Main screen ───────────────────────────────────────────────

export default function EditJobScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const { firebaseUser } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [jobData, setJobData] = useState<any>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EditJobFormData>({
    resolver: zodResolver(editJobSchema),
  });

  // Load job data
  useEffect(() => {
    async function loadJob() {
      if (!jobId || !firebaseUser?.uid) return;
      
      try {
        const db = getFirebaseDB();
        const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
        
        if (!jobSnap.exists()) {
          Alert.alert('Error', 'Job not found');
          router.back();
          return;
        }
        
        const job = jobSnap.val();
        
        // Verify ownership
        if (job.factoryUid !== firebaseUser.uid) {
          Alert.alert('Error', 'You can only edit your own jobs');
          router.back();
          return;
        }
        
        // Check status
        if (job.status !== 'open') {
          Alert.alert('Error', 'You can only edit jobs in "open" status');
          router.back();
          return;
        }
        
        setJobData(job);
        
        // Populate form
        setValue('goodsDescription', job.goodsDescription || '');
        setValue('weightTonnes', job.weightTonnes || 0);
        setValue('volumeCbm', job.volumeCbm || 0);
        setValue('requiredBodyType', job.requiredBodyType || '');
        setValue('requiredVehicleType', job.requiredVehicleType || '');
        setValue('budgetInr', job.budgetInr || undefined);
        setValue('availableFrom', new Date(job.availableFrom).toISOString().split('T')[0] || '');
        setValue('availableUntil', new Date(job.availableUntil).toISOString().split('T')[0] || '');
        setValue('specialInstructions', job.specialInstructions || '');
        
        setLoading(false);
      } catch (err: any) {
        console.error('[EditJob] Error loading job:', err);
        Alert.alert('Error', 'Failed to load job data');
        router.back();
      }
    }
    
    loadJob();
  }, [jobId, firebaseUser?.uid]);

  // Save changes
  const saveChanges = async (data: EditJobFormData) => {
    if (!jobId || !firebaseUser?.uid) return;
    
    setSaving(true);
    setServerError('');
    
    try {
      const db = getFirebaseDB();
      const fromMs = new Date(data.availableFrom).getTime();
      const untilMs = new Date(data.availableUntil).getTime();
      
      const updates: any = {
        goodsDescription: data.goodsDescription || null,
        weightTonnes: data.weightTonnes,
        volumeCbm: data.volumeCbm || null,
        requiredVehicleType: data.requiredVehicleType || null,
        requiredBodyType: data.requiredBodyType || null,
        budgetInr: data.budgetInr || null,
        availableFrom: fromMs,
        availableUntil: untilMs,
        specialInstructions: data.specialInstructions || null,
        updatedAt: Date.now(),
      };
      
      await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), updates);
      
      Alert.alert('Success', 'Job updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error('[EditJob] Error saving:', err);
      setServerError(err.message || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.ochre} />
        <Text style={s.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={s.backArrow}>←</Text>
            </Pressable>
            <Text style={s.title}>Edit Job</Text>
          </View>

          {/* Route info (read-only) */}
          <Card style={s.infoCard}>
            <Text style={s.infoLabel}>Route (cannot be changed)</Text>
            <Text style={s.infoText}>
              {jobData?.pickupCity}, {jobData?.pickupState} → {jobData?.deliveryCity}, {jobData?.deliveryState}
            </Text>
            <Text style={s.infoLabel} style={{ marginTop: SPACING.xs }}>Category (cannot be changed)</Text>
            <Text style={s.infoText}>{jobData?.goodsCategory?.replace(/_/g, ' ')}</Text>
          </Card>

          {serverError.length > 0 && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{serverError}</Text>
            </View>
          )}

          {/* Editable fields */}
          <Controller
            control={control}
            name="goodsDescription"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Description (optional)"
                placeholder="Cotton fabric, 500 bales"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={2}
                accessibilityLabel="Goods description"
              />
            )}
          />

          <Controller
            control={control}
            name="weightTonnes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Total weight (tonnes) *"
                placeholder="10"
                value={value ? String(value) : ''}
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                error={errors.weightTonnes?.message}
                accessibilityLabel="Weight in tonnes"
              />
            )}
          />

          <Controller
            control={control}
            name="requiredVehicleType"
            render={({ field: { onChange, value } }) => (
              <ChipSelector 
                label="Required vehicle type (optional)" 
                options={VEHICLE_OPTIONS} 
                value={value ?? ''} 
                onChange={onChange} 
              />
            )}
          />

          <Controller
            control={control}
            name="requiredBodyType"
            render={({ field: { onChange, value } }) => (
              <ChipSelector 
                label="Required body type (optional)" 
                options={BODY_OPTIONS} 
                value={value ?? ''} 
                onChange={onChange} 
              />
            )}
          />

          <Controller
            control={control}
            name="availableFrom"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Goods ready from *"
                placeholder="YYYY-MM-DD"
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                maxLength={10}
                error={errors.availableFrom?.message}
                accessibilityLabel="Available from date"
              />
            )}
          />
          
          <Controller
            control={control}
            name="availableUntil"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Goods must be picked up by *"
                placeholder="YYYY-MM-DD"
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                maxLength={10}
                error={errors.availableUntil?.message}
                accessibilityLabel="Available until date"
              />
            )}
          />
          
          <Controller
            control={control}
            name="budgetInr"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Budget (₹) — drivers bid below this"
                placeholder="Leave blank if flexible"
                value={value ? String(value) : ''}
                onChangeText={(t) => onChange(parseFloat(t) || undefined)}
                onBlur={onBlur}
                keyboardType="numeric"
                error={errors.budgetInr?.message}
                accessibilityLabel="Budget in rupees"
              />
            )}
          />
          
          <Controller
            control={control}
            name="specialInstructions"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Special instructions (optional)"
                placeholder="Fragile goods, no stacking, etc."
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                accessibilityLabel="Special instructions"
              />
            )}
          />

          <Button
            title="Save Changes"
            onPress={handleSubmit(saveChanges)}
            variant="primary"
            fullWidth
            size="lg"
            loading={saving}
            style={{ marginTop: SPACING.md }}
          />
          
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            fullWidth
            size="lg"
            style={{ marginTop: SPACING.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  scroll: { flexGrow: 1, padding: SPACING.md, paddingBottom: SPACING.xxl },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.sm, 
    paddingTop: SPACING.xl, 
    marginBottom: SPACING.md 
  },
  backArrow: { fontSize: 22, color: COLORS.charcoal },
  title: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.charcoal },
  loadingText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
    marginTop: SPACING.sm,
  },
  infoCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.ochre + '10',
  },
  infoLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
    marginBottom: 2,
  },
  infoText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.charcoal,
  },
  fieldLabel: { 
    fontFamily: FONTS.bodyMedium, 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.primaryText, 
    marginBottom: SPACING.xs 
  },
  errorBanner: {
    backgroundColor: COLORS.brick + '15',
    borderWidth: 1,
    borderColor: COLORS.brick,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  errorText: { 
    fontFamily: FONTS.bodyMedium, 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.brick 
  },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.paperWhite,
  },
  chipSelected: {
    backgroundColor: COLORS.ochre,
    borderColor: COLORS.ochre,
  },
  chipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
  },
  chipTextSelected: {
    color: COLORS.paperWhite,
  },
});
