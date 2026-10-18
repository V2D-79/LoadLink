# Infinite Loop Fix - Location Select Screen

## Error

```
Warning: Maximum update depth exceeded. This can happen when a component calls 
setState inside useEffect, but useEffect either doesn't have a dependency array, 
or one of the dependencies changes on every render.
in LocationSelectScreen
```

## Root Cause

The infinite loop was caused by:

1. **`useEffect` with `params` object dependency**: The `params` object from `useLocalSearchParams()` is recreated on every render, causing the effect to run repeatedly.

2. **`location` in `useCallback` dependency**: The `handleWebViewMessage` callback had `location` in its dependencies, and when the callback changed, it triggered map updates which set location, creating a loop:
   ```
   location changes → callback recreated → mapReady sends location → 
   setLocation called → location changes → loop continues
   ```

## Solutions Applied

### 1. Fixed `useEffect` Dependencies

**Before** (causes infinite loop):
```typescript
useEffect(() => {
  if (params.lat && params.lng) {
    setLocation({...});
  }
}, [params]); // ❌ params object changes every render
```

**After** (fixed):
```typescript
useEffect(() => {
  if (params.lat && params.lng) {
    const initialLocation = {
      latitude: parseFloat(params.lat as string),
      longitude: parseFloat(params.lng as string),
      address: params.address as string,
    };
    setLocation(initialLocation);
  }
}, [params.lat, params.lng, params.address]); // ✅ Only specific params
```

### 2. Added Ref to Track Initial Location Send

**Problem**: Every time `location` changed, `handleWebViewMessage` was recreated, causing `mapReady` to send location again, triggering another update.

**Solution**: Use a ref to track if we've already sent the initial location:

```typescript
const initialLocationSentRef = useRef(false);

const handleWebViewMessage = useCallback(async (event: any) => {
  switch (msg.type) {
    case 'mapReady':
      setMapReady(true);
      // Only send initial location once
      if (!initialLocationSentRef.current && location) {
        initialLocationSentRef.current = true;
        setTimeout(() => sendToMap('setLocation', location), 300);
      }
      break;
    // ... other cases
  }
}, [sendToMap, location]);
```

## Changes Made

### File: `app/(factory)/location-select.tsx`

1. **Added ref**:
   ```typescript
   const initialLocationSentRef = useRef(false);
   ```

2. **Fixed useEffect dependencies**:
   ```typescript
   // Changed from [params] to specific params
   }, [params.lat, params.lng, params.address]);
   ```

3. **Protected mapReady location send**:
   ```typescript
   if (!initialLocationSentRef.current && location) {
     initialLocationSentRef.current = true;
     setTimeout(() => sendToMap('setLocation', location), 300);
   }
   ```

## Why This Works

### Dependency Arrays
- **Before**: `[params]` - object reference changes every render
- **After**: `[params.lat, params.lng, params.address]` - primitive values only change when actually different

### Ref Guard
- **Ref values don't cause re-renders** when changed
- `initialLocationSentRef` prevents sending location to map multiple times
- Only sends once when map first becomes ready

## Testing

### Verify Fix:
1. ✅ Open app
2. ✅ Navigate to Post Job (Factory)
3. ✅ Click "📍 Or Select on Map"
4. ✅ **Expected**: Map loads without console errors
5. ✅ **Expected**: No "Maximum update depth" warning
6. ✅ Search for location - should work
7. ✅ Use GPS - should work
8. ✅ Tap on map - should work
9. ✅ Confirm location - should navigate back correctly

### Console Check:
- ✅ No infinite loop errors
- ✅ No "Maximum update depth exceeded" warnings
- ✅ Location logs appear only when expected

## Impact

✅ **Fixed**: Infinite loop eliminated  
✅ **Performance**: No more excessive re-renders  
✅ **Functionality**: All location selection methods work  
✅ **User Experience**: No lag or freezing  

## Related Issues

This same pattern could occur in:
- `app/(driver)/map-select.tsx` (similar structure)
- Any component using `useLocalSearchParams()` with object dependency

## Prevention

### Best Practices:

1. **Don't use object dependencies in useEffect**:
   ```typescript
   // ❌ BAD
   useEffect(() => {...}, [params])
   
   // ✅ GOOD
   useEffect(() => {...}, [params.id, params.name])
   ```

2. **Use refs for one-time flags**:
   ```typescript
   const hasRunRef = useRef(false);
   useEffect(() => {
     if (!hasRunRef.current) {
       hasRunRef.current = true;
       // run once
     }
   }, [dependencies]);
   ```

3. **Minimize useCallback dependencies**:
   ```typescript
   // ❌ BAD - includes changing state
   useCallback(() => {...}, [state, otherState])
   
   // ✅ GOOD - use ref or remove if not needed
   useCallback(() => {...}, [])
   ```

## Files Modified

- `app/(factory)/location-select.tsx`

## Summary

The infinite loop was caused by:
1. Object dependency in useEffect (params)
2. Circular dependency between location state and callback

Fixed by:
1. Using specific primitive dependencies
2. Adding ref guard to prevent repeated map updates

**Status**: ✅ Fixed and tested
