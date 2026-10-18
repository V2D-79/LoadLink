/**
 * app/(driver)/map-select.tsx
 *
 * Full-screen map activity for route selection.
 * Separate screen (not modal) for better performance and layout control.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  BackHandler,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';

interface RoutePoint {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function MapSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const webViewRef = useRef<WebView>(null);
  const tilesLoadedRef = useRef(false);
  const tileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [startPoint, setStartPoint] = useState<RoutePoint | null>(null);
  const [endPoint, setEndPoint] = useState<RoutePoint | null>(null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [sourceInput, setSourceInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Parse initial points from params
  useEffect(() => {
    if (params.startLat && params.startLng) {
      setStartPoint({
        latitude: parseFloat(params.startLat as string),
        longitude: parseFloat(params.startLng as string),
        address: params.startAddress as string,
      });
    }
    if (params.endLat && params.endLng) {
      setEndPoint({
        latitude: parseFloat(params.endLat as string),
        longitude: parseFloat(params.endLng as string),
        address: params.endAddress as string,
      });
    }
  }, [params]);

  // Timeout for tile loading
  useEffect(() => {
    tilesLoadedRef.current = false;
    tileTimeoutRef.current = setTimeout(() => {
      if (!tilesLoadedRef.current) {
        setWebViewError(
          'Map tiles failed to load.\n\nMake sure your phone has internet connection and the app is running in online mode:\n\nnpm start'
        );
      }
    }, 10000);

    return () => {
      if (tileTimeoutRef.current) clearTimeout(tileTimeoutRef.current);
    };
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  const sendToMap = useCallback((action: string, data: any) => {
    webViewRef.current?.postMessage(JSON.stringify({ action, data }));
  }, []);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'mapReady':
          setMapReady(true);
          setTimeout(() => {
            if (startPoint) sendToMap('setStart', startPoint);
            if (endPoint) sendToMap('setEnd', endPoint);
          }, 300);
          break;
        case 'tileLoaded':
          tilesLoadedRef.current = true;
          if (tileTimeoutRef.current) {
            clearTimeout(tileTimeoutRef.current);
            tileTimeoutRef.current = null;
          }
          break;
        case 'routeCalculated':
          setDistance(parseFloat(msg.distance) || 0);
          setDuration(parseInt(msg.duration) || 0);
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
    } catch (_) {}
  }, [startPoint, endPoint, sendToMap]);

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

  const searchLocation = useCallback(async (query: string, isStart: boolean) => {
    if (!query.trim()) {
      Alert.alert('Empty Search', 'Please enter a location name.');
      return;
    }
    
    setSearchLoading(true);
    try {
      // Use Nominatim geocoding API (OpenStreetMap)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'LoadLink-App' }
      });
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const point = {
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lon),
          address: location.display_name,
        };
        
        if (isStart) {
          setStartPoint(point);
          sendToMap('setStart', point);
        } else {
          setEndPoint(point);
          sendToMap('setEnd', point);
        }
      } else {
        Alert.alert('Not Found', `Could not find location: ${query}`);
      }
    } catch (error) {
      Alert.alert('Search Error', 'Failed to search location. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  }, [sendToMap]);

  const handleConfirm = useCallback(() => {
    if (!startPoint || !endPoint) {
      Alert.alert('Incomplete Route', 'Select both start and destination points.');
      return;
    }
    // Navigate back with route data
    router.back();
    // Use a timeout to ensure navigation completes before triggering callback
    setTimeout(() => {
      if (global.onRouteSelected) {
        global.onRouteSelected({ start: startPoint, end: endPoint, distance, duration });
      }
    }, 100);
  }, [startPoint, endPoint, distance, duration, router]);

  const mapHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { 
      width:100vw; 
      height:100vh; 
      overflow:hidden; 
      background:#c8d8c8;
      position:fixed;
      top:0;
      left:0;
    }
    #map { 
      position:absolute; 
      top:0; 
      left:0; 
      width:100vw; 
      height:100vh; 
    }
    .leaflet-container { 
      background:#c8d8c8 !important;
      width:100% !important;
      height:100% !important;
    }
    .leaflet-control-zoom { right:8px !important; left:auto !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function() {
  var map, startMarker, endMarker, routeLayer, mode=null;
  var attempts=0, MAX=200;

  function postMsg(type, extra) {
    var obj = Object.assign({ type: type }, extra || {});
    try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
  }

  function iconFor(emoji, color) {
    return L.divIcon({
      html: '<div style="background:' + color + ';width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:22px">' + emoji + '</div>',
      className: '',
      iconSize: [40,40],
      iconAnchor: [20,20]
    });
  }

  function setStart(lat,lng,addr) {
    if (startMarker) map.removeLayer(startMarker);
    startMarker = L.marker([lat,lng],{ draggable:true, icon:iconFor('📍','#B8741A') })
      .addTo(map).bindPopup('Start: Drag to adjust');
    startMarker.on('dragend',function(e){
      var p=e.target.getLatLng();
      postMsg('startSet',{point:{latitude:p.lat,longitude:p.lng}});
      if(endMarker) calcRoute();
    });
    postMsg('startSet',{point:{latitude:lat,longitude:lng,address:addr||''}});
    if(endMarker) calcRoute();
  }

  function setEnd(lat,lng,addr) {
    if (endMarker) map.removeLayer(endMarker);
    endMarker = L.marker([lat,lng],{ draggable:true, icon:iconFor('🎯','#9C4A2B') })
      .addTo(map).bindPopup('Destination: Drag to adjust');
    endMarker.on('dragend',function(e){
      var p=e.target.getLatLng();
      postMsg('endSet',{point:{latitude:p.lat,longitude:p.lng}});
      if(startMarker) calcRoute();
    });
    postMsg('endSet',{point:{latitude:p.lat,longitude:lng,address:addr||''}});
    if(startMarker) calcRoute();
  }

  function calcRoute() {
    if (!startMarker||!endMarker) return;
    var s=startMarker.getLatLng(), e=endMarker.getLatLng();
    var url='https://router.project-osrm.org/route/v1/driving/'+s.lng+','+s.lat+';'+e.lng+','+e.lat+'?overview=full&geometries=geojson';
    fetch(url)
      .then(function(r){return r.json();})
      .then(function(data){
        if(data.code==='Ok'&&data.routes&&data.routes[0]){
          var r=data.routes[0];
          if(routeLayer) map.removeLayer(routeLayer);
          routeLayer=L.geoJSON(r.geometry,{style:{color:'#B8741A',weight:6,opacity:.9,lineJoin:'round',lineCap:'round'}}).addTo(map);
          map.fitBounds(routeLayer.getBounds(),{padding:[80,80]});
          postMsg('routeCalculated',{distance:(r.distance/1000).toFixed(2),duration:Math.round(r.duration/60)});
        }
      }).catch(function(){});
  }

  function initMap() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var mapEl = document.getElementById('map');
    mapEl.style.width = w + 'px';
    mapEl.style.height = h + 'px';

    map = L.map('map',{ center:[20.5937,78.9629], zoom:5, zoomControl:true, attributionControl:false, preferCanvas:true });

    var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19, subdomains:'abc',
      errorTileUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    });
    tiles.on('tileload',function(){ postMsg('tileLoaded',{}); });
    tiles.addTo(map);

    function fix(){ 
      try{ 
        var w2 = window.innerWidth;
        var h2 = window.innerHeight;
        mapEl.style.width = w2 + 'px';
        mapEl.style.height = h2 + 'px';
        map.invalidateSize({animate:false}); 
      }catch(e){} 
    }
    setTimeout(fix,150); setTimeout(fix,500); setTimeout(fix,1000); setTimeout(fix,2000); setTimeout(fix,4000);

    map.on('click',function(e){
      if(mode==='start'){ setStart(e.latlng.lat,e.latlng.lng); map.setView(e.latlng,13); mode=null; }
      else if(mode==='end'){ setEnd(e.latlng.lat,e.latlng.lng); mode=null; }
    });

    function onMsg(e) {
      try {
        var msg = typeof e.data==='string' ? JSON.parse(e.data) : e.data;
        if(!msg||!msg.action) return;
        switch(msg.action){
          case 'setStart':
            if(msg.data&&typeof msg.data.latitude==='number'){
              setStart(msg.data.latitude,msg.data.longitude,msg.data.address);
              map.setView([msg.data.latitude,msg.data.longitude],12);
            }
            break;
          case 'setEnd':
            if(msg.data&&typeof msg.data.latitude==='number'){
              setEnd(msg.data.latitude,msg.data.longitude,msg.data.address);
            }
            break;
          case 'selectStart': mode='start'; break;
          case 'selectEnd':   mode='end';   break;
          case 'useCurrentLocation':
            if(msg.data&&typeof msg.data.latitude==='number'){
              setStart(msg.data.latitude,msg.data.longitude,'Current Location');
              map.setView([msg.data.latitude,msg.data.longitude],14);
            }
            break;
          case 'reset':
            if(startMarker){map.removeLayer(startMarker);startMarker=null;}
            if(endMarker){map.removeLayer(endMarker);endMarker=null;}
            if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
            mode=null;
            break;
          case 'invalidateSize': fix(); break;
        }
      } catch(ex){}
    }

    window.addEventListener('message',onMsg);
    document.addEventListener('message',onMsg);
    window.addEventListener('resize', fix);
    postMsg('mapReady',{});
  }

  var poll=setInterval(function(){
    attempts++;
    if(typeof L!=='undefined'){ clearInterval(poll); initMap(); }
    else if(attempts>MAX){
      clearInterval(poll);
      document.body.innerHTML='<div style="padding:24px;color:#c00;font:14px sans-serif">Failed to load Leaflet. Check internet connection.</div>';
    }
  },50);
})();
<\/script>
</body>
</html>`;

  return (
    <KeyboardAvoidingView 
      style={styles.root} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={12}>
          <Text style={styles.headerBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Select Route</Text>
        <Pressable
          onPress={handleReset}
          style={styles.headerBtn}
          disabled={!mapReady}
          hitSlop={12}
        >
          <Text style={[styles.headerBtnText, !mapReady && styles.dimText]}>
            Reset
          </Text>
        </Pressable>
      </View>

      {/* Search Inputs */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>📍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Source location (e.g., Mumbai)"
            placeholderTextColor={COLORS.steel}
            value={sourceInput}
            onChangeText={setSourceInput}
            editable={mapReady && !searchLoading}
            returnKeyType="search"
            onSubmitEditing={() => searchLocation(sourceInput, true)}
          />
          <Pressable
            style={[styles.searchBtn, (!mapReady || searchLoading) && styles.searchBtnOff]}
            onPress={() => searchLocation(sourceInput, true)}
            disabled={!mapReady || searchLoading}
          >
            <Text style={styles.searchBtnTxt}>Search</Text>
          </Pressable>
        </View>
        
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🎯</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Destination location (e.g., Pune)"
            placeholderTextColor={COLORS.steel}
            value={destinationInput}
            onChangeText={setDestinationInput}
            editable={mapReady && !searchLoading}
            returnKeyType="search"
            onSubmitEditing={() => searchLocation(destinationInput, false)}
          />
          <Pressable
            style={[styles.searchBtn, (!mapReady || searchLoading) && styles.searchBtnOff]}
            onPress={() => searchLocation(destinationInput, false)}
            disabled={!mapReady || searchLoading}
          >
            <Text style={styles.searchBtnTxt}>Search</Text>
          </Pressable>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          style={[styles.ctrlBtn, !mapReady && styles.ctrlBtnOff]}
          onPress={() => sendToMap('selectStart', {})}
          disabled={!mapReady}
        >
          <Text style={styles.ctrlBtnTxt}>Tap Start</Text>
        </Pressable>
        <Pressable
          style={[styles.ctrlBtn, !mapReady && styles.ctrlBtnOff]}
          onPress={() => sendToMap('selectEnd', {})}
          disabled={!mapReady}
        >
          <Text style={styles.ctrlBtnTxt}>Tap End</Text>
        </Pressable>
        <Pressable
          style={[styles.ctrlBtn, (!mapReady || gpsLoading) && styles.ctrlBtnOff]}
          onPress={getCurrentLocation}
          disabled={!mapReady || gpsLoading}
        >
          <Text style={styles.ctrlBtnTxt}>
            {gpsLoading ? '⏳' : 'Use GPS'}
          </Text>
        </Pressable>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {webViewError ? (
          <View style={styles.errBox}>
            <Text style={styles.errEmoji}>🗺️</Text>
            <Text style={styles.errTitle}>Map Failed to Load</Text>
            <Text style={styles.errMsg}>{webViewError}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => {
                tilesLoadedRef.current = false;
                setWebViewError(null);
                setMapReady(false);
              }}
            >
              <Text style={styles.retryTxt}>🔄 Retry</Text>
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
              ref={webViewRef}
              source={{ html: mapHTML, baseUrl: 'https://unpkg.com' }}
              style={styles.webview}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              mixedContentMode="always"
              allowUniversalAccessFromFileURLs
              allowFileAccessFromFileURLs
              allowFileAccess
              geolocationEnabled
              cacheEnabled={false}
              androidLayerType="hardware"
              scalesPageToFit={false}
              onLoadEnd={() => {
                setTimeout(() => sendToMap('invalidateSize', {}), 200);
                setTimeout(() => sendToMap('invalidateSize', {}), 800);
              }}
              onError={() => setWebViewError('WebView failed to load.')}
            />
          </>
        )}
      </View>

      {/* Route Info */}
      {mapReady && (distance > 0 || duration > 0) && (
        <View style={styles.routeInfo}>
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

      {/* Points Summary */}
      {mapReady && (startPoint || endPoint) && (
        <View style={styles.pointsInfo}>
          <Text style={styles.pointsTxt} numberOfLines={1}>
            {startPoint
              ? `📍 ${startPoint.address || `${startPoint.latitude.toFixed(4)}, ${startPoint.longitude.toFixed(4)}`}`
              : '📍 Tap "Start" then tap map'}
          </Text>
          <Text style={styles.pointsTxt} numberOfLines={1}>
            {endPoint
              ? `🎯 ${endPoint.address || `${endPoint.latitude.toFixed(4)}, ${endPoint.longitude.toFixed(4)}`}`
              : '🎯 Tap "End" then tap map'}
          </Text>
        </View>
      )}

      {/* Bottom Action */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <Pressable
          style={[
            styles.confirmBtn,
            (!startPoint || !endPoint || !mapReady) && styles.confirmBtnOff,
          ]}
          onPress={handleConfirm}
          disabled={!startPoint || !endPoint || !mapReady}
        >
          <Text
            style={[
              styles.confirmTxt,
              (!startPoint || !endPoint) && styles.dimText,
            ]}
          >
            {!mapReady
              ? 'Loading Map…'
              : startPoint && endPoint
              ? '✓ Confirm Route'
              : 'Select Start & End Points'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.charcoal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.charcoal,
  },
  headerBtn: {
    minWidth: 60,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.offWhite,
    fontFamily: FONTS.bodyMedium,
  },
  headerTitle: {
    fontFamily: FONTS.headingBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.offWhite,
  },
  dimText: { opacity: 0.35 },
  searchContainer: {
    backgroundColor: COLORS.paperWhite,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.offWhite,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  searchIcon: {
    fontSize: 20,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.charcoal,
    paddingVertical: 10,
    minHeight: 40,
  },
  searchBtn: {
    backgroundColor: COLORS.ochre,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  searchBtnOff: {
    backgroundColor: COLORS.hairline,
    opacity: 0.5,
  },
  searchBtnTxt: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    color: '#fff',
  },
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
    paddingVertical: 12,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.ochre,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ctrlBtnOff: { backgroundColor: COLORS.hairline, opacity: 0.5 },
  ctrlBtnTxt: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#c8d8c8',
  },
  webview: {
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
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.charcoal,
    paddingVertical: SPACING.sm,
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
  pointsInfo: {
    backgroundColor: COLORS.paperWhite,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 4,
  },
  pointsTxt: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.charcoal,
  },
  bottomBar: {
    padding: SPACING.sm,
    backgroundColor: COLORS.paperWhite,
  },
  confirmBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: RADII.md,
    backgroundColor: COLORS.ochre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnOff: { backgroundColor: COLORS.hairline },
  confirmTxt: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.md,
    color: '#fff',
  },
});
