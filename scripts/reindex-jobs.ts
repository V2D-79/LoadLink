/**
 * scripts/reindex-jobs.ts
 * 
 * Re-index all existing jobs with the enhanced cell indexing algorithm.
 * This adds intermediate cells along job routes so drivers on those routes can find them.
 * 
 * Run this after deploying the matching algorithm fix.
 * 
 * Usage:
 *   npx ts-node scripts/reindex-jobs.ts
 * 
 * Or add to package.json:
 *   "scripts": {
 *     "reindex-jobs": "ts-node scripts/reindex-jobs.ts"
 *   }
 *   npm run reindex-jobs
 */

import { get, ref } from 'firebase/database';
import { getFirebaseDB } from '../src/services/firebase';
import { writeJobCellIndex } from '../src/engine/match';
import { DB_PATHS } from '../src/constants/app';

interface JobData {
  jobId: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  status: string;
  pickupCity?: string;
  deliveryCity?: string;
}

async function reindexAllJobs() {
  console.log('🔄 Starting job re-indexing...\n');
  
  try {
    const db = getFirebaseDB();
    const jobsSnap = await get(ref(db, DB_PATHS.jobs));
    
    if (!jobsSnap.exists()) {
      console.log('ℹ️  No jobs found in database');
      return;
    }
    
    const jobs = jobsSnap.val() as Record<string, JobData>;
    const jobIds = Object.keys(jobs);
    
    console.log(`📦 Found ${jobIds.length} total jobs`);
    
    let reindexed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const jobId of jobIds) {
      const job = jobs[jobId];
      
      // Only reindex open jobs
      if (job.status !== 'open') {
        console.log(`⏭️  Skipping job ${jobId} (status: ${job.status})`);
        skipped++;
        continue;
      }
      
      // Validate coordinates
      if (!job.pickupLat || !job.pickupLng || !job.deliveryLat || !job.deliveryLng) {
        console.log(`⚠️  Skipping job ${jobId} (missing coordinates)`);
        skipped++;
        continue;
      }
      
      try {
        await writeJobCellIndex(jobId, {
          pickupLat: job.pickupLat,
          pickupLng: job.pickupLng,
          deliveryLat: job.deliveryLat,
          deliveryLng: job.deliveryLng,
        });
        
        const route = job.pickupCity && job.deliveryCity 
          ? `${job.pickupCity} → ${job.deliveryCity}`
          : `${job.pickupLat.toFixed(2)}, ${job.pickupLng.toFixed(2)} → ${job.deliveryLat.toFixed(2)}, ${job.deliveryLng.toFixed(2)}`;
        
        console.log(`✅ Reindexed job ${jobId}: ${route}`);
        reindexed++;
      } catch (error) {
        console.error(`❌ Failed to reindex job ${jobId}:`, error);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Reindexing Summary');
    console.log('='.repeat(50));
    console.log(`✅ Successfully reindexed: ${reindexed} jobs`);
    console.log(`⏭️  Skipped: ${skipped} jobs`);
    console.log(`❌ Errors: ${errors} jobs`);
    console.log(`📦 Total: ${jobIds.length} jobs`);
    console.log('='.repeat(50));
    
    if (reindexed > 0) {
      console.log('\n✨ Reindexing complete! Jobs are now discoverable along their routes.');
    }
    
    if (errors > 0) {
      console.log('\n⚠️  Some jobs failed to reindex. Check error messages above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during reindexing:', error);
    process.exit(1);
  }
}

// Run the script
console.log('🚀 Job Cell Index Re-indexer');
console.log('This will update all open jobs to use the enhanced indexing algorithm.\n');

reindexAllJobs()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
