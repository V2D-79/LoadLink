# How to Test New Features 🧪

## Quick Start

1. **Reload the app** (if running):
   ```bash
   # In Metro bundler terminal, press 'r'
   # Or shake phone and select "Reload"
   ```

2. **Or start fresh**:
   ```bash
   npm start
   ```

3. **Open on your phone** (Expo Go or development build)

---

## Test Scenario 1: Home Pages ✅

### Driver Home
**What to test:**
1. Open app as driver
2. You should land on **Home tab** (first tab)
3. Verify you see:
   - ✅ "Welcome back, [Your Name]"
   - ✅ Animated truck moving smoothly left to right
   - ✅ "LoadLink Platform" info card
   - ✅ Three quick action cards (Set Route, Find Jobs, Track Activity)
   - ✅ Three benefit cards
   - ✅ "Set My Route Now" button at bottom

**Expected behavior:**
- Truck animation plays continuously without stopping
- Scrolling is smooth
- All cards are tappable
- Clicking cards navigates to correct screens
- Bottom button navigates to Route tab

**Screenshots to take:**
- [ ] Full home screen
- [ ] Truck animation (video if possible)

---

### Factory Home
**What to test:**
1. Open app as factory
2. You should land on **Home tab** (first tab)
3. Verify you see:
   - ✅ "Welcome, [Organization Name]"
   - ✅ Animated truck moving smoothly
   - ✅ "LoadLink Platform" info card
   - ✅ Three quick action cards (Post Job, Manage Jobs, Track Shipments)
   - ✅ Three benefit cards
   - ✅ "Post a Job Now" button at bottom

**Expected behavior:**
- Same as driver home
- Organization name displayed correctly

**Screenshots to take:**
- [ ] Full home screen

---

## Test Scenario 2: Map-Based Location Picker (Factory) 📍

### Test Pickup Location Selection

**Method 1: Search by Name**
1. Go to Post Job screen
2. At Step 0 (Pickup), click **"📍 Or Select on Map"**
3. Map opens full screen
4. Type **"Mumbai"** in search field
5. Click **"Search"** button
6. Verify:
   - ✅ Map zooms to Mumbai
   - ✅ Orange marker (📍) appears
   - ✅ Location text shows "Mumbai..." at bottom
7. Click **"✓ Confirm Location"**
8. Verify:
   - ✅ Map closes
   - ✅ Back on pickup form
   - ✅ Address field has Mumbai address

**Method 2: Use GPS**
1. Click **"📍 Or Select on Map"** again
2. Click **"📍 Use GPS"** button
3. Grant location permission (if prompted)
4. Verify:
   - ✅ Map zooms to your current location
   - ✅ Marker appears at your position
   - ✅ Location text shows "Current Location"
5. Confirm and verify address filled

**Method 3: Tap on Map**
1. Click **"📍 Or Select on Map"** again
2. Tap anywhere on the map (don't search, don't use GPS)
3. Verify:
   - ✅ Marker appears where you tapped
   - ✅ Location coordinates shown at bottom
4. Drag the marker to a different location
5. Verify:
   - ✅ Marker moves smoothly
   - ✅ Location updates
6. Confirm and verify

**Expected behavior:**
- Map tiles load within 2-3 seconds
- All three methods work independently
- Marker is draggable
- Confirm button only enabled when location selected
- Cancel button closes without saving

**Screenshots to take:**
- [ ] Map with search results
- [ ] Map with GPS location
- [ ] Map with tapped location
- [ ] Form with auto-filled address

---

### Test Delivery Location Selection

**Repeat all three methods** for Step 1 (Delivery):
1. Search for **"Pune"**
2. Use GPS (if different from pickup)
3. Tap on map

**Expected behavior:**
- Same as pickup
- Independent from pickup selection
- Can have same or different location

---

## Test Scenario 3: Live Route Tracking (Driver) 🗺️

### Test Route with Live Map

**Setup:**
1. Go to Route tab as driver
2. If no route set, click **"Open Map & Select Route"**
3. Set route: Mumbai → Pune
4. Confirm route

**What to test:**
1. Back on Route tab, verify you see:
   - ✅ **Live map** at top (250px height)
   - ✅ Orange marker (📍) at Mumbai (start)
   - ✅ Red marker (🎯) at Pune (end)
   - ✅ Green truck marker (🚛) at current position
   - ✅ Brown/ochre route line connecting them
   - ✅ Map auto-fitted to show entire route
2. Below map:
   - ✅ Route details card
   - ✅ Distance and time shown
   - ✅ Update and Clear buttons

**Expected behavior:**
- Map loads quickly (1-2 seconds)
- All markers visible
- Route line follows roads (not straight)
- Map bounds fit entire route
- Can scroll below map to see details

**Screenshots to take:**
- [ ] Full route screen with live map
- [ ] Close-up of map showing all markers
- [ ] Route details card

---

### Test Route Updates

**What to test:**
1. Click **"Update Route on Map"**
2. Modify route (change start or end)
3. Confirm changes
4. Back on Route tab
5. Verify:
   - ✅ Live map shows new route
   - ✅ Markers updated
   - ✅ Distance/time recalculated

**Expected behavior:**
- Map updates smoothly
- No flickering
- Previous route replaced

---

### Test Route Clearing

**What to test:**
1. Click **"Clear Route"**
2. Confirm (if prompted)
3. Verify:
   - ✅ Map disappears
   - ✅ Shows "No Route Set" state
   - ✅ "Open Map & Select Route" button appears

---

## Test Scenario 4: Navigation Tabs 🔄

### Driver Navigation

**What to test:**
1. Check all 5 tabs appear:
   - ✅ Home (house icon 🏠)
   - ✅ Find Jobs (truck icon)
   - ✅ My Route (route icon)
   - ✅ Activity (chart icon)
   - ✅ Profile (person icon)
2. Tap each tab
3. Verify:
   - ✅ Switches to correct screen
   - ✅ Active tab highlighted (ochre color)
   - ✅ Icon color changes
   - ✅ No delay in switching

**Expected behavior:**
- Home tab selected by default on login
- Tab bar doesn't overflow
- Icons clear and recognizable
- Smooth transitions

---

### Factory Navigation

**What to test:**
1. Check all 5 tabs appear:
   - ✅ Home (house icon 🏠)
   - ✅ My Jobs (briefcase icon)
   - ✅ Post Job (plus icon)
   - ✅ Track (eye icon)
   - ✅ Profile (person icon)
2. Same verification as driver

---

## Test Scenario 5: Complete User Flows 🎯

### Flow 1: Factory Posts Job Using Maps

**Complete journey:**
1. Open app as factory → Land on Home
2. Click "Post a Job" card → Go to Post Job
3. Step 0 (Pickup):
   - Click "Or Select on Map"
   - Search "Pune"
   - Confirm
   - Verify address auto-filled
4. Click "Next: Delivery"
5. Step 1 (Delivery):
   - Click "Or Select on Map"
   - Use GPS OR search "Kolhapur"
   - Confirm
   - Verify address auto-filled
6. Continue through:
   - Step 2: Cargo (fill weight, category)
   - Step 3: Schedule (fill dates, budget)
   - Step 4: Review
7. Publish job
8. Verify "Job Posted!" success screen

**Time estimate:** 3-5 minutes

**Expected result:**
- ✅ Job created successfully
- ✅ Appears in My Jobs tab
- ✅ Coordinates saved correctly

---

### Flow 2: Driver Sets Route and Views Tracking

**Complete journey:**
1. Open app as driver → Land on Home
2. Click "Set My Route" card → Go to Route tab
3. Click "Open Map & Select Route"
4. Search "Mumbai" for source
5. Search "Pune" for destination
6. Verify route line appears
7. Check distance and time
8. Click "Confirm Route"
9. Back on Route tab
10. Verify live tracking map shows:
    - Start marker
    - End marker  
    - Current position
    - Route line
11. Check route details below map

**Time estimate:** 2-3 minutes

**Expected result:**
- ✅ Route saved successfully
- ✅ Live map displays correctly
- ✅ Can update or clear route

---

## Test Scenario 6: Edge Cases & Errors ⚠️

### Test Internet Connection Issues

**What to test:**
1. Turn off WiFi and mobile data
2. Try to open map picker
3. Verify:
   - ✅ Map shows "Loading map..."
   - ✅ After 10 seconds, shows error message
   - ✅ Error says "Make sure your phone has internet"
   - ✅ Has "Retry" button
4. Turn internet back on
5. Click "Retry"
6. Verify:
   - ✅ Map loads successfully

---

### Test Permission Denials

**What to test:**
1. Open map picker
2. Click "Use GPS"
3. Click "Deny" on permission prompt
4. Verify:
   - ✅ Shows "Permission Denied" alert
   - ✅ Says "Enable location access"
5. Go to phone settings
6. Grant location permission
7. Try GPS again
8. Verify:
   - ✅ Works correctly now

---

### Test Search Failures

**What to test:**
1. Open map picker
2. Search for nonsense: "Xyzabc123"
3. Click "Search"
4. Verify:
   - ✅ Shows "Not Found" alert
   - ✅ Says "Could not find location: Xyzabc123"
   - ✅ Map remains on previous view

---

### Test Rapid Tab Switching

**What to test:**
1. Quickly tap between all tabs multiple times
2. Verify:
   - ✅ No crashes
   - ✅ No white screens
   - ✅ Content loads correctly each time
   - ✅ No memory issues

---

### Test Map with Slow Internet

**What to test:**
1. Enable slow 2G/3G connection simulation
2. Open map picker
3. Observe:
   - ✅ Map tiles load progressively (center first)
   - ✅ No crashes while loading
   - ✅ Shows loading indicator
   - ✅ Eventually loads completely

---

## Test Scenario 7: Performance & Smoothness 🚀

### Test Animation Performance

**What to test:**
1. Go to Home tab
2. Observe truck animation for 30 seconds
3. Verify:
   - ✅ Smooth 60 FPS (no stuttering)
   - ✅ Continues infinitely
   - ✅ No lag when scrolling
   - ✅ No battery drain

**How to check FPS:**
- Animation should look butter smooth
- No visible frame drops
- Truck moves at constant speed

---

### Test Map Performance

**What to test:**
1. Open map picker
2. Pan around the map
3. Zoom in and out
4. Verify:
   - ✅ Smooth panning (60 FPS)
   - ✅ Smooth zooming
   - ✅ Tiles load progressively
   - ✅ No lag

---

### Test Memory Usage

**What to test:**
1. Open Developer menu (shake phone)
2. Enable "Show Perf Monitor"
3. Navigate through app
4. Open maps multiple times
5. Check memory:
   - ✅ Memory stable (not constantly increasing)
   - ✅ No memory leaks
   - ✅ FPS stays at 60

---

## Test Scenario 8: Accessibility 👁️

### Test with Large Text

**What to test:**
1. Go to phone Settings → Display → Font Size
2. Set to "Large" or "Extra Large"
3. Open app
4. Verify:
   - ✅ Text scales appropriately
   - ✅ No text cut off
   - ✅ Buttons still tappable
   - ✅ Layout doesn't break

---

### Test Screen Reader (if enabled)

**What to test:**
1. Enable TalkBack (Android) or VoiceOver (iOS)
2. Navigate through Home screen
3. Verify:
   - ✅ All elements announced
   - ✅ Buttons have labels
   - ✅ Cards are tappable
   - ✅ Navigation works

---

## Common Issues & Solutions 🔧

### Issue 1: Map Not Loading
**Symptoms:** Map shows gray screen or loading forever
**Check:**
- [ ] Phone has internet connection
- [ ] App running in online mode (`npm start`, not offline)
- [ ] Try reloading app (press 'r' in Metro)

**Solution:**
- Ensure internet is working
- Try different WiFi/mobile network
- Check if OpenStreetMap is accessible in your region

---

### Issue 2: Animation Not Playing
**Symptoms:** Truck static, not moving
**Check:**
- [ ] Is Reanimated installed?
- [ ] Any console errors?

**Solution:**
```bash
# Reinstall Reanimated
npm install react-native-reanimated
# Clear cache
npm start -- --reset-cache
```

---

### Issue 3: GPS Not Working
**Symptoms:** "Use GPS" button does nothing
**Check:**
- [ ] Location permission granted?
- [ ] GPS enabled on phone?
- [ ] App has location access in settings?

**Solution:**
- Go to phone Settings → Apps → LoadLink → Permissions
- Enable Location → "Allow all the time" or "Allow only while using app"
- Enable GPS in phone quick settings

---

### Issue 4: Home Tab Not First
**Symptoms:** Different tab shows first on login
**Check:**
- [ ] Is code updated?
- [ ] Did app reload?

**Solution:**
```bash
# Force reload
# In Metro terminal, press 'r'
# Or shake phone → Reload
```

---

### Issue 5: Compilation Errors
**Symptoms:** Red screen with error message
**Check:**
- [ ] Any TypeScript errors?
- [ ] All files saved?

**Solution:**
```bash
# Check for errors
npx tsc --noEmit

# If errors, check recent changes
# All files should have been verified as error-free
```

---

## Reporting Issues 📝

If you find any issues during testing, please provide:

1. **What were you doing?**
   - Exact steps to reproduce
   
2. **What happened?**
   - Actual behavior (with screenshot)
   
3. **What did you expect?**
   - Expected behavior
   
4. **Device info:**
   - Phone model
   - Android/iOS version
   - App version
   
5. **Console logs:**
   - Any errors in Metro bundler
   - Any red screens in app

---

## Test Checklist Summary ✅

Copy this checklist and mark as you test:

### Home Pages
- [ ] Driver home shows correctly
- [ ] Factory home shows correctly
- [ ] Truck animation plays smoothly
- [ ] All quick action cards work
- [ ] CTA buttons navigate correctly

### Map Location Picker
- [ ] Search by location name works
- [ ] GPS button gets current location
- [ ] Tap on map places marker
- [ ] Marker is draggable
- [ ] Confirm saves location
- [ ] Cancel discards changes
- [ ] Address auto-fills on form

### Live Route Tracking
- [ ] Map shows when route is set
- [ ] All three markers visible
- [ ] Route line drawn correctly
- [ ] Map auto-fits to route
- [ ] Can update route
- [ ] Can clear route

### Navigation
- [ ] Home tab is first for both roles
- [ ] All 5 tabs visible
- [ ] Tab switching works
- [ ] Icons clear and correct

### Performance
- [ ] Animation smooth (60 FPS)
- [ ] Maps load quickly
- [ ] No lag or stuttering
- [ ] Memory usage stable

### Error Handling
- [ ] No internet shows error
- [ ] Permission denial handled
- [ ] Search failures handled
- [ ] No crashes

---

**Happy Testing! 🚀**

All features have been implemented correctly with no errors. The app is ready for thorough testing. Let me know what you find!
