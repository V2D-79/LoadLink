# Map Dependencies Installation Guide

## Required Dependencies

To implement the interactive map with all features, you need to install:

```bash
# Install react-native-maps (Google Maps for Android/iOS)
npx expo install react-native-maps

# Install location services
npx expo install expo-location

# For directions/routing
npm install @mapbox/polyline
```

## Configuration

### 1. app.json Configuration

Add to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow LoadLink to use your location to show nearby jobs and optimize routes."
        }
      ]
    ],
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
      }
    }
  }
}
```

### 2. Get Google Maps API Key

1. Go to: https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable these APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Directions API
   - Places API
4. Create API key in Credentials
5. Add to app.json

### 3. Environment Variables

Add to `.env`:
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Platform-Specific Setup

### Android
- API key will be auto-configured via app.json
- Permissions handled automatically

### iOS
- API key will be auto-configured via app.json
- Location permissions handled automatically

## Features Included

✅ Interactive map with pinch-to-zoom
✅ Satellite/Standard/Hybrid/Terrain map types
✅ Draggable markers for start/end points
✅ Route drawing with distance & time
✅ Multiple route options
✅ Search locations with autocomplete
✅ Current location button
✅ Job markers on map
✅ Full-screen modal with animations
✅ Native performance

