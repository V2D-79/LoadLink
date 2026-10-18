/**
 * app/(factory)/track.tsx
 *
 * Factory "Track" tab.
 *
 * Shows the live location of the assigned driver for the factory's
 * most recent accepted/in-transit job using a Leaflet map in a WebView.
 *
 * Data sources:
 *   - jobs/{jobId} → current job status
 *   - liveLocation/{assignedDriverUid} → { lat, lng, accuracy, updatedAt }
 *
 * The map auto-updates via the RTDB real-time listener.
 * Privacy: exact addresses only shown after assignment (jobPrivate).
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';

import { useAuthContext } from '../../src/hooks/AuthContext';
import { useRTDBValue, useRTDBList } from '../../src/hooks/useRTDB';
import { Card, Chip, EmptyState } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';
import { DB_PATHS } from '../../src/constants/app';

// ── Types ─────────────────────────────────────────────────────

interface LiveLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  updatedAt: number;
}

interface Job {
  jobId: string;
  status: string;
  pickupCity: string;
  pickupState: string;
  pickupLat: number;
  pickupLng: number;
  deliveryCity: string;
  deliveryState: string;
  deliveryLat: number;
  deliveryLng: number;
  assignedDriverUid?: string;
  weightTonnes: number;
  availableFrom: number;
  availableUntil: number;
  factoryUid: string;
  __key: string;
}

// ── Helpers ───────────────────────────────────────────────────

const ACTIVE_STATUSES = ['accepted', 'heading_to_pickup', 'loaded', 'in_transit'];

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Leaflet HTML ──────────────────────────────────────────────

function buildLeafletHtml(driverLat: number, driverLng: number, pickupLat: number, pickupLng: number, deliveryLat: number, deliveryLng: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; }
  body { background:#F3EFE6; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  const map = L.map('map', { zoomControl: true });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  // Custom icons
  const driverIcon = L.divIcon({
    html: '<div style="width:20px;height:20px;background:#B8741A;border:3px solid #FBF9F4;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10], className: '',
  });
  const pickupIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;background:#5B6B3A;border:2px solid #FBF9F4;border-radius:50%"></div>',
    iconSize: [14, 14], iconAnchor: [7, 7], className: '',
  });
  const deliveryIcon = L.divIcon({
    html: '<div style="width:14px;height:14px;background:#9C4A2B;border:2px solid #FBF9F4;border-radius:50%"></div>',
    iconSize: [14, 14], iconAnchor: [7, 7], className: '',
  });

  const driverLat = ${driverLat};
  const driverLng = ${driverLng};
  const pickupLat = ${pickupLat};
  const pickupLng = ${pickupLng};
  const deliveryLat = ${deliveryLat};
  const deliveryLng = ${deliveryLng};

  const driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
    .addTo(map).bindPopup('<b>Driver</b>');

  L.marker([pickupLat, pickupLng], { icon: pickupIcon })
    .addTo(map).bindPopup('<b>Pickup</b>');

  L.marker([deliveryLat, deliveryLng], { icon: deliveryIcon })
    .addTo(map).bindPopup('<b>Delivery</b>');

  // Route line
  L.polyline([[pickupLat, pickupLng], [deliveryLat, deliveryLng]], {
    color: '#B8741A', weight: 2, dashArray: '6 4', opacity: 0.6,
  }).addTo(map);

  // Fit bounds
  const bounds = L.latLngBounds([
    [driverLat, driverLng],
    [pickupLat, pickupLng],
    [deliveryLat, deliveryLng],
  ]);
  map.fitBounds(bounds, { padding: [30, 30] });

  // Listen for live updates from React Native
  window.addEventListener('message', function(e) {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'locationUpdate') {
        driverMarker.setLatLng([data.lat, data.lng]);
      }
    } catch {}
  });
</script>
</body>
</html>`;
}

// ── Info row ──────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.hairline },
  label: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, flex: 1 },
  value: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.charcoal, flex: 2, textAlign: 'right' },
});

// ── Main screen ───────────────────────────────────────────────

export default function TrackScreen() {
  const { firebaseUser } = useAuthContext();
  const uid = firebaseUser?.uid;

  // Get factory's active jobs
  const { data: allJobs, loading: jobsLoading } = useRTDBList<Job>(
    uid ? DB_PATHS.jobs : null,
  );

  // Find most recent active job for this factory
  const activeJob = useMemo(() => {
    if (!uid) return null;
    const mine = allJobs
      .filter((j) => j.factoryUid === uid && ACTIVE_STATUSES.includes(j.status))
      .sort((a, b) => (b as any).updatedAt - (a as any).updatedAt);
    return mine[0] ?? null;
  }, [allJobs, uid]);

  // Live location of assigned driver
  const { data: liveLocation } = useRTDBValue<LiveLocation>(
    activeJob?.assignedDriverUid
      ? `${DB_PATHS.liveLocation}/${activeJob.assignedDriverUid}`
      : null,
  );

  // Private job data (exact coords after assignment)
  const { data: jobPrivate } = useRTDBValue<any>(
    activeJob ? `${DB_PATHS.jobPrivate}/${activeJob.jobId}` : null,
  );

  if (jobsLoading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
        <ActivityIndicator color={COLORS.ochre} size="large" />
      </View>
    );
  }

  if (!activeJob) {
    return (
      <View style={s.root}>
        <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
        <View style={s.header}>
          <Text style={s.screenTitle}>Track</Text>
        </View>
        <EmptyState
          heading="No active trips"
          subText="Once a driver accepts your job and starts moving, their live location will appear here."
          type="route"
        />
      </View>
    );
  }

  // Coords fallback: approx coords from job, exact from jobPrivate if available
  const pickupLat = jobPrivate?.pickupExactLat ?? activeJob.pickupLat ?? 18.52;
  const pickupLng = jobPrivate?.pickupExactLng ?? activeJob.pickupLng ?? 73.85;
  const deliveryLat = jobPrivate?.deliveryExactLat ?? activeJob.deliveryLat ?? 16.7;
  const deliveryLng = jobPrivate?.deliveryExactLng ?? activeJob.deliveryLng ?? 74.24;
  const driverLat = liveLocation?.lat ?? (pickupLat + deliveryLat) / 2;
  const driverLng = liveLocation?.lng ?? (pickupLng + deliveryLng) / 2;

  const mapHtml = buildLeafletHtml(driverLat, driverLng, pickupLat, pickupLng, deliveryLat, deliveryLng);

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.screenTitle}>Track Driver</Text>
        <Chip label={activeJob.status.replace(/_/g, ' ')} status={activeJob.status} />
      </View>

      {/* Route summary */}
      <View style={s.routeBar}>
        <View style={s.routeCity}>
          <Text style={s.cityLabel}>PICKUP</Text>
          <Text style={s.cityName}>{activeJob.pickupCity}</Text>
        </View>
        <Text style={s.routeArrow}>→</Text>
        <View style={[s.routeCity, { alignItems: 'flex-end' }]}>
          <Text style={s.cityLabel}>DELIVERY</Text>
          <Text style={s.cityName}>{activeJob.deliveryCity}</Text>
        </View>
      </View>

      {/* Leaflet map */}
      <View style={s.mapContainer}>
        <WebView
          source={{ html: mapHtml }}
          style={s.map}
          originWhitelist={['*']}
          javaScriptEnabled
          accessibilityLabel="Live driver tracking map"
        />
      </View>

      {/* Location meta */}
      <Card style={s.metaCard}>
        {liveLocation ? (
          <>
            <InfoRow label="Last update" value={relativeTime(liveLocation.updatedAt)} />
            {liveLocation.accuracy && (
              <InfoRow label="Accuracy" value={`±${Math.round(liveLocation.accuracy)} m`} />
            )}
          </>
        ) : (
          <Text style={s.noLocationText}>
            Waiting for driver to share location…
          </Text>
        )}
        <InfoRow label="Cargo" value={`${activeJob.weightTonnes} tonnes`} />
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.xs,
  },
  screenTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.charcoal },
  routeBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: COLORS.hairline,
  },
  routeCity: { flex: 1 },
  cityLabel: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, textTransform: 'uppercase', letterSpacing: 0.8 },
  cityName: { fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.md, color: COLORS.charcoal },
  routeArrow: { fontSize: 18, color: COLORS.ochre, paddingHorizontal: SPACING.sm },
  mapContainer: { flex: 1, margin: SPACING.sm, borderRadius: RADII.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.hairline },
  map: { flex: 1 },
  metaCard: { margin: SPACING.sm, padding: SPACING.md, marginBottom: SPACING.xxl },
  noLocationText: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, textAlign: 'center', paddingVertical: SPACING.xs },
});
