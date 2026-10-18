# Fix Map Not Showing Issue

## Problem
The map modal opens but the map doesn't display properly, or shows permission denied errors.

## Solution

### Step 1: Deploy Firebase Database Rules
The permission denied error happens because drivers don't have permission to write jobs in Firebase.

**Run this command:**
```bash
firebase deploy --only database
```

**If you get "Failed to authenticate" error:**
```bash
firebase login
firebase deploy --only database
```

### Step 2: Make Sure App is Running in Online Mode
The map requires internet to load tiles from OpenStreetMap.

**Stop the current server** (Ctrl+C), then run:
```bash
npm start
```

**NOT:**  
~~`npm run start:offline`~~

### Step 3: Clear Cache and Restart
Sometimes the app caches old code. To fix:

```bash
npm run start:clear
```

Then on your phone:
- Close Expo Go completely
- Reopen Expo Go
- Scan the QR code again

### Step 4: Test the Map
1. Login as driver (`vivekdalavi7521@gmail.com`)
2. Go to "My Route" tab
3. Click "📍 Open Map & Select Route"
4. Map should load with tiles visible
5. Tap "📍 Start" then tap on map
6. Tap "🎯 End" then tap another location
7. Route line should appear with distance/time
8. Click "✓ Confirm Route"

## What Was Fixed

### 1. Database Rules
Changed jobs write permission from:
```
|| data.exists() && data.child('assignedDriverUid').val() === auth.uid
```

To:
```
|| data.child('assignedDriverUid').val() === auth.uid
|| newData.child('assignedDriverUid').val() === auth.uid
```

This allows drivers to be assigned to jobs.

### 2. Map Layout
- Uses `flex: 1` for map container
- Proper SafeAreaView spacing for Android
- WebView hardware acceleration enabled
- Map `invalidateSize()` called multiple times for Android WebView layout

## Troubleshooting

### Map shows white/gray background only
- **Cause**: App running in offline mode
- **Fix**: Run `npm start` (not `npm run start:offline`)

### "Something went wrong" / Worklets error
- **Cause**: Cached mismatched dependencies
- **Fix**: Run `npm run start:clear`

### Permission denied error for jobs
- **Cause**: Database rules not deployed
- **Fix**: Run `firebase deploy --only database`

### Map tiles don't load after 8 seconds
- **Cause**: No internet connection or firewall blocking
- **Fix**: 
  1. Check phone has internet
  2. Check phone and computer on same WiFi
  3. Try tunnel mode: `npx expo start --tunnel`

## Current Status

✅ Factory edit profile created  
✅ Factory profile UI updated to match driver  
✅ Database rules fixed for driver job updates  
✅ Map layout fixed with proper flex containers  
🔄 Waiting for: Firebase rules deployment & online mode confirmation
