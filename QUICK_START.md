# LoadLink - Quick Start Guide

## 🚀 Start the App (Online Mode)

```bash
# Stop any running server first
Ctrl+C

# Start in online mode (required for map)
npm run start
```

## 📱 Connect Your Phone

### Method 1: QR Code (Easiest)
1. Install **Expo Go** app from Play Store/App Store
2. Open **Expo Go**
3. Tap **"Scan QR code"**
4. Point camera at QR code in terminal
5. App loads automatically

### Method 2: Automatic (USB)
1. Connect phone via USB
2. Press **`a`** in terminal
3. App opens automatically

## 🔐 Login Credentials

### Your Driver Account:
- **Email**: `vivekdalavi7521@gmail.com`
- **Password**: [your password]

### Or Create New Account:
1. Tap **"Sign Up"**
2. Enter any email and password
3. Select **"Driver"** role
4. Tap **"Sign Up"**

## 🗺️ Test the Map

1. Login as driver
2. Tap **"My Route"** tab (bottom)
3. Tap **"📍 Open Map & Select Route"**
4. Wait 2-3 seconds for tiles
5. **Map should show streets!**

### Use the Map:
- **Select Start**: Tap button → Click map
- **Select Destination**: Tap button → Click map
- **Route draws automatically** with distance
- **Drag markers** to adjust
- **Confirm** to save

## ✅ Success Checklist

- [ ] Running `npm run start` (NOT start:offline)
- [ ] Phone on same WiFi as computer
- [ ] Phone has internet connection
- [ ] Scanned QR code with Expo Go
- [ ] Logged in successfully
- [ ] On "My Route" tab
- [ ] Map modal opens
- [ ] Tiles load (streets visible)

## ⚠️ If Map Doesn't Show

Make sure you're running:
```bash
npm run start
```

**NOT:**
```bash
npm run start:offline  ❌
```

The map needs internet to load tiles!

## 🆘 Common Issues

### "Unable to connect to Metro"
- Make sure phone and computer on same WiFi
- Try: `npx expo start --tunnel`

### Map is blank
- Check you're in online mode (not offline)
- Wait 3-5 seconds for tiles
- Check phone has internet

### App won't reload
- Press **`r`** in terminal
- OR shake phone → tap "Reload"

## 🎯 Quick Commands

In terminal while server runs:

- **`r`** - Reload app
- **`a`** - Open Android
- **`j`** - Debugger
- **`m`** - Menu
- **`Ctrl+C`** - Stop

## 📊 What You Should See

### Landing Screen:
- Welcome message
- Login button
- Sign Up button

### After Login (Driver):
- **Find** - Browse jobs
- **Activity** - Your trips
- **My Route** - Set route with map ← Test this!
- **Profile** - Your info

### Map Modal:
- Header with close (✕) and reset
- Three control buttons
- Map with streets/tiles
- Distance and time at bottom
- Confirm button

## 💯 Test Flow

```
1. Start server → npm run start
2. Scan QR → Open in Expo Go
3. Login → vivekdalavi7521@gmail.com
4. Go to → "My Route" tab
5. Click → "Open Map & Select Route"
6. Verify → Streets/tiles visible
7. Click → "Select Start" then map
8. Click → "Select Destination" then map
9. See → Route line and distance
10. Click → "Confirm Route"
```

---

**Need detailed help?** See `HOW_TO_RUN_WITH_EXPO_GO.md`

**Map not working?** See `OFFLINE_MODE_MAP_ISSUE.md`

**Technical details?** See `PROVEN_MAP_INTEGRATED.md`
