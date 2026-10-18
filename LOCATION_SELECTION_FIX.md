# Location Selection Flow Fix

## Issue
After selecting a location on the map in the factory job posting flow and clicking confirm, the selected location was not properly appearing in the pickup/delivery form fields.

## Root Causes

### 1. Missing Dependency in useEffect
The `useEffect` hook that sets up `global.onLocationSelected` was missing `setValue` in its dependency array, which could cause stale closure issues.

### 2. Poor Address Parsing
The address parsing logic was too simplistic - just taking the first part before comma, which didn't extract city and state properly.

### 3. Lack of Validation Flags
`setValue` calls weren't using proper validation flags, which could prevent form validation from running correctly.

### 4. Missing Reverse Geocoding
When tapping on the map, there was no reverse geocoding to get a human-readable address.

### 5. Insufficient Logging
No console logs made it difficult to debug the callback flow.

## Fixes Applied

### 1. Fixed useEffect Dependencies (`post.tsx`)
```typescript
useEffect(() => {
  global.onLocationSelected = (data) => {
    // ... callback logic
  };
  return () => {
    global.onLocationSelected = undefined;
  };
}, [setValue]); // ✅ Added setValue dependency
```

### 2. Improved Address Parsing (`post.tsx`)
```typescript
// Parse city and state properly from full address
const addressParts = data.location.address?.split(',').map(s => s.trim()) || [];
const cityName = addressParts[0] || 'Selected Location';
const stateName = addressParts[addressParts.length - 2] || 'India';

setValue('pickupCity', cityName, { shouldValidate: true });
setValue('pickupState', stateName, { shouldValidate: true });
setValue('pickupAddress', data.location.address || '', { shouldValidate: false });
```

### 3. Added Reverse Geocoding (`location-select.tsx`)
When a user taps on the map, the app now:
1. Captures the lat/lng coordinates
2. Calls Nominatim reverse geocoding API
3. Gets a human-readable address
4. Updates the location with the address

```typescript
case 'locationSet':
  const point = msg.point;
  if (point && point.latitude && point.longitude && !point.address) {
    const url = `https://nominatim.openstreetmap.org/reverse?...`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.display_name) {
      point.address = data.display_name;
    }
  }
  setLocation(point);
  break;
```

### 4. Added Comprehensive Logging
Added console.log statements at key points:
- When location is selected in the map screen
- When confirm button is pressed
- When callback is invoked
- When form fields are updated

This helps debug the flow:
```
[LocationSelect] Location set: {...}
[LocationSelect] Confirming location: {...}
[LocationSelect] Calling global.onLocationSelected
[PostJob] Location selected: {...}
[PostJob] Setting pickup: {...}
```

## How It Works Now

### User Flow
1. User is on **Post Job** screen (step 0 or 1)
2. User clicks **"📍 Or Select on Map"** button
3. App navigates to **location-select** screen with params:
   - `title`: "Select Pickup Location" or "Select Delivery Location"
   - `type`: "pickup" or "delivery"
   - `lat`, `lng`, `address`: existing values (if any)

4. User interacts with map:
   - **Search**: Enter city name → get coordinates → show on map
   - **GPS**: Click "Use GPS" → get current location → show on map
   - **Tap**: Tap anywhere on map → reverse geocode → show address

5. User sees selected location displayed at bottom with address

6. User clicks **"✓ Confirm Location"** button

7. App:
   - Navigates back to Post Job screen
   - After 100ms, calls `global.onLocationSelected` with location data
   
8. Post Job screen receives callback:
   - Updates coordinates state (`pickupCoords` or `deliveryCoords`)
   - Parses address to extract city and state
   - Updates form fields with `setValue`:
     - City field → first part of address
     - State field → second-to-last part of address
     - Address field → full address
   - Form validates fields automatically

9. User sees form fields populated with selected location

## Testing Checklist

- [ ] Select pickup location via map search
- [ ] Select pickup location via GPS
- [ ] Select pickup location by tapping map
- [ ] Confirm and verify pickup fields populate correctly
- [ ] Select delivery location via map search
- [ ] Select delivery location via GPS
- [ ] Select delivery location by tapping map
- [ ] Confirm and verify delivery fields populate correctly
- [ ] Check console logs show proper flow
- [ ] Verify address is human-readable (not just coordinates)
- [ ] Verify city and state are extracted correctly
- [ ] Complete job posting with map-selected locations
- [ ] Verify published job has correct coordinates

## Technical Details

### Global Callback Pattern
The app uses a global callback pattern to pass data between screens:

1. **Source screen** (post.tsx) sets up callback in `useEffect`
2. **Target screen** (location-select.tsx) calls callback on confirm
3. Global variable ensures callback is accessible across navigation

This pattern is used because:
- Expo Router doesn't support returning data from pushed screens
- Navigation params are one-way (forward only)
- Callbacks work across different navigation stacks

### Coordinate Handling
- **Approximate coords** (0.05° precision) stored in public job data for privacy
- **Exact coords** stored in private job data for assigned driver
- **Map display** uses exact coords for precise selection

### Address Format
Nominatim returns addresses in format:
```
"Place, Neighborhood, City, District, State, Postal Code, Country"
```

Parsing extracts:
- **City**: First part (index 0)
- **State**: Second-to-last part (length - 2)
- **Full address**: Complete string stored for reference

## Files Modified

1. `app/(factory)/post.tsx`
   - Fixed useEffect dependency array
   - Improved address parsing logic
   - Added validation flags to setValue
   - Added comprehensive logging

2. `app/(factory)/location-select.tsx`
   - Added reverse geocoding for map taps
   - Added logging to confirm handler
   - Improved error handling
   - Added address display in location info

## Related Files

- `src/types/global.d.ts` - Global callback type definitions
- `app/(driver)/map-select.tsx` - Similar pattern for driver route selection
- `app/(factory)/_layout.tsx` - Contains location-select as hidden screen

## Notes

- App must run in **online mode** (`npm start`) for map tiles and geocoding to work
- Nominatim API requires **User-Agent** header: `'LoadLink-App'`
- Timeout of 100ms ensures navigation completes before callback fires
- Reverse geocoding may fail if internet is slow - falls back to coordinates
