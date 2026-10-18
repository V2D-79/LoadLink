/**
 * app/(driver)/home.tsx
 *
 * Driver home screen with platform info and quick actions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { Button, Card } from '../../src/ui';
import TruckAnimation from '../../src/components/TruckAnimation';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';

export default function DriverHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuthContext();

  const features = [
    {
      icon: '🗺️',
      title: 'Set Your Route',
      description: 'Define your travel path and get matched with jobs along the way',
      action: () => router.push('/(driver)/route'),
    },
    {
      icon: '🔍',
      title: 'Find Jobs',
      description: 'Browse available transport jobs and place competitive bids',
      action: () => router.push('/(driver)/find'),
    },
    {
      icon: '📊',
      title: 'Track Activity',
      description: 'Monitor your bids, accepted jobs, and earnings',
      action: () => router.push('/(driver)/activity'),
    },
  ];

  const stats = [
    { label: 'Smart Matching', value: 'AI-powered job matching based on your route' },
    { label: 'Real-time Tracking', value: 'Live GPS tracking for factories' },
    { label: 'Secure Payments', value: 'Guaranteed payment terms and invoicing' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACING.md }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{userProfile?.displayName || 'Driver'}</Text>

        {/* Animation */}
        <TruckAnimation />

        {/* Platform Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>🚛 LoadLink Platform</Text>
          <Text style={styles.infoText}>
            India's smart freight marketplace connecting drivers with factories. 
            Set your route, get matched with cargo, and maximize your earnings on every trip.
          </Text>
        </Card>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {features.map((feature, idx) => (
          <Pressable key={idx} onPress={feature.action}>
            <Card style={styles.featureCard}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </Card>
          </Pressable>
        ))}

        {/* Platform Benefits */}
        <Text style={styles.sectionTitle}>Why LoadLink?</Text>
        {stats.map((stat, idx) => (
          <Card key={idx} style={styles.statCard}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </Card>
        ))}

        {/* CTA */}
        <Button
          title="🗺️ Set My Route Now"
          onPress={() => router.push('/(driver)/route')}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: SPACING.lg }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  scrollView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  greeting: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.md,
    color: COLORS.steel,
    marginBottom: SPACING.xxs,
  },
  name: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.xxl,
    color: COLORS.charcoal,
    marginBottom: SPACING.sm,
  },
  infoCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.ochre + '15',
    borderWidth: 1,
    borderColor: COLORS.ochre + '30',
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.charcoal,
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
    lineHeight: 22,
  },
  sectionTitle: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.charcoal,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.charcoal,
    marginBottom: SPACING.xxs,
  },
  featureDesc: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
    lineHeight: 18,
  },
  arrow: {
    fontSize: 20,
    color: COLORS.steel,
  },
  statCard: {
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.ochre,
    marginBottom: SPACING.xxs,
  },
  statValue: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
    lineHeight: 18,
  },
});
