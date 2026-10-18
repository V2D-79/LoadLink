/**
 * app/(factory)/post.tsx
 *
 * Post-Job wizard — 5 steps:
 *   0: Pickup location (city search + optional coords)
 *   1: Delivery location
 *   2: Cargo details (category, weight, body type, loading equipment)
 *   3: Schedule & budget (dates, budget INR)
 *   4: Review & publish
 *
 * On publish: writes to jobs/{jobId}, jobPrivate/{jobId},
 * cellIndexJobs/{cellKey}/{jobId}, and increments counters/totalJobs.
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ref, push, set, serverTimestamp, increment } from 'firebase/database';
import Animated, { FadeIn } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { getFirebaseDB } from '../../src/services/firebase';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { writeJobCellIndex } from '../../src/engine/match';
import { findCity } from '../../src/data/cities';
import { Input, Button, Card, Chip } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import {
  DB_PATHS,
  GOODS_CATEGORIES,
  VEHICLE_TYPES,
  BODY_TYPES,
  VEHICLE_TYPE_LABELS,
  BODY_TYPE_LABELS,
  PAYMENT_TERMS,
  LOADING_RESPONSIBILITY,
} from '../../src/constants/app';
import { searchCities } from '../../src/data/cities';
import type { CityData } from '../../src/types';

// ── Zod schema ────────────────────────────────────────────────

const postJobSchema = z.object({
  pickupCity: z.string().min(1, 'Pickup city is required'),
  pickupState: z.string().min(1),
  pickupAddress: z.string().max(300).optional(),
  deliveryCity: z.string().min(1, 'Delivery city is required'),
  deliveryState: z.string().min(1),
  deliveryAddress: z.string().max(300).optional(),
  goodsCategory: z.string().min(1, 'Select a goods category'),
  goodsDescription: z.string().max(500).optional(),
  weightTonnes: z
    .number({ invalid_type_error: 'Enter weight' })
    .min(0.01, 'Weight must be > 0')
    .max(200),
  volumeCbm: z.number().min(0).max(1000).optional(),
  requiredBodyType: z.string().optional(),
  requiredVehicleType: z.string().optional(),
  budgetInr: z.number().min(100).max(9999999).optional(),
  paymentTerms: z.string().default('on_delivery'),
  loadingResponsibility: z.string().default('factory'),
  availableFrom: z.string().min(1, 'Available-from date is required'),
  availableUntil: z.string().min(1, 'Available-until date is required'),
  specialInstructions: z.string().max(1000).optional(),
});

type PostJobFormData = z.infer<typeof postJobSchema>;

// ── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return 'Not set';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayIso() {
  return new Date().toISOString().split('T')[0] ?? '';
}

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0] ?? '';
}

// ── Step dots ─────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={dotS.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[dotS.dot, i < current ? dotS.done : i === current ? dotS.active : dotS.idle]} />
      ))}
    </View>
  );
}
const dotS = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: SPACING.md },
  dot: { height: 6, borderRadius: 3 },
  active: { width: 20, backgroundColor: COLORS.ochre },
  done: { width: 8, backgroundColor: COLORS.olive },
  idle: { width: 8, backgroundColor: COLORS.hairline },
});

// ── City autocomplete field ───────────────────────────────────

function CityPicker({
  label,
  value,
  onSelect,
  error,
}: {
  label: string;
  value: string;
  onSelect: (city: CityData) => void;
  error?: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CityData[]>([]);
  const [open, setOpen] = useState(false);

  const handleSelect = (city: CityData) => {
    setQuery(city.name);
    setOpen(false);
    onSelect(city);
  };

  return (
    <View style={{ marginBottom: SPACING.md, position: 'relative' }}>
      <Input
        label={label}
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setResults(searchCities(t, 8));
          setOpen(t.length >= 2);
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => {
          // Delay closing to allow click to register
          setTimeout(() => setOpen(false), 300);
        }}
        placeholder="Start typing city name (e.g., Pune)"
        error={error}
        accessibilityLabel={label}
      />
      {open && results.length > 0 && (
        <View style={cpS.dropdown}>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {results.map((c) => (
              <Pressable
                key={`${c.name}-${c.state}`}
                onPress={() => handleSelect(c)}
                onPressIn={() => handleSelect(c)}
                style={cpS.item}
                accessibilityRole="menuitem"
                accessibilityLabel={`${c.name}, ${c.state}`}
              >
                <Text style={cpS.name}>{c.name}</Text>
                <Text style={cpS.state}>{c.state}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
const cpS = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: COLORS.paperWhite,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADII.md,
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  name: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.primaryText },
  state: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel },
});

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
          <Chip
            key={o.value}
            label={o.label}
            selected={value === o.value}
            onPress={() => onChange(value === o.value ? '' : o.value)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

const GOODS_OPTIONS = GOODS_CATEGORIES.map((c) => ({
  value: c,
  label: c
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' '),
}));

const VEHICLE_OPTIONS = VEHICLE_TYPES.map((v) => ({ value: v, label: VEHICLE_TYPE_LABELS[v] }));
const BODY_OPTIONS = BODY_TYPES.map((b) => ({ value: b, label: BODY_TYPE_LABELS[b] }));

export default function PostJobScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuthContext();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  // Store resolved city coords
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Setup global callback for location selection
  useEffect(() => {
    global.onLocationSelected = (data: { type: string; location: { latitude: number; longitude: number; address?: string } }) => {
      console.log('[PostJob] Location selected:', data);
      
      if (data.type === 'pickup') {
        setPickupCoords({ lat: data.location.latitude, lng: data.location.longitude });
        
        // Try to parse city and state from address
        const addressParts = data.location.address?.split(',').map(s => s.trim()) || [];
        const cityName = addressParts[0] || 'Selected Location';
        const stateName = addressParts[addressParts.length - 2] || 'India';
        
        console.log('[PostJob] Setting pickup:', { cityName, stateName, address: data.location.address });
        
        setValue('pickupCity', cityName, { shouldValidate: true });
        setValue('pickupState', stateName, { shouldValidate: true });
        setValue('pickupAddress', data.location.address || '', { shouldValidate: false });
        
      } else if (data.type === 'delivery') {
        setDeliveryCoords({ lat: data.location.latitude, lng: data.location.longitude });
        
        // Try to parse city and state from address
        const addressParts = data.location.address?.split(',').map(s => s.trim()) || [];
        const cityName = addressParts[0] || 'Selected Location';
        const stateName = addressParts[addressParts.length - 2] || 'India';
        
        console.log('[PostJob] Setting delivery:', { cityName, stateName, address: data.location.address });
        
        setValue('deliveryCity', cityName, { shouldValidate: true });
        setValue('deliveryState', stateName, { shouldValidate: true });
        setValue('deliveryAddress', data.location.address || '', { shouldValidate: false });
      }
    };

    return () => {
      global.onLocationSelected = undefined;
    };
  }, [setValue]);

  const {
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<PostJobFormData>({
    resolver: zodResolver(postJobSchema),
    defaultValues: {
      pickupCity: '',
      pickupState: '',
      deliveryCity: '',
      deliveryState: '',
      goodsCategory: '',
      weightTonnes: 0,
      paymentTerms: 'on_delivery',
      loadingResponsibility: 'factory',
      availableFrom: todayIso(),
      availableUntil: addDays(todayIso(), 7),
      requiredBodyType: '',
      requiredVehicleType: '',
    },
  });

  // ── Publish ───────────────────────────────────────────────

  const publish = async (data: PostJobFormData) => {
    if (!firebaseUser) return;
    setLoading(true);
    setServerError('');
    try {
      const db = getFirebaseDB();
      const jobRef = push(ref(db, DB_PATHS.jobs));
      const jobId = jobRef.key!;

      const pLat = pickupCoords?.lat ?? 0;
      const pLng = pickupCoords?.lng ?? 0;
      const dLat = deliveryCoords?.lat ?? 0;
      const dLng = deliveryCoords?.lng ?? 0;

      // Approximate coords (0.05° ≈ 5.5 km) for privacy before assignment
      const approxLat = (v: number) => Math.round(v / 0.05) * 0.05;

      const now = serverTimestamp();
      const fromMs = new Date(data.availableFrom).getTime();
      const untilMs = new Date(data.availableUntil).getTime();

      await set(jobRef, {
        jobId,
        factoryUid: firebaseUser.uid,
        status: 'open',
        pickupCity: data.pickupCity,
        pickupState: data.pickupState,
        pickupLat: approxLat(pLat),
        pickupLng: approxLat(pLng),
        deliveryCity: data.deliveryCity,
        deliveryState: data.deliveryState,
        deliveryLat: approxLat(dLat),
        deliveryLng: approxLat(dLng),
        goodsCategory: data.goodsCategory,
        goodsDescription: data.goodsDescription ?? null,
        weightTonnes: data.weightTonnes,
        volumeCbm: data.volumeCbm ?? null,
        requiredVehicleType: data.requiredVehicleType || null,
        requiredBodyType: data.requiredBodyType || null,
        budgetInr: data.budgetInr ?? null,
        paymentTerms: data.paymentTerms,
        loadingResponsibility: data.loadingResponsibility,
        availableFrom: fromMs,
        availableUntil: untilMs,
        specialInstructions: data.specialInstructions ?? null,
        bidCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      // Private exact coords & addresses
      await set(ref(db, `${DB_PATHS.jobPrivate}/${jobId}`), {
        jobId,
        factoryUid: firebaseUser.uid,
        pickupExactLat: pLat,
        pickupExactLng: pLng,
        pickupAddress: data.pickupAddress ?? null,
        deliveryExactLat: dLat,
        deliveryExactLng: dLng,
        deliveryAddress: data.deliveryAddress ?? null,
        createdAt: now,
      });

      // Cell index for matching
      await writeJobCellIndex(jobId, {
        pickupLat: pLat,
        pickupLng: pLng,
        deliveryLat: dLat,
        deliveryLng: dLng,
      });

      // Increment global counter
      await set(ref(db, 'counters/totalJobs'), increment(1));

      setDone(true);
    } catch (err: any) {
      setServerError(err.message ?? 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }]}>
        <Text style={s.doneEmoji}>📦</Text>
        <Text style={s.doneTitle}>Job Posted!</Text>
        <Text style={s.doneSub}>Drivers matching your route will be notified. You'll see bids on the My Jobs tab.</Text>
        <Button
          title="View My Jobs"
          onPress={() => router.replace('/(factory)/jobs')}
          variant="primary"
          size="lg"
          style={{ marginTop: SPACING.xl }}
        />
        <Button
          title="Post Another Job"
          onPress={() => {
            setDone(false);
            setStep(0);
          }}
          variant="outline"
          size="lg"
          style={{ marginTop: SPACING.sm }}
        />
      </View>
    );
  }

  // ── Step content ──────────────────────────────────────────

  const stepTitles = ['Pickup', 'Delivery', 'Cargo', 'Schedule', 'Review'];

  async function next(fields: (keyof PostJobFormData)[]) {
    const ok = await trigger(fields);
    if (ok) setStep((p) => p + 1);
  }

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => { if (step === 0) router.back(); else setStep(p => p - 1); }} hitSlop={12}>
              <Text style={s.backArrow}>←</Text>
            </Pressable>
            <Text style={s.title}>Post Transport Job</Text>
          </View>

          <StepDots total={5} current={step} />
          <Text style={s.stepLabel}>{stepTitles[step]}</Text>

          {serverError.length > 0 && (
            <View style={s.errorBanner}><Text style={s.errorText}>{serverError}</Text></View>
          )}

          {/* ── Step 0: Pickup ─── */}
          {step === 0 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Controller
                control={control}
                name="pickupCity"
                render={({ field: { value } }) => (
                  <CityPicker
                    label="Pickup City *"
                    value={value}
                    error={errors.pickupCity?.message}
                    onSelect={(c) => {
                      setValue('pickupCity', c.name);
                      setValue('pickupState', c.state);
                      setPickupCoords({ lat: c.lat, lng: c.lng });
                    }}
                  />
                )}
              />
              <Button 
                title="📍 Or Select on Map" 
                onPress={() => router.push({
                  pathname: '/(factory)/location-select',
                  params: {
                    title: 'Select Pickup Location',
                    type: 'pickup',
                    lat: pickupCoords?.lat?.toString() || '',
                    lng: pickupCoords?.lng?.toString() || '',
                    address: getValues('pickupAddress') || '',
                  },
                })}
                variant="outline" 
                fullWidth 
                size="md"
                style={{ marginBottom: SPACING.md }}
              />
              <Controller
                control={control}
                name="pickupAddress"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Exact Pickup Address (Optional)"
                    placeholder="e.g., Plot 5, MIDC Phase 2, Pune - 411018"
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={2}
                    accessibilityLabel="Pickup address"
                  />
                )}
              />
              <Button title="Next: Delivery" onPress={() => next(['pickupCity', 'pickupState'])} variant="primary" fullWidth size="lg" />
            </Animated.View>
          )}

          {/* ── Step 1: Delivery ─── */}
          {step === 1 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Controller
                control={control}
                name="deliveryCity"
                render={({ field: { value } }) => (
                  <CityPicker
                    label="Delivery City *"
                    value={value}
                    error={errors.deliveryCity?.message}
                    onSelect={(c) => {
                      setValue('deliveryCity', c.name);
                      setValue('deliveryState', c.state);
                      setDeliveryCoords({ lat: c.lat, lng: c.lng });
                    }}
                  />
                )}
              />
              <Button 
                title="📍 Or Select on Map" 
                onPress={() => router.push({
                  pathname: '/(factory)/location-select',
                  params: {
                    title: 'Select Delivery Location',
                    type: 'delivery',
                    lat: deliveryCoords?.lat?.toString() || '',
                    lng: deliveryCoords?.lng?.toString() || '',
                    address: getValues('deliveryAddress') || '',
                  },
                })}
                variant="outline" 
                fullWidth 
                size="md"
                style={{ marginBottom: SPACING.md }}
              />
              <Controller
                control={control}
                name="deliveryAddress"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Exact Delivery Address (Optional)"
                    placeholder="e.g., Warehouse 12, Industrial Area, Kolhapur - 416001"
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={2}
                    accessibilityLabel="Delivery address"
                  />
                )}
              />
              <Button title="Next: Cargo" onPress={() => next(['deliveryCity', 'deliveryState'])} variant="primary" fullWidth size="lg" />
            </Animated.View>
          )}

          {/* ── Step 2: Cargo ─── */}
          {step === 2 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Controller
                control={control}
                name="goodsCategory"
                render={({ field: { onChange, value } }) => (
                  <ChipSelector label="Goods category *" options={GOODS_OPTIONS} value={value} onChange={onChange} />
                )}
              />
              {errors.goodsCategory && <Text style={s.fieldError}>{errors.goodsCategory.message}</Text>}

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
                  <ChipSelector label="Required vehicle type (optional)" options={VEHICLE_OPTIONS} value={value ?? ''} onChange={onChange} />
                )}
              />

              <Controller
                control={control}
                name="requiredBodyType"
                render={({ field: { onChange, value } }) => (
                  <ChipSelector label="Required body type (optional)" options={BODY_OPTIONS} value={value ?? ''} onChange={onChange} />
                )}
              />

              <Button title="Next: Schedule" onPress={() => next(['goodsCategory', 'weightTonnes'])} variant="primary" fullWidth size="lg" />
            </Animated.View>
          )}

          {/* ── Step 3: Schedule & Budget ─── */}
          {step === 3 && (
            <Animated.View entering={FadeIn.duration(300)}>
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
              <Button title="Review & Publish" onPress={() => next(['availableFrom', 'availableUntil'])} variant="primary" fullWidth size="lg" />
            </Animated.View>
          )}

          {/* ── Step 4: Review ─── */}
          {step === 4 && (
            <Animated.View entering={FadeIn.duration(300)}>
              {[
                { label: 'Pickup', value: `${getValues('pickupCity')}, ${getValues('pickupState')}` },
                { label: 'Delivery', value: `${getValues('deliveryCity')}, ${getValues('deliveryState')}` },
                { label: 'Category', value: getValues('goodsCategory').replace(/_/g, ' ') },
                { label: 'Weight', value: `${getValues('weightTonnes')} tonnes` },
                { label: 'Available', value: `${formatDate(getValues('availableFrom'))} – ${formatDate(getValues('availableUntil'))}` },
                { label: 'Budget', value: getValues('budgetInr') ? `₹${getValues('budgetInr')}` : 'Flexible' },
              ].map((row) => (
                <Card key={row.label} style={{ marginBottom: SPACING.xs, padding: SPACING.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.reviewLabel}>{row.label}</Text>
                    <Text style={s.reviewValue}>{row.value}</Text>
                  </View>
                </Card>
              ))}

              <Button
                title="Publish Job"
                onPress={handleSubmit(publish)}
                variant="primary"
                fullWidth
                size="lg"
                loading={loading}
                style={{ marginTop: SPACING.md }}
              />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  scroll: { flexGrow: 1, padding: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingTop: SPACING.xl, marginBottom: SPACING.md },
  backArrow: { fontSize: 22, color: COLORS.charcoal },
  title: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.charcoal },
  stepLabel: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.xl, color: COLORS.charcoal, marginBottom: SPACING.md },
  fieldLabel: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.primaryText, marginBottom: SPACING.xs },
  fieldError: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.brick, marginBottom: SPACING.xs },
  errorBanner: {
    backgroundColor: COLORS.brick + '15', borderWidth: 1, borderColor: COLORS.brick,
    borderRadius: RADII.sm, padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  errorText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.brick },
  reviewLabel: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.steel },
  reviewValue: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.charcoal, flexShrink: 1, textAlign: 'right', marginLeft: SPACING.sm },
  doneEmoji: { fontSize: 56, textAlign: 'center', marginBottom: SPACING.md },
  doneTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xxl, color: COLORS.charcoal, textAlign: 'center' },
  doneSub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, textAlign: 'center', lineHeight: 22, marginTop: SPACING.xs },
});
