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
  Switch,
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
import { rankJobsWithAI, type JobForRanking, type RankedJob } from '../../src/services/aiRankingService';
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

function ScoreBadge({ score, label }: { score: number; label?: string }) {
  const color =
    score >= 75 ? COLORS.olive : score >= 50 ? COLORS.ochre : COLORS.rust;
  return (
    <View style={[scoreBadgeS.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[scoreBadgeS.text, { color }]}>{score}</Text>
      {label && <Text style={[scoreBadgeS.label, { color }]}>{label}</Text>}
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
    flexDirection: 'row',
    gap: 4,
  },
  text: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.sm },
  label: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs },
});

// ── Job card ──────────────────────────────────────────────────

function JobCard({
  job,
  score,
  reasoning,
  isAIRanked,
  index,
  onPress,
}: {
  job: JobSnapshot;
  score?: number;
  reasoning?: string;
  isAIRanked?: boolean;
  index: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Job from ${(job as any).pickupCity} to ${(job as any).deliveryCity}`}>
        <Card style={s.card}>
          {/* AI Reasoning Banner */}
          {isAIRanked && reasoning && (
            <View style={s.reasoningBanner}>
              <Text style={s.reasoningText}>🤖 {reasoning}</Text>
            </View>
          )}

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
                <ScoreBadge score={score} label={isAIRanked ? 'AI' : 'match'} />
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

  const [aiRankingEnabled, setAiRankingEnabled] = useState(false);
  const [aiRankedJobs, setAiRankedJobs] = useState<RankedJob[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

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

  // Fetch driver's profile
  const { data: driverProfile } = useRTDBValue<any>(
    uid ? `${DB_PATHS.users}/${uid}` : null
  );

  // Fetch driver's truck info
  const { data: driverPrivate } = useRTDBValue<any>(
    uid ? `${DB_PATHS.userPrivate}/${uid}` : null
  );
  const { data: truck } = useRTDBValue<any>(
    uid && driverPrivate?.primaryTruckId
      ? `${DB_PATHS.trucks}/${uid}/${driverPrivate.primaryTruckId}`
      : null
  );

  const openJobs = allJobs.filter((j) => {
    // Filter out deleted jobs or jobs with missing critical data
    if (!j || !(j as any).status || !(j as any).jobId) return false;
    if ((j as any).status !== 'open') return false;
    if (!(j as any).pickupCity || !(j as any).deliveryCity) return false;
    return true;
  });

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
          const jobData = snap.val() as JobSnapshot;
          // Ensure job has valid data and is still open
          if (jobData && (jobData as any).status === 'open' && (jobData as any).pickupCity && (jobData as any).deliveryCity) {
            detailed.push({ jobId, score, job: jobData });
          }
        }
      }
      setMatchedJobs(detailed);
    } catch (err: any) {
      setMatchError(err.message ?? 'Matching failed. Please try again.');
    } finally {
      setMatchLoading(false);
    }
  }, [activeRoute, uid]);

  const runAIRanking = useCallback(async () => {
    if (!uid) return;
    setAiLoading(true);
    try {
      // Get all open jobs
      const jobsSnapshot = await get(ref(getFirebaseDB(), DB_PATHS.jobs));
      const allJobsData: JobForRanking[] = [];
      
      if (jobsSnapshot.exists()) {
        const jobsObj = jobsSnapshot.val();
        Object.keys(jobsObj).forEach((jobId) => {
          const job = jobsObj[jobId];
          // Filter out deleted or invalid jobs
          if (job && job.status === 'open' && job.pickupCity && job.deliveryCity && job.jobId) {
            allJobsData.push({
              jobId,
              ...job,
            } as JobForRanking);
          }
        });
      }

      // Build driver profile
      const driverProfileData = {
        uid,
        city: driverProfile?.city,
        state: driverProfile?.state,
        currentLat: activeRoute?.currentLat,
        currentLng: activeRoute?.currentLng,
        truckType: truck?.vehicleType,
        bodyType: truck?.bodyType,
        maxCapacityTonnes: truck?.maxCapacityTonnes,
      };

      // Rank jobs with AI
      const ranked = await rankJobsWithAI(allJobsData, driverProfileData);
      setAiRankedJobs(ranked);
    } catch (err: any) {
      console.error('[AI Ranking] Error:', err);
      setMatchError(err.message ?? 'AI ranking failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }, [uid, driverProfile, activeRoute, truck]);

  useEffect(() => {
    if (activeRoute && !aiRankingEnabled) {
      runMatching();
    } else if (aiRankingEnabled) {
      runAIRanking();
    }
  }, [activeRoute, aiRankingEnabled, runMatching, runAIRanking]);

  // ── No route set ─────────────────────────────────────────

  if (!routeLoading && !activeRoute) {
    return (
      <View style={s.root}>
        <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
        <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
          <Text style={s.screenTitle}>Find Jobs</Text>
          {/* AI Ranking Toggle */}
          <View style={s.aiToggleContainer}>
            <Text style={s.aiToggleLabel}>AI Ranking</Text>
            <Switch
              value={aiRankingEnabled}
              onValueChange={(value) => {
                setAiRankingEnabled(value);
                if (value) {
                  runAIRanking();
                }
              }}
              trackColor={{ false: COLORS.steel + '30', true: COLORS.olive + '50' }}
              thumbColor={aiRankingEnabled ? COLORS.olive : COLORS.steel}
            />
          </View>
        </View>

        {/* Nudge */}
        {!aiRankingEnabled && (
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
        )}

        {/* AI Ranked or All Jobs */}
        {aiRankingEnabled ? (
          <>
            <Text style={s.sectionLabel}>🤖 AI Ranked Jobs ({aiRankedJobs.length})</Text>
            {aiLoading ? (
              <View style={s.loadingBox}>
                <ActivityIndicator color={COLORS.ochre} size="large" />
                <Text style={s.loadingText}>AI analyzing jobs for you…</Text>
              </View>
            ) : aiRankedJobs.length === 0 ? (
              <EmptyState
                heading="No jobs found"
                subText="No open jobs available at the moment. Check back soon."
                actionLabel="Refresh"
                onAction={runAIRanking}
              />
            ) : (
              <FlatList
                data={aiRankedJobs}
                keyExtractor={(item) => item.jobId}
                renderItem={({ item, index }) => (
                  <JobCard
                    job={item.job as any}
                    score={item.aiScore}
                    reasoning={item.reasoning}
                    isAIRanked={true}
                    index={index}
                    onPress={() => router.push(`/(driver)/job/${item.jobId}` as any)}
                  />
                )}
                contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, gap: SPACING.sm, paddingBottom: SPACING.xxl }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        ) : (
          <>
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
          </>
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
        <View style={{ flex: 1 }}>
          <Text style={s.screenTitle}>{aiRankingEnabled ? '🤖 AI Ranked Jobs' : 'Matched Jobs'}</Text>
          {activeRoute && (
            <Text style={s.routeSummary}>
              {(activeRoute as any).currentCity} → {(activeRoute as any).destinationCity}
            </Text>
          )}
        </View>
        
        {/* AI Toggle */}
        <View style={s.aiToggleContainer}>
          <Text style={s.aiToggleLabel}>AI</Text>
          <Switch
            value={aiRankingEnabled}
            onValueChange={(value) => {
              setAiRankingEnabled(value);
              if (value) {
                runAIRanking();
              } else {
                runMatching();
              }
            }}
            trackColor={{ false: COLORS.steel + '30', true: COLORS.olive + '50' }}
            thumbColor={aiRankingEnabled ? COLORS.olive : COLORS.steel}
          />
        </View>
      </View>

      {routeLoading || matchLoading || aiLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={COLORS.ochre} size="large" />
          <Text style={s.loadingText}>
            {aiRankingEnabled ? 'AI analyzing jobs for you…' : 'Scanning jobs along your route…'}
          </Text>
        </View>
      ) : matchError ? (
        <EmptyState
          heading={aiRankingEnabled ? 'AI ranking failed' : 'Match scan failed'}
          subText={matchError}
          actionLabel="Retry"
          onAction={aiRankingEnabled ? runAIRanking : runMatching}
        />
      ) : aiRankingEnabled ? (
        aiRankedJobs.length === 0 ? (
          <EmptyState
            heading="No jobs found"
            subText="No open jobs available at the moment. Check back soon."
            actionLabel="Refresh"
            onAction={runAIRanking}
          />
        ) : (
          <FlatList
            data={aiRankedJobs}
            keyExtractor={(item) => item.jobId}
            renderItem={({ item, index }) => (
              <JobCard
                job={item.job as any}
                score={item.aiScore}
                reasoning={item.reasoning}
                isAIRanked={true}
                index={index}
                onPress={() => router.push(`/(driver)/job/${item.jobId}` as any)}
              />
            )}
            contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xxl }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Animated.View entering={FadeIn.duration(300)}>
                <Text style={s.matchCount}>{aiRankedJobs.length} jobs ranked by AI intelligence</Text>
              </Animated.View>
            }
          />
        )
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
  aiToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.paperWhite,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  aiToggleLabel: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xs, color: COLORS.charcoal },
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
  reasoningBanner: {
    backgroundColor: COLORS.olive + '10',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.olive,
    padding: SPACING.xs,
    marginBottom: SPACING.sm,
    borderRadius: RADII.xs,
  },
  reasoningText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.charcoal, lineHeight: 16 },
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
