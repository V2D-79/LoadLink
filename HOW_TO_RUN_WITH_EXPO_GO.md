# Complete Guide: Running LoadLink with Expo Go

## Step 1: Stop Current Server

If the server is already running, stop it:

```bash
Press Ctrl+C in the terminal
```

Wait until you see the terminal prompt return.

## Step 2: Start in Regular/Online Mode

Run this command:

```bash
npm run start
```

**OR** if that doesn't work:

```bash
expo start
```

**DO NOT use:** `npm run start:offline`

## Step 3: Wait for QR Code

You'll see output like this:

```
Starting Metro Bundler...
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▀▄█▀ ▀█  █ ▄▄▄▄▄ █
█ █   █ █▄   ▄██▄██ █   █ █
█ █▄▄▄█ █ ▀█▀█▄▀ ▀█ █▄▄▄█ █
▄▄▄▄▄▄▄█ ▀▄█ █ █ █▄▄▄▄▄▄▄█

› Metro waiting on exp://10.141.113.231:8081
› Scan the QR code above with Expo Go (Android)
```

## Step 4: Install Expo Go (if not already installed)

### On Android:
1. Open **Google Play Store**
2. Search for **"Expo Go"**
3. Install the app (by Expo)
4. Open Expo Go app

### On iOS:
1. Open **App Store**
2. Search for **"Expo Go"**
3. Install the app (by Expo)
4. Open Expo Go app

## Step 5: Connect to Your App

### Method 1: Scan QR Code (Easiest)

**On Android:**
1. Open **Expo Go** app
2. Tap **"Scan QR code"** button
3. Point camera at the QR code in terminal
4. App will load automatically

**On iOS:**
1. Open **Camera** app (not Expo Go)
2. Point at QR code
3. Tap notification that appears
4. Expo Go will open and load app

### Method 2: Manual Entry

1. Open **Expo Go** app
2. Look at your terminal - find the URL like: `exp://10.141.113.231:8081`
3. In Expo Go, tap **"Enter URL manually"**
4. Type the URL
5. Tap **Go** or **Connect**

### Method 3: From Terminal (if connected via USB)

Press `a` in the terminal to open on Android automatically.

## Step 6: Wait for App to Load

You'll see:
```
Android Bundled 25242ms node_modules\expo-router\entry.js (1610 modules)
```

Wait for bundling to complete. First time takes 20-30 seconds.

## Step 7: Login to the App

When app opens, you'll see the **Landing Screen**.

### Option A: Login as Driver (You)

1. Tap **"Login"** button
2. Enter:
   - **Email**: `vivekdalavi7521@gmail.com`
   - **Password**: `[your password]` (the one you set when you created account)
3. Tap **"Login"** button

You'll be logged in as a **Driver** and see:
- Find Jobs (tab)
- Activity (tab)
- My Route (tab) ← **This has the map!**
- Profile (tab)

### Option B: Create New Driver Account

1. Tap **"Sign Up"** button
2. Fill in:
   - **Full Name**: Your name
   - **Email**: Your email
   - **Password**: At least 6 characters
   - **Role**: Select **"Driver"**
3. Tap **"Sign Up"**
4. You'll be logged in automatically

### Option C: Login as Factory Owner

If you want to test the factory side:

1. Create account with role **"Factory Owner"**
2. You'll see different screens:
   - Post Load (create jobs)
   - My Jobs
   - Track
   - Profile

## Step 8: Test the Map Feature

Once logged in as **Driver**:

1. Tap the **"My Route"** tab (map icon at bottom)
2. You'll see **"Set My Route"** screen
3. Tap **"📍 Open Map & Select Route"** button
4. **Modal should slide up** with map
5. **Wait 2-3 seconds** for tiles to load
6. You should see **streets and roads**!

### Using the Map:

1. **Select Start Point**:
   - Tap "📍 Select Start" button
   - Tap anywhere on map
   - Orange marker appears

2. **Select Destination**:
   - Tap "🎯 Select Destination" button
   - Tap anywhere on map
   - Red marker appears

3. **Route Calculates Automatically**:
   - Orange line appears between points
   - Distance shows at bottom (e.g., "15.3 km")
   - Time shows at bottom (e.g., "25m")

4. **Adjust Route**:
   - Drag markers to new positions
   - Route recalculates automatically

5. **Use Current Location**:
   - Tap "📱 Use My Location" button
   - Allow location permission
   - Map centers on your location

6. **Save Route**:
   - Tap "✓ Confirm Route" button
   - Route saves to Firebase
   - Modal closes

## Common Issues & Solutions

### Issue 1: QR Code Won't Scan

**Solution:**
- Make sure phone and computer are on **same WiFi network**
- Try Method 2 (manual URL entry)
- Check firewall isn't blocking connections

### Issue 2: "Unable to connect"

**Solution:**
```bash
# In terminal, press:
Ctrl+C

# Then run with tunnel:
npx expo start --tunnel
```

This works even if on different networks.

### Issue 3: Map Tiles Not Loading

**Solution:**
- Make sure you're NOT running `npm run start:offline`
- Check phone has internet connection
- Wait up to 5 seconds for tiles to load
- If error appears, follow instructions in error message

### Issue 4: "Network request failed"

**Solution:**
- Your phone needs internet for Firebase
- Connect to WiFi or mobile data
- Restart Expo Go app

### Issue 5: App Won't Load After Changes

**Solution:**
```bash
# In terminal, press 'r' to reload
r

# OR shake phone and tap "Reload"
```

## Expo Go Commands

When server is running, you can press these keys in terminal:

- **`r`** - Reload app
- **`a`** - Open on Android device/emulator
- **`i`** - Open on iOS simulator (Mac only)
- **`w`** - Open in web browser
- **`j`** - Open debugger
- **`m`** - Toggle menu
- **`?`** - Show all commands
- **`Ctrl+C`** - Stop server

## Debugging Tips

### View Console Logs

Logs appear in the terminal where you ran `npm run start`:

```
(NOBRIDGE) LOG  [RouteScreen] Opening map modal
(NOBRIDGE) LOG  [RouteMapSelector] Modal opening...
(NOBRIDGE) LOG  [RouteMapSelector] Map ready
(NOBRIDGE) LOG  [RouteMapSelector] First tile loaded successfully
```

### Shake Phone for Dev Menu

1. Shake your phone
2. Menu appears with options:
   - Reload
   - Debug
   - Element Inspector
   - Performance Monitor

### Check Network Connection

Make sure:
- ✅ Phone and computer on same WiFi
- ✅ Phone has internet access
- ✅ Computer has internet access
- ✅ Firewall allows Expo connections

## Full Login Credentials Reference

### Existing Driver Account:
- **Email**: `vivekdalavi7521@gmail.com`
- **Password**: [Your password]
- **Role**: Driver

### To Create New Account:
1. Any valid email
2. Password (min 6 characters)
3. Choose role: "Driver" or "Factory Owner"

### Test Accounts (if you created them):
You can create multiple test accounts with different roles to test all features.

## What You Should See

### After Login as Driver:

**Find Tab:**
- List of available jobs
- Can search and filter
- Can view job details
- Can submit bids

**Activity Tab:**
- Your active trips
- Bid history
- Trip status updates

**My Route Tab:**
- Current route display (if set)
- "Open Map & Select Route" button ← **Test this!**
- Route details (distance, capacity)

**Profile Tab:**
- Your info
- Edit profile
- Logout

## Expected Map Behavior in Online Mode

1. ✅ Button click → Modal slides up
2. ✅ Header appears (close X, title, reset)
3. ✅ Control buttons appear (Select Start, Select Destination, Use Location)
4. ✅ "Loading map tiles..." shows briefly
5. ✅ Map tiles load (streets/roads visible)
6. ✅ Can zoom with pinch
7. ✅ Can pan by dragging
8. ✅ Can tap to place markers
9. ✅ Route line appears
10. ✅ Distance and time calculated
11. ✅ Can drag markers
12. ✅ Can confirm and save

## Troubleshooting Checklist

- [ ] Stopped offline mode server (Ctrl+C)
- [ ] Running `npm run start` (not start:offline)
- [ ] Expo Go installed on phone
- [ ] Phone and computer on same WiFi
- [ ] Phone has internet connection
- [ ] QR code scanned successfully
- [ ] App loaded in Expo Go
- [ ] Logged in as driver
- [ ] Navigated to "My Route" tab
- [ ] Clicked "Open Map & Select Route"
- [ ] Waited for tiles to load (2-3 seconds)
- [ ] Map tiles visible (streets/roads)

## Quick Start Summary

```bash
# 1. Stop server if running
Ctrl+C

# 2. Start in online mode
npm run start

# 3. Scan QR code with Expo Go

# 4. Login:
Email: vivekdalavi7521@gmail.com
Password: [your password]

# 5. Go to "My Route" tab

# 6. Tap "Open Map & Select Route"

# 7. Map should load with tiles!
```

## Getting Help

If still having issues:

1. Check terminal logs for errors
2. Check phone internet connection
3. Try tunnel mode: `npx expo start --tunnel`
4. Restart Expo Go app
5. Restart terminal and run `npm run start` again

---

**Last Updated**: October 17, 2026
**App**: LoadLink
**Mode**: Regular/Online (required for map)
**Platform**: Expo Go (Android/iOS)
