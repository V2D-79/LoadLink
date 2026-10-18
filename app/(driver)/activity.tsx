/**
 * app/(driver)/activity.tsx
 *
 * Driver "Activity" tab.
 * Shows:
 *   - "My Offers" — jobs where driver has an active assignment offer
 *   - "Active Trips" — accepted/in-transit jobs
 *   - "Bid History" — jobs the driver has bid on (via bidsByDriver index)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuthContext } from '../../src/hooks/AuthContext';
import { useRTDBValue, useRTDBList } from '../../src/hooks/useRTDB';
import { Card, Chip, EmptyState } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { DB_PATHS } from '../../src/constants/app';

// ── Helpers ───────────────────────────────────────────────────

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function timeLeft(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

// ── Activity card ─────────────────────────────────────────────

function ActivityCard({
  jobId,
  job,
  bidAmount,
  status,
  assignment,
  index,
  onPress,
}: {
  jobId: string;
  job: any;
  bidAmount?: number;
  status: string;
  assignment?: any;
  index: number;
  onPress: () => void;
}) {
  const isOffer = assignment && assignment.status === 'offered';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Job from ${job?.pickupCity ?? ''} to ${job?.deliveryCity ?? ''}`}>
        <Card style={[s.card, isOffer && s.cardOffer]}>
          {isOffer && (
            <View style={s.offerBadge}>
              <Text style={s.offerBadgeText}>OFFER — {timeLeft(assignment.expiresAt)}</Text>
            </View>
          )}

          <View style={s.routeRow}>
            <View style={s.city}>
              <Text style={s.cityName}>{job?.pickupCity ?? '...'}</Text>
              <Text style={s.cityState}>{job?.pickupState ?? ''}</Text>
            </View>
            <Text style={s.arrow}>→</Text>
            <View style={[s.city, { alignItems: 'flex-end' }]}>
              <Text style={s.cityName}>{job?.deliveryCity ?? '...'}</Text>
              <Text style={s.cityState}>{job?.deliveryState ?? ''}</Text>
            </View>
          </View>

          <View style={s.footerRow}>
            <Chip label={status.replace(/_/g, ' ')} status={job?.status ?? 'open'} />
            {bidAmount && (
              <Text style={s.bidAmount}>Your bid: {formatINR(bidAmount)}</Text>
            )}
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

// ── Tabs ──────────────────────────────────────────────────────

const TABS = [
  { key: 'offers', label: 'Offers' },
  { key: 'active', label: 'Active' },
  { key: 'bids', label: 'All Bids' },
] as const;

// ── Job item that fetches its own data ────────────────────────

function ActivityJobItem({
  jobId,
  bidAmount,
  index,
}: {
  jobId: string;
  bidAmount?: number;
  index: number;
}) {
  const router = useRouter();
  const { data: job } = useRTDBValue<any>(`${DB_PATHS.jobs}/${jobId}`);

  const isAssigned = job?.assignedDriverUid != null;
  const { data: assignment } = useRTDBValue<any>(
    isAssigned && job?.currentAssignmentId
      ? `${DB_PATHS.assignments}/${jobId}/${job.currentAssignmentId}`
      : null,
  );

  return (
    <ActivityCard
      jobId={jobId}
      job={job}
      bidAmount={bidAmount}
      status={job?.status ?? 'open'}
      assignment={assignment}
      index={index}
      onPress={() => router.push(`/(driver)/job/${jobId}` as any)}
    />
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function ActivityScreen() {
  const { firebaseUser } = useAuthContext();
  const uid = firebaseUser?.uid;
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'offers' | 'active' | 'bids'>('offers');

  // bidsByDriver/{uid} → { [jobId]: { bidId, amountInr, updatedAt } }
  const { data: bidIndex, loading: bidsLoading } = useRTDBValue<Record<string, { bidId: string; amountInr: number; updatedAt: number }>>(
    uid ? `${DB_PATHS.bidsByDriver}/${uid}` : null,
  );

  const bidEntries = useMemo(() => {
    if (!bidIndex) return [];
    return Object.entries(bidIndex).map(([jobId, info]) => ({ jobId, ...info }));
  }, [bidIndex]);

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />

      <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={s.screenTitle}>My Activity</Text>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[s.tab, tab === t.key && s.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
          >
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {bidsLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={COLORS.ochre} />
        </View>
      ) : bidEntries.length === 0 ? (
        <EmptyState
          heading="No activity yet"
          subText="Jobs you bid on will appear here. Find jobs on the Find tab."
          type="bids"
        />
      ) : (
        <FlatList
          data={bidEntries}
          keyExtractor={(item) => item.jobId}
          renderItem={({ item, index }) => (
            <ActivityJobItem
              jobId={item.jobId}
              bidAmount={item.amountInr}
              index={index}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, gap: SPACING.sm, paddingBottom: SPACING.xxl }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  screenTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.charcoal },
  tabBar: { flexDirection: 'row', paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.hairline },
  tab: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, marginRight: SPACING.xs },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.ochre },
  tabLabel: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.steel },
  tabLabelActive: { color: COLORS.ochre, fontFamily: FONTS.bodySemiBold },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: SPACING.md },
  cardOffer: { borderColor: COLORS.ochre, borderWidth: 1.5 },
  offerBadge: { backgroundColor: COLORS.ochre, alignSelf: 'flex-start', borderRadius: RADII.xs, paddingHorizontal: SPACING.xs, paddingVertical: 2, marginBottom: SPACING.xs },
  offerBadgeText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xxs, color: COLORS.paperWhite, letterSpacing: 0.5 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  city: { flex: 1 },
  cityName: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal },
  cityState: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel },
  arrow: { fontSize: 16, color: COLORS.ochre, paddingHorizontal: SPACING.xs },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  bidAmount: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.charcoal },
});
