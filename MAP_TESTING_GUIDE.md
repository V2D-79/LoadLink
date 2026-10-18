# Map Feature Testing Guide

## Prerequisites ✅

Before testing the map, ensure:

```bash
# 1. Server running in ONLINE mode
npm run start

# 2. Expo Go installed on phone

# 3. Phone connected and app loaded

# 4. Logged in as driver
Email: vivekdalavi7521@gmail.com
```

## Step-by-Step Map Testing

### Step 1: Navigate to Route Screen

```
Bottom Navigation Bar
├── Find (🔍)
├── Activity (📋)
├── My Route (🗺️) ← TAP THIS
└── Profile (👤)
```

You should see:
- Title: "Set My Route"
- Card with map emoji 🗺️
- Button: "📍 Open Map & Select Route"

### Step 2: Open Map Modal

**TAP:** "📍 Open Map & Select Route" button

**Expected Behavior:**
1. Modal slides up from bottom (300ms animation)
2. Header appears:
   - Left: ✕ (Close button)
   - Center: "Select Route"
   - Right: "Reset"
3. Control bar with 3 buttons:
   - "📍 Select Start"
   - "🎯 Select Destination"
   - "📱 Use My Location"

### Step 3: Wait for Map to Load

**Timeline:**
```
0-300ms:   "Opening..." shown
300ms:     Modal fully visible
300-2000ms: "Loading map tiles..." with spinner
2-3s:      Map tiles start appearing
3-5s:      Map fully loaded
```

**What You Should See:**
- Map centered on Pune, India (default)
- Streets and roads visible
- Can zoom with pinch gesture
- Can pan by dragging
- Buttons now enabled (not grayed out)

### Step 4: Place Start Marker

**Action:**
1. TAP "📍 Select Start" button
2. TAP anywhere on the map

**Expected:**
- Orange circle marker (📍) appears at clicked location
- Marker has white border and shadow
- Can drag marker to adjust position
- Popup shows "Start Point"

**If Nothing Happens:**
- Check buttons are enabled (not gray)
- Wait for tiles to fully load
- Try clicking different area of map

### Step 5: Place Destination Marker

**Action:**
1. TAP "🎯 Select Destination" button
2. TAP different location on map

**Expected:**
- Red/rust circle marker (🎯) appears
- Marker has white border and shadow
- Can drag marker to adjust position
- Popup shows "Destination"
- **Route line automatically draws!**

### Step 6: Verify Route Calculation

**Automatic After Both Markers Placed:**

Route line should appear:
- Color: Ochre/orange (#B8741A)
- Width: 5px
- Follows roads (not straight line)
- Map zooms to fit entire route

**Bottom panel appears showing:**
```
┌────────────────────────────┐
│ Distance    │  Est. Time   │
│   15.3 km   │    25m       │
└────────────────────────────┘
```

**Distance Format:**
- Shows in kilometers (km)
- 1 decimal place (e.g., 15.3 km)

**Time Format:**
- Minutes: "25m"
- Hours: "1h 15m"

### Step 7: Test Drag to Adjust

**Action:**
- Long press on start marker
- Drag to new location
- Release

**Expected:**
- Marker moves to new position
- Route recalculates automatically
- New distance/time appears
- Route line updates

**Repeat for destination marker**

### Step 8: Test Use My Location

**Action:**
1. TAP "📱 Use My Location" button
2. Allow location permission if prompted

**Expected:**
- Permission dialog appears (first time)
- Tap "Allow" or "Allow While Using"
- Map centers on your current location
- Start marker placed at your location
- Map zooms to level 15

**If Permission Denied:**
- Go to phone Settings
- Apps → Expo Go
- Permissions → Location
- Set to "Allow"

### Step 9: Test Reset

**Action:**
- TAP "Reset" button (top right)

**Expected:**
- Start marker disappears
- End marker disappears
- Route line disappears
- Distance/time panel disappears
- Map returns to default view
- All clean, ready for new route

### Step 10: Confirm and Save Route

**Prerequisites:**
- Both start and end markers placed
- Route line visible
- Distance showing

**Action:**
- TAP "✓ Confirm Route" button (bottom right)

**Expected:**
1. Route data saves to Firebase
2. Modal closes with slide down animation
3. Returns to "My Route" screen
4. Route card now shows:
   - Current location
   - Destination
   - Distance
   - Estimated time
   - Capacity info

## Visual Checklist

### When Modal Opens:
```
┌─────────────────────────────┐
│ ✕   Select Route      Reset │ ← Header
├─────────────────────────────┤
│ 📍 Start │ 🎯 Dest │ 📱 GPS │ ← Controls
├─────────────────────────────┤
│                             │
│                             │
│        MAP AREA             │ ← Should show streets!
│     (streets visible)       │
│                             │
│                             │
├─────────────────────────────┤
│  Distance  │   Est. Time    │ ← Route info
│   15.3 km  │      25m       │
├─────────────────────────────┤
│  Cancel  │ ✓ Confirm Route  │ ← Actions
└─────────────────────────────┘
```

### Marker Appearance:
```
Start Marker (📍):
┌──────┐
│      │  ← Pulsing ring animation
│  📍  │  ← Orange circle with icon
│      │
└──────┘

End Marker (🎯):
┌──────┐
│      │  ← Pulsing ring animation
│  🎯  │  ← Rust/red circle with icon
│      │
└──────┘
```

### Route Line:
```
Start ───────────────────── End
  📍   Ochre/orange line    🎯
       Follows roads
       Smooth curves
```

## Troubleshooting

### ❌ Map is Blank/White

**Check:**
1. Are you in online mode?
   ```bash
   # Terminal should show:
   npm run start
   # NOT: npm run start:offline
   ```

2. Does phone have internet?
   - Open browser on phone
   - Try loading google.com
   - If fails, connect to WiFi

3. Wait longer (up to 5 seconds)
   - First load can be slow
   - Tiles download from internet

### ❌ Buttons Don't Work

**Check:**
1. Are buttons grayed out?
   - Wait for map to fully load
   - Look for "Loading map tiles..." to finish

2. Did you tap button first?
   - Must tap "Select Start" THEN tap map
   - Must tap "Select Destination" THEN tap map

### ❌ Route Doesn't Calculate

**Check:**
1. Are BOTH markers placed?
   - Need both start (📍) and end (🎯)
   - Check map for both markers

2. Internet connection?
   - Route calculation uses OSRM API
   - Needs internet connection

3. Console logs?
   - Check terminal for errors
   - Should see: "Route calculated"

### ❌ Can't Drag Markers

**Check:**
1. Try long press first
2. Make sure markers are visible
3. Try placing new markers instead

### ❌ Location Permission Fails

**Check:**
1. Go to Settings → Apps → Expo Go
2. Permissions → Location
3. Set to "Allow" or "Allow while using app"
4. Restart app

## Success Criteria

### ✅ Map Loads:
- [ ] Streets and roads visible
- [ ] Can zoom in/out
- [ ] Can pan around
- [ ] Tiles load completely

### ✅ Start Marker:
- [ ] Click button works
- [ ] Click map places marker
- [ ] Marker is orange with icon
- [ ] Can drag to adjust

### ✅ End Marker:
- [ ] Click button works
- [ ] Click map places marker
- [ ] Marker is rust/red with icon
- [ ] Can drag to adjust

### ✅ Route Calculation:
- [ ] Line appears between markers
- [ ] Line follows roads
- [ ] Distance shown in km
- [ ] Time shown in minutes
- [ ] Updates when markers drag

### ✅ Other Features:
- [ ] Use My Location works
- [ ] Reset clears everything
- [ ] Confirm saves route
- [ ] Modal closes properly

## Console Logs to Verify

Watch terminal while testing:

```
✅ Good logs:
[RouteScreen] Opening map modal for new route
[RouteMapSelector] Modal opening...
[RouteMapSelector] Animation complete, showing content
[RouteMapSelector] WebView load ended
[RouteMapSelector] Map ready
[RouteMapSelector] First tile loaded successfully  ← KEY!
[RouteMapSelector] Message from map: mapReady
[RouteMapSelector] Start point set: {latitude: X, longitude: Y}
[RouteMapSelector] End point set: {latitude: X, longitude: Y}
[RouteMapSelector] Route calculated: {dist: 15.3, dur: 25}

❌ Bad logs:
[RouteMapSelector] Tiles not loaded after 5s - likely offline
[RouteMapSelector] WebView error: ...
[RouteMapSelector] HTTP error: ...
```

## Performance Expectations

### Timing:
- Modal open: < 500ms
- Tiles load: 2-5 seconds (first time)
- Marker place: Instant
- Route calculate: 1-3 seconds
- Drag update: < 1 second

### Smoothness:
- Modal animation: 60fps
- Pan/zoom: Smooth
- Marker drag: Smooth
- No freezing
- No lag

## Final Test Checklist

Complete flow:

1. [ ] Start server in online mode
2. [ ] Login as driver
3. [ ] Navigate to "My Route"
4. [ ] Click "Open Map & Select Route"
5. [ ] Wait for tiles (streets visible)
6. [ ] Click "Select Start"
7. [ ] Click map (orange marker appears)
8. [ ] Click "Select Destination"
9. [ ] Click map (red marker appears)
10. [ ] Route line appears
11. [ ] Distance shows (e.g., 15.3 km)
12. [ ] Time shows (e.g., 25m)
13. [ ] Drag start marker (route updates)
14. [ ] Drag end marker (route updates)
15. [ ] Click "Use My Location" (centers on you)
16. [ ] Click "Reset" (everything clears)
17. [ ] Place markers again
18. [ ] Click "✓ Confirm Route"
19. [ ] Modal closes
20. [ ] Route card shows on screen

**All steps should work smoothly!**

---

**Status**: Ready to test
**Mode**: Online (npm run start)
**Platform**: Expo Go
**Feature**: Interactive route selection with distance
