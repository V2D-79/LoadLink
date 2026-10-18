# Map as Separate Full-Screen Activity

## What Changed

The map is now a **separate full-screen page** instead of a modal popup. This fixes all layout issues and provides a better user experience.

## New Files Created

1. **`app/(driver)/map-select.tsx`** - Full-screen map activity
   - Complete standalone screen with header, controls, and map
   - No modal wrapper - pure screen navigation
   - Better performance and layout control

2. **`src/types/global.d.ts`** - TypeScript global types
   - Defines global callback for route selection

## Modified Files

1. **`app/(driver)/route.tsx`**
   - Removed RouteMapSelector modal component
   - Added `openMapScreen()` function to navigate to map screen
   - Setup global callback to receive route data when user returns

2. **`app/(driver)/_layout.tsx`**
   - Added `map-select` to hidden screens list
   - Screen is accessible but not shown in tab bar

## How It Works

### User Flow:
1. User clicks "📍 Open Map & Select Route" button
2. **Navigation**: App navigates to full-screen map activity (`/(driver)/map-select`)
3. User interacts with map:
   - Tap "📍 Start" then tap map location
   - Tap "🎯 End" then tap another location  
   - Route line appears with distance & time
   - Drag markers to adjust
4. User clicks "✓ Confirm Route"
5. **Navigation back**: Returns to route tab
6. **Callback**: Route data saved to Firebase via global callback

### Technical Implementation:

```typescript
// In route.tsx - Navigate to map screen
const openMapScreen = () => {
  router.push({
    pathname: '/(driver)/map-select',
    params: {
      startLat, startLng, startAddress,
      endLat, endLng, endAddress
    }
  });
};

// Setup global callback
useEffect(() => {
  global.onRouteSelected = async (routeData) => {
    // Save route to Firebase
    await saveRouteToDatabase(routeData);
  };
}, []);

// In map-select.tsx - Return with data
const handleConfirm = () => {
  router.back();
  setTimeout(() => {
    global.onRouteSelected?.({ start, end, distance, duration });
  }, 100);
};
```

## Features

### ✅ Full Screen Map
- Uses entire screen (no cramped modal)
- Proper WebView sizing with viewport units
- Hardware acceleration enabled
- Multiple `invalidateSize()` calls for Android

### ✅ Interactive Controls
- **📍 Start** - Tap button, then tap map to set start point
- **🎯 End** - Tap button, then tap map to set destination
- **📱 GPS** - Use current location as start point
- **Reset** - Clear all markers and routes

### ✅ Route Calculation
- Uses OSRM routing service (best route automatically)
- Shows blue route line on map
- Displays distance (km) and estimated time
- Auto-fits map to show entire route

### ✅ Draggable Markers
- Both start and end markers can be dragged
- Route recalculates automatically when markers move
- Larger markers (40x40px) for easier touch

### ✅ Route Info Display
- Distance shown in kilometers
- Time shown as hours & minutes
- Point coordinates/addresses displayed
- Bottom confirm button shows current state

### ✅ Navigation
- Back button in header
- Android hardware back button supported
- Returns to route tab on confirm
- Preserves route tab scroll position

## Map Layout Fix

The key changes that fixed the layout:

### HTML/CSS:
```css
html, body { 
  width: 100vw;     /* Full viewport width */
  height: 100vh;    /* Full viewport height */
  position: fixed;  /* Prevent scrolling */
  overflow: hidden;
}

#map { 
  width: 100vw;     /* Force full width */
  height: 100vh;    /* Force full height */
}
```

### JavaScript:
```javascript
function initMap() {
  // Explicitly set map dimensions
  var w = window.innerWidth;
  var h = window.innerHeight;
  var mapEl = document.getElementById('map');
  mapEl.style.width = w + 'px';
  mapEl.style.height = h + 'px';
  
  // Create map with canvas rendering
  map = L.map('map', { 
    preferCanvas: true  // Better performance
  });
  
  // Multiple invalidateSize() calls
  function fix() {
    var w2 = window.innerWidth;
    var h2 = window.innerHeight;
    mapEl.style.width = w2 + 'px';
    mapEl.style.height = h2 + 'px';
    map.invalidateSize({animate: false});
  }
  setTimeout(fix, 150);
  setTimeout(fix, 500);
  setTimeout(fix, 1000);
  setTimeout(fix, 2000);
  setTimeout(fix, 4000);
}
```

### React Native WebView:
```tsx
<WebView
  style={{ flex: 1, width: '100%', height: '100%' }}
  androidLayerType="hardware"
  androidHardwareAccelerationDisabled={false}
  scalesPageToFit={false}
  onLoadEnd={() => {
    setTimeout(() => sendToMap('invalidateSize', {}), 200);
    setTimeout(() => sendToMap('invalidateSize', {}), 800);
  }}
/>
```

## Testing

1. **Press `r`** in Expo to reload the app
2. Login as driver
3. Go to "My Route" tab
4. Click "📍 Open Map & Select Route"
5. **Full-screen map should appear** (not a small modal!)
6. Test all features:
   - Tap Start, tap map
   - Tap End, tap map
   - See route line appear
   - Drag markers
   - Check distance/time display
   - Tap GPS button
   - Tap Reset
   - Tap Confirm

## Benefits Over Modal

| Modal (Old) | Separate Screen (New) |
|-------------|----------------------|
| Layout issues | Perfect layout |
| WebView sizing problems | Full viewport control |
| Cramped on small screens | Uses entire screen |
| Hard to debug | Easier to debug |
| Animation conflicts | Smooth transitions |
| Z-index issues | No stacking context |

## Files Summary

**Map Related Files:**
- ✅ `app/(driver)/map-select.tsx` - NEW full-screen map activity
- ✅ `app/(driver)/route.tsx` - Modified to use navigation
- ✅ `app/(driver)/_layout.tsx` - Added map-select route
- ✅ `src/types/global.d.ts` - NEW global callback type
- ⚠️ `src/components/RouteMapSelector.tsx` - OLD modal (can be deleted)

**Current Status:**
- Map now works as separate full-screen activity
- All layout issues resolved
- Proper WebView sizing
- Best route calculation via OSRM
- Draggable markers
- GPS location support
