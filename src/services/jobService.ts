/**
 * src/services/jobService.ts
 *
 * Job management services for factory users:
 * - Delete jobs
 * - Update job details
 */

import { ref, remove, update, get } from 'firebase/database';
import { getFirebaseDB } from './firebase';
import { DB_PATHS } from '../constants/app';

/**
 * Delete a job and all associated data
 * Only factory owner can delete their own jobs
 */
export async function deleteJob(jobId: string, factoryUid: string): Promise<void> {
  const db = getFirebaseDB();
  
  console.log('[deleteJob] Starting deletion for jobId:', jobId);
  
  // Verify ownership
  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }
  
  const jobData = jobSnap.val();
  console.log('[deleteJob] Job data:', { status: jobData.status, factoryUid: jobData.factoryUid });
  
  if (jobData.factoryUid !== factoryUid) {
    throw new Error('Unauthorized: You can only delete your own jobs');
  }
  
  // Check if job has active trips
  if (['accepted', 'heading_to_pickup', 'loaded', 'in_transit'].includes(jobData.status)) {
    throw new Error('Cannot delete job with active trip. Contact the driver to cancel.');
  }
  
  // Delete main job and jobPrivate using remove() which respects Firebase rules better
  console.log('[deleteJob] Removing main job data');
  await remove(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  
  console.log('[deleteJob] Removing private job data');
  try {
    await remove(ref(db, `${DB_PATHS.jobPrivate}/${jobId}`));
  } catch (err) {
    console.warn('[deleteJob] Error removing jobPrivate (may not exist):', err);
  }
  
  // Remove from cell index
  console.log('[deleteJob] Removing from cell index');
  try {
    const cellIndexRef = ref(db, 'cellIndexJobs');
    const cellsSnap = await get(cellIndexRef);
    
    if (cellsSnap.exists()) {
      const cells = cellsSnap.val();
      const deletePromises: Promise<void>[] = [];
      
      Object.keys(cells).forEach(cellKey => {
        if (cells[cellKey]?.[jobId]) {
          console.log('[deleteJob] Removing from cell:', cellKey);
          deletePromises.push(remove(ref(db, `cellIndexJobs/${cellKey}/${jobId}`)));
        }
      });
      
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.warn('[deleteJob] Error removing from cell index:', err);
  }
  
  // Delete all bids for this job - using the nested structure bids/{jobId}/{bidId}
  console.log('[deleteJob] Removing bids');
  try {
    const bidsRef = ref(db, `bids/${jobId}`);
    const bidsSnap = await get(bidsRef);
    
    if (bidsSnap.exists()) {
      console.log('[deleteJob] Found bids, removing entire bids node for job');
      await remove(bidsRef);
    }
  } catch (err) {
    console.warn('[deleteJob] Error removing bids:', err);
  }
  
  console.log('[deleteJob] Job deleted successfully');
}

/**
 * Update job details
 * Only allowed for jobs in 'open' status
 */
export async function updateJob(
  jobId: string,
  factoryUid: string,
  updates: {
    goodsDescription?: string;
    weightTonnes?: number;
    budgetInr?: number;
    availableFrom?: number;
    availableUntil?: number;
    specialInstructions?: string;
    requiredVehicleType?: string;
    requiredBodyType?: string;
  }
): Promise<void> {
  const db = getFirebaseDB();
  
  // Verify ownership and status
  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }
  
  const jobData = jobSnap.val();
  if (jobData.factoryUid !== factoryUid) {
    throw new Error('Unauthorized: You can only edit your own jobs');
  }
  
  if (jobData.status !== 'open') {
    throw new Error('Can only edit jobs in "open" status');
  }
  
  // Update job
  const jobUpdates: any = {
    ...updates,
    updatedAt: Date.now(),
  };
  
  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), jobUpdates);
}

/**
 * Cancel a job (soft delete - sets status to cancelled)
 */
export async function cancelJob(jobId: string, factoryUid: string, reason?: string): Promise<void> {
  const db = getFirebaseDB();
  
  // Verify ownership
  const jobSnap = await get(ref(db, `${DB_PATHS.jobs}/${jobId}`));
  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }
  
  const jobData = jobSnap.val();
  if (jobData.factoryUid !== factoryUid) {
    throw new Error('Unauthorized: You can only cancel your own jobs');
  }
  
  // Check if job has active trips
  if (['accepted', 'heading_to_pickup', 'loaded', 'in_transit'].includes(jobData.status)) {
    throw new Error('Cannot cancel job with active trip. Contact the driver to cancel.');
  }
  
  // Update status to cancelled
  await update(ref(db, `${DB_PATHS.jobs}/${jobId}`), {
    status: 'cancelled',
    cancelledAt: Date.now(),
    cancellationReason: reason || null,
    updatedAt: Date.now(),
  });
}

