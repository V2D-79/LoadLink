# Firebase Persistence Test Guide

## Manual Testing Steps

### 1. Test Auth Initialization
1. Start the app: `npm run start`
2. Check the console/terminal for these messages:
   - ✅ Should see: `[Firebase] Auth initialized with AsyncStorage persistence`
   - ❌ Should NOT see: "Expected a class definition" error
   - ❌ Should NOT see: "AsyncStorage not provided" warning
   - ❌ Should NOT see: Require cycle warnings

### 2. Test Login Persistence
1. Open the app in Expo Go
2. Log in with valid credentials
3. Close the app completely (swipe away from recent apps)
4. Reopen the app
5. ✅ You should still be logged in (no login screen shown)

### 3. Test AsyncStorage Read/Write
1. Log in to the app
2. Open React Native Debugger or Flipper
3. Check AsyncStorage entries
4. You should see Firebase auth entries like:
   - `firebase:authUser:[PROJECT_ID]:[API_KEY]`
   - These entries contain the auth token

### 4. Test Hot Reload
1. With the app running and logged in
2. Make a small change to any screen (add a comment)
3. Save the file (triggers hot reload)
4. Check console:
   - ✅ Should see: `[Firebase] Using existing Auth instance`
   - ❌ Should NOT see duplicate initialization errors

### 5. Test Logout
1. Log in to the app
2. Navigate to Profile screen
3. Tap "Sign Out"
4. ✅ Auth state should clear
5. ✅ Should be redirected to login screen
6. Close and reopen app
7. ✅ Should still show login screen (not auto-logged in)

---

## Automated Verification (Optional)

If you want to verify the persistence programmatically, add this test code temporarily:

```typescript
// Add to src/services/firebase.ts for testing
export async function testPersistence() {
  try {
    const testKey = 'test_firebase_persistence';
    const testValue = 'test_value_' + Date.now();
    
    // Test write
    await asyncStoragePersistence._set(testKey, testValue);
    console.log('[Persistence Test] Write successful');
    
    // Test read
    const readValue = await asyncStoragePersistence._get(testKey);
    console.log('[Persistence Test] Read value:', readValue);
    
    if (readValue === testValue) {
      console.log('✅ Persistence test PASSED');
    } else {
      console.log('❌ Persistence test FAILED - values do not match');
    }
    
    // Test remove
    await asyncStoragePersistence._remove(testKey);
    const afterRemove = await asyncStoragePersistence._get(testKey);
    
    if (afterRemove === null) {
      console.log('✅ Remove test PASSED');
    } else {
      console.log('❌ Remove test FAILED - value still exists');
    }
    
    // Test availability
    const isAvailable = await asyncStoragePersistence._isAvailable?.();
    console.log('[Persistence Test] Available:', isAvailable);
    
  } catch (error) {
    console.error('❌ Persistence test ERROR:', error);
  }
}
```

Then call it in `app/_layout.tsx` after fonts load:

```typescript
// In RootLayout component
useEffect(() => {
  if (__DEV__) {
    import('../src/services/firebase').then(({ testPersistence }) => {
      testPersistence();
    });
  }
}, []);
```

**Remember to remove this test code before committing!**

---

## Expected Console Output (Success)

```
[Firebase] Auth initialized with AsyncStorage persistence
✅ Persistence test PASSED
✅ Remove test PASSED
[Persistence Test] Available: true
```

## Common Issues and Solutions

### Issue: Still seeing "AsyncStorage not provided" warning
**Solution:** Clear Metro bundler cache and restart:
```bash
npm run start:clear
```

### Issue: "Expected a class definition" error persists
**Solution:** 
1. Delete `node_modules/.cache`
2. Restart Metro bundler
3. Clear Expo Go cache (shake device → "Reload")

### Issue: Auth state not persisting
**Solution:**
1. Check AsyncStorage permissions (should be automatic in Expo)
2. Verify `@react-native-async-storage/async-storage` is version `1.23.1`
3. Check if persistence is being set in `getFirebaseAuth()`

### Issue: Hot reload causes multiple initializations
**Solution:** This is normal! The singleton pattern handles this. You should see:
```
[Firebase] Using existing Auth instance
```

---

## Verification Complete ✅

If all tests pass:
- Auth state persists across app restarts
- No console errors or warnings
- Login/logout works correctly
- Hot reload doesn't break auth state

Then the Firebase Auth persistence is working correctly!
