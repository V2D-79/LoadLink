# How to Switch to Online Mode

## Quick Steps

To enable account creation, login, and database features, you need to run the app in **online mode**.

### Step 1: Stop Current Server

In the terminal where Expo is running:
```
Press Ctrl+C
```

Wait until it stops completely.

### Step 2: Edit package.json

Open `package.json` and find the scripts section:

**Change FROM:**
```json
"scripts": {
  "start": "expo start --offline",
  "start:clear": "expo start -c --offline",
  ...
}
```

**Change TO:**
```json
"scripts": {
  "start": "expo start",
  "start:clear": "expo start -c",
  ...
}
```

**Simply remove `--offline` from both lines!**

### Step 3: Restart the Server

```bash
npm run start:clear
```

### Step 4: Reload App

- Open Expo Go on your device
- Scan the new QR code
- Or shake device and press "Reload"

---

## Alternative: Quick Online Start

Instead of editing package.json, you can directly run:

```bash
npx expo start
```

Or with cache clear:
```bash
npx expo start -c
```

This bypasses the package.json scripts and starts in online mode immediately.

---

## What You Can Do in Online Mode

✅ **Create Accounts** - Driver and Factory signup works  
✅ **Login** - Email/phone authentication works  
✅ **Database Operations** - Read/write to Firebase RTDB  
✅ **Phone Verification** - Check if phone already registered  
✅ **All Features** - Full app functionality

---

## Offline vs Online Mode

### Offline Mode (--offline flag)
**Best for:**
- UI development
- Form layout testing
- Component development
- No internet available

**Limitations:**
- Cannot create accounts
- Cannot login
- Cannot access database
- Auth features disabled

### Online Mode (no --offline flag)
**Best for:**
- Full feature testing
- Account creation
- Login testing
- Database operations
- Production-like testing

**Requirements:**
- Internet connection
- Firebase accessible
- Valid .env credentials

---

## Current Status

Right now your app is running in **offline mode**, which is why you see:
> "Cannot create account in offline mode. Please connect to the internet and try again."

Follow the steps above to switch to **online mode** and test full functionality!

---

## Recommended Workflow

**For Quick UI Changes:**
```bash
npm run start          # Offline mode, faster
```

**For Feature Testing:**
```bash
npx expo start         # Online mode, full features
```

**For Production Testing:**
```bash
npx expo start --no-dev --minify
```

---

**Ready to test account creation? Switch to online mode now!** 🚀
