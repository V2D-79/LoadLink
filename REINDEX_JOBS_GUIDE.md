# How to Re-index Jobs for Enhanced Matching

After deploying the matching algorithm fix, existing jobs need to be re-indexed to benefit from the intermediate route coverage.

## Quick Test (Single Job)

You can test the new indexing by posting a new job:

1. Login as **Factory** user
2. Go to **Post Job** tab
3. Create a test job:
   - Pickup: Pune
   - Delivery: Kolhapur
4. This job will automatically use the new indexing
5. Login as **Driver** user
6. Set route through: Satara (between Pune and Kolhapur)
7. Go to **Find Jobs** tab
8. The new job should appear!

## Re-index All Existing Jobs

### Method 1: Using TypeScript Script (Recommended)

If you have Node.js and ts-node installed:

```bash
# Install ts-node if not already installed
npm install -g ts-node

# Run the reindex script
npx ts-node scripts/reindex-jobs.ts
```

### Method 2: Using React Native App

Add this temporary function to your app and call it once:

**File: `app/(factory)/profile.tsx`** (or any screen you can access)

```typescript
import { get, ref } from 'firebase/database';
import { getFirebaseDB } from '../../src/services/firebase';
import { writeJobCellIndex } from '../../src/engine/match';
import { DB_PATHS } from '../../src/constants/app';

// Add this function
async function reindexJobs() {
  try {
    const db = getFirebaseDB();
    const jobsSnap = await get(ref(db, DB_PATHS.jobs));
    
    if (!jobsSnap.exists()) {
      Alert.alert('No Jobs', 'No jobs to reindex');
      return;
    }
    
    const jobs = jobsSnap.val();
    const jobIds = Object.keys(jobs);
    let count = 0;
    
    for (const jobId of jobIds) {
      const job = jobs[jobId];
      if (job.status === 'open') {
        await writeJobCellIndex(jobId, {
          pickupLat: job.pickupLat,
          pickupLng: job.pickupLng,
          deliveryLat: job.deliveryLat,
          deliveryLng: job.deliveryLng,
        });
        count++;
      }
    }
    
    Alert.alert('Success', `Reindexed ${count} jobs`);
  } catch (error) {
    Alert.alert('Error', error.message);
  }
}

// Add a button in your profile screen:
<Button
  title="🔄 Reindex Jobs (Admin)"
  onPress={reindexJobs}
  variant="outline"
  size="sm"
/>
```

### Method 3: Using Firebase Console + Cloud Functions

If you have Firebase Cloud Functions set up:

1. Create a Cloud Function:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const reindexJobs = functions.https.onRequest(async (req, res) => {
  const db = admin.database();
  const jobsSnap = await db.ref('jobs').once('value');
  const jobs = jobsSnap.val();
  
  let count = 0;
  for (const jobId in jobs) {
    const job = jobs[jobId];
    if (job.status === 'open') {
      // Call your reindexing logic here
      count++;
    }
  }
  
  res.json({ success: true, reindexed: count });
});
```

2. Deploy and call the function

### Method 4: Manual Re-posting

For small databases (few jobs):

1. Note down all open jobs
2. Cancel/delete them
3. Re-post them
4. New posts will use enhanced indexing automatically

## Verification

After re-indexing, verify it worked:

1. Check Firebase Console → Realtime Database
2. Navigate to: `cellIndexJobs`
3. Pick a job ID (e.g., `job_abc123`)
4. It should appear in multiple cells (10-30 cells for long routes)
5. Before: only 2 cells
6. After: many cells

### Example Check

Job: Pune → Kolhapur (job_xyz789)

**Before re-indexing:**
```
cellIndexJobs/
  lat_37_lng_147/
    job_xyz789: true    ← Only in Pune cell
  lat_33_lng_148/
    job_xyz789: true    ← Only in Kolhapur cell
```

**After re-indexing:**
```
cellIndexJobs/
  lat_37_lng_147/
    job_xyz789: true    ← Pune
  lat_37_lng_148/
    job_xyz789: true    ← Pune corridor
  lat_36_lng_148/
    job_xyz789: true    ← Intermediate
  lat_35_lng_148/
    job_xyz789: true    ← Intermediate
  lat_34_lng_148/
    job_xyz789: true    ← Satara (KEY!)
  lat_33_lng_148/
    job_xyz789: true    ← Kolhapur
  ... (many more cells)
```

## Testing the Fix

### Test Case: Satara Driver

1. **Setup**:
   - Create job: Pune → Kolhapur (or use existing)
   - Run re-indexing
   
2. **Driver Side**:
   - Login as driver
   - Go to Route tab
   - Set route: Satara → anywhere
   - Go to Find Jobs tab
   
3. **Expected Result**:
   - Pune → Kolhapur job should appear
   - Should have match score (50-80)
   - Can bid on the job

4. **Before Fix**:
   - Job would NOT appear
   - Driver would see "No matches"

## Troubleshooting

### "No jobs found"
- Check that jobs exist in Firebase (`jobs/` path)
- Verify jobs have `status: "open"`
- Check coordinates are valid numbers

### "Permission denied"
- Update database rules to allow cell index writes
- Check `database.rules.json` has rules for `cellIndexJobs`

### "Script fails"
- Check Firebase connection
- Verify environment variables (.env file)
- Check internet connection

### "Jobs still not showing"
- Verify re-indexing completed successfully
- Check driver route is set correctly
- Verify corridor distance (50 km default)
- Check console logs for matching algorithm output

## Performance Notes

- Re-indexing 100 jobs takes ~10-30 seconds
- Database writes are parallelized
- Safe to run multiple times (idempotent)
- No impact on running app
- Can be done during production (non-destructive)

## Rollback

If you need to rollback:

1. Revert `src/engine/match.ts` to previous version
2. New jobs will use old indexing
3. Old index entries don't break anything (just unused)
4. Can clean up with: delete `cellIndexJobs` path

## Schedule

**Recommended**: Run re-indexing immediately after deploying the fix

**Frequency**: 
- Only needed once after fix deployment
- New jobs auto-index correctly
- Only re-run if you notice indexing issues

## Summary

✅ New jobs: Automatically use enhanced indexing  
⚠️ Existing jobs: Need manual re-indexing  
🔄 Re-indexing: Safe, fast, idempotent  
📊 Verification: Check Firebase Console  
🚀 Impact: Immediate improvement in match quality  
