/**
 * app/(factory)/job/[id].tsx
 *
 * Factory job detail screen.
 * Shows full job info, all active bids (partial visibility),
 * lets factory offer assignment to a driver.
 * Status-aware: shows appropriate actions per job state.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuthContext } from '../../../src/hooks/AuthContext';
import { useRTDBValue, useRTDBList } from '../../../src/hooks/useRTDB';
import { offerAssignment } from '../../../src/services/bidService';
import { Card, Chip, Button } from '../../../src/ui';
import DriverProfileSheet from '../../../src/components/DriverProfileSheet';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../../src/constants/theme';
import { DB_PATHS, GOODS_CATEGORY_LABELS } from '../../../src/constants/app';
import type { Bid } from '../../../src/services/bidService';

// ── Helpers ───────────────────────────────────────────────────

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function categoryLabel(cat: string): string {
  return (GOODS_CATEGORY_LABELS as Record<string, string>)[cat] ?? cat.replace(/_/g, ' ');
}

// ── Bid card ──────────────────────────────────────────────────

function BidCard({
  bid,
  isLowest,
  onOffer,
  offeringId,
  jobStatus,
}: {
  bid: Bid & { driverName?: string; truckReg?: string };
  isLowest: boolean;
  onOffer: (bid: Bid) => void;
  offeringId: string | null;
  jobStatus: string;
}) {
  const canOffer = jobStatus === 'open' && bid.status === 'active';

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Card style={[bs.card, isLowest && bs.cardLowest]}>
        <View style={bs.row}>
          <View style={bs.driverInfo}>
            <Text style={bs.driverName}>{bid.driverName ?? 'Driver'}</Text>
            {bid.truckReg && <Text style={bs.truckReg}>{bid.truckReg}</Text>}
          </View>
          <View style={bs.amountBox}>
            {isLowest && <Text style={bs.lowestTag}>LOWEST</Text>}
            <Text style={bs.amount}>{formatINR(bid.amountInr)}</Text>
          </View>
        </View>

        {bid.notes && <Text style={bs.notes}>{bid.notes}</Text>}

        <View style={bs.footer}>
          <Chip label={bid.status} status={bid.status === 'active' ? 'open' : bid.status} />
          {canOffer && (
            <Pressable
              onPress={() => onOffer(bid)}
              style={[bs.offerBtn, offeringId === bid.bidId && bs.offerBtnDisabled]}
              disabled={offeringId !== null}
              accessibilityRole="button"
              accessibilityLabel={`Offer job to this driver for ${formatINR(bid.amountInr)}`}
            >
              {offeringId === bid.bidId ? (
                <ActivityIndicator size="small" color={COLORS.paperWhite} />
              ) : (
                <Text style={bs.offerBtnText}>Offer Job</Text>
              )}
            </Pressable>
          )}
        </View>
      </Card>
    </Animated.View>
  );
}

const bs = StyleSheet.create({
  card: { padding: SPACING.md, marginBottom: SPACING.xs },
  cardLowest: { borderColor: COLORS.olive, borderWidth: 1.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.xs },
  driverInfo: { flex: 1 },
  driverName: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal },
  truckReg: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel, marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  lowestTag: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xxs, color: COLORS.olive, letterSpacing: 0.8, marginBottom: 2 },
  amount: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.charcoal },
  notes: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginBottom: SPACING.sm, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offerBtn: { backgroundColor: COLORS.ochre, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADII.sm },
  offerBtnDisabled: { opacity: 0.6 },
  offerBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.paperWhite },
});

// ── Info row ─────────────────────────────────────────────────

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

export default function FactoryJobDetailScreen() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const { firebaseUser } = useAuthContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: job, loading: jobLoading } = useRTDBValue<any>(
    jobId ? `${DB_PATHS.jobs}/${jobId}` : null,
  );
  const { data: bids, loading: bidsLoading } = useRTDBList<Bid>(
    jobId ? `${DB_PATHS.bids}/${jobId}` : null,
  );

  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [driverSheetOpen, setDriverSheetOpen] = useState(false);

  // Partial bid visibility: show active bids only, sorted by amount
  const activeBids = useMemo(() => {
    return bids
      .filter((b) => b.status === 'active' || b.status === 'selected')
      .sort((a, b) => a.amountInr - b.amountInr);
  }, [bids]);

  const lowestBid = activeBids[0];

  const handleOffer = async (bid: Bid) => {
    if (!jobId || !firebaseUser || !job) return;
    Alert.alert(
      'Offer job to driver?',
      `This will send an offer of ${formatINR(bid.amountInr)} to the driver. They have ${12}h to accept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Offer',
          onPress: async () => {
            setOfferingId(bid.bidId);
            setError('');
            try {
              await offerAssignment(jobId, bid.bidId, bid.driverUid, bid.truckId, firebaseUser.uid);
            } catch (err: any) {
              setError(err.message ?? 'Failed to send offer.');
            } finally {
              setOfferingId(null);
            }
          },
        },
      ],
    );
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
        <Text style={s.errorText}>Job not found or was removed.</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" size="md" style={{ marginTop: SPACING.md }} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + SPACING.md }]}
        showsVerticalScrollIndicator={false}
      >

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
          <View style={s.heroArrow}>
            <Text style={s.heroArrowText}>→</Text>
          </View>
          <View style={[s.heroCity, { alignItems: 'flex-end' }]}>
            <Text style={s.heroCityTag}>DELIVERY</Text>
            <Text style={s.heroCityName}>{job.deliveryCity}</Text>
            <Text style={s.heroCityState}>{job.deliveryState}</Text>
          </View>
        </View>

        {error.length > 0 && (
          <View style={s.errorBanner}><Text style={s.errorBannerText}>{error}</Text></View>
        )}

        {/* Job details */}
        <Card style={s.detailCard}>
          <Text style={s.sectionTitle}>Job Details</Text>
          <InfoRow label="Category" value={categoryLabel(job.goodsCategory ?? '')} />
          <InfoRow label="Weight" value={`${job.weightTonnes} tonnes`} />
          {job.budgetInr && <InfoRow label="Budget" value={formatINR(job.budgetInr)} />}
          <InfoRow label="Available from" value={formatDate(job.availableFrom)} />
          <InfoRow label="Available until" value={formatDate(job.availableUntil)} />
          {job.requiredVehicleType && (
            <InfoRow label="Required vehicle" value={job.requiredVehicleType.replace(/_/g, ' ')} />
          )}
          {job.requiredBodyType && (
            <InfoRow label="Required body" value={job.requiredBodyType.replace(/_/g, ' ')} />
          )}
          {job.specialInstructions && (
            <View style={{ paddingTop: SPACING.xs }}>
              <Text style={infoS.label}>Special instructions</Text>
              <Text style={[infoS.value, { textAlign: 'left', marginTop: 4 }]}>
                {job.specialInstructions}
              </Text>
            </View>
          )}
        </Card>

        {/* Bids section */}
        <View style={s.bidsHeader}>
          <Text style={s.sectionTitle}>
            Bids ({activeBids.length})
          </Text>
          {activeBids.length > 0 && (
            <Text style={s.bidsSummary}>
              Lowest: {formatINR(lowestBid!.amountInr)}
            </Text>
          )}
        </View>

        {bidsLoading ? (
          <ActivityIndicator color={COLORS.ochre} style={{ marginVertical: SPACING.lg }} />
        ) : activeBids.length === 0 ? (
          <Card style={s.noBidsCard}>
            <Text style={s.noBidsText}>No bids yet. Matching drivers will be notified automatically.</Text>
          </Card>
        ) : (
          activeBids.map((bid) => (
            <BidCard
              key={bid.bidId ?? (bid as any).__key}
              bid={bid}
              isLowest={bid.bidId === lowestBid?.bidId}
              onOffer={handleOffer}
              offeringId={offeringId}
              jobStatus={job.status}
            />
          ))
        )}

        {/* Driver profile card — shown when a driver is assigned */}
        {job.assignedDriverUid && (
          <Pressable
            onPress={() => setDriverSheetOpen(true)}
            style={({ pressed }) => [
              s.driverCard,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View driver profile"
          >
            <View style={s.driverCardLeft}>
              <View style={s.driverAvatar}>
                <Text style={s.driverAvatarTxt}>🧑‍✈️</Text>
              </View>
              <View>
                <Text style={s.driverCardTitle}>Assigned Driver</Text>
                <Text style={s.driverCardSub}>
                  Tap to view profile, truck info &amp; contact
                </Text>
              </View>
            </View>
            <Text style={s.driverCardArrow}>›</Text>
          </Pressable>
        )}

        {/* Offer sent status */}
        {job.status === 'offered' && (
          <Card style={[s.detailCard, { backgroundColor: COLORS.ochre + '10', borderColor: COLORS.ochre }]}>
            <Text style={s.assignedTitle}>Offer Sent — Awaiting Driver</Text>
            <Text style={s.assignedSub}>
              Waiting for the driver to accept. The offer expires after 12 hours.
            </Text>
          </Card>
        )}

        {job.status === 'accepted' && (
          <Card style={[s.detailCard, { backgroundColor: COLORS.olive + '10', borderColor: COLORS.olive }]}>
            <Text style={[s.assignedTitle, { color: COLORS.olive }]}>Driver Accepted</Text>
            <Text style={s.assignedSub}>
              The driver has confirmed. Track their location on the Track tab.
            </Text>
            <Button
              title="Track Driver"
              onPress={() => router.replace('/(factory)/track')}
              variant="primary"
              size="md"
              style={{ marginTop: SPACING.sm }}
            />
          </Card>
        )}
      </ScrollView>

      {/* Driver profile bottom sheet */}
      {job?.assignedDriverUid && (
        <DriverProfileSheet
          visible={driverSheetOpen}
          onClose={() => setDriverSheetOpen(false)}
          driverUid={job.assignedDriverUid}
          truckId={job.assignedTruckId}
          bidAmountInr={
            bids.find(
              (b) => b.driverUid === job.assignedDriverUid && b.status === 'selected',
            )?.amountInr
          }
          jobStatus={job.status}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  scroll: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SPACING.sm, marginBottom: SPACING.md },
  backArrow: { fontSize: 22, color: COLORS.charcoal },
  routeHero: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, backgroundColor: COLORS.paperWhite, borderRadius: RADII.lg, padding: SPACING.md },
  heroCity: { flex: 1 },
  heroCityTag: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, letterSpacing: 0.8, textTransform: 'uppercase' },
  heroCityName: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.charcoal },
  heroCityState: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel },
  heroArrow: { paddingHorizontal: SPACING.sm },
  heroArrowText: { fontSize: 22, color: COLORS.ochre },
  detailCard: { padding: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal, marginBottom: SPACING.sm },
  bidsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  bidsSummary: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.olive },
  noBidsCard: { padding: SPACING.md, marginBottom: SPACING.md, alignItems: 'center' },
  noBidsText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, textAlign: 'center', lineHeight: 20 },
  errorBanner: { backgroundColor: COLORS.brick + '15', borderWidth: 1, borderColor: COLORS.brick, borderRadius: RADII.sm, padding: SPACING.sm, marginBottom: SPACING.sm },
  errorBannerText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.brick },
  errorText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.md, color: COLORS.steel, textAlign: 'center' },
  assignedTitle: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.ochre, marginBottom: SPACING.xxs },
  assignedSub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, lineHeight: 20 },
  // ── Driver profile card
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.charcoal,
    borderRadius: RADII.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  driverCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  driverAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.ochre + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  driverAvatarTxt: { fontSize: 22 },
  driverCardTitle: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.sm, color: COLORS.offWhite },
  driverCardSub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel, marginTop: 2 },
  driverCardArrow: { fontSize: 24, color: COLORS.ochre, fontFamily: FONTS.headingBold },
});

