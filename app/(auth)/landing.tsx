/**
 * app/(auth)/landing.tsx
 *
 * Landing screen — the app's first impression.
 * Shows the LoadLink logo, tagline, live stats counter,
 * and Log In / Sign Up call-to-action buttons.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ref, onValue } from 'firebase/database';
import { getFirebaseDB } from '../../src/services/firebase';
import { Logo } from '../../src/ui';
import Button from '../../src/ui/Button';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { APP_NAME, DB_PATHS } from '../../src/constants/app';

const { width: SCREEN_W } = Dimensions.get('window');

interface Stats {
  totalUsers: number;
  totalJobs: number;
  completedTrips: number;
}

function StatItem({ value, label }: { value: number; label: string }) {
  if (value === 0) return null;
  const formatted = value >= 1000
    ? `${(value / 1000).toFixed(1)}K`
    : String(value);
  return (
    <View style={statStyles.item}>
      <Text style={statStyles.value}>{formatted}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: { alignItems: 'center', flex: 1 },
  value: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.ochre },
  label: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel, textAlign: 'center' },
});

// How-it-works step card
function Step({ num, text, accent }: { num: number; text: string; accent: string }) {
  return (
    <View style={stepStyles.row}>
      <View style={[stepStyles.badge, { backgroundColor: accent + '22', borderColor: accent }]}>
        <Text style={[stepStyles.num, { color: accent }]}>{num}</Text>
      </View>
      <Text style={stepStyles.text}>{text}</Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  badge: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm, marginTop: 1,
  },
  num: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.sm },
  text: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, lineHeight: 20 },
});

export default function LandingScreen() {
  const router = useRouter();
  const [stats, setStats] = React.useState<Stats>({ totalUsers: 0, totalJobs: 0, completedTrips: 0 });

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(-20);
  const taglineOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(20);

  useEffect(() => {
    // Staggered entrance
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    logoY.value = withDelay(100, withSpring(0, { damping: 18 }));
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    ctaOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    ctaY.value = withDelay(700, withSpring(0, { damping: 18 }));
  }, []);

  // Live counters from RTDB
  useEffect(() => {
    try {
      const db = getFirebaseDB();
      const countersRef = ref(db, 'counters');
      const unsubscribe = onValue(countersRef, (snap) => {
        if (snap.exists()) {
          const d = snap.val();
          setStats({
            totalUsers: d.totalUsers ?? 0,
            totalJobs: d.totalJobs ?? 0,
            completedTrips: d.completedTrips ?? 0,
          });
        }
      }, { onlyOnce: false });
      return () => unsubscribe();
    } catch {
      // Firebase not initialized yet — ignore
    }
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));

  const taglineAnimStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const ctaAnimStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));

  const anyStats = stats.totalUsers > 0 || stats.totalJobs > 0 || stats.completedTrips > 0;

  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor={COLORS.charcoal} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── HERO ─────────────────────────────── */}
        <View style={styles.hero}>
          <Animated.View style={[styles.logoWrap, logoAnimStyle]}>
            <Logo size={54} color={COLORS.offWhite} accentColor={COLORS.ochre} />
            <Text style={styles.appName}>{APP_NAME}</Text>
          </Animated.View>

          <Animated.Text style={[styles.tagline, taglineAnimStyle]}>
            {'Connect factories with trucks on return trips.\nReduce empty miles. Move goods faster.'}
          </Animated.Text>

          {/* Live stats — hidden when all zero */}
          {anyStats && (
            <Animated.View style={[styles.statsRow, taglineAnimStyle]}>
              <StatItem value={stats.totalUsers} label="Registered Users" />
              {stats.totalUsers > 0 && stats.totalJobs > 0 && <View style={styles.statDivider} />}
              <StatItem value={stats.totalJobs} label="Transport Jobs" />
              {stats.totalJobs > 0 && stats.completedTrips > 0 && <View style={styles.statDivider} />}
              <StatItem value={stats.completedTrips} label="Completed Trips" />
            </Animated.View>
          )}
        </View>

        {/* ── HOW IT WORKS ─────────────────────── */}
        <View style={styles.howSection}>
          {/* Factory column */}
          <View style={[styles.howCard, { borderColor: COLORS.ochre + '44' }]}>
            <Text style={[styles.howTitle, { color: COLORS.ochre }]}>For Factories</Text>
            <Step num={1} text="Post your transport need with pickup, delivery and cargo details." accent={COLORS.ochre} />
            <Step num={2} text="Receive bids from matching drivers. Compare and select." accent={COLORS.ochre} />
            <Step num={3} text="Track your goods in real time with live location." accent={COLORS.ochre} />
            <Step num={4} text="Confirm delivery with a handover code and rate the driver." accent={COLORS.ochre} />
          </View>

          {/* Driver column */}
          <View style={[styles.howCard, { borderColor: COLORS.rust + '44', marginTop: SPACING.sm }]}>
            <Text style={[styles.howTitle, { color: COLORS.rust }]}>For Drivers</Text>
            <Step num={1} text="Set your route, truck details and available dates." accent={COLORS.rust} />
            <Step num={2} text="Browse matching jobs along your route or get notified automatically." accent={COLORS.rust} />
            <Step num={3} text="Place a bid and accept assignments from factories." accent={COLORS.rust} />
            <Step num={4} text="Deliver the goods, enter the handover code, and earn." accent={COLORS.rust} />
          </View>
        </View>
      </ScrollView>

      {/* ── CTA BUTTONS (sticky bottom) ──────── */}
      <Animated.View style={[styles.cta, ctaAnimStyle]}>
        <Button
          title="Log In"
          onPress={() => router.push('/(auth)/login')}
          variant="primary"
          fullWidth
          size="lg"
          accessibilityLabel="Log in to LoadLink"
        />
        <Button
          title="Create Account"
          onPress={() => router.push('/(auth)/signup')}
          variant="outline"
          fullWidth
          size="lg"
          style={{ marginTop: SPACING.sm }}
          accessibilityLabel="Create a new LoadLink account"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.charcoal,
  },
  scroll: {
    paddingBottom: 180, // space for sticky CTA
  },
  hero: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  appName: {
    fontFamily: FONTS.headingBold,
    fontSize: 32,
    color: COLORS.offWhite,
    letterSpacing: 1,
    marginTop: SPACING.sm,
  },
  tagline: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.md,
    color: COLORS.steel,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.paperWhite + '12',
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    width: '100%',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.hairline,
    marginHorizontal: SPACING.sm,
  },
  howSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  howCard: {
    backgroundColor: COLORS.charcoal,
    borderRadius: RADII.md,
    borderWidth: 1,
    padding: SPACING.md,
  },
  howTitle: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
  },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.charcoal,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
});
