/**
 * app/(factory)/profile.tsx
 *
 * Factory profile tab.
 * Sections:
 *   - Avatar + org name + rating + job count
 *   - Active job panel: generate pickup code, enter delivery code, rate driver
 *   - Contact & GST info
 *   - Account (sign out)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signOut } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getFirebaseDB, getFirebaseAuth } from '../../src/services/firebase';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { useRTDBValue } from '../../src/hooks/useRTDB';
import {
  generatePickupCode,
  markDelivered,
  markCompleted,
  submitReview,
} from '../../src/services/tripService';
import { Input, Button, Card, Chip } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { DB_PATHS } from '../../src/constants/app';

// ── Star picker ───────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: SPACING.xs, marginVertical: SPACING.sm }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} accessibilityLabel={`${i} stars`} hitSlop={8}>
          <Text style={{ fontSize: 32, color: i <= value ? COLORS.ochre : COLORS.hairline }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Rating modal ──────────────────────────────────────────────

function RatingModal({
  visible,
  jobId,
  reviewerUid,
  revieweeUid,
  onDone,
}: {
  visible: boolean;
  jobId: string;
  reviewerUid: string;
  revieweeUid: string;
  onDone: () => void;
}) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await submitReview({ jobId, reviewerUid, revieweeUid, role: 'factory', stars, comment });
      await markCompleted(jobId);
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={rm.overlay}>
        <View style={rm.sheet}>
          <Text style={rm.title}>Rate the Driver</Text>
          <Text style={rm.sub}>How was your experience with this driver?</Text>
          <StarPicker value={stars} onChange={setStars} />
          <Input
            label="Comment (optional)"
            placeholder="Timely delivery, good handling…"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            accessibilityLabel="Driver review comment"
          />
          {error.length > 0 && <Text style={rm.error}>{error}</Text>}
          <Button title="Submit Review" onPress={submit} variant="primary" fullWidth size="lg" loading={loading} />
          <Button title="Skip" onPress={onDone} variant="ghost" fullWidth size="md" style={{ marginTop: SPACING.xs }} />
        </View>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.paperWhite, borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.charcoal, marginBottom: SPACING.xxs },
  sub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginBottom: SPACING.xs },
  error: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.brick, marginBottom: SPACING.xs },
});

// ── Active job panel ──────────────────────────────────────────

function ActiveJobPanel({ jobId, factoryUid }: { jobId: string; factoryUid: string }) {
  const { data: job } = useRTDBValue<any>(`${DB_PATHS.jobs}/${jobId}`);
  const [pickupCode, setPickupCode] = useState('');
  const [deliveryInput, setDeliveryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRating, setShowRating] = useState(false);

  if (!job) return null;

  const status = job.status;

  const doGenPickup = async () => {
    setLoading(true); setError('');
    try {
      const code = await generatePickupCode(jobId, factoryUid);
      setPickupCode(code);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const doConfirmDelivery = async () => {
    setLoading(true); setError('');
    try {
      await markDelivered(jobId, factoryUid, deliveryInput);
      setShowRating(true);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const STEPS = ['accepted', 'heading_to_pickup', 'loaded', 'in_transit', 'delivered', 'completed'];
  const stepIdx = STEPS.indexOf(status);

  return (
    <>
      <Card style={ajS.card}>
        <Text style={ajS.title}>Active Trip</Text>
        <Text style={ajS.route}>{job.pickupCity} → {job.deliveryCity}</Text>

        {/* Progress */}
        <View style={ajS.progressRow}>
          {STEPS.slice(0, -1).map((step, i) => (
            <View key={step} style={[ajS.seg, i < stepIdx && ajS.segDone, i === stepIdx && ajS.segActive]} />
          ))}
        </View>
        <Text style={ajS.statusText}>{status.replace(/_/g, ' ').toUpperCase()}</Text>

        {error.length > 0 && <Text style={ajS.error}>{error}</Text>}

        {/* Generate pickup code */}
        {(status === 'accepted' || status === 'heading_to_pickup') && (
          <>
            {pickupCode.length > 0 ? (
              <View style={ajS.codeBox}>
                <Text style={ajS.codeLabel}>Pickup Code — give to driver</Text>
                <Text style={ajS.code}>{pickupCode}</Text>
                <Text style={ajS.codeSub}>Driver enters this to confirm loading.</Text>
              </View>
            ) : (
              <Button
                title="Generate Pickup Code"
                onPress={doGenPickup}
                variant="primary" size="md" loading={loading}
                style={{ marginTop: SPACING.sm }}
              />
            )}
          </>
        )}

        {/* Enter delivery code */}
        {status === 'in_transit' && (
          <View style={{ marginTop: SPACING.sm }}>
            <Input
              label="Enter delivery code (from driver)"
              placeholder="6-digit code"
              value={deliveryInput}
              onChangeText={setDeliveryInput}
              keyboardType="numeric"
              maxLength={6}
              accessibilityLabel="Delivery handover code"
            />
            <Button
              title="Confirm Delivery"
              onPress={doConfirmDelivery}
              variant="primary" size="md" loading={loading}
            />
          </View>
        )}

        {(status === 'delivered' || status === 'completed') && (
          <View style={ajS.completedBox}>
            <Text style={ajS.completedText}>Delivery confirmed! Rate the driver →</Text>
            <Button
              title="Rate Driver"
              onPress={() => setShowRating(true)}
              variant="outline" size="sm"
              style={{ marginTop: SPACING.xs }}
            />
          </View>
        )}
      </Card>

      <RatingModal
        visible={showRating}
        jobId={jobId}
        reviewerUid={factoryUid}
        revieweeUid={job.assignedDriverUid ?? ''}
        onDone={() => setShowRating(false)}
      />
    </>
  );
}

const ajS = StyleSheet.create({
  card: { padding: SPACING.md, marginBottom: SPACING.md, borderColor: COLORS.ochre, borderWidth: 1 },
  title: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal, marginBottom: SPACING.xxs },
  route: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginBottom: SPACING.sm },
  progressRow: { flexDirection: 'row', gap: 3, marginBottom: SPACING.xxs },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.hairline },
  segDone: { backgroundColor: COLORS.olive },
  segActive: { backgroundColor: COLORS.ochre },
  statusText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xxs, color: COLORS.steel, letterSpacing: 1, marginBottom: SPACING.xs },
  error: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.brick, marginTop: SPACING.xs },
  codeBox: { backgroundColor: COLORS.ochre + '15', borderRadius: RADII.md, padding: SPACING.md, marginTop: SPACING.sm, alignItems: 'center' },
  codeLabel: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.steel, marginBottom: SPACING.xs },
  code: { fontFamily: FONTS.headingBold, fontSize: 40, letterSpacing: 8, color: COLORS.charcoal },
  codeSub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel, marginTop: SPACING.xs, textAlign: 'center' },
  completedBox: { backgroundColor: COLORS.olive + '15', borderRadius: RADII.sm, padding: SPACING.sm, marginTop: SPACING.sm },
  completedText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.olive },
});

// ── Main screen ───────────────────────────────────────────────

export default function FactoryProfileScreen() {
  const { firebaseUser, userProfile } = useAuthContext();
  const router = useRouter();
  const uid = firebaseUser?.uid;

  const { data: privateData } = useRTDBValue<any>(uid ? `${DB_PATHS.userPrivate}/${uid}` : null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const ACTIVE = ['accepted', 'heading_to_pickup', 'loaded', 'in_transit', 'delivered'];
    get(ref(getFirebaseDB(), DB_PATHS.jobs)).then((snap) => {
      if (!snap.exists()) return;
      const jobs = snap.val();
      const found = Object.entries(jobs).find(([, j]: [string, any]) =>
        j.factoryUid === uid && ACTIVE.includes(j.status),
      );
      setActiveJobId(found ? found[0] : null);
    });
  }, [uid]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await signOut(getFirebaseAuth());
          router.replace('/(auth)/landing');
        },
      },
    ]);
  };

  const rating = (userProfile as any)?.averageRating ?? 0;
  const jobCount = (userProfile as any)?.ratingCount ?? 0;

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <Animated.View entering={FadeIn.duration(400)} style={s.heroSection}>
          <Pressable onPress={() => router.push('/(factory)/edit-profile')}>
            {(userProfile as any)?.profileImageUrl ? (
              <Image 
                source={{ uri: (userProfile as any).profileImageUrl }} 
                style={s.avatar}
                onError={(e) => console.log('[FactoryProfile] Image load error:', e.nativeEvent.error)}
              />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarInitials}>
                  {((userProfile as any)?.orgName ?? (userProfile as any)?.fullName ?? 'F').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
          <Text style={s.name}>{(userProfile as any)?.orgName ?? (userProfile as any)?.fullName ?? 'Factory'}</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Text key={i} style={{ fontSize: FONT_SIZES.md, color: i <= Math.round(rating) ? COLORS.ochre : COLORS.hairline }}>★</Text>
            ))}
            {rating > 0 && (
              <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginLeft: SPACING.xxs }}>
                {rating.toFixed(1)}
              </Text>
            )}
          </View>
          <Text style={s.jobCount}>{jobCount} {jobCount === 1 ? 'job' : 'jobs'} completed</Text>
          <Chip label="Factory" style={{ marginTop: SPACING.xs }} />
          
          <Button
            title="Edit Profile"
            onPress={() => router.push('/(factory)/edit-profile')}
            variant="outline"
            size="sm"
            style={{ marginTop: SPACING.sm }}
          />
        </Animated.View>

        {/* Active job */}
        {activeJobId && uid && (
          <ActiveJobPanel jobId={activeJobId} factoryUid={uid} />
        )}

        {/* Company info */}
        <Card style={s.sectionCard}>
          <Text style={s.sectionTitle}>Company Information</Text>
          {privateData?.gstNumber && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>GST Number:</Text>
              <Text style={s.infoValue}>{privateData.gstNumber}</Text>
            </View>
          )}
          {privateData?.businessAddress && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Address:</Text>
              <Text style={s.infoValue}>{privateData.businessAddress}</Text>
            </View>
          )}
        </Card>

        {/* Contact info */}
        <Card style={s.sectionCard}>
          <Text style={s.sectionTitle}>Contact</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Phone:</Text>
            <Text style={s.infoValue}>{(userProfile as any)?.phone ?? '—'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>WhatsApp:</Text>
            <Text style={s.infoValue}>{(userProfile as any)?.whatsapp ?? '—'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Email:</Text>
            <Text style={s.infoValue}>{privateData?.realEmail ?? privateData?.internalEmail ?? '—'}</Text>
          </View>
        </Card>

        {/* Location */}
        <Card style={s.sectionCard}>
          <Text style={s.sectionTitle}>Location</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>City:</Text>
            <Text style={s.infoValue}>{(userProfile as any)?.city ?? '—'}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>State:</Text>
            <Text style={s.infoValue}>{(userProfile as any)?.state ?? '—'}</Text>
          </View>
        </Card>

        {/* Account */}
        <Card style={s.sectionCard}>
          <Text style={s.sectionTitle}>Account</Text>
          <Button title="Sign Out" onPress={handleSignOut} variant="outline" fullWidth size="md" />
        </Card>

        <Text style={s.versionText}>LoadLink v1.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  heroSection: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: COLORS.rust, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: SPACING.sm 
  },
  avatarInitials: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xxl, color: COLORS.paperWhite },
  name: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.charcoal, marginBottom: SPACING.xs, textAlign: 'center' },
  jobCount: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginTop: SPACING.xxs },
  sectionCard: { padding: SPACING.md, marginBottom: SPACING.sm },
  sectionTitle: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal, marginBottom: SPACING.sm },
  infoRow: { 
    flexDirection: 'row', 
    marginBottom: SPACING.xs, 
    alignItems: 'flex-start' 
  },
  infoLabel: { 
    fontFamily: FONTS.bodySemiBold, 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.steel, 
    width: 100 
  },
  infoValue: { 
    fontFamily: FONTS.bodyRegular, 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.charcoal, 
    flex: 1 
  },
  versionText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, textAlign: 'center', marginTop: SPACING.lg },
});
