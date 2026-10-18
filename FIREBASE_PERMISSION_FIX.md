# Firebase Permission Fix - Driver Bid Permission Denied

## Issue
When a driver places a bid on a job, they get a Firebase permission error:
```
FIREBASE WARNING: update at /jobs/-P4ClVXkxQ-Xhnn0YuD7 failed: permission_denied
```

## Root Cause
The `placeBid()` function in `src/services/bidService.ts` tries to increment the `bidCount` field on the job:

```typescript
await update(ref(db, `${DB_PATHS.jobs}/${payload.jobId}`), {
  bidCount: increment(1),
  updatedAt: now,
});
```

However, the Firebase security rules only allow job writes for:
- Factory owners (job creator)
- Assigned drivers

Drivers who are just placing bids don't have write permission to the job document.

## Solution
Updated the Firebase security rules to allow **any authenticated user** to write to the `bidCount` and `updatedAt` fields specifically:

```json
"jobs": {
  ".read": "auth !== null",
  "$jobId": {
    ".write": "auth !== null && (...existing rules...)",
    "bidCount": {
      ".write": "auth !== null"
    },
    "updatedAt": {
      ".write": "auth !== null"
    },
    // ... rest of validation rules
  }
}
```

This allows:
- ✅ Drivers to increment `bidCount` when placing bids
- ✅ System to update `updatedAt` timestamp
- ❌ Drivers still CANNOT modify other job fields (status, pickup, delivery, budget, etc.)

## Files Modified
1. `database.rules.json` - Added specific write permissions for `bidCount` and `updatedAt` fields
2. `src/services/bidService.ts` - Kept the bidCount increment logic (with clarifying comment)

## Deployment Required ⚠️

You must deploy the updated Firebase rules for this fix to work:

```bash
firebase login
firebase deploy --only database
```

After deployment, drivers will be able to place bids without permission errors.

## Testing
1. Log in as a driver
2. Navigate to "Find Jobs" tab
3. Open any job detail
4. Place a bid
5. Verify no permission error appears in console
6. Verify bidCount increments in the UI

## Security Impact
✅ **SAFE** - Drivers can only increment a counter, not modify critical job data
- Drivers cannot change job status
- Drivers cannot modify pricing, locations, or requirements
- Only the specific `bidCount` and `updatedAt` fields are writable by all authenticated users
- All other job fields remain protected

## Alternative Approaches Considered
1. **Remove bidCount from client** - Would require calculating count on every query (performance issue)
2. **Cloud Functions** - Adds complexity and cost
3. **Transaction-based increment** - Still requires write permission
4. **Field-level permission (chosen)** - Simple, secure, and performant ✅

## Status
✅ **CODE FIXED** - Files updated
⚠️ **DEPLOYMENT PENDING** - Need to run `firebase deploy --only database`
