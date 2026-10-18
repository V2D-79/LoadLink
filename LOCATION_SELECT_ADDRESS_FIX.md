# Location Select Address Fix

## Issue
When posting a job and clicking the "Use GPS" (📍 Use GPS) button to get current location, the address field was showing just "Current Location" instead of the actual formatted address.

## Root Cause
In `app/(factory)/location-select.tsx`, the `useGPS()` function was setting a hardcoded address:
```typescript
const point = {
  latitude: loc.coords.latitude,
  longitude: loc.coords.longitude,
  address: 'Current Location',  // ❌ Not a real address
};
```

## Solution
Modified the `useGPS()` function to perform reverse geocoding using Nominatim API to get the actual address:

```typescript
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
    
    // ✅ Reverse geocode to get actual address
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
      address: address,  // ✅ Real address from reverse geocoding
    };
    setLocation(point);
    sendToMap('setLocation', point);
  } catch {
    Alert.alert('Error', 'Could not get your location.');
  } finally {
    setGpsLoading(false);
  }
}, [sendToMap]);
```

## Benefits
- ✅ Shows full formatted address (e.g., "Street Name, Area, City, State, Country, PIN")
- ✅ More descriptive and useful for users
- ✅ Consistent with manual location selection behavior
- ✅ Falls back to coordinates if reverse geocoding fails
- ✅ Properly logs for debugging

## Files Modified
- `app/(factory)/location-select.tsx` - Enhanced `useGPS()` function

## Testing
1. Open factory app and go to Post Job
2. Click on Pickup Location section
3. Click "📍 Use GPS" button
4. Allow location permission
5. Verify that the address field now shows the full address (e.g., "Plot 45, MIDC Phase 2, Pune, Maharashtra, India") instead of just "Current Location"
6. Confirm button should work normally

## Status
✅ **COMPLETE** - GPS button now shows proper formatted addresses
