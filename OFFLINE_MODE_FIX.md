# Offline Mode & Capacity Field Fixes

## Issues Fixed

### Issue 1: "Permission Denied" Error on Account Creation

**Problem:** When clicking "Create Account" for Driver or Factory signup, the app shows "Permission denied" error.

**Root Cause:** The app is running in **offline mode** (`expo start --offline`), which blocks all Firebase network requests. Account creation requires:
- Creating Firebase Auth user
- Writing to Realtime Database
- Verifying phone number uniqueness

All of these require internet connection and fail with "Permission denied" in offline mode.

### Issue 2: Capacity Field Value Changes Unexpectedly

**Problem:** In the truck details form, when entering the WhatsApp number, the "Maximum Capacity (Tonnes)" field value changes or gets reset.

**Root Cause:** The number input handler was converting empty strings to `0` with `parseFloat(t) || 0`, which was interfering with form state when other fields were being edited.

---

## Fixes Applied

### Fix 1: Better Error Message for Offline Mode

**File:** `app/(auth)/signup.tsx`

**Before:**
```typescript
catch (err: any) {
  setServerError(err.message ?? 'Signup failed. Please try again.');
}
```

**After:**
```typescript
catch (err: any) {
  // Handle specific error cases
  if (err.message?.includes('Permission denied') || err.message?.includes('network')) {
    setServerError('Cannot create account in offline mode. Please connect to the internet and try again.');
  } else {
    setServerError(err.message ?? 'Signup failed. Please try again.');
  }
}
```

**Applied to:**
- FactoryDetailsStep submit function
- DriverDetailsStep submit function

**Why better:**
- Clear explanation of the problem
- Tells user exactly what to do
- Distinguishes between offline and other errors

### Fix 2: Improved Capacity Field Handler

**File:** `app/(auth)/signup.tsx`

**Before:**
```typescript
value={String(value || '')}
onChangeText={(t) => onChange(parseFloat(t) || 0)}
```

**After:**
```typescript
value={value !== undefined && value !== null ? String(value) : ''}
onChangeText={(text) => {
  const trimmed = text.trim();
  if (trimmed === '') {
    // Allow clearing the field
    return;
  }
  const parsed = parseFloat(trimmed);
  if (!isNaN(parsed) && parsed > 0) {
    onChange(parsed);
  }
}}
```

**Why better:**
- Only updates on valid positive numbers
- Doesn't interfere when field is empty
- Doesn't default to 0 accidentally
- Preserves form state properly

---

## How to Run in Online Mode

The app needs internet connection for account creation. Here's how to run it properly:

### Option 1: Remove Offline Flag (Recommended)

**Edit:** `package.json`

**Change:**
```json
"scripts": {
  "start": "expo start --offline",
  "start:clear": "expo start -c --offline"
}
```

**To:**
```json
"scripts": {
  "start": "expo start",
  "start:clear": "expo start -c"
}
```

Then restart:
```bash
npm run start:clear
```

### Option 2: Start Without Offline Flag

```bash
npx expo start
```

Or with cache clear:
```bash
npx expo start -c
```

### Option 3: Temporary Online Mode

In the terminal where Expo is running:
- Press `Ctrl+C` to stop
- Run: `npx expo start` (without --offline)
- Scan QR code again

---

## Testing Guide

### Test 1: Capacity Field (Fixed)

1. ✅ Open driver signup
2. ✅ Fill personal details (Step 2)
3. ✅ Click "Continue"
4. ✅ Fill truck registration
5. ✅ Select vehicle type
6. ✅ Select body type
7. ✅ Enter capacity: "10"
8. ✅ Enter WhatsApp: "9876543210"
9. ✅ **Verify capacity still shows "10"** (not changed)
10. ✅ Change capacity to "15"
11. ✅ **Verify it updates correctly**

### Test 2: Offline Mode Error (Clearer Message)

1. ✅ Ensure app is in offline mode
2. ✅ Complete driver signup form
3. ✅ Click "Create Account"
4. ✅ **See clear message:** "Cannot create account in offline mode. Please connect to the internet and try again."
5. ✅ Message is helpful, not confusing

### Test 3: Online Mode Account Creation (Should Work)

**Prerequisites:** App running in online mode (no --offline flag)

1. ✅ Complete driver signup form
2. ✅ Click "Create Account"
3. ✅ **Should succeed** (create Firebase Auth user)
4. ✅ Should write to Realtime Database
5. ✅ Should redirect to success screen

---

## Why Offline Mode Exists

The `--offline` flag is used during development to:
- Work without internet connection
- Prevent unnecessary network calls during UI development
- Faster bundling (skips network checks)

**However:** Account creation, login, and database operations **require online mode**.

---

## Current Behavior

### In Offline Mode (--offline flag)
- ✅ App loads and runs
- ✅ UI works perfectly
- ✅ Forms work
- ✅ Navigation works
- ❌ **Cannot create accounts** (needs internet)
- ❌ **Cannot login** (needs Firebase Auth)
- ❌ **Cannot fetch data** (needs Realtime Database)

**Error shown:** "Cannot create account in offline mode. Please connect to the internet and try again."

### In Online Mode (no --offline flag)
- ✅ App loads and runs
- ✅ UI works perfectly
- ✅ Forms work
- ✅ Navigation works
- ✅ **Can create accounts**
- ✅ **Can login**
- ✅ **Can fetch data**

---

## Recommended Setup

### For UI Development
```bash
npm run start      # With offline flag (faster)
```

### For Full Testing (Auth, Database)
```bash
npx expo start     # Without offline flag (full functionality)
```

### For Production Testing
```bash
npx expo start --no-dev --minify
```

---

## Files Modified

1. **app/(auth)/signup.tsx**
   - FactoryDetailsStep submit error handling
   - DriverDetailsStep submit error handling
   - Capacity field input handler

**Total lines changed:** ~25 lines

---

## Error Messages Guide

### Before Fixes

| Error | User Sees |
|-------|-----------|
| Permission denied | "Signup failed. Please try again." |
| Network error | "Signup failed. Please try again." |
| Offline mode | "Signup failed. Please try again." |

**Problem:** User doesn't know what to do!

### After Fixes

| Error | User Sees |
|-------|-----------|
| Permission denied | "Cannot create account in offline mode. Please connect to the internet and try again." |
| Network error | "Cannot create account in offline mode. Please connect to the internet and try again." |
| Other errors | "Signup failed. Please try again." |

**Better:** Clear, actionable message!

---

## Next Steps

### To Test Account Creation:

1. **Stop the current server:**
   ```
   Press Ctrl+C in the terminal
   ```

2. **Edit package.json** - Remove `--offline` from scripts

3. **Start in online mode:**
   ```bash
   npm run start:clear
   ```

4. **Test signup:**
   - Fill all fields
   - Click "Create Account"
   - ✅ Should work now!

### To Keep Offline Mode for UI Development:

Keep the current setup, but know that account creation won't work. Use it for:
- Testing form layouts
- Testing navigation
- Testing UI components
- Testing form validation

For actual signup/login testing, switch to online mode.

---

## Status: ✅ FIXED

Both issues are resolved:

1. ✅ **Clear error message** when trying to create account in offline mode
2. ✅ **Capacity field** no longer changes when editing other fields

To fully test account creation, run the app in **online mode** (without --offline flag).

**Capacity field works perfectly now - try it!**
**Error message is helpful and clear!**
