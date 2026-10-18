/**
 * src/components/LocationMapPicker.tsx
 *
 * Shared map component for picking a single location (pickup or delivery).
 * Used in factory post job flow and other location selection screens.
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
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../constants/theme';

interface LocationPoint {
  latitude: number;
  longitude: number;
  address?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: LocationPoint) => void;
  initialLocation?: LocationPoint;
  title: string;
}

export default function LocationMapPicker({ visible, onClose, onSelect, initialLocation, title }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [location, setLocation] = useState<LocationPoint | null>(initialLocation || null);
  const [mapReady, setMapReady] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (visible && initialLocation) {
      setLocation(initialLocation);
    }
  }, [visible, initialLocation]);

  const sendToMap = useCallback((action: string, data: any) => {
    webViewRef.current?.postMessage(JSON.stringify({ action, data }));
  }, []);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'mapReady':
          setMapReady(true);
          if (initialLocation) {
            setTimeout(() => sendToMap('setLocation', initialLocation), 300);
          }
          break;
        case 'locationSet':
          setLocation(msg.point);
          break;
      }
    } catch (_) {}
  }, [initialLocation, sendToMap]);

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
      const point = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: 'Current Location',
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
    onSelect(location);
    onClose();
  };

  const mapHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100vw; height:100vh; overflow:hidden; }
    #map { position:absolute; top:0; left:0; width:100vw; height:100vh; }
    .leaflet-container { background:#c8d8c8 !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function() {
  var map, marker;

  function postMsg(type, extra) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, extra || {}))); } catch(e) {}
  }

  function icon() {
    return L.divIcon({
      html: '<div style="background:#B8741A;width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:22px">📍</div>',
      className: '', iconSize: [40,40], iconAnchor: [20,20]
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

  var mapEl = document.getElementById('map');
  mapEl.style.width = window.innerWidth + 'px';
  mapEl.style.height = window.innerHeight + 'px';

  map = L.map('map',{ center:[20.5937,78.9629], zoom:5, zoomControl:true, attributionControl:false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

  setTimeout(function(){ map.invalidateSize({animate:false}); },150);
  setTimeout(function(){ map.invalidateSize({animate:false}); },500);

  map.on('click',function(e){ setLocation(e.latlng.lat,e.latlng.lng); });

  window.addEventListener('message',function(e) {
    try {
      var msg = typeof e.data==='string' ? JSON.parse(e.data) : e.data;
      if(msg.action==='setLocation' && msg.data) {
        setLocation(msg.data.latitude,msg.data.longitude,msg.data.address);
      }
    } catch(ex){}
  });
  document.addEventListener('message',function(e) {
    try {
      var msg = typeof e.data==='string' ? JSON.parse(e.data) : e.data;
      if(msg.action==='setLocation' && msg.data) {
        setLocation(msg.data.latitude,msg.data.longitude,msg.data.address);
      }
    } catch(ex){}
  });

  postMsg('mapReady',{});
})();
<\/script>
</body>
</html>`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
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
            geolocationEnabled
          />
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
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.confirmBtn, !location && styles.btnOff]}
            onPress={handleConfirm}
            disabled={!location}
          >
            <Text style={styles.confirmText}>{location ? '✓ Confirm Location' : 'Select a location'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.charcoal },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
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
});
