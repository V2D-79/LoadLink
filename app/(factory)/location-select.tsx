/**
 * app/(factory)/location-select.tsx
 *
 * Full-screen map for selecting pickup or delivery location
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../../src/constants/theme';

interface LocationPoint {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function LocationSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const webViewRef = useRef<WebView>(null);
  const tilesLoadedRef = useRef(false);
  const tileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLocationSentRef = useRef(false); // Track if we've sent initial location
  
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  const title = params.title as string || 'Select Location';
  const locationType = params.type as string || 'pickup'; // 'pickup' or 'delivery'

  // Parse initial location from params - only run once on mount
  useEffect(() => {
    if (params.lat && params.lng) {
      const initialLocation = {
        latitude: parseFloat(params.lat as string),
        longitude: parseFloat(params.lng as string),
        address: params.address as string,
      };
      setLocation(initialLocation);
    }
  }, [params.lat, params.lng, params.address]); // Only depend on the specific params we use

  // Timeout for tile loading
  useEffect(() => {
    tilesLoadedRef.current = false;
    tileTimeoutRef.current = setTimeout(() => {
      if (!tilesLoadedRef.current) {
        setWebViewError(
          'Map tiles failed to load.\n\nMake sure your phone has internet connection and the app is running in online mode.'
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

  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'mapReady':
          setMapReady(true);
          // Only send initial location once
          if (!initialLocationSentRef.current && location) {
            initialLocationSentRef.current = true;
            setTimeout(() => sendToMap('setLocation', location), 300);
          }
          break;
        case 'tileLoaded':
          tilesLoadedRef.current = true;
          if (tileTimeoutRef.current) {
            clearTimeout(tileTimeoutRef.current);
            tileTimeoutRef.current = null;
          }
          break;
        case 'locationSet':
          // Reverse geocode to get address
          const point = msg.point;
          if (point && point.latitude && point.longitude && !point.address) {
            try {
              const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.latitude}&lon=${point.longitude}&addressdetails=1`;
              const response = await fetch(url, {
                headers: { 'User-Agent': 'LoadLink-App' }
              });
              const data = await response.json();
              if (data && data.display_name) {
                point.address = data.display_name;
                console.log('[LocationSelect] Reverse geocoded address:', data.display_name);
              }
            } catch (error) {
              console.log('[LocationSelect] Reverse geocoding failed:', error);
              point.address = `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
            }
          }
          console.log('[LocationSelect] Location set:', point);
          setLocation(point);
          break;
      }
    } catch (error) {
      console.log('[LocationSelect] Message handling error:', error);
    }
  }, [sendToMap, location]); // Add location back but protect with ref

  const searchLocation = useCallback(async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Empty Search', 'Please enter a location name.');
      return;
    }
    
    setSearchLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=in`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'LoadLink-App' }
      });
      const data = await response.json();
      
      if (data && data.length > 0) {
        const point = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          address: data[0].display_name,
        };
        setLocation(point);
        sendToMap('setLocation', point);
      } else {
        Alert.alert('Not Found', `Could not find location: ${searchQuery}`);
      }
    } catch (error) {
      Alert.alert('Search Error', 'Failed to search location.');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, sendToMap]);

  const useGPS = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Enable location access.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      // Reverse geocode to get actual address
      let address = `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&addressdetails=1`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'LoadLink-App' }
        });
        const data = await response.json();
        if (data && data.display_name) {
          address = data.display_name;
          console.log('[LocationSelect] GPS reverse geocoded:', address);
        }
      } catch (error) {
        console.log('[LocationSelect] GPS reverse geocoding failed:', error);
      }
      
      const point = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: address,
      };
      setLocation(point);
      sendToMap('setLocation', point);
    } catch {
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      setGpsLoading(false);
    }
  }, [sendToMap]);

  const handleConfirm = () => {
    if (!location) {
      Alert.alert('No Location', 'Please select a location on the map.');
      return;
    }
    
    console.log('[LocationSelect] Confirming location:', {
      type: locationType,
      location: location,
    });
    
    // Navigate back with location data
    router.back();
    
    // Use global callback to pass data back
    setTimeout(() => {
      if (global.onLocationSelected) {
        console.log('[LocationSelect] Calling global.onLocationSelected');
        global.onLocationSelected({
          type: locationType,
          location: location,
        });
      } else {
        console.log('[LocationSelect] Warning: global.onLocationSelected is not defined!');
      }
    }, 100);
  };

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
  var map, marker;
  var attempts=0, MAX=200;

  function postMsg(type, extra) {
    var obj = Object.assign({ type: type }, extra || {});
    try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
  }

  function icon() {
    return L.divIcon({
      html: '<div style="background:#B8741A;width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:22px">📍</div>',
      className: '', iconSize: [40,40], iconAnchor: [20,40]
    });
  }

  function setLocation(lat,lng,addr) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat,lng],{ draggable:true, icon:icon() })
      .addTo(map).bindPopup(addr || 'Selected location');
    marker.on('dragend',function(e){
      var p=e.target.getLatLng();
      postMsg('locationSet',{point:{latitude:p.lat,longitude:p.lng}});
    });
    map.setView([lat,lng],12);
    postMsg('locationSet',{point:{latitude:lat,longitude:lng,address:addr||''}});
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
    setTimeout(fix,150); setTimeout(fix,500); setTimeout(fix,1000); setTimeout(fix,2000);

    map.on('click',function(e){ setLocation(e.latlng.lat,e.latlng.lng); });

    function onMsg(e) {
      try {
        var msg = typeof e.data==='string' ? JSON.parse(e.data) : e.data;
        if(!msg||!msg.action) return;
        if(msg.action==='setLocation' && msg.data && typeof msg.data.latitude==='number'){
          setLocation(msg.data.latitude,msg.data.longitude,msg.data.address);
        } else if(msg.action==='invalidateSize') {
          fix();
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
    <View style={styles.root}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.xs }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>← Cancel</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location (e.g., Mumbai)"
          placeholderTextColor={COLORS.steel}
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={mapReady && !searchLoading}
          returnKeyType="search"
          onSubmitEditing={searchLocation}
        />
        <Pressable
          style={[styles.searchBtn, (!mapReady || searchLoading) && styles.btnOff]}
          onPress={searchLocation}
          disabled={!mapReady || searchLoading}
        >
          <Text style={styles.btnText}>Search</Text>
        </Pressable>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          style={[styles.ctrlBtn, (!mapReady || gpsLoading) && styles.btnOff]}
          onPress={useGPS}
          disabled={!mapReady || gpsLoading}
        >
          <Text style={styles.ctrlText}>{gpsLoading ? '⏳' : '📍 Use GPS'}</Text>
        </Pressable>
        <Text style={styles.ctrlText}>or tap on map</Text>
      </View>

      {/* Map */}
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
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.ochre} />
                <Text style={styles.loadingText}>Loading map…</Text>
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
              onError={(e) => {
                console.log('[LocationSelect] WebView error:', e.nativeEvent);
                setWebViewError('WebView failed to load. Check internet connection.');
              }}
            />
          </>
        )}
      </View>

      {/* Location display */}
      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText} numberOfLines={2}>
            📍 {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
          </Text>
        </View>
      )}

      {/* Confirm button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <Pressable
          style={[styles.confirmBtn, !location && styles.btnOff]}
          onPress={handleConfirm}
          disabled={!location}
        >
          <Text style={styles.confirmText}>{location ? '✓ Confirm Location' : 'Select a location'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.charcoal },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.charcoal,
  },
  backText: { fontSize: FONT_SIZES.sm, color: COLORS.offWhite, fontFamily: FONTS.bodyMedium },
  title: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.offWhite },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.paperWhite,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.charcoal,
    backgroundColor: COLORS.offWhite,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    borderRadius: RADII.sm,
  },
  searchBtn: {
    backgroundColor: COLORS.ochre,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADII.sm,
  },
  btnOff: { backgroundColor: COLORS.hairline, opacity: 0.5 },
  btnText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: '#fff' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.paperWhite,
  },
  ctrlBtn: {
    backgroundColor: COLORS.ochre,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADII.sm,
  },
  ctrlText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.charcoal,
  },
  mapContainer: { flex: 1, backgroundColor: '#c8d8c8' },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.steel,
  },
  locationInfo: {
    backgroundColor: COLORS.paperWhite,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  locationText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.charcoal,
  },
  bottomBar: {
    padding: SPACING.sm,
    backgroundColor: COLORS.paperWhite,
  },
  confirmBtn: {
    backgroundColor: COLORS.ochre,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
    alignItems: 'center',
  },
  confirmText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.md,
    color: '#fff',
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
});
