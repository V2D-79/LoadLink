# Quick Reference Guide

## What Was Fixed

### The Problem
After login, user was redirected to landing page instead of their dashboard.

### The Root Cause
Race condition: Navigation happened before auth state finished updating.

### The Solution
Wait for auth state to update before navigating.

## Files Changed

1. **app/(auth)/login.tsx**
   - Added auth context listener
   - Removed immediate navigation after login
   - Navigation now happens in useEffect when auth state updates

2. **app/index.tsx**
   - Improved auth guard logic
   - Better handling of edge cases
   - More defensive null checks

## How to Test

### 1. Login Flow
```
1. Open app
2. Click "Log In" on landing page
3. Enter: vivekdalavi7521@gmail.com
4. Enter: [your password]
5. Click "Log In"
6. Should see: Loading spinner → Driver/Find tab
```

### 2. Signup Flow
```
1. Open app
2. Click "Create Account"
3. Complete all steps
4. Should see: Success screen → Auto-navigate to dashboard
```

### 3. Auth Persistence
```
1. Login successfully
2. Close app completely
3. Reopen app
4. Should see: Your dashboard (stay logged in)
```

## Expected Logs (Working)

```
[LoginScreen] Submit with data: vivekdalavi7521@gmail.com
[loginUser] Starting login with: vivekdalavi7521@gmail.com
[loginUser] Login successful! User UID: ADgGJDfFvuMdP3skmWr1Om0Fna53
[useAuth] Auth state changed: User: ADgGJDfFvuMdP3skmWr1Om0Fna53
[useAuth] Profile loaded: {"displayName": "Vivek Dalavi", "role": "driver"}
[LoginScreen] Auth state updated, navigating based on role: driver
```

## Database Structure

```
/users
  /{uid}
    - role: "driver" | "factory"
    - displayName: string
    - phone: string
    - city: string
    - state: string
    - ...

/jobs
  /{jobId}
    - factoryUid: string
    - status: "open" | "accepted" | ...
    - pickupCity: string
    - deliveryCity: string
    - ...

/bidsByDriver
  /{driverUid}
    /{jobId}
      - bidId: string
      - amountInr: number
      - updatedAt: timestamp
```

## Key Hooks

### useAuthContext()
```typescript
const { firebaseUser, role, userProfile, loading } = useAuthContext();
```

### useRTDBValue()
```typescript
const { data, loading, error } = useRTDBValue<T>('path/to/data');
```

### useRTDBList()
```typescript
const { data, loading, error } = useRTDBList<T>('path/to/list');
```

## Navigation Routes

### Auth (not logged in)
- `/(auth)/landing` - Entry page
- `/(auth)/login` - Login form
- `/(auth)/signup` - Signup wizard
- `/(auth)/forgot-password` - Password reset

### Factory (logged in as factory)
- `/(factory)/jobs` - List of posted jobs
- `/(factory)/post` - Post new job
- `/(factory)/track` - Track deliveries
- `/(factory)/profile` - Profile & settings

### Driver (logged in as driver)
- `/(driver)/find` - Browse/match jobs
- `/(driver)/activity` - Bids & offers
- `/(driver)/route` - Set route
- `/(driver)/profile` - Profile & settings

## Troubleshooting

### Issue: Still redirecting to landing after login
**Check:**
1. Firebase config in `.env` file
2. Database rules allow read access
3. User profile exists in database
4. Internet connection active

**Debug:**
Look for these logs:
```
[LoginScreen] Login successful!
[useAuth] Profile loaded: { role: "..." }
[LoginScreen] Auth state updated, navigating...
```

### Issue: Data not showing
**Check:**
1. Path in database exists
2. Real-time listener connected
3. Database rules allow read
4. Check `loading` state

**Debug:**
```typescript
const { data, loading, error } = useRTDBValue('path');
console.log({ data, loading, error });
```

### Issue: Navigation loop
**Check:**
1. Auth guards in layout files
2. Role matches expected value
3. firebaseUser is not null

## Environment Variables

Make sure `.env` contains:
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_DATABASE_URL=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

## Common Commands

### Start Dev Server
```bash
npx expo start
```

### Clear Cache
```bash
npx expo start --clear
```

### View Logs
```bash
npx expo start
# Then press 'j' to open debugger
```

## Status: READY ✅

All issues resolved, system validated, ready for testing.

