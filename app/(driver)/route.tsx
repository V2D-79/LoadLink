/**
 * app/(driver)/route.tsx
 *
 * Driver "My Route" tab with interactive map for route selection.
 * 
 * Features:
 * - Full-screen interactive map
 * - Draggable start/end markers
 * - Route visualization with distance & time
 * - Multiple map types (Standard/Satellite/Hybrid/Terrain)
 * - Location search
 * - Current location support
 * - Job markers overlay
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ref, set, remove, get, serverTimestamp } from 'firebase/database';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { getFirebaseDB } from '../../src/services/firebase';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { useRTDBValue, useRTDBList } from '../../src/hooks/useRTDB';
import {
  writeRouteCellIndex,
  clearRouteCellIndex,
  type RouteSnapshot,
} from '../../src/engine/match';
import { Button, Card } from '../../src/ui';
import LiveRouteMap from '../../src/components/LiveRouteMap';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { DB_PATHS } from '../../src/constants/app';

// ── Helpers ───────────────────────────────────────────────────

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function todayIso() {
  return new Date().toISOString().split('T')[0] ?? '';
}

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0] ?? '';
}

// ── Main screen ───────────────────────────────────────────────

export default function RouteScreen() {
  const { firebaseUser, userProfile } = useAuthContext();
  const uid = firebaseUser?.uid;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: activeRoute, loading } = useRTDBValue<RouteSnapshot>(
    uid ? `${DB_PATHS.driverRoutes}/${uid}` : null,
  );

  // Fetch all open jobs for map markers
  const { data: allJobs } = useRTDBList<any>(DB_PATHS.jobs);
  const openJobs = allJobs.filter((j) => j.status === 'open');

  const [clearing, setClearing] = useState(false);
  const [serverError, setServerError] = useState('');
  const [truckId, setTruckId] = useState<string | null>(null);

  // Load truck info for this driver
  useEffect(() => {
    if (!uid) return;
    get(ref(getFirebaseDB(), `${DB_PATHS.userPrivate}/${uid}/primaryTruckId`)).then((snap) => {
      if (snap.exists()) setTruckId(snap.val());
    });
  }, [uid]);

  // Setup global callback for route selection
  useEffect(() => {
    global.onRouteSelected = async (routeData: any) => {
      console.log('[RouteScreen] Route selected:', routeData);
      if (!uid) return;

      try {
        const db = getFirebaseDB();

        // Fetch truck info for vehicle/body type
        let vehicleType = 'medium_truck';
        let bodyType = 'open';
        let maxCapacity = 10;

        if (truckId) {
          const trucksSnap = await get(ref(db, `${DB_PATHS.trucks}/${uid}`));
          if (trucksSnap.exists()) {
            const trucks = trucksSnap.val();
            const truck = Object.values(trucks)[0] as any;
            if (truck) {
              vehicleType = truck.vehicleType ?? vehicleType;
              bodyType = truck.bodyType ?? bodyType;
              maxCapacity = truck.maxCapacityTonnes ?? maxCapacity;
            }
          }
        }

        const route: Omit<RouteSnapshot, 'lastBidInr'> = {
          driverId: uid,
          truckId: truckId ?? '',
          currentLat: routeData.start.latitude,
          currentLng: routeData.start.longitude,
          destinationLat: routeData.end.latitude,
          destinationLng: routeData.end.longitude,
          maxCapacityTonnes: maxCapacity,
          vehicleType,
          bodyType,
          availableFrom: Date.now(),
          availableUntil: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
          averageRating: (userProfile as any)?.averageRating ?? 0,
        };

        await set(ref(db, `${DB_PATHS.driverRoutes}/${uid}`), {
          ...route,
          currentCity: routeData.start.address || 'Selected Location',
          destinationCity: routeData.end.address || 'Selected Location',
          distance: routeData.distance || 0,
          duration: routeData.duration || 0,
          tripStatus: 'empty_returning',
          updatedAt: serverTimestamp(),
        });

        await writeRouteCellIndex(uid, route);
      } catch (err: any) {
        setServerError(err.message ?? 'Failed to save route. Please try again.');
      }
    };

    return () => {
      global.onRouteSelected = undefined;
    };
  }, [uid, truckId, userProfile]);

  const onClear = async () => {
    if (!uid) return;
    setClearing(true);
    try {
      await clearRouteCellIndex(uid);
      await remove(ref(getFirebaseDB(), `${DB_PATHS.driverRoutes}/${uid}`));
    } catch (err: any) {
      setServerError(err.message ?? 'Failed to clear route.');
    } finally {
      setClearing(false);
    }
  };

  const openMapScreen = () => {
    console.log('[RouteScreen] Opening map screen');
    const params: any = {};
    if (activeRoute) {
      params.startLat = activeRoute.currentLat.toString();
      params.startLng = activeRoute.currentLng.toString();
      params.startAddress = (activeRoute as any).currentCity || '';
      params.endLat = activeRoute.destinationLat.toString();
      params.endLng = activeRoute.destinationLng.toString();
      params.endAddress = (activeRoute as any).destinationCity || '';
    }
    router.push({
      pathname: '/(driver)/map-select',
      params,
    });
  };

  // Convert job locations for map
  const jobMarkers = openJobs
    .filter((job) => job.pickupLat && job.pickupLng)
    .map((job) => ({
      latitude: job.pickupLat,
      longitude: job.pickupLng,
      title: `${job.pickupCity} → ${job.deliveryCity}`,
    }));

  // ── Active route display ─────────────────────────────────

  if (activeRoute && !loading) {
    return (
      <View style={s.root}>
        <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + SPACING.md }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.screenTitle}>My Route</Text>

          {/* Live Map */}
          <LiveRouteMap
            startLat={activeRoute.currentLat}
            startLng={activeRoute.currentLng}
            endLat={activeRoute.destinationLat}
            endLng={activeRoute.destinationLng}
            currentLat={activeRoute.currentLat}
            currentLng={activeRoute.currentLng}
            height={250}
          />

          <Card style={s.routeCard}>
            <View style={s.routeRow}>
              <View style={s.routeDot} />
              <View style={s.routeInfo}>
                <Text style={s.routeLabel}>Current location</Text>
                <Text style={s.routeCity}>{(activeRoute as any).currentCity ?? 'Unknown'}</Text>
              </View>
            </View>
            <View style={s.routeLine} />
            <View style={s.routeRow}>
              <View style={[s.routeDot, s.routeDotDest]} />
              <View style={s.routeInfo}>
                <Text style={s.routeLabel}>Destination</Text>
                <Text style={s.routeCity}>{(activeRoute as any).destinationCity ?? 'Unknown'}</Text>
              </View>
            </View>

            {(typeof (activeRoute as any).distance !== 'undefined' || typeof (activeRoute as any).duration !== 'undefined') && (
              <View style={s.metaRow}>
                <Text style={s.metaText}>
                  📏 {Number((activeRoute as any).distance ?? 0).toFixed(1)} km
                </Text>
                <Text style={s.metaText}>
                  ⏱️ {Math.round(Number((activeRoute as any).duration ?? 0))} min
                </Text>
              </View>
            )}

            <Text style={s.capacityText}>
              Capacity: {Number(activeRoute.maxCapacityTonnes ?? 0)} tonnes
            </Text>
          </Card>

          {serverError.length > 0 && (
            <View style={s.errorBanner}><Text style={s.errorText}>{serverError}</Text></View>
          )}

          <Button
            title="📍 Update Route on Map"
            onPress={openMapScreen}
            variant="outline"
            fullWidth
            size="lg"
            style={{ marginTop: SPACING.sm }}
          />
          <Button
            title="Clear Route"
            onPress={onClear}
            variant="danger"
            fullWidth
            size="lg"
            loading={clearing}
            style={{ marginTop: SPACING.xs }}
          />
        </ScrollView>
      </View>
    );
  }

  // ── No route set — show button to open map ───────────────

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + SPACING.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.screenTitle}>Set My Route</Text>
        <Text style={s.screenSub}>
          Set your route on an interactive map to get matched with jobs along your journey.
        </Text>

        <Card style={s.emptyCard}>
          <Text style={s.emptyEmoji}>🗺️</Text>
          <Text style={s.emptyTitle}>No Route Set</Text>
          <Text style={s.emptySub}>
            Select your starting point and destination on the map. The system will show you all available jobs along your route.
          </Text>
        </Card>

        {serverError.length > 0 && (
          <View style={s.errorBanner}><Text style={s.errorText}>{serverError}</Text></View>
        )}

        <Button
          title="📍 Open Map & Select Route"
          onPress={openMapScreen}
          variant="primary"
          fullWidth
          size="lg"
          style={{ marginTop: SPACING.md }}
        />

        <View style={s.featuresBox}>
          <Text style={s.featuresTitle}>Map Features:</Text>
          <Text style={s.featureItem}>✓ Drag markers to adjust route</Text>
          <Text style={s.featureItem}>✓ View distance & estimated time</Text>
          <Text style={s.featureItem}>✓ See available jobs on map</Text>
          <Text style={s.featureItem}>✓ Multiple map views (Satellite/Hybrid)</Text>
          <Text style={s.featureItem}>✓ Search locations</Text>
          <Text style={s.featureItem}>✓ Use current location</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  scrollView: { flex: 1, width: '100%' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  screenTitle: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.charcoal,
    marginBottom: SPACING.xxs,
    marginTop: SPACING.xl,
  },
  screenSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: COLORS.brick + '15',
    borderWidth: 1,
    borderColor: COLORS.brick,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brick,
  },
  routeCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.ochre,
  },
  routeDotDest: {
    backgroundColor: COLORS.rust,
  },
  routeLine: {
    width: 2,
    height: 28,
    backgroundColor: COLORS.hairline,
    marginLeft: 5,
    marginVertical: 4,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
  },
  routeCity: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.charcoal,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
  },
  capacityText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.charcoal,
    marginTop: SPACING.xs,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.charcoal,
    marginBottom: SPACING.xs,
  },
  emptySub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresBox: {
    backgroundColor: COLORS.paperWhite,
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  featuresTitle: {
    fontFamily: FONTS.headingSemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.charcoal,
    marginBottom: SPACING.xs,
  },
  featureItem: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.steel,
    marginBottom: SPACING.xxs,
    paddingLeft: SPACING.xs,
  },
});
