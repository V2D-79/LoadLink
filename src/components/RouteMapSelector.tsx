/**
 * src/components/RouteMapSelector.tsx
 *
 * Full-screen interactive map for route selection using Leaflet via WebView.
 *
 * Fixes in this version:
 *  - Map container sized with CSS (100% / absolute) instead of 100vw/100vh + !important
 *    (that combination is what pushed tiles into the top-left corner on Android).
 *    A ResizeObserver now calls invalidateSize() automatically.
 *  - Tile-timeout false positive: Leaflet fires "tileload" for the errorTileUrl
 *    placeholder too, so blocked/failed tiles looked "loaded". Placeholders are now ignored.
 *  - Retry now really retries: remounts the WebView and restarts the timeout.
 *  - useSafeAreaInsets() throws without a SafeAreaProvider -> use the context safely
 *    and fall back to StatusBar.currentHeight on Android.
 *  - Duplicate RN->WebView messages (document + window listeners) are de-duplicated.
 *  - Job markers live in a layer group (no duplicates / can be cleared).
 *  - Stale OSRM responses are ignored; route failures reset distance/duration.
 *  - Tapping the map with no mode selected places Start, then End.
 *  - Hint strip is always visible once the map is ready.
 *  - Attribution re-enabled (required by the OpenStreetMap tile policy).
 *  - Removed unneeded/unsafe WebView flags (file access, hardware layer, geolocation).
 */

import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../constants/theme';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RouteData {
  start: RoutePoint | null;
  end: RoutePoint | null;
  distance?: number;
  duration?: number;
}

interface JobLocation {
  latitude: number;
  longitude: number;
  title: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onRouteSelected: (route: RouteData) => void;
  initialStart?: RoutePoint;
  initialEnd?: RoutePoint;
  showJobMarkers?: boolean;
  jobLocations?: JobLocation[];
}

// Stable reference so a default prop doesn't change identity on every render.
const EMPTY_JOBS: JobLocation[] = [];
const TILE_TIMEOUT_MS = 8000;

/**
 * Leaflet HTML — a constant (no interpolation), so it is built once at module level.
 * Written in ES5 style for older Android WebViews.
 */
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #c8d8c8;
      -webkit-tap-highlight-color: transparent;
    }
    #map {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background: #c8d8c8;
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  function postMsg(type, extra) {
    var obj = { type: type };
    if (extra) { for (var k in extra) { obj[k] = extra[k]; } }
    try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch (e) {}
  }

  if (typeof L === 'undefined') {
    document.body.innerHTML =
      '<div style="padding:24px;color:#c00;font:14px sans-serif">Failed to load the map library. Check your internet connection.</div>';
    postMsg('leafletFailed');
    return;
  }

  var map;
  var startMarker = null, endMarker = null, routeLayer = null, jobsLayer = null;
  var mode = null;
  var routeReq = 0, lastMsgId = 0, tilesOk = false, resizeTimer = null;
  var mapEl = document.getElementById('map');

  var POINT = {
    start: { emoji: '\\uD83D\\uDCCD', color: '#B8741A', label: 'Start',       msg: 'startSet' },
    end:   { emoji: '\\uD83C\\uDFAF', color: '#9C4A2B', label: 'Destination', msg: 'endSet'   }
  };

  function iconFor(emoji, color) {
    return L.divIcon({
      html: '<div style="background:' + color + ';width:34px;height:34px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:18px">' + emoji + '</div>',
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function clearRoute() {
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  }

  function calcRoute() {
    if (!startMarker || !endMarker) return;
    var s = startMarker.getLatLng(), e = endMarker.getLatLng();
    var req = ++routeReq;
    var url = 'https://router.project-osrm.org/route/v1/driving/' +
      s.lng + ',' + s.lat + ';' + e.lng + ',' + e.lat +
      '?overview=full&geometries=geojson';
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (req !== routeReq) return; // a newer request superseded this one
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          var r = data.routes[0];
          clearRoute();
          routeLayer = L.geoJSON(r.geometry, {
            style: { color: '#B8741A', weight: 5, opacity: 0.85, lineJoin: 'round', lineCap: 'round' }
          }).addTo(map);
          map.fitBounds(routeLayer.getBounds(), { padding: [60, 60] });
          postMsg('routeCalculated', {
            distance: (r.distance / 1000).toFixed(2),
            duration: Math.round(r.duration / 60)
          });
        } else {
          clearRoute();
          postMsg('routeFailed');
        }
      })
      .catch(function () {
        if (req !== routeReq) return;
        clearRoute();
        postMsg('routeFailed');
      });
  }

  function placePoint(kind, lat, lng, addr) {
    var cfg = POINT[kind];
    var old = kind === 'start' ? startMarker : endMarker;
    if (old) map.removeLayer(old);

    var marker = L.marker([lat, lng], { draggable: true, icon: iconFor(cfg.emoji, cfg.color) })
      .addTo(map)
      .bindPopup(cfg.label);

    marker.on('dragend', function (ev) {
      var p = ev.target.getLatLng();
      postMsg(cfg.msg, { point: { latitude: p.lat, longitude: p.lng } });
      calcRoute();
    });

    if (kind === 'start') { startMarker = marker; } else { endMarker = marker; }
    postMsg(cfg.msg, { point: { latitude: lat, longitude: lng, address: addr || '' } });
    calcRoute();
  }

  function fix() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      try { map.invalidateSize({ animate: false }); } catch (e) {}
    }, 50);
  }

  function initMap() {
    map = L.map('map', {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    map.attributionControl.setPrefix(false);
    jobsLayer = L.layerGroup().addTo(map);

    var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abc',
      attribution: '&copy; OpenStreetMap contributors',
      errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    });
    tiles.on('tileload', function (ev) {
      // Leaflet also fires "tileload" when the errorTileUrl placeholder loads - ignore those.
      var src = (ev.tile && ev.tile.src) || '';
      if (src.indexOf('data:') === 0) return;
      if (!tilesOk) { tilesOk = true; postMsg('tileLoaded'); }
    });
    tiles.addTo(map);

    // Keep the map sized to its container (Android WebView lays out late / during the Modal animation).
    if (window.ResizeObserver) { new ResizeObserver(fix).observe(mapEl); }
    window.addEventListener('resize', fix);
    setTimeout(fix, 300);
    setTimeout(fix, 1000);

    map.on('click', function (ev) {
      var kind = mode;
      if (!kind) { kind = !startMarker ? 'start' : (!endMarker ? 'end' : null); }
      if (!kind) return;
      mode = null;
      placePoint(kind, ev.latlng.lat, ev.latlng.lng);
      if (kind === 'start' && !endMarker) { map.setView(ev.latlng, 14); }
    });

    function onMsg(e) {
      try {
        var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!msg || !msg.action) return;

        // De-duplicate: some WebView versions deliver on both document and window.
        if (msg.id) {
          if (msg.id <= lastMsgId) return;
          lastMsgId = msg.id;
        }

        var d = msg.data;
        switch (msg.action) {
          case 'setStart':
            if (d && typeof d.latitude === 'number') {
              placePoint('start', d.latitude, d.longitude, d.address);
              map.setView([d.latitude, d.longitude], 13);
            }
            break;
          case 'setEnd':
            if (d && typeof d.latitude === 'number') {
              placePoint('end', d.latitude, d.longitude, d.address);
            }
            break;
          case 'selectStart': mode = 'start'; break;
          case 'selectEnd':   mode = 'end';   break;
          case 'useCurrentLocation':
            if (d && typeof d.latitude === 'number') {
              placePoint('start', d.latitude, d.longitude, 'Current Location');
              map.setView([d.latitude, d.longitude], 15);
            }
            break;
          case 'reset':
            routeReq++; // drop any in-flight route response
            if (startMarker) { map.removeLayer(startMarker); startMarker = null; }
            if (endMarker)   { map.removeLayer(endMarker);   endMarker = null; }
            clearRoute();
            mode = null;
            break;
          case 'setJobs':
            jobsLayer.clearLayers();
            if (d && Array.isArray(d)) {
              d.forEach(function (j) {
                if (typeof j.latitude === 'number') {
                  L.marker([j.latitude, j.longitude], { icon: iconFor('\\uD83D\\uDCE6', '#5B6B3A') })
                    .addTo(jobsLayer)
                    .bindPopup(j.title || 'Job');
                }
              });
            }
            break;
          case 'invalidateSize': fix(); break;
        }
      } catch (ex) {}
    }

    window.addEventListener('message', onMsg);
    document.addEventListener('message', onMsg);
    postMsg('mapReady');
  }

  initMap();
})();
</script>
</body>
</html>`;

export default function RouteMapSelector({
  visible,
  onClose,
  onRouteSelected,
  initialStart,
  initialEnd,
  showJobMarkers = true,
  jobLocations = EMPTY_JOBS,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const tilesLoadedRef = useRef(false);
  const msgIdRef = useRef(0);

  // Safe-area insets without throwing when no <SafeAreaProvider> is mounted.
  const insets = useContext(SafeAreaInsetsContext);
  const topInset = Math.max(
    insets?.top ?? 0,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0
  );
  const bottomInset = insets?.bottom ?? 0;

  const [startPoint, setStartPoint] = useState<RoutePoint | null>(initialStart || null);
  const [endPoint, setEndPoint] = useState<RoutePoint | null>(initialEnd || null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0); // bump to remount the WebView (Retry)

  // Always-fresh props for use inside stable callbacks (avoids stale closures).
  const latest = useRef({ initialStart, initialEnd, jobLocations, showJobMarkers });
  latest.current = { initialStart, initialEnd, jobLocations, showJobMarkers };

  // Reset route state each time the modal opens.
  useEffect(() => {
    if (!visible) return;
    setStartPoint(initialStart || null);
    setEndPoint(initialEnd || null);
    setDistance(0);
    setDuration(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Load / retry lifecycle: reset flags and (re)start the tile timeout.
  useEffect(() => {
    tilesLoadedRef.current = false;
    setMapReady(false);
    setWebViewError(null);
    if (!visible) return undefined;

    const timer = setTimeout(() => {
      if (!tilesLoadedRef.current) {
        setWebViewError(
          'Map tiles failed to load.\n\nCheck your internet connection and try again.'
        );
      }
    }, TILE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [visible, loadAttempt]);

  const sendToMap = useCallback((action: string, data: unknown = {}) => {
    msgIdRef.current += 1;
    webViewRef.current?.postMessage(
      JSON.stringify({ id: msgIdRef.current, action, data })
    );
  }, []);

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        switch (msg.type) {
          case 'mapReady':
            setMapReady(true);
            // Push the initial points / job markers shortly after the map is ready.
            setTimeout(() => {
              const { initialStart: s, initialEnd: e, jobLocations: jobs, showJobMarkers: showJobs } =
                latest.current;
              if (s) sendToMap('setStart', s);
              if (e) sendToMap('setEnd', e);
              if (showJobs && jobs.length > 0) sendToMap('setJobs', jobs);
            }, 200);
            break;
          case 'tileLoaded':
            tilesLoadedRef.current = true;
            break;
          case 'leafletFailed':
            setWebViewError(
              'The map library could not be loaded.\n\nCheck your internet connection and try again.'
            );
            break;
          case 'routeCalculated':
            setDistance(parseFloat(msg.distance) || 0);
            setDuration(parseInt(msg.duration, 10) || 0);
            break;
          case 'routeFailed':
            setDistance(0);
            setDuration(0);
            Alert.alert('No Route Found', 'Could not calculate a driving route between these points.');
            break;
          case 'startSet':
            setStartPoint(msg.point);
            break;
          case 'endSet':
            setEndPoint(msg.point);
            break;
          case 'error':
            Alert.alert('Map Error', msg.message);
            break;
        }
      } catch (_) {
        // ignore malformed messages
      }
    },
    [sendToMap]
  );

  const getCurrentLocation = useCallback(async () => {
    if (!mapReady) {
      Alert.alert('Please Wait', 'Map is still loading…');
      return;
    }
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Enable location access to use this feature.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      sendToMap('useCurrentLocation', {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      setGpsLoading(false);
    }
  }, [mapReady, sendToMap]);

  const handleReset = useCallback(() => {
    if (!mapReady) return;
    sendToMap('reset', {});
    setStartPoint(null);
    setEndPoint(null);
    setDistance(0);
    setDuration(0);
  }, [mapReady, sendToMap]);

  const handleConfirm = useCallback(() => {
    if (!startPoint || !endPoint) {
      Alert.alert('Incomplete Route', 'Select both start and destination points.');
      return;
    }
    onRouteSelected({ start: startPoint, end: endPoint, distance, duration });
    onClose();
  }, [startPoint, endPoint, distance, duration, onRouteSelected, onClose]);

  const handleRetry = useCallback(() => {
    setLoadAttempt((n) => n + 1);
  }, []);

  const routeIncomplete = !startPoint || !endPoint;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset + SPACING.xs }]}>
          <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
            <Text style={styles.headerBtnText}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Select Route</Text>
          <Pressable
            onPress={handleReset}
            style={styles.headerBtn}
            disabled={!mapReady}
            hitSlop={8}
          >
            <Text style={[styles.headerBtnText, !mapReady && styles.dimText]}>Reset</Text>
          </Pressable>
        </View>

        {/* Action buttons */}
        <View style={styles.controls}>
          <Pressable
            style={[styles.ctrlBtn, !mapReady && styles.ctrlBtnOff]}
            onPress={() => sendToMap('selectStart', {})}
            disabled={!mapReady}
          >
            <Text style={styles.ctrlBtnTxt}>📍 Start</Text>
          </Pressable>
          <Pressable
            style={[styles.ctrlBtn, !mapReady && styles.ctrlBtnOff]}
            onPress={() => sendToMap('selectEnd', {})}
            disabled={!mapReady}
          >
            <Text style={styles.ctrlBtnTxt}>🎯 End</Text>
          </Pressable>
          <Pressable
            style={[styles.ctrlBtn, (!mapReady || gpsLoading) && styles.ctrlBtnOff]}
            onPress={getCurrentLocation}
            disabled={!mapReady || gpsLoading}
          >
            <Text style={styles.ctrlBtnTxt}>{gpsLoading ? '⏳' : '📱 GPS'}</Text>
          </Pressable>
        </View>

        {/* Map fills all remaining space */}
        <View style={styles.mapWrap}>
          {webViewError ? (
            <View style={styles.errBox}>
              <Text style={styles.errEmoji}>🗺️</Text>
              <Text style={styles.errTitle}>Map Failed to Load</Text>
              <Text style={styles.errMsg}>{webViewError}</Text>
              <Pressable style={styles.retryBtn} onPress={handleRetry}>
                <Text style={styles.retryTxt}>🔄  Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {!mapReady && (
                <View style={styles.loadingOverlay} pointerEvents="none">
                  <ActivityIndicator size="large" color={COLORS.ochre} />
                  <Text style={styles.loadingTxt}>Loading map…</Text>
                </View>
              )}
              <WebView
                key={loadAttempt}
                ref={webViewRef}
                source={{ html: MAP_HTML, baseUrl: 'https://unpkg.com' }}
                style={styles.webview}
                onMessage={handleWebViewMessage}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                mixedContentMode="always"
                setSupportMultipleWindows={false}
                onLayout={() => sendToMap('invalidateSize', {})}
                onError={() =>
                  setWebViewError('WebView failed to load. Check your internet connection.')
                }
              />
            </>
          )}
        </View>

        {/* Route info strip */}
        {mapReady && (distance > 0 || duration > 0) && (
          <View style={styles.routeStrip}>
            <View style={styles.metric}>
              <Text style={styles.metricLbl}>Distance</Text>
              <Text style={styles.metricVal}>{distance.toFixed(1)} km</Text>
            </View>
            <View style={styles.metricDiv} />
            <View style={styles.metric}>
              <Text style={styles.metricLbl}>Est. Time</Text>
              <Text style={styles.metricVal}>
                {duration >= 60
                  ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                  : `${duration}m`}
              </Text>
            </View>
          </View>
        )}

        {/* Points summary (always shown once the map is ready, with hints for empty points) */}
        {mapReady && (
          <View style={styles.pointsStrip}>
            <Text style={styles.pointsTxt} numberOfLines={1}>
              {startPoint
                ? `📍 ${
                    startPoint.address ||
                    `${startPoint.latitude.toFixed(3)}, ${startPoint.longitude.toFixed(3)}`
                  }`
                : '📍 Tap the map to set your start point'}
            </Text>
            <Text style={styles.pointsTxt} numberOfLines={1}>
              {endPoint
                ? `🎯 ${
                    endPoint.address ||
                    `${endPoint.latitude.toFixed(3)}, ${endPoint.longitude.toFixed(3)}`
                  }`
                : '🎯 Tap the map again to set your destination'}
            </Text>
          </View>
        )}

        {/* Bottom actions */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(SPACING.md, bottomInset) }]}>
          <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.confirmBtn, routeIncomplete && styles.confirmOff]}
            onPress={handleConfirm}
            disabled={routeIncomplete || !mapReady}
          >
            <Text style={[styles.confirmTxt, routeIncomplete && styles.dimText]}>
              {!mapReady
                ? 'Loading…'
                : !routeIncomplete
                ? '✓  Confirm Route'
                : 'Select Points'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.charcoal,
  },
  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.charcoal,
  },
  headerBtn: {
    minWidth: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.offWhite,
    fontFamily: FONTS.bodyMedium,
  },
  headerTitle: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.offWhite,
  },
  dimText: { opacity: 0.35 },
  // ── Controls
  controls: {
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.xs,
    backgroundColor: COLORS.paperWhite,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  ctrlBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.ochre,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  ctrlBtnOff: { backgroundColor: COLORS.hairline, opacity: 0.5 },
  ctrlBtnTxt: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    color: '#fff',
  },
  // ── Map
  mapWrap: {
    flex: 1,
    backgroundColor: '#c8d8c8',
    overflow: 'hidden',
  },
  webview: {
    // flex only — width/height: '100%' on top of flex can collapse a WebView on Android
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingTxt: {
    marginTop: SPACING.sm,
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
  },
  // ── Error
  errBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.offWhite,
  },
  errEmoji: { fontSize: 56, marginBottom: SPACING.md },
  errTitle: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.brick,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  errMsg: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  retryBtn: {
    backgroundColor: COLORS.ochre,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
  },
  retryTxt: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: '#fff',
  },
  // ── Info strips
  routeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.charcoal,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricLbl: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.steel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricVal: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.offWhite,
  },
  metricDiv: { width: 1, height: 28, backgroundColor: COLORS.steel + '50' },
  pointsStrip: {
    backgroundColor: COLORS.paperWhite,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    gap: 2,
  },
  pointsTxt: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.charcoal,
  },
  // ── Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.paperWhite,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.offWhite,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  cancelTxt: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
  },
  confirmBtn: { backgroundColor: COLORS.ochre },
  confirmOff: { backgroundColor: COLORS.hairline },
  confirmTxt: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: '#fff',
  },
});