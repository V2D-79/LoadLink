/**
 * app/(driver)/profile.tsx
 *
 * Driver profile tab.
 * Sections:
 *   - Avatar + name + rating stars + trip count
 *   - Truck details card (vehicle type, reg, capacity)
 *   - Trip status panel (active job progress with handover codes)
 *   - Account section (change password, sign out)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { get, ref, update, serverTimestamp } from 'firebase/database';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getFirebaseDB, getFirebaseAuth } from '../../src/services/firebase';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { useRTDBValue } from '../../src/hooks/useRTDB';
import {
  markHeadingToPickup,
  markLoaded,
  markInTransit,
  generateDeliveryCode,
} from '../../src/services/tripService';
import { Input, Button, Card, Chip } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { DB_PATHS, VEHICLE_TYPE_LABELS, BODY_TYPE_LABELS } from '../../src/constants/app';

// ── Helpers ───────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: FONT_SIZES.md, color: i <= Math.round(rating) ? COLORS.ochre : COLORS.hairline }}>
          ★
        </Text>
      ))}
      <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginLeft: SPACING.xxs }}>
        {rating > 0 ? rating.toFixed(1) : 'No ratings yet'}
      </Text>
    </View>
  );
}

// ── Active trip panel ─────────────────────────────────────────

function ActiveTripPanel({ jobId, driverUid }: { jobId: string; driverUid: string }) {
  const { data: job } = useRTDBValue<any>(`${DB_PATHS.jobs}/${jobId}`);
  const [loading, setLoading] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [error, setError] = useState('');

  const doAction = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try { await fn(); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  if (!job) return null;

  const status = job.status;
  const STEPS = ['accepted', 'heading_to_pickup', 'loaded', 'in_transit', 'delivered', 'completed'];
  const stepIdx = STEPS.indexOf(status);

  return (
    <Card style={atS.card}>
      <Text style={atS.title}>Active Trip</Text>
      <Text style={atS.route}>{job.pickupCity} → {job.deliveryCity}</Text>

      {/* Progress bar */}
      <View style={atS.progressRow}>
        {STEPS.slice(0, -1).map((step, i) => (
          <View key={step} style={[atS.progressSegment, i < stepIdx && atS.progressDone, i === stepIdx && atS.progressActive]} />
        ))}
      </View>
      <Text style={atS.statusLabel}>{status.replace(/_/g, ' ').toUpperCase()}</Text>

      {error.length > 0 && <Text style={atS.error}>{error}</Text>}

      {/* Actions per status */}
      {status === 'accepted' && (
        <Button title="I'm Heading to Pickup" onPress={() => doAction(() => markHeadingToPickup(jobId, driverUid))} variant="primary" size="md" loading={loading} style={{ marginTop: SPACING.sm }} />
      )}

      {status === 'heading_to_pickup' && (
        <View style={{ marginTop: SPACING.sm }}>
          <Input
            label="Enter pickup handover code (from factory)"
            placeholder="6-digit code"
            value={codeInput}
            onChangeText={setCodeInput}
            keyboardType="numeric"
            maxLength={6}
            accessibilityLabel="Pickup handover code"
          />
          <Button
            title="Confirm Pickup"
            onPress={() => doAction(() => markLoaded(jobId, driverUid, codeInput))}
            variant="primary" size="md" loading={loading}
          />
        </View>
      )}

      {status === 'loaded' && (
        <Button title="Start Transit" onPress={() => doAction(() => markInTransit(jobId, driverUid))} variant="primary" size="md" loading={loading} style={{ marginTop: SPACING.sm }} />
      )}

      {status === 'in_transit' && deliveryCode.length === 0 && (
        <Button
          title="I've Arrived — Generate Delivery Code"
          onPress={async () => {
            setLoading(true);
            try {
              const code = await generateDeliveryCode(jobId, driverUid);
              setDeliveryCode(code);
            } catch (e: any) { setError(e.message); }
            setLoading(false);
          }}
          variant="primary" size="md" loading={loading} style={{ marginTop: SPACING.sm }}
        />
      )}

      {deliveryCode.length > 0 && (
        <View style={atS.codeBox}>
          <Text style={atS.codeLabel}>Delivery Code — show to factory</Text>
          <Text style={atS.code}>{deliveryCode}</Text>
          <Text style={atS.codeSub}>Factory enters this code to confirm receipt.</Text>
        </View>
      )}

      {(status === 'delivered' || status === 'completed') && (
        <View style={atS.completedBox}>
          <Text style={atS.completedText}>Delivery confirmed!</Text>
        </View>
      )}
    </Card>
  );
}

const atS = StyleSheet.create({
  card: { padding: SPACING.md, marginBottom: SPACING.md, borderColor: COLORS.ochre, borderWidth: 1 },
  title: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal, marginBottom: SPACING.xxs },
  route: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginBottom: SPACING.sm },
  progressRow: { flexDirection: 'row', gap: 3, marginBottom: SPACING.xxs },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.hairline },
  progressDone: { backgroundColor: COLORS.olive },
  progressActive: { backgroundColor: COLORS.ochre },
  statusLabel: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xxs, color: COLORS.steel, letterSpacing: 1, marginBottom: SPACING.xs },
  error: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.brick, marginTop: SPACING.xs },
  codeBox: { backgroundColor: COLORS.ochre + '15', borderRadius: RADII.md, padding: SPACING.md, marginTop: SPACING.sm, alignItems: 'center' },
  codeLabel: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.steel, marginBottom: SPACING.xs },
  code: { fontFamily: FONTS.headingBold, fontSize: 40, letterSpacing: 8, color: COLORS.charcoal },
  codeSub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel, marginTop: SPACING.xs, textAlign: 'center' },
  completedBox: { backgroundColor: COLORS.olive + '15', borderRadius: RADII.sm, padding: SPACING.sm, marginTop: SPACING.sm },
  completedText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.olive, textAlign: 'center' },
});

// ── Main profile screen ───────────────────────────────────────

export default function DriverProfileScreen() {
  const { firebaseUser, userProfile } = useAuthContext();
  const router = useRouter();
  const uid = firebaseUser?.uid;
  const insets = useSafeAreaInsets();

  const { data: privateData } = useRTDBValue<any>(
    uid ? `${DB_PATHS.userPrivate}/${uid}` : null,
  );
  const { data: truck } = useRTDBValue<any>(
    privateData?.primaryTruckId && uid
      ? `${DB_PATHS.trucks}/${uid}/${privateData.primaryTruckId}`
      : null,
  );

  // Find active job for trip panel
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    // Quick scan — in production use a dedicated index
    const ACTIVE = ['accepted', 'heading_to_pickup', 'loaded', 'in_transit'];
    get(ref(getFirebaseDB(), DB_PATHS.jobs)).then((snap) => {
      if (!snap.exists()) return;
      const jobs = snap.val();
      const found = Object.entries(jobs).find(([, j]: [string, any]) =>
        j.assignedDriverUid === uid && ACTIVE.includes(j.status),
      );
      setActiveJobId(found ? found[0] : null);
    });
  }, [uid]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut(getFirebaseAuth());
          router.replace('/(auth)/landing');
        },
      },
    ]);
  };

  const rating = (userProfile as any)?.averageRating ?? 0;
  const tripCount = (userProfile as any)?.ratingCount ?? 0;

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Avatar + identity */}
        <Animated.View entering={FadeIn.duration(400)} style={[s.heroSection, { paddingTop: insets.top + SPACING.md }]}>
          <Pressable onPress={() => router.push('/(driver)/edit-profile')}>
            {(userProfile as any)?.profileImageUrl ? (
              <Image 
                source={{ uri: (userProfile as any).profileImageUrl }} 
                style={s.avatar}
                onError={(e) => console.log('[Profile] Image load error:', e.nativeEvent.error)}
              />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarInitials}>
                  {(userProfile as any)?.displayName?.charAt(0)?.toUpperCase() ?? 'D'}
                </Text>
              </View>
            )}
          </Pressable>
          <Text style={s.name}>{(userProfile as any)?.displayName ?? 'Driver'}</Text>
          <StarRow rating={rating} />
          <Text style={s.tripCount}>{(userProfile as any)?.tripsCompleted || 0} {(userProfile as any)?.tripsCompleted === 1 ? 'trip' : 'trips'} completed</Text>
          <Chip label="Driver" style={{ marginTop: SPACING.xs }} />
          
          <Button
            title="Edit Profile"
            onPress={() => router.push('/(driver)/edit-profile')}
            variant="outline"
            size="sm"
            style={{ marginTop: SPACING.sm }}
          />
        </Animated.View>

        {/* Active trip */}
        {activeJobId && uid && (
          <ActiveTripPanel jobId={activeJobId} driverUid={uid} />
        )}

        {/* Truck card */}
        {truck && (
          <Card style={s.sectionCard}>
            <Text style={s.sectionTitle}>My Truck</Text>
            <View style={s.truckRow}>
              <View style={s.truckField}>
                <Text style={s.fieldLabel}>Registration</Text>
                <Text style={s.fieldValue}>{truck.registrationNumber ?? '—'}</Text>
              </View>
              <View style={s.truckField}>
                <Text style={s.fieldLabel}>Capacity</Text>
                <Text style={s.fieldValue}>{truck.maxCapacityTonnes ?? '—'} t</Text>
              </View>
            </View>
            <View style={s.truckRow}>
              <View style={s.truckField}>
                <Text style={s.fieldLabel}>Type</Text>
                <Text style={s.fieldValue}>
                  {VEHICLE_TYPE_LABELS[truck.vehicleType as keyof typeof VEHICLE_TYPE_LABELS] ?? truck.vehicleType ?? '—'}
                </Text>
              </View>
              <View style={s.truckField}>
                <Text style={s.fieldLabel}>Body</Text>
                <Text style={s.fieldValue}>
                  {BODY_TYPE_LABELS[truck.bodyType as keyof typeof BODY_TYPE_LABELS] ?? truck.bodyType ?? '—'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Contact info */}
        <Card style={s.sectionCard}>
          <Text style={s.sectionTitle}>Contact</Text>
          <View style={s.contactRow}>
            <Text style={s.contactLabel}>Phone:</Text>
            <Text style={s.contactValue}>{(userProfile as any)?.phone ?? '—'}</Text>
          </View>
          <View style={s.contactRow}>
            <Text style={s.contactLabel}>WhatsApp:</Text>
            <Text style={s.contactValue}>{(userProfile as any)?.whatsapp ?? '—'}</Text>
          </View>
          <View style={s.contactRow}>
            <Text style={s.contactLabel}>Email:</Text>
            <Text style={s.contactValue}>{privateData?.realEmail ?? privateData?.internalEmail ?? '—'}</Text>
          </View>
        </Card>

        {/* Location */}
        <Card style={s.sectionCard}>
          <Text style={s.sectionTitle}>Location</Text>
          <View style={s.contactRow}>
            <Text style={s.contactLabel}>City:</Text>
            <Text style={s.contactValue}>{(userProfile as any)?.city ?? '—'}</Text>
          </View>
          <View style={s.contactRow}>
            <Text style={s.contactLabel}>State:</Text>
            <Text style={s.contactValue}>{(userProfile as any)?.state ?? '—'}</Text>
          </View>
        </Card>

        {/* Account actions */}
        <Card style={s.sectionCard}>
          <Text style={s.sectionTitle}>Account</Text>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            fullWidth
            size="md"
          />
        </Card>

        <Text style={s.versionText}>LoadLink v1.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  scroll: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  heroSection: { alignItems: 'center', paddingTop: 0, paddingBottom: SPACING.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.ochre, justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarInitials: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xxl, color: COLORS.paperWhite },
  name: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.charcoal, marginBottom: SPACING.xs },
  tripCount: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginTop: SPACING.xxs },
  sectionCard: { padding: SPACING.md, marginBottom: SPACING.sm },
  sectionTitle: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal, marginBottom: SPACING.sm },
  truckRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xs },
  truckField: { flex: 1, backgroundColor: COLORS.offWhite, borderRadius: RADII.sm, padding: SPACING.xs },
  fieldLabel: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  fieldValue: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.charcoal },
  contactRow: { flexDirection: 'row', marginBottom: SPACING.xs, alignItems: 'center' },
  contactLabel: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.steel, width: 100 },
  contactValue: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.charcoal, flex: 1 },
  contactLine: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginBottom: SPACING.xxs },
  versionText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, textAlign: 'center', marginTop: SPACING.lg },
});
