/**
 * app/(factory)/jobs.tsx
 *
 * Factory "My Jobs" tab.
 *
 * Shows all jobs posted by the logged-in factory user,
 * ordered by createdAt desc. Real-time RTDB subscription.
 * Tapping a job opens a detail bottom sheet with bids.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { query, ref, orderByChild, equalTo, get } from 'firebase/database';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { getFirebaseDB } from '../../src/services/firebase';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { useRTDBList } from '../../src/hooks/useRTDB';
import { Card, Chip, EmptyState, JobCardSkeleton } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { DB_PATHS, JOB_STATUSES, GOODS_CATEGORY_LABELS } from '../../src/constants/app';

// ── Types ─────────────────────────────────────────────────────

interface Job {
  jobId: string;
  status: string;
  pickupCity: string;
  pickupState: string;
  deliveryCity: string;
  deliveryState: string;
  goodsCategory: string;
  weightTonnes: number;
  budgetInr?: number;
  bidCount: number;
  availableFrom: number;
  availableUntil: number;
  createdAt: number;
  __key: string;
}

// ── Helpers ───────────────────────────────────────────────────

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function categoryLabel(cat: string): string {
  return (GOODS_CATEGORY_LABELS as Record<string, string>)[cat] ?? cat.replace(/_/g, ' ');
}

const STATUS_ACTIVE = ['open', 'offered', 'accepted', 'heading_to_pickup', 'loaded', 'in_transit'];
const STATUS_PAST = ['delivered', 'completed', 'cancelled', 'expired'];

// ── Job card ──────────────────────────────────────────────────

function JobCard({ job, onPress, index }: { job: Job; onPress: () => void; index: number }) {
  const isActive = STATUS_ACTIVE.includes(job.status);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Job from ${job.pickupCity} to ${job.deliveryCity}`}>
        <Card style={s.jobCard}>
          {/* Route row */}
          <View style={s.routeRow}>
            <View style={s.city}>
              <Text style={s.cityLabel}>FROM</Text>
              <Text style={s.cityName}>{job.pickupCity}</Text>
              <Text style={s.stateName}>{job.pickupState}</Text>
            </View>
            <View style={s.arrow}>
              <Text style={s.arrowText}>→</Text>
            </View>
            <View style={[s.city, { alignItems: 'flex-end' }]}>
              <Text style={s.cityLabel}>TO</Text>
              <Text style={s.cityName}>{job.deliveryCity}</Text>
              <Text style={s.stateName}>{job.deliveryState}</Text>
            </View>
          </View>

          {/* Meta row */}
          <View style={s.metaRow}>
            <Chip label={job.status.replace(/_/g, ' ')} status={job.status} />
            <Text style={s.metaText}>{categoryLabel(job.goodsCategory)}</Text>
            <Text style={s.metaText}>{job.weightTonnes}t</Text>
          </View>

          {/* Footer row */}
          <View style={s.footerRow}>
            <View style={s.bidBadge}>
              <Text style={s.bidCount}>{job.bidCount}</Text>
              <Text style={s.bidLabel}> {job.bidCount === 1 ? 'bid' : 'bids'}</Text>
            </View>
            {job.budgetInr ? (
              <Text style={s.budget}>Budget: {formatINR(job.budgetInr)}</Text>
            ) : (
              <Text style={s.budget}>Open budget</Text>
            )}
            <Text style={s.time}>{relativeTime(job.createdAt)}</Text>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

// ── Filter tabs ───────────────────────────────────────────────

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
] as const;

// ── Main screen ───────────────────────────────────────────────

export default function JobsScreen() {
  const { firebaseUser } = useAuthContext();
  const router = useRouter();
  const [tab, setTab] = useState<'active' | 'past' | 'all'>('active');

  const { data: allJobs, loading, error } = useRTDBList<Job>(
    firebaseUser?.uid ? DB_PATHS.jobs : null,
  );

  // Filter to only this factory's jobs, then by tab
  const myJobs = useMemo(() => {
    const uid = firebaseUser?.uid;
    if (!uid) return [];
    const mine = allJobs.filter((j) => (j as any).factoryUid === uid);
    const sorted = mine.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    if (tab === 'active') return sorted.filter((j) => STATUS_ACTIVE.includes(j.status));
    if (tab === 'past') return sorted.filter((j) => STATUS_PAST.includes(j.status));
    return sorted;
  }, [allJobs, firebaseUser?.uid, tab]);

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.screenTitle}>My Jobs</Text>
        <Pressable
          onPress={() => router.push('/(factory)/post')}
          style={s.postBtn}
          accessibilityRole="button"
          accessibilityLabel="Post new job"
        >
          <Text style={s.postBtnText}>+ Post Job</Text>
        </Pressable>
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
            accessibilityLabel={`${t.label} jobs`}
          >
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
          {[0, 1, 2].map((i) => <JobCardSkeleton key={i} />)}
        </View>
      ) : error ? (
        <EmptyState
          heading="Failed to load"
          subText={error}
          actionLabel="Retry"
          onAction={() => {}}
        />
      ) : myJobs.length === 0 ? (
        <EmptyState
          heading={tab === 'active' ? 'No active jobs' : 'No jobs yet'}
          subText={
            tab === 'active'
              ? 'Post a transport job and matching drivers will be notified.'
              : 'Your completed and cancelled jobs will appear here.'
          }
          actionLabel="Post a Job"
          onAction={() => router.push('/(factory)/post')}
        />
      ) : (
        <FlatList
          data={myJobs}
          keyExtractor={(item) => item.jobId ?? item.__key}
          renderItem={({ item, index }) => (
            <JobCard
              job={item}
              index={index}
              onPress={() => router.push(`/(factory)/job/${item.jobId}` as any)}
            />
          )}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.sm }}
          showsVerticalScrollIndicator={false}
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
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  screenTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.charcoal },
  postBtn: {
    backgroundColor: COLORS.ochre,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.round,
  },
  postBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.paperWhite },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  tab: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.xs,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.ochre },
  tabLabel: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.steel },
  tabLabelActive: { color: COLORS.ochre, fontFamily: FONTS.bodySemiBold },
  jobCard: { padding: SPACING.md },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  city: { flex: 1 },
  cityLabel: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, letterSpacing: 0.8, textTransform: 'uppercase' },
  cityName: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal },
  stateName: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel },
  arrow: { paddingHorizontal: SPACING.sm },
  arrowText: { fontSize: 18, color: COLORS.ochre },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  metaText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  bidBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.ochre + '20', paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: RADII.sm },
  bidCount: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.sm, color: COLORS.ochre },
  bidLabel: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.ochre },
  budget: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.charcoal, flex: 1 },
  time: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel },
});
