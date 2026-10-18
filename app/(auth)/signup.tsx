/**
 * app/(auth)/signup.tsx
 *
 * Multi-step signup wizard:
 *   Step 0: Role chooser (Factory or Driver)
 *   Step 1: Personal details (name, phone, city, state, language, password)
 *   Step 2a (factory): Organisation details (orgName, GST, address)
 *   Step 2b (driver):  Truck details (regNo, vehicleType, bodyType, capacity)
 *   Step 3: Success splash with auto-redirect
 *
 * Uses react-hook-form + Zod. RTDB write via authService.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

import {
  factorySignupSchema,
  driverSignupSchema,
  type FactorySignupFormData,
  type DriverSignupFormData,
} from '../../src/validation/auth';
import { signUpFactory, signUpDriver, isPhoneRegistered } from '../../src/services/authService';
import { Input, Button, Logo } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { APP_NAME, VEHICLE_TYPE_LABELS, BODY_TYPE_LABELS } from '../../src/constants/app';
import { searchCities, getStates } from '../../src/data/cities';
import type { CityData } from '../../src/types';

type Role = 'factory' | 'driver';

// ── Step progress indicator ──────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i < current
              ? dotStyles.dotDone
              : i === current
                ? dotStyles.dotActive
                : dotStyles.dotIdle,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: SPACING.lg },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 20, backgroundColor: COLORS.ochre },
  dotDone: { width: 8, backgroundColor: COLORS.olive },
  dotIdle: { width: 8, backgroundColor: COLORS.hairline },
});

// ── Role card ────────────────────────────────────────────────

function RoleCard({
  icon,
  title,
  description,
  selected,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[roleStyles.card, selected && roleStyles.cardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={roleStyles.iconWrap}>{icon}</View>
      <View style={roleStyles.textWrap}>
        <Text style={[roleStyles.title, selected && roleStyles.titleSelected]}>{title}</Text>
        <Text style={roleStyles.desc}>{description}</Text>
      </View>
      <View style={[roleStyles.radio, selected && roleStyles.radioSelected]}>
        {selected && <View style={roleStyles.radioInner} />}
      </View>
    </Pressable>
  );
}

const roleStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    borderRadius: RADII.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.paperWhite,
  },
  cardSelected: {
    borderColor: COLORS.ochre,
    backgroundColor: COLORS.ochre + '08',
  },
  iconWrap: { marginRight: SPACING.sm },
  textWrap: { flex: 1 },
  title: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal },
  titleSelected: { color: COLORS.ochre },
  desc: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel, marginTop: 2, lineHeight: 16 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: COLORS.ochre },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.ochre },
});

// ── Select field ─────────────────────────────────────────────

function SelectField({
  label,
  value,
  options,
  placeholder,
  onSelect,
  error,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  placeholder: string;
  onSelect: (v: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={sfStyles.wrap}>
      <Text style={sfStyles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[sfStyles.trigger, error ? sfStyles.triggerError : null]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
      >
        <Text style={selected ? sfStyles.selectedText : sfStyles.placeholderText}>
          {selected?.label ?? placeholder}
        </Text>
        <Text style={sfStyles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open && (
        <View style={sfStyles.dropdown}>
          <ScrollView style={sfStyles.dropdownScroll} nestedScrollEnabled>
            {options.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => {
                  onSelect(o.value);
                  setOpen(false);
                }}
                style={[sfStyles.option, o.value === value && sfStyles.optionSelected]}
                accessibilityRole="menuitem"
                accessibilityLabel={o.label}
              >
                <Text style={[sfStyles.optionText, o.value === value && sfStyles.optionTextSelected]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {error && <Text style={sfStyles.errorText}>{error}</Text>}
    </View>
  );
}

const sfStyles = StyleSheet.create({
  wrap: { marginBottom: SPACING.md, position: 'relative' },
  label: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.charcoal, marginBottom: SPACING.xxs },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.offWhite,
    minHeight: 48,
  },
  triggerError: { borderColor: COLORS.brick },
  selectedText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.md, color: COLORS.primaryText, flex: 1 },
  placeholderText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.md, color: COLORS.steel, flex: 1 },
  chevron: { fontSize: 11, color: COLORS.steel, marginLeft: SPACING.xs },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownScroll: { maxHeight: 180 },
  option: { padding: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.hairline },
  optionSelected: { backgroundColor: COLORS.ochre + '15' },
  optionText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.primaryText },
  optionTextSelected: { fontFamily: FONTS.bodySemiBold, color: COLORS.ochre },
  errorText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.brick, marginTop: 4 },
});

// ── City search field ────────────────────────────────────────

function CitySearchField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CityData[]>([]);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    setQuery(text);
    onChange(text);
    if (text.length >= 2) {
      setResults(searchCities(text, 8));
      setFocused(true);
    } else {
      setResults([]);
    }
  };

  const select = (city: CityData) => {
    setQuery(city.name);
    onChange(city.name);
    setResults([]);
    setFocused(false);
  };

  return (
    <View style={{ marginBottom: SPACING.md, position: 'relative' }}>
      <Input
        label={label}
        value={query}
        onChangeText={handleChange}
        placeholder="Start typing city name (e.g., Pune, Mumbai)"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Delay closing to allow click to register
          setTimeout(() => setFocused(false), 300);
        }}
        error={error}
        accessibilityLabel={`${label} search`}
      />
      {focused && results.length > 0 && (
        <View style={csStyles.dropdown}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {results.map((c) => (
              <Pressable
                key={`${c.name}-${c.state}`}
                onPress={() => select(c)}
                onPressIn={() => select(c)}
                style={csStyles.result}
                accessibilityRole="menuitem"
                accessibilityLabel={`${c.name}, ${c.state}`}
              >
                <Text style={csStyles.cityName}>{c.name}</Text>
                <Text style={csStyles.stateName}>{c.state}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const csStyles = StyleSheet.create({
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
    maxHeight: 180,
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  result: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  cityName: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.primaryText },
  stateName: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel },
});

// ── Vehicle / body type options ──────────────────────────────

const VEHICLE_OPTIONS = Object.entries(VEHICLE_TYPE_LABELS).map(([v, l]) => ({
  value: v,
  label: l,
}));
const BODY_OPTIONS = Object.entries(BODY_TYPE_LABELS).map(([v, l]) => ({
  value: v,
  label: l,
}));
const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'mr', label: 'Marathi' },
  { value: 'hi', label: 'Hindi' },
];

// ── Factory icon ─────────────────────────────────────────────

function FactoryIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Rect x={3} y={18} width={30} height={15} rx={2} fill={COLORS.ochre} opacity={0.2} />
      <Rect x={3} y={18} width={30} height={15} rx={2} stroke={COLORS.ochre} strokeWidth={1.5} />
      <Rect x={6} y={10} width={8} height={8} rx={1} fill={COLORS.ochre} opacity={0.4} />
      <Rect x={16} y={6} width={10} height={12} rx={1} fill={COLORS.ochre} opacity={0.4} />
      <Rect x={8} y={22} width={5} height={5} rx={1} fill={COLORS.ochre} />
      <Rect x={22} y={22} width={5} height={5} rx={1} fill={COLORS.ochre} />
      <Rect x={15} y={24} width={6} height={9} rx={1} fill={COLORS.ochre} />
    </Svg>
  );
}

function TruckIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Rect x={2} y={12} width={22} height={16} rx={2} fill={COLORS.rust} opacity={0.2} />
      <Rect x={2} y={12} width={22} height={16} rx={2} stroke={COLORS.rust} strokeWidth={1.5} />
      <Path d="M24 16h6l3 6v6h-9V16z" fill={COLORS.rust} opacity={0.3} stroke={COLORS.rust} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={8} cy={29} r={3} fill={COLORS.rust} />
      <Circle cx={28} cy={29} r={3} fill={COLORS.rust} />
      <Rect x={5} y={15} width={9} height={6} rx={1} fill={COLORS.rust} opacity={0.5} />
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN SCREEN
// ────────────────────────────────────────────────────────────

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Separate forms for factory and driver
  const factoryForm = useForm<FactorySignupFormData>({
    resolver: zodResolver(factorySignupSchema),
    defaultValues: {
      role: 'factory',
      displayName: '',
      phone: '',
      email: '',
      city: '',
      state: '',
      language: 'en',
      password: '',
      confirmPassword: '',
      orgName: '',
      gstNumber: '',
      businessAddress: '',
      whatsapp: '',
    },
  });

  const driverForm = useForm<DriverSignupFormData>({
    resolver: zodResolver(driverSignupSchema),
    defaultValues: {
      role: 'driver',
      displayName: '',
      phone: '',
      email: '',
      city: '',
      state: '',
      language: 'en',
      password: '',
      confirmPassword: '',
      whatsapp: '',
      truck: {
        registrationNumber: '',
        vehicleType: 'medium_truck',
        bodyType: 'open',
        maxCapacityTonnes: 10,
      },
    },
  });

  const activeForm = role === 'factory' ? factoryForm : driverForm;
  const totalSteps = 3; // 0=role, 1=personal, 2=role-specific

  // ── Step 0: Role chooser ─────────────────────────────────

  function RoleStep() {
    return (
      <Animated.View entering={FadeIn.duration(300)}>
        <Text style={s.stepTitle}>Who are you?</Text>
        <Text style={s.stepSub}>Choose how you'll use {APP_NAME}</Text>

        <RoleCard
          icon={<FactoryIcon />}
          title="Factory / Organisation"
          description="I need to transport goods from my premises to customers or other locations."
          selected={role === 'factory'}
          onPress={() => setRole('factory')}
          accessibilityLabel="Select factory role"
        />
        <RoleCard
          icon={<TruckIcon />}
          title="Truck Driver / Transporter"
          description="I have a truck and want to earn on return trips or available routes."
          selected={role === 'driver'}
          onPress={() => setRole('driver')}
          accessibilityLabel="Select driver role"
        />

        <Button
          title="Continue"
          onPress={() => {
            if (!role) {
              setServerError('Please select your role to continue.');
              return;
            }
            setServerError('');
            setStep(1);
          }}
          variant="primary"
          fullWidth
          size="lg"
          style={{ marginTop: SPACING.md }}
          accessibilityLabel="Continue to personal details"
        />
      </Animated.View>
    );
  }

  // ── Step 1: Personal details ──────────────────────────────

  function PersonalStep() {
    const form = activeForm;
    const { control, formState: { errors }, trigger, getValues } = form as any;

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const proceed = async () => {
      // Clear any previous errors
      setServerError('');
      setLoading(true);

      try {
        // Validate form fields
        const ok = await trigger([
          'displayName', 'phone', 'email', 'city', 'state', 'language',
          'password', 'confirmPassword',
        ]);
        
        if (!ok) {
          setLoading(false);
          return;
        }

        // Phone uniqueness check (skip if offline)
        try {
          const phone = getValues('phone');
          const taken = await isPhoneRegistered(phone);
          if (taken) {
            setServerError('This mobile number is already registered. Please log in.');
            setLoading(false);
            return;
          }
        } catch (phoneCheckError) {
          // If phone check fails (e.g., offline mode), allow to continue with warning
          if (__DEV__) {
            console.warn('[Signup] Phone uniqueness check failed, continuing anyway:', phoneCheckError);
          }
          // Continue to next step even if check fails
        }

        setServerError('');
        setStep(2);
      } catch (error: any) {
        setServerError(error.message || 'Validation failed. Please check your inputs.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        <Text style={s.stepTitle}>Your details</Text>
        <Text style={s.stepSub}>This will be visible to other users</Text>

        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full Name"
              placeholder="e.g., Ramesh Kumar"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              returnKeyType="next"
              error={errors.displayName?.message}
              accessibilityLabel="Full name input"
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Mobile Number"
              placeholder="e.g., 9876543210 (10 digits)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              returnKeyType="next"
              maxLength={13}
              error={errors.phone?.message}
              accessibilityLabel="Mobile number input"
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email (Optional)"
              placeholder="e.g., user@example.com"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              error={errors.email?.message}
              accessibilityLabel="Email input"
            />
          )}
        />

        <Controller
          control={control}
          name="city"
          render={({ field: { onChange, value } }) => (
            <CitySearchField
              label="Your City"
              value={value}
              onChange={onChange}
              error={errors.city?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="state"
          render={({ field: { onChange, value } }) => (
            <SelectField
              label="State"
              value={value}
              options={getStates().map((s) => ({ value: s, label: s }))}
              placeholder="Select your state"
              onSelect={onChange}
              error={errors.state?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="language"
          render={({ field: { onChange, value } }) => (
            <SelectField
              label="Preferred Language"
              value={value}
              options={LANG_OPTIONS}
              placeholder="Choose your language"
              onSelect={onChange}
              error={errors.language?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Create Password"
              placeholder="Minimum 8 characters with letters & numbers"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={!showPassword}
              returnKeyType="next"
              error={errors.password?.message}
              accessibilityLabel="Password input"
              rightElement={
                <Pressable onPress={() => setShowPassword(p => !p)} hitSlop={8}>
                  <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁'}</Text>
                </Pressable>
              }
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirm Password"
              placeholder="Enter the same password again"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              error={errors.confirmPassword?.message}
              accessibilityLabel="Confirm password input"
              rightElement={
                <Pressable onPress={() => setShowConfirm(p => !p)} hitSlop={8}>
                  <Text style={{ fontSize: 16 }}>{showConfirm ? '🙈' : '👁'}</Text>
                </Pressable>
              }
            />
          )}
        />

        <Button
          title="Continue"
          onPress={proceed}
          variant="primary"
          fullWidth
          size="lg"
          loading={loading}
          disabled={loading}
          style={{ marginTop: SPACING.sm }}
          accessibilityLabel="Continue to organisation or truck details"
        />
      </Animated.View>
    );
  }

  // ── Step 2a: Factory org details ──────────────────────────

  function FactoryDetailsStep() {
    const { control, formState: { errors }, handleSubmit } = factoryForm;

    const submit = async (data: FactorySignupFormData) => {
      setServerError('');
      setLoading(true);
      try {
        console.log('[FactoryDetailsStep] Starting factory signup...');
        await signUpFactory(data);
        console.log('[FactoryDetailsStep] Factory signup successful');
        setDone(true);
      } catch (err: any) {
        console.error('[FactoryDetailsStep] Factory signup error:', err);
        // Handle specific error cases
        if (err.message?.includes('Permission denied') || err.message?.includes('PERMISSION_DENIED')) {
          setServerError('Cannot create account in offline mode. Please connect to the internet and try again.');
        } else if (err.message?.includes('network') || err.message?.includes('Network')) {
          setServerError('Network error. Please check your internet connection and try again.');
        } else if (err.message?.includes('already registered')) {
          setServerError(err.message);
        } else {
          setServerError(err.message ?? 'Signup failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        <Text style={s.stepTitle}>Organisation details</Text>
        <Text style={s.stepSub}>Optional — helps drivers trust your jobs</Text>

        <Controller
          control={control}
          name="orgName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Company / Organization Name (Optional)"
              placeholder="e.g., Sharma Industries Pvt Ltd"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              returnKeyType="next"
              error={errors.orgName?.message}
              accessibilityLabel="Organisation name input"
            />
          )}
        />

        <Controller
          control={control}
          name="gstNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="GSTIN (Optional)"
              placeholder="e.g., 27AAACR5055K1ZS (15 characters)"
              value={value ?? ''}
              onChangeText={(t) => onChange(t.toUpperCase())}
              onBlur={onBlur}
              autoCapitalize="characters"
              maxLength={15}
              returnKeyType="next"
              error={errors.gstNumber?.message}
              accessibilityLabel="GSTIN input"
            />
          )}
        />

        <Controller
          control={control}
          name="businessAddress"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Business Address (Optional)"
              placeholder="e.g., Plot 5, MIDC Phase 2, Pune - 411019"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={2}
              returnKeyType="next"
              error={errors.businessAddress?.message}
              accessibilityLabel="Business address input"
            />
          )}
        />

        <Controller
          control={control}
          name="whatsapp"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="WhatsApp Number (Optional)"
              placeholder="e.g., 9876543210"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              maxLength={13}
              returnKeyType="done"
              error={errors.whatsapp?.message}
              accessibilityLabel="WhatsApp number input"
            />
          )}
        />

        <Button
          title="Create Account"
          onPress={handleSubmit(submit)}
          variant="primary"
          fullWidth
          size="lg"
          loading={loading}
          style={{ marginTop: SPACING.sm }}
          accessibilityLabel="Create factory account"
        />
      </Animated.View>
    );
  }

  // ── Step 2b: Driver truck details ─────────────────────────

  function DriverDetailsStep() {
    const { control, formState: { errors }, handleSubmit } = driverForm;

    const submit = async (data: DriverSignupFormData) => {
      setServerError('');
      setLoading(true);
      try {
        console.log('[DriverDetailsStep] Starting driver signup...');
        await signUpDriver(data);
        console.log('[DriverDetailsStep] Driver signup successful');
        setDone(true);
      } catch (err: any) {
        console.error('[DriverDetailsStep] Driver signup error:', err);
        // Handle specific error cases
        if (err.message?.includes('Permission denied') || err.message?.includes('PERMISSION_DENIED')) {
          setServerError('Cannot create account in offline mode. Please connect to the internet and try again.');
        } else if (err.message?.includes('network') || err.message?.includes('Network')) {
          setServerError('Network error. Please check your internet connection and try again.');
        } else if (err.message?.includes('already registered')) {
          setServerError(err.message);
        } else {
          setServerError(err.message ?? 'Signup failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        <Text style={s.stepTitle}>Your truck</Text>
        <Text style={s.stepSub}>You can add more trucks after signup</Text>

        <Controller
          control={control}
          name="truck.registrationNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Truck Registration Number"
              placeholder="e.g., MH12AB1234"
              value={value}
              onChangeText={(t) => onChange(t.toUpperCase())}
              onBlur={onBlur}
              autoCapitalize="characters"
              maxLength={12}
              returnKeyType="next"
              error={errors.truck?.registrationNumber?.message}
              accessibilityLabel="Truck registration number input"
            />
          )}
        />

        <Controller
          control={control}
          name="truck.vehicleType"
          render={({ field: { onChange, value } }) => (
            <SelectField
              label="Vehicle Type"
              value={value}
              options={VEHICLE_OPTIONS}
              placeholder="Select your truck type"
              onSelect={onChange}
              error={errors.truck?.vehicleType?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="truck.bodyType"
          render={({ field: { onChange, value } }) => (
            <SelectField
              label="Body Type"
              value={value}
              options={BODY_OPTIONS}
              placeholder="Select truck body type"
              onSelect={onChange}
              error={errors.truck?.bodyType?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="truck.maxCapacityTonnes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Maximum Capacity (Tonnes)"
              placeholder="e.g., 10 (in tonnes)"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChangeText={(text) => {
                const trimmed = text.trim();
                if (trimmed === '') {
                  // Allow clearing the field
                  return;
                }
                const parsed = parseFloat(trimmed);
                if (!isNaN(parsed) && parsed > 0) {
                  onChange(parsed);
                }
              }}
              onBlur={onBlur}
              keyboardType="decimal-pad"
              returnKeyType="next"
              error={errors.truck?.maxCapacityTonnes?.message}
              accessibilityLabel="Truck capacity in tonnes input"
            />
          )}
        />

        <Controller
          control={control}
          name="whatsapp"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="WhatsApp Number (Optional)"
              placeholder="e.g., 9876543210"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              maxLength={13}
              returnKeyType="done"
              error={errors.whatsapp?.message}
              accessibilityLabel="WhatsApp number input"
            />
          )}
        />

        <Button
          title="Create Account"
          onPress={handleSubmit(submit)}
          variant="primary"
          fullWidth
          size="lg"
          loading={loading}
          style={{ marginTop: SPACING.sm }}
          accessibilityLabel="Create driver account"
        />
      </Animated.View>
    );
  }

  // ── Step 3: Success splash ────────────────────────────────
  // Auto-navigate after signup success - auth state will be detected by index.tsx
  useEffect(() => {
    if (done) {
      // Wait a moment for Firebase auth state to propagate
      const timer = setTimeout(() => {
        router.replace('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [done, router]);

  if (done) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }]}>
        <StatusBar style="light" backgroundColor={COLORS.charcoal} />
        <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: 'center' }}>
          <Logo size={64} color={COLORS.offWhite} accentColor={COLORS.ochre} />
          <Text style={s.doneTitle}>You're all set!</Text>
          <Text style={s.doneSub}>
            {role === 'factory'
              ? 'Post your first transport job to get started.'
              : 'Browse available jobs along your route.'}
          </Text>
          <ActivityIndicator size="large" color={COLORS.ochre} style={{ marginTop: SPACING.xl }} />
          <Text style={[s.doneSub, { marginTop: SPACING.sm }]}>Logging you in...</Text>
        </Animated.View>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar style="light" backgroundColor={COLORS.charcoal} />
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
            <Pressable
              onPress={() => {
                if (step === 0) router.back();
                else setStep((p) => p - 1);
              }}
              style={s.backBtn}
              hitSlop={12}
              accessibilityLabel="Go back"
            >
              <Text style={s.backArrow}>←</Text>
            </Pressable>
            <Text style={s.screenTitle}>Create account</Text>
          </View>

          {/* Progress */}
          <StepDots total={totalSteps} current={step} />

          {/* Server error */}
          {serverError.length > 0 && (
            <View style={s.errorBanner}>
              <Text style={s.errorBannerText}>{serverError}</Text>
            </View>
          )}

          {/* Steps */}
          {step === 0 && <RoleStep />}
          {step === 1 && <PersonalStep />}
          {step === 2 && role === 'factory' && <FactoryDetailsStep />}
          {step === 2 && role === 'driver' && <DriverDetailsStep />}

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              accessibilityRole="link"
              accessibilityLabel="Log in"
            >
              <Text style={s.footerLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.charcoal },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  header: { paddingTop: SPACING.xl, paddingBottom: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn: { padding: SPACING.xxs },
  backArrow: { fontSize: 22, color: COLORS.offWhite },
  screenTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.offWhite },
  stepTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.offWhite, marginBottom: SPACING.xxs },
  stepSub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginBottom: SPACING.md, lineHeight: 20 },
  errorBanner: {
    backgroundColor: COLORS.brick + '15',
    borderWidth: 1,
    borderColor: COLORS.brick,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  errorBannerText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.brick },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.xl },
  footerText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel },
  footerLink: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.ochre },
  doneTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xxl, color: COLORS.offWhite, textAlign: 'center', marginTop: SPACING.lg },
  doneSub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.md, color: COLORS.steel, textAlign: 'center', lineHeight: 24, marginTop: SPACING.xs },
});
