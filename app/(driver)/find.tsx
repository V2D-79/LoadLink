/**
 * app/(driver)/find.tsx
 *
 * Driver "Find Jobs" tab.
 *
 * If the driver has an active route set → queries the matching engine
 * cell index, scores every open job, shows ranked results.
 *
 * If no route → nudges the driver to set one, shows all open jobs
 * as a fallback (unscored, sorted by newest).
 *
 * Tapping a job → detail + bid screen.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { get, ref } from 'firebase/database';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { getFirebaseDB } from '../../src/services/firebase';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { useRTDBValue, useRTDBList } from '../../src/hooks/useRTDB';
import {
  findMatchingJobsForRoute,
  type RouteSnapshot,
  type JobSnapshot,
} from '../../src/engine/match';
import { Card, Chip, EmptyState, JobCardSkeleton } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { DB_PATHS, GOODS_CATEGORY_LABELS } from '../../src/constants/app';

// ── Helpers ───────────────────────────────────────────────────

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function categoryLabel(cat: string): string {
  return (GOODS_CATEGORY_LABELS as Record<string, string>)[cat] ?? cat.replace(/_/g, ' ');
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

// ── Score badge ───────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? COLORS.olive : score >= 50 ? COLORS.ochre : COLORS.rust;
  return (
    <View style={[scoreBadgeS.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[scoreBadgeS.text, { color }]}>{score}</Text>
    </View>
  );
}

const scoreBadgeS = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    alignItems: 'center',
    minWidth: 36,
  },
  text: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.sm },
});

// ── Job card ──────────────────────────────────────────────────

function JobCard({
  job,
  score,
  index,
  onPress,
}: {
  job: JobSnapshot;
  score?: number;
  index: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Job from ${(job as any).pickupCity} to ${(job as any).deliveryCity}`}>
        <Card style={s.card}>
          {/* Route */}
          <View style={s.routeRow}>
            <View style={s.routeCity}>
              <Text style={s.cityTag}>PICKUP</Text>
              <Text style={s.cityName}>{(job as any).pickupCity}</Text>
              <Text style={s.stateName}>{(job as any).pickupState}</Text>
            </View>
            <Text style={s.arrowText}>→</Text>
            <View style={[s.routeCity, { alignItems: 'flex-end' }]}>
              <Text style={s.cityTag}>DELIVERY</Text>
              <Text style={s.cityName}>{(job as any).deliveryCity}</Text>
              <Text style={s.stateName}>{(job as any).deliveryState}</Text>
            </View>
          </View>

          {/* Details row */}
          <View style={s.detailRow}>
            <Chip label={categoryLabel((job as any).goodsCategory ?? '')} />
            <Text style={s.weightText}>{job.weightTonnes}t</Text>
            {job.budgetInr ? (
              <Text style={s.budgetText}>{formatINR(job.budgetInr)}</Text>
            ) : (
              <Text style={s.budgetText}>Open budget</Text>
            )}
          </View>

          {/* Footer */}
          <View style={s.footerRow}>
            {score !== undefined ? (
              <View style={s.matchRow}>
                <ScoreBadge score={score} />
                <Text style={s.matchLabel}>match</Text>
              </View>
            ) : null}
            <Text style={s.bidCountText}>{(job as any).bidCount ?? 0} bids</Text>
            <Text style={s.timeText}>{relativeTime((job as any).createdAt ?? Date.now())}</Text>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function FindJobsScreen() {
  const { firebaseUser } = useAuthContext();
  const router = useRouter();
  const uid = firebaseUser?.uid;
  const insets = useSafeAreaInsets();

  const { data: activeRoute, loading: routeLoading } = useRTDBValue<RouteSnapshot>(
    uid ? `${DB_PATHS.driverRoutes}/${uid}` : null,
  );

  const [matchedJobs, setMatchedJobs] = useState<Array<{ jobId: string; score: number; job: JobSnapshot }>>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState('');

  // Fallback: all open jobs
  const { data: allJobs, loading: allLoading } = useRTDBList<JobSnapshot>(
    !activeRoute && !routeLoading ? DB_PATHS.jobs : null,
  );

  const openJobs = allJobs.filter((j) => (j as any).status === 'open');

  const runMatching = useCallback(async () => {
    if (!activeRoute || !uid) return;
    setMatchLoading(true);
    setMatchError('');
    try {
      const results = await findMatchingJobsForRoute(activeRoute);
      const detailed: Array<{ jobId: string; score: number; job: JobSnapshot }> = [];
      for (const { jobId, score } of results) {
        const snap = await get(ref(getFirebaseDB(), `${DB_PATHS.jobs}/${jobId}`));
        if (snap.exists()) {
          detailed.push({ jobId, score, job: snap.val() as JobSnapshot });
        }
      }
      setMatchedJobs(detailed);
    } catch (err: any) {
      setMatchError(err.message ?? 'Matching failed. Please try again.');
    } finally {
      setMatchLoading(false);
    }
  }, [activeRoute, uid]);

  useEffect(() => {
    if (activeRoute) runMatching();
  }, [activeRoute, runMatching]);

  // ── No route set ─────────────────────────────────────────

  if (!routeLoading && !activeRoute) {
    return (
      <View style={s.root}>
        <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
        <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
          <Text style={s.screenTitle}>Find Jobs</Text>
        </View>

        {/* Nudge */}
        <View style={s.nudgeCard}>
          <Text style={s.nudgeEmoji}>📍</Text>
          <Text style={s.nudgeTitle}>Set your route to get matches</Text>
          <Text style={s.nudgeSub}>
            Tell us where you're heading. The engine will rank the best jobs along your route.
          </Text>
          <Pressable
            onPress={() => router.push('/(driver)/route')}
            style={s.nudgeBtn}
            accessibilityRole="button"
            accessibilityLabel="Set route"
          >
            <Text style={s.nudgeBtnText}>Set My Route</Text>
          </Pressable>
        </View>

        {/* Fallback: all open jobs */}
        <Text style={s.sectionLabel}>All open jobs near India</Text>
        {allLoading ? (
          <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
            {[0, 1, 2].map((i) => <JobCardSkeleton key={i} />)}
          </View>
        ) : (
          <FlatList
            data={openJobs.slice(0, 20)}
            keyExtractor={(item) => item.jobId ?? (item as any).__key}
            renderItem={({ item, index }) => (
              <JobCard
                job={item}
                index={index}
                onPress={() => router.push(`/(driver)/job/${item.jobId}` as any)}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, gap: SPACING.sm, paddingBottom: SPACING.xxl }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  // ── With route: matched results ──────────────────────────

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
        <View>
          <Text style={s.screenTitle}>Matched Jobs</Text>
          {activeRoute && (
            <Text style={s.routeSummary}>
              {(activeRoute as any).currentCity} → {(activeRoute as any).destinationCity}
            </Text>
          )}
        </View>
        <Pressable
          onPress={runMatching}
          style={s.refreshBtn}
          accessibilityRole="button"
          accessibilityLabel="Refresh matches"
        >
          <Text style={s.refreshText}>↻ Refresh</Text>
        </Pressable>
      </View>

      {routeLoading || matchLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={COLORS.ochre} size="large" />
          <Text style={s.loadingText}>Scanning jobs along your route…</Text>
        </View>
      ) : matchError ? (
        <EmptyState
          heading="Match scan failed"
          subText={matchError}
          actionLabel="Retry"
          onAction={runMatching}
        />
      ) : matchedJobs.length === 0 ? (
        <EmptyState
          heading="No matches yet"
          subText="No open jobs found along your current route. Check back soon or update your route."
          actionLabel="Update Route"
          onAction={() => router.push('/(driver)/route')}
        />
      ) : (
        <FlatList
          data={matchedJobs}
          keyExtractor={(item) => item.jobId}
          renderItem={({ item, index }) => (
            <JobCard
              job={item.job}
              score={item.score}
              index={index}
              onPress={() => router.push(`/(driver)/job/${item.jobId}` as any)}
            />
          )}
          contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xxl }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Animated.View entering={FadeIn.duration(300)}>
              <Text style={s.matchCount}>{matchedJobs.length} jobs ranked by match score</Text>
            </Animated.View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  screenTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.charcoal },
  routeSummary: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel, marginTop: 2 },
  refreshBtn: {
    backgroundColor: COLORS.charcoal + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.round,
    marginTop: SPACING.xs,
  },
  refreshText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.charcoal },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  loadingText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel },
  matchCount: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.steel, marginBottom: SPACING.xs },
  nudgeCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.ochre + '12',
    borderWidth: 1,
    borderColor: COLORS.ochre,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  nudgeEmoji: { fontSize: 36, marginBottom: SPACING.sm },
  nudgeTitle: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal, textAlign: 'center', marginBottom: SPACING.xs },
  nudgeSub: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.md },
  nudgeBtn: { backgroundColor: COLORS.ochre, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADII.round },
  nudgeBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.paperWhite },
  sectionLabel: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.steel, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  card: { padding: SPACING.md },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  routeCity: { flex: 1 },
  cityTag: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, letterSpacing: 0.8, textTransform: 'uppercase' },
  cityName: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal },
  stateName: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel },
  arrowText: { fontSize: 18, color: COLORS.ochre, paddingHorizontal: SPACING.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  weightText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.steel },
  budgetText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xs, color: COLORS.charcoal },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xxs },
  matchLabel: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel },
  bidCountText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel, flex: 1 },
  timeText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel },
});
