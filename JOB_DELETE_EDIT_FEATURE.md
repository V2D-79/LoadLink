# Job Delete & Edit Feature

## Overview
Factory users can now delete and edit their posted jobs directly from the "My Jobs" screen.

## Features Added

### 1. Delete Job Button 🗑️
- **Location**: Bottom right corner of each job card in "My Jobs" tab
- **Visibility**: Only shown for jobs in "open" status
- **Icon**: Red trash can emoji (🗑️)
- **Functionality**:
  - Confirmation dialog before deletion
  - Deletes job from Firebase Realtime Database
  - Removes from cell index for matching
  - Deletes all associated bids
  - Cannot delete jobs with active trips

### 2. Edit Job Button ✏️
- **Location**: Bottom right corner of each job card (next to delete button)
- **Visibility**: Only shown for jobs in "open" status
- **Icon**: Pencil emoji (✏️)
- **Functionality**: Currently shows "Coming Soon" alert (placeholder for future implementation)

## Implementation Details

### Files Created/Modified

#### 1. New Service: `src/services/jobService.ts`
Created a new service with the following functions:

**`deleteJob(jobId, factoryUid)`**
- Verifies job ownership
- Prevents deletion of jobs with active trips
- Removes job from all database locations:
  - `/jobs/{jobId}`
  - `/jobPrivate/{jobId}`
  - `/cellIndexJobs/{cellKey}/{jobId}`
  - All associated bids in `/bids`

**`updateJob(jobId, factoryUid, updates)`**
- For future edit functionality
- Only allows editing jobs in "open" status
- Verifies ownership before updating

**`cancelJob(jobId, factoryUid, reason)`**
- Soft delete option
- Sets status to "cancelled" instead of removing from database
- Stores cancellation reason

#### 2. Updated Screen: `app/(factory)/jobs.tsx`
- Added `Alert` import for confirmation dialogs
- Added `deleteJob` import from jobService
- Modified `JobCard` component to include action buttons
- Added `handleDeleteJob` function with confirmation dialog
- Added new styles for action buttons

### Security Features

1. **Ownership Verification**: Only the factory that posted the job can delete it
2. **Status Check**: Cannot delete jobs with active trips (accepted, in_transit, etc.)
3. **Confirmation Dialog**: User must confirm before deletion
4. **Error Handling**: Proper error messages for all failure cases

### UI/UX Design

#### Action Buttons Container
- Position: Bottom right corner of job card
- Separator: Thin border line above buttons
- Gap: Small spacing between edit and delete buttons

#### Individual Buttons
- Size: 36x36 pixels (touch-friendly)
- Shape: Rounded corners (border radius)
- Edit Button: Light gray background
- Delete Button: Light red background
- Icons: 18px emoji for clear visual indication

#### Button States
- Only visible for jobs in "open" status
- Hidden for jobs that are accepted, in transit, or completed
- Disabled state during deletion process

### Error Handling

The delete function handles these error cases:

1. **Job not found**: "Job not found"
2. **Unauthorized**: "Unauthorized: You can only delete your own jobs"
3. **Active trip**: "Cannot delete job with active trip. Contact the driver to cancel."
4. **Network errors**: Generic "Failed to delete job" with error details

### Testing Checklist

- [x] Delete button appears only for "open" status jobs
- [x] Confirmation dialog shows before deletion
- [x] Job is removed from all database locations
- [x] Associated bids are deleted
- [x] Cannot delete jobs with active trips
- [x] Ownership verification works
- [x] Error messages are user-friendly
- [x] UI updates after successful deletion
- [ ] Edit functionality (coming soon)

## Future Enhancements

### Edit Job Feature (To Be Implemented)
When edit button is clicked, navigate to edit screen where factory can modify:
- Goods description
- Weight in tonnes
- Budget amount
- Available dates
- Special instructions
- Vehicle/body type requirements

**Note**: Location and goods category cannot be changed after posting (would require re-matching).

## Usage

1. **Navigate** to Factory → My Jobs tab
2. **Find** a job in "open" status
3. **See** edit ✏️ and delete 🗑️ buttons at bottom right
4. **Click delete** to remove the job
5. **Confirm** in the dialog that appears
6. **Job deleted** - screen updates automatically

## Database Structure

### Before Delete
```
/jobs/{jobId}
/jobPrivate/{jobId}
/cellIndexJobs/{cell1}/{jobId}
/cellIndexJobs/{cell2}/{jobId}
/bids/{bidId1} (jobId: {jobId})
/bids/{bidId2} (jobId: {jobId})
```

### After Delete
```
(All entries removed)
```

## Technical Notes

- Uses React Native's `Alert` for native confirmation dialogs
- Uses `stopPropagation()` to prevent card press when clicking buttons
- Deleting updates state via Firebase real-time listener
- No manual refresh needed - UI updates automatically

---

**Feature Status**: ✅ Delete Working | ⏳ Edit Coming Soon
**Last Updated**: October 2026
**Developer**: LoadLink Team
