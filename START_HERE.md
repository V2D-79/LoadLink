# 🚀 START HERE - Complete Setup Guide

## 📋 What You Need

1. ✅ Computer with Node.js installed
2. ✅ Smartphone (Android or iOS)
3. ✅ Both on same WiFi network
4. ✅ Internet connection on both devices

## 🎯 Quick Start (3 Steps)

### Step 1: Start Server (Computer)

```bash
# In terminal, run:
npm run start
```

**Wait for QR code to appear!**

### Step 2: Connect Phone

1. Install **Expo Go** app from store
2. Open Expo Go
3. Scan QR code from terminal
4. App loads automatically

### Step 3: Login and Test

**Login:**
- Email: `vivekdalavi7521@gmail.com`
- Password: [your password]

**Test Map:**
1. Go to "My Route" tab
2. Tap "Open Map & Select Route"
3. Map should show streets!

---

## 📚 Documentation Index

### For First-Time Setup:
📖 **[HOW_TO_RUN_WITH_EXPO_GO.md](HOW_TO_RUN_WITH_EXPO_GO.md)**
- Complete Expo Go setup
- How to scan QR code
- Login credentials
- Troubleshooting connection issues

### For Quick Reference:
📖 **[QUICK_START.md](QUICK_START.md)**
- Commands cheat sheet
- Login info
- Common issues
- Success checklist

### For Testing the Map:
📖 **[MAP_TESTING_GUIDE.md](MAP_TESTING_GUIDE.md)**
- Step-by-step map testing
- What you should see
- Visual checklist
- Troubleshooting map issues

### If Map Not Showing:
📖 **[OFFLINE_MODE_MAP_ISSUE.md](OFFLINE_MODE_MAP_ISSUE.md)**
- Why map needs online mode
- How to switch modes
- Expected behavior

### Technical Details:
📖 **[PROVEN_MAP_INTEGRATED.md](PROVEN_MAP_INTEGRATED.md)**
- How the map works
- Architecture details
- Features list

---

## ⚡ Super Quick Start

**Copy-paste these commands:**

```bash
# 1. Stop any running server
Ctrl+C

# 2. Start in online mode
npm run start

# 3. Scan QR code with Expo Go app

# 4. Login in app:
#    Email: vivekdalavi7521@gmail.com
#    Password: [yours]

# 5. Test map:
#    My Route tab → Open Map & Select Route
```

---

## 🔑 Important Notes

### ✅ DO:
- Run `npm run start` (online mode)
- Connect phone to same WiFi
- Wait for tiles to load (2-3 seconds)
- Have internet on both devices

### ❌ DON'T:
- Run `npm run start:offline` (map won't work)
- Expect instant load (tiles take time)
- Use without internet connection

---

## 🆘 Having Issues?

### Map Not Loading?
1. Check you're running `npm run start` (NOT start:offline)
2. Wait 5 seconds for tiles
3. Check phone has internet
4. See: [OFFLINE_MODE_MAP_ISSUE.md](OFFLINE_MODE_MAP_ISSUE.md)

### Can't Connect Phone?
1. Check same WiFi
2. Try scanning QR again
3. Try tunnel: `npx expo start --tunnel`
4. See: [HOW_TO_RUN_WITH_EXPO_GO.md](HOW_TO_RUN_WITH_EXPO_GO.md)

### App Crashes or Errors?
1. Press `r` in terminal to reload
2. Shake phone → Reload
3. Check terminal for error messages

---

## 📱 What You'll See

### 1. Landing Screen
- Welcome message
- Login button
- Sign Up button

### 2. After Login (Driver)
```
┌─────────────────────┐
│                     │
│    FIND JOBS        │ ← Browse available loads
│                     │
├─────────────────────┤
│    ACTIVITY         │ ← Your trips and bids
├─────────────────────┤
│    MY ROUTE  ⭐     │ ← Set route with MAP
├─────────────────────┤
│    PROFILE          │ ← Your information
└─────────────────────┘
```

### 3. Map Feature (My Route Tab)
```
Click "Open Map & Select Route"
         ↓
┌──────────────────────┐
│ ✕  Select Route  ⟳  │
├──────────────────────┤
│ 📍 │ 🎯 │ 📱 GPS    │
├──────────────────────┤
│                      │
│   [MAP WITH TILES]   │ ← Streets visible!
│   [START MARKER]     │
│   [END MARKER]       │
│   [ROUTE LINE]       │
│                      │
├──────────────────────┤
│ 15.3 km │ 25 min    │ ← Distance & time
├──────────────────────┤
│ Cancel │ ✓ Confirm  │
└──────────────────────┘
```

---

## ✅ Success Checklist

Before asking for help, verify:

- [ ] Running `npm run start` (NOT start:offline)
- [ ] QR code visible in terminal
- [ ] Expo Go installed on phone
- [ ] Phone and computer on same WiFi
- [ ] Phone has internet connection
- [ ] App loaded in Expo Go
- [ ] Logged in successfully
- [ ] Can see bottom navigation tabs
- [ ] Clicked "My Route" tab
- [ ] Clicked "Open Map & Select Route"
- [ ] Waited 3-5 seconds for tiles
- [ ] Can see streets on map

**If all checked ✅ and map still not working:**
See detailed troubleshooting in [OFFLINE_MODE_MAP_ISSUE.md](OFFLINE_MODE_MAP_ISSUE.md)

---

## 🎓 Learning Path

1. **First Time?** → Read [HOW_TO_RUN_WITH_EXPO_GO.md](HOW_TO_RUN_WITH_EXPO_GO.md)
2. **Need Commands?** → Check [QUICK_START.md](QUICK_START.md)
3. **Test Map?** → Follow [MAP_TESTING_GUIDE.md](MAP_TESTING_GUIDE.md)
4. **Map Issues?** → See [OFFLINE_MODE_MAP_ISSUE.md](OFFLINE_MODE_MAP_ISSUE.md)
5. **Curious How?** → Read [PROVEN_MAP_INTEGRATED.md](PROVEN_MAP_INTEGRATED.md)

---

## 💡 Pro Tips

### Faster Testing:
```bash
# In terminal, press these keys:
r  → Reload app instantly
a  → Open on Android (if USB connected)
j  → Open debugger
m  → Toggle menu
```

### Better Debugging:
```bash
# Run with tunnel (works on different networks):
npx expo start --tunnel

# Clear cache and restart:
npx expo start -c
```

### Save Time:
- Keep terminal open
- Just press `r` to reload after code changes
- Don't restart server unless necessary

---

## 🎉 You're Ready!

**Execute:**
```bash
npm run start
```

**Then follow the QR code!**

---

**Last Updated**: October 17, 2026  
**Project**: LoadLink - Freight Matching Platform  
**Feature**: Interactive Route Selection with Distance Calculation  
**Status**: Ready for Testing  
