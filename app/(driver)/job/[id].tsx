/**
 * app/(driver)/job/[id].tsx
 *
 * Driver job detail screen.
 * Shows full job info + partial bid summary (count + lowest).
 * Driver can place, revise, or withdraw their bid.
 * If assigned: shows accept/reject assignment buttons.
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StatusBar } from 'expo-status-bar';
import { get, ref } from 'firebase/database';

import { useAuthContext } from '../../../src/hooks/AuthContext';
import { useRTDBValue, useRTDBList } from '../../../src/hooks/useRTDB';
import {
  placeBid,
  reviseBid,
  withdrawBid,
  acceptAssignment,
  rejectAssignment,
  getDriverBidForJob,
} from '../../../src/services/bidService';
import { getFirebaseDB } from '../../../src/services/firebase';
import { Input, Button, Card, Chip } from '../../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../../src/constants/theme';
import { DB_PATHS, GOODS_CATEGORY_LABELS, DB_PATHS as DP } from '../../../src/constants/app';

// ── Schema ────────────────────────────────────────────────────

const bidSchema = z.object({
  amountInr: z
    .number({ invalid_type_error: 'Enter a bid amount' })
    .min(100, 'Bid must be at least ₹100')
    .max(9_999_999),
  notes: z.string().max(300).optional(),
});
type BidFormData = z.infer<typeof bidSchema>;

// ── Helpers ───────────────────────────────────────────────────

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}
function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function categoryLabel(cat: string) {
  return (GOODS_CATEGORY_LABELS as Record<string, string>)[cat] ?? cat.replace(/_/g, ' ');
}
function timeLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

// ── Info row ──────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoS.row}>
      <Text style={infoS.label}>{label}</Text>
      <Text style={infoS.value}>{value}</Text>
    </View>
  );
}
const infoS = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.hairline },
  label: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, flex: 1 },
  value: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.charcoal, flex: 2, textAlign: 'right' },
});

// ── Main screen ───────────────────────────────────────────────

export default function DriverJobDetailScreen() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const { firebaseUser } = useAuthContext();
  const router = useRouter();

  const { data: job, loading: jobLoading } = useRTDBValue<any>(
    jobId ? `${DB_PATHS.jobs}/${jobId}` : null,
  );
  const { data: bids } = useRTDBList<any>(
    jobId ? `${DB_PATHS.bids}/${jobId}` : null,
  );

  const [existingBid, setExistingBid] = useState<{ bidId: string; amountInr: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [bidPlaced, setBidPlaced] = useState(false);
  const [truckId, setTruckId] = useState('');

  // Fetch driver's existing bid and truck
  useEffect(() => {
    if (!firebaseUser?.uid || !jobId) return;
    getDriverBidForJob(firebaseUser.uid, jobId).then(setExistingBid);
    get(ref(getFirebaseDB(), `${DB_PATHS.userPrivate}/${firebaseUser.uid}/primaryTruckId`)).then(
      (snap) => { if (snap.exists()) setTruckId(snap.val()); },
    );
  }, [firebaseUser?.uid, jobId]);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<BidFormData>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      amountInr: existingBid?.amountInr ?? 0,
      notes: '',
    },
  });

  // Prefill with existing bid amount
  useEffect(() => {
    if (existingBid) setValue('amountInr', existingBid.amountInr);
  }, [existingBid, setValue]);

  const activeBids = bids.filter((b) => b.status === 'active');
  const bidCount = activeBids.length;
  const lowestBid = activeBids.length > 0
    ? Math.min(...activeBids.map((b: any) => b.amountInr))
    : null;

  // Check if this driver is the assigned driver
  const isAssignedDriver = job?.assignedDriverUid === firebaseUser?.uid;
  const assignmentId = job?.currentAssignmentId;
  const { data: assignment } = useRTDBValue<any>(
    isAssignedDriver && jobId && assignmentId
      ? `${DB_PATHS.assignments}/${jobId}/${assignmentId}`
      : null,
  );

  const onSubmitBid = async (data: BidFormData) => {
    if (!firebaseUser?.uid || !jobId) return;
    setLoading(true);
    setServerError('');
    try {
      if (existingBid) {
        await reviseBid(jobId, existingBid.bidId, firebaseUser.uid, data.amountInr, data.notes);
        setExistingBid({ ...existingBid, amountInr: data.amountInr });
      } else {
        const bidId = await placeBid({
          jobId,
          driverUid: firebaseUser.uid,
          truckId,
          amountInr: data.amountInr,
          notes: data.notes,
        });
        setExistingBid({ bidId, amountInr: data.amountInr });
      }
      setBidPlaced(true);
    } catch (err: any) {
      setServerError(err.message ?? 'Bid failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onWithdraw = () => {
    if (!existingBid || !firebaseUser?.uid || !jobId) return;
    Alert.alert('Withdraw bid?', 'Your bid will be removed from this job.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await withdrawBid(jobId, existingBid.bidId, firebaseUser.uid);
            setExistingBid(null);
            setBidPlaced(false);
          } catch (err: any) {
            setServerError(err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const onAccept = async () => {
    if (!jobId || !assignmentId || !firebaseUser?.uid) return;
    setLoading(true);
    try {
      await acceptAssignment(jobId, assignmentId, firebaseUser.uid);
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onReject = async () => {
    if (!jobId || !assignmentId || !firebaseUser?.uid) return;
    Alert.alert('Reject offer?', 'The factory will be notified and the job will reopen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await rejectAssignment(jobId, assignmentId, firebaseUser.uid);
          } catch (err: any) {
            setServerError(err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (jobLoading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.ochre} size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', padding: SPACING.xl }]}>
        <Text style={s.errorText}>Job not found.</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" size="md" style={{ marginTop: SPACING.md }} />
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
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
              <Text style={s.backArrow}>←</Text>
            </Pressable>
            <Chip label={job.status?.replace(/_/g, ' ') ?? 'open'} status={job.status} />
          </View>

          {/* Route hero */}
          <View style={s.routeHero}>
            <View style={s.heroCity}>
              <Text style={s.heroCityTag}>PICKUP</Text>
              <Text style={s.heroCityName}>{job.pickupCity}</Text>
              <Text style={s.heroCityState}>{job.pickupState}</Text>
            </View>
            <Text style={s.heroArrow}>→</Text>
            <View style={[s.heroCity, { alignItems: 'flex-end' }]}>
              <Text style={s.heroCityTag}>DELIVERY</Text>
              <Text style={s.heroCityName}>{job.deliveryCity}</Text>
              <Text style={s.heroCityState}>{job.deliveryState}</Text>
            </View>
          </View>

          {/* Offer / assignment banner */}
          {isAssignedDriver && job.status === 'offered' && assignment && (
            <Card style={[s.offerCard, { borderColor: COLORS.ochre }]}>
              <Text style={s.offerTitle}>You've received an offer!</Text>
              <Text style={s.offerSub}>
                The factory wants to assign this job to you at {formatINR(existingBid?.amountInr ?? 0)}.
                {'\n'}Expires in: {timeLeft(assignment.expiresAt)}
              </Text>
              {serverError.length > 0 && (
                <Text style={{ color: COLORS.brick, fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, marginBottom: SPACING.xs }}>{serverError}</Text>
              )}
              <View style={s.assignRow}>
                <Button title="Accept" onPress={onAccept} variant="primary" size="md" loading={loading} style={{ flex: 1 }} />
                <Button title="Reject" onPress={onReject} variant="danger" size="md" style={{ flex: 1, marginLeft: SPACING.xs }} />
              </View>
            </Card>
          )}

          {isAssignedDriver && job.status === 'accepted' && (
            <Card style={[s.offerCard, { borderColor: COLORS.olive }]}>
              <Text style={[s.offerTitle, { color: COLORS.olive }]}>Job Accepted</Text>
              <Text style={s.offerSub}>Head to the pickup location. The factory is tracking your route.</Text>
            </Card>
          )}

          {/* Error banner */}
          {!isAssignedDriver && serverError.length > 0 && (
            <View style={s.errorBanner}><Text style={s.errorBannerText}>{serverError}</Text></View>
          )}

          {/* Job details */}
          <Card style={s.detailCard}>
            <Text style={s.sectionTitle}>Job Details</Text>
            <InfoRow label="Category" value={categoryLabel(job.goodsCategory ?? '')} />
            <InfoRow label="Weight" value={`${job.weightTonnes} tonnes`} />
            {job.budgetInr && <InfoRow label="Factory budget" value={formatINR(job.budgetInr)} />}
            <InfoRow label="Available" value={`${formatDate(job.availableFrom)} – ${formatDate(job.availableUntil)}`} />
            {job.paymentTerms && <InfoRow label="Payment" value={job.paymentTerms.replace(/_/g, ' ')} />}
            {job.requiredVehicleType && <InfoRow label="Required vehicle" value={job.requiredVehicleType.replace(/_/g, ' ')} />}
            {job.requiredBodyType && <InfoRow label="Required body" value={job.requiredBodyType.replace(/_/g, ' ')} />}
          </Card>

          {/* Bid summary (partial visibility) */}
          {job.status === 'open' && (
            <Card style={s.bidSummaryCard}>
              <Text style={s.sectionTitle}>Bid Activity</Text>
              <View style={s.bidSummaryRow}>
                <View style={s.bidStat}>
                  <Text style={s.bidStatValue}>{bidCount}</Text>
                  <Text style={s.bidStatLabel}>total bids</Text>
                </View>
                {lowestBid && (
                  <View style={s.bidStat}>
                    <Text style={s.bidStatValue}>{formatINR(lowestBid)}</Text>
                    <Text style={s.bidStatLabel}>lowest bid</Text>
                  </View>
                )}
                {existingBid && (
                  <View style={s.bidStat}>
                    <Text style={[s.bidStatValue, { color: COLORS.ochre }]}>{formatINR(existingBid.amountInr)}</Text>
                    <Text style={s.bidStatLabel}>your bid</Text>
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Bid form — only if job is open and driver not assigned */}
          {job.status === 'open' && !isAssignedDriver && (
            <Card style={s.detailCard}>
              <Text style={s.sectionTitle}>
                {existingBid ? 'Revise Your Bid' : 'Place a Bid'}
              </Text>
              {bidPlaced && !loading && (
                <View style={s.successBanner}>
                  <Text style={s.successText}>
                    {existingBid ? 'Bid updated!' : 'Bid placed!'} The factory can now see your offer.
                  </Text>
                </View>
              )}
              <Controller
                control={control}
                name="amountInr"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Your bid amount (₹)"
                    placeholder={job.budgetInr ? `Less than ${formatINR(job.budgetInr)}` : 'Enter amount'}
                    value={value ? String(value) : ''}
                    onChangeText={(t) => onChange(parseFloat(t) || 0)}
                    onBlur={onBlur}
                    keyboardType="numeric"
                    error={errors.amountInr?.message}
                    accessibilityLabel="Bid amount in rupees"
                  />
                )}
              />
              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Notes for factory (optional)"
                    placeholder="I can pickup tomorrow morning, etc."
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={2}
                    accessibilityLabel="Bid notes"
                  />
                )}
              />
              <Button
                title={existingBid ? 'Revise Bid' : 'Place Bid'}
                onPress={handleSubmit(onSubmitBid)}
                variant="primary"
                fullWidth
                size="lg"
                loading={loading}
              />
              {existingBid && (
                <Button
                  title="Withdraw Bid"
                  onPress={onWithdraw}
                  variant="ghost"
                  fullWidth
                  size="md"
                  style={{ marginTop: SPACING.xs }}
                />
              )}
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SPACING.xl, marginBottom: SPACING.md },
  backArrow: { fontSize: 22, color: COLORS.charcoal },
  routeHero: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, backgroundColor: COLORS.paperWhite, borderRadius: RADII.lg, padding: SPACING.md },
  heroCity: { flex: 1 },
  heroCityTag: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, letterSpacing: 0.8, textTransform: 'uppercase' },
  heroCityName: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.charcoal },
  heroCityState: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel },
  heroArrow: { fontSize: 22, color: COLORS.ochre, paddingHorizontal: SPACING.sm },
  detailCard: { padding: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal, marginBottom: SPACING.sm },
  offerCard: { padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1.5 },
  offerTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.md, color: COLORS.ochre, marginBottom: SPACING.xxs },
  offerSub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, lineHeight: 20, marginBottom: SPACING.sm },
  assignRow: { flexDirection: 'row', gap: SPACING.xs },
  bidSummaryCard: { padding: SPACING.md, marginBottom: SPACING.md },
  bidSummaryRow: { flexDirection: 'row', gap: SPACING.md },
  bidStat: { flex: 1, alignItems: 'center', backgroundColor: COLORS.offWhite, borderRadius: RADII.sm, padding: SPACING.sm },
  bidStatValue: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal },
  bidStatLabel: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, textTransform: 'uppercase', letterSpacing: 0.5 },
  errorBanner: { backgroundColor: COLORS.brick + '15', borderWidth: 1, borderColor: COLORS.brick, borderRadius: RADII.sm, padding: SPACING.sm, marginBottom: SPACING.sm },
  errorBannerText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.brick },
  successBanner: { backgroundColor: COLORS.olive + '15', borderWidth: 1, borderColor: COLORS.olive, borderRadius: RADII.sm, padding: SPACING.sm, marginBottom: SPACING.sm },
  successText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.olive },
  errorText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.md, color: COLORS.steel },
});
