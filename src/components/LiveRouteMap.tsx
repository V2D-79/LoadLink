/**
 * src/components/LiveRouteMap.tsx
 *
 * Live tracking map showing driver's current position and route
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../constants/theme';

interface Props {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  currentLat?: number;
  currentLng?: number;
  height?: number;
}

export default function LiveRouteMap({
  startLat,
  startLng,
  endLat,
  endLng,
  currentLat,
  currentLng,
  height = 300,
}: Props) {
  const webViewRef = useRef<WebView>(null);

  const sendToMap = useCallback((action: string, data: any) => {
    webViewRef.current?.postMessage(JSON.stringify({ action, data }));
  }, []);

  useEffect(() => {
    if (currentLat && currentLng) {
      sendToMap('updateCurrent', { latitude: currentLat, longitude: currentLng });
    }
  }, [currentLat, currentLng, sendToMap]);

  const mapHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; overflow:hidden; }
    #map { position:absolute; top:0; left:0; width:100%; height:100%; }
    .leaflet-container { background:#c8d8c8 !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function() {
  var map, startMarker, endMarker, currentMarker, routeLayer;
  var startLat = ${startLat}, startLng = ${startLng};
  var endLat = ${endLat}, endLng = ${endLng};
  var currentLat = ${currentLat || startLat}, currentLng = ${currentLng || startLng};

  function icon(emoji, color) {
    return L.divIcon({
      html: '<div style="background:'+color+';width:36px;height:36px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:18px">'+emoji+'</div>',
      className: '', iconSize: [36,36], iconAnchor: [18,18]
    });
  }

  map = L.map('map',{ center:[(startLat+endLat)/2,(startLng+endLng)/2], zoom:8, zoomControl:true, attributionControl:false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

  startMarker = L.marker([startLat,startLng],{ icon:icon('📍','#B8741A') }).addTo(map).bindPopup('Start');
  endMarker = L.marker([endLat,endLng],{ icon:icon('🎯','#9C4A2B') }).addTo(map).bindPopup('Destination');
  currentMarker = L.marker([currentLat,currentLng],{ icon:icon('🚛','#2E7D32') }).addTo(map).bindPopup('Current Location');

  // Draw route
  var url='https://router.project-osrm.org/route/v1/driving/'+startLng+','+startLat+';'+endLng+','+endLat+'?overview=full&geometries=geojson';
  fetch(url)
    .then(function(r){return r.json();})
    .then(function(data){
      if(data.code==='Ok'&&data.routes&&data.routes[0]){
        var r=data.routes[0];
        routeLayer=L.geoJSON(r.geometry,{style:{color:'#B8741A',weight:4,opacity:.7}}).addTo(map);
        map.fitBounds(routeLayer.getBounds(),{padding:[50,50]});
      }
    });

  setTimeout(function(){ map.invalidateSize({animate:false}); },200);
  setTimeout(function(){ map.invalidateSize({animate:false}); },800);

  window.addEventListener('message',function(e) {
    try {
      var msg = typeof e.data==='string' ? JSON.parse(e.data) : e.data;
      if(msg.action==='updateCurrent' && msg.data) {
        currentMarker.setLatLng([msg.data.latitude, msg.data.longitude]);
        map.panTo([msg.data.latitude, msg.data.longitude]);
      }
    } catch(ex){}
  });
  document.addEventListener('message',function(e) {
    try {
      var msg = typeof e.data==='string' ? JSON.parse(e.data) : e.data;
      if(msg.action==='updateCurrent' && msg.data) {
        currentMarker.setLatLng([msg.data.latitude, msg.data.longitude]);
        map.panTo([msg.data.latitude, msg.data.longitude]);
      }
    } catch(ex){}
  });
})();
<\/script>
</body>
</html>`;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHTML, baseUrl: 'https://unpkg.com' }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#c8d8c8',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
