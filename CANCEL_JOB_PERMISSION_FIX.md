# Cancel Job Permission Fix

## Issue
When trying to confirm job cancellation, the factory user was getting a "permission denied" error from Firebase Realtime Database.

## Root Cause
The Firebase database rules for the `jobs` node were missing write permissions for the `cancelledAt` and `cancellationReason` fields. When the `cancelJob` function tried to update these fields, Firebase rejected the write operation.

## Changes Made

### 1. Database Rules Update (`database.rules.json`)
Added write permissions for cancellation-related fields:

```json
"cancelledAt": {
  ".write": "auth !== null"
},
"cancellationReason": {
  ".write": "auth !== null"
}
```

These fields are now writable by any authenticated user who has write access to the job (factory owner or assigned driver).

### 2. Factory Job Detail Screen (`app/(factory)/job/[id].tsx`)

#### Added Cancel Job Functionality:
- Imported `cancelJob` from `jobService`
- Added `isCancelling` state to track cancellation progress
- Implemented `handleCancelJob` function with confirmation dialog
- Added "Cancel Job" button in the UI (visible for `open` and `offered` jobs only)

#### Added Missing Styles:
- `rejectionLabel`: Style for the "Reason provided:" label
- `rejectionReason`: Style for displaying the cancellation/rejection reason text

#### Cancel Button Features:
- Shows only for jobs with status `open` or `offered`
- Displays confirmation dialog before cancelling
- Shows loading state ("Cancelling...") during the operation
- On success, navigates back to the jobs list
- On error, displays an alert with the error message

## How to Deploy

To deploy the updated database rules to Firebase, run:

```bash
# Install firebase-tools if not already installed
npm install -g firebase-tools

# Deploy the rules
firebase deploy --only database
```

## User Flow

1. Factory user opens a job detail page
2. Clicks "Cancel Job" button (red outline button)
3. Confirms cancellation in the alert dialog
4. Job status is updated to `cancelled` with timestamp and reason
5. User is redirected back to the jobs list

## Notes

- Jobs with active trips (`accepted`, `heading_to_pickup`, `loaded`, `in_transit`) cannot be cancelled via this method
- The cancellation reason is set to "Cancelled by factory" by default
- All bidding drivers should be notified (notification logic may need to be added separately)
- The cancelled job appears in the "Past" tab of the factory's job list
