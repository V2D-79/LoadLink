# Edit Profile Navigation Fix

## Issue

Edit profile screen should not appear in the bottom navigation bar - it should only be accessible from the Profile screen via the "Edit Profile" button.

## Solution

Added `edit-profile` screen to the hidden screens list in the driver layout, ensuring it's not visible in the bottom tab bar but can still be navigated to programmatically.

## Changes Made

### File: `app/(driver)/_layout.tsx`

**BEFORE:**
```typescript
{/* Detail screens — hidden from tab bar */}
<Tabs.Screen
  name="job/[id]"
  options={{ href: null }}
/>
<Tabs.Screen
  name="notifications"
  options={{ href: null }}
/>
```

**AFTER:**
```typescript
{/* Detail screens — hidden from tab bar */}
<Tabs.Screen
  name="edit-profile"
  options={{ href: null }}
/>
<Tabs.Screen
  name="job/[id]"
  options={{ href: null }}
/>
<Tabs.Screen
  name="notifications"
  options={{ href: null }}
/>
```

## How It Works

### Bottom Tab Bar (Visible Tabs)
```
┌─────────────────────────────────────────────────────────┐
│  [Find Jobs]  [My Activity]  [My Route]  [Profile]     │
└─────────────────────────────────────────────────────────┘
```

Only 4 tabs visible in the bottom navigation.

### Hidden Screens (Not in Tab Bar)
- ✅ `edit-profile` - Accessed via Profile → Edit Profile button
- ✅ `job/[id]` - Accessed by tapping a job card
- ✅ `notifications` - Accessed via notification bell icon

### Navigation Flow

**To Edit Profile:**
```
Profile Tab (bottom nav)
    ↓
Tap "Edit Profile" button
    ↓
edit-profile screen opens (full screen)
    ↓
Make changes → Save
    ↓
Navigate back to Profile Tab
```

**Key Point:** `options={{ href: null }}` hides the screen from the tab bar while keeping it navigable via `router.push()`.

## Bottom Navigation Structure

### Driver Tabs (4 tabs)
1. **Find Jobs** (`find.tsx`) - Browse and match jobs
2. **My Activity** (`activity.tsx`) - Bids, offers, active trips
3. **My Route** (`route.tsx`) - Set/edit route
4. **Profile** (`profile.tsx`) - View profile & settings

### Hidden Driver Screens
- `edit-profile.tsx` - Edit profile form
- `job/[id].tsx` - Job detail with bid form
- `notifications.tsx` - Notifications list

### Factory Tabs (4 tabs)
1. **My Jobs** (`jobs.tsx`) - List of posted jobs
2. **Post Job** (`post.tsx`) - Create new job
3. **Track** (`track.tsx`) - Track deliveries
4. **Profile** (`profile.tsx`) - Factory profile

### Hidden Factory Screens
- `job/[id].tsx` - Job detail with bids
- `notifications.tsx` - Notifications list

## Why This Matters

### Before (if not configured):
```
Bottom Nav: [Find] [Activity] [Route] [Profile] [Edit Profile] ❌
                                                  └─ WRONG!
```
Too many tabs, cluttered navigation

### After (correct):
```
Bottom Nav: [Find] [Activity] [Route] [Profile] ✅

Profile Screen:
  ┌─────────────────────┐
  │  Vivek Dalavi       │
  │  [Edit Profile] ←── Opens edit-profile.tsx
  │  [Logout]           │
  └─────────────────────┘
```
Clean navigation, edit profile accessed via button

## Expo Router Tab Configuration

### Visible Tab
```typescript
<Tabs.Screen
  name="profile"
  options={{
    title: 'Profile',
    tabBarIcon: ({ color }) => <IconProfile color={color} />,
  }}
/>
```

### Hidden Screen
```typescript
<Tabs.Screen
  name="edit-profile"
  options={{ href: null }}  // ← Makes it hidden from tab bar
/>
```

## Testing

### ✅ Tab Bar Only Shows 4 Tabs
```
1. Open app as driver
2. Look at bottom navigation
3. Count tabs: Find Jobs, My Activity, My Route, Profile
4. Should see exactly 4 tabs (no edit-profile)
```

### ✅ Edit Profile Still Accessible
```
1. Tap Profile tab
2. Tap "Edit Profile" button
3. Edit profile screen opens
4. Make changes and save
5. Navigate back to profile
```

### ✅ Navigation Works Correctly
```
1. From Profile → Edit Profile (works)
2. From Edit Profile → Back to Profile (works)
3. Edit Profile not in tab bar (correct)
```

## Code Reference

### How to Navigate to Hidden Screens

From `profile.tsx`:
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

<Button
  title="Edit Profile"
  onPress={() => router.push('/(driver)/edit-profile')}
  variant="outline"
/>
```

This works because the screen exists in the layout, just with `href: null`.

## Status

✅ **FIXED** - Edit profile is now properly hidden from the bottom navigation bar

## Summary

| Screen | Location | Visible in Tab Bar | Accessible Via |
|--------|----------|-------------------|----------------|
| Find Jobs | `find.tsx` | ✅ Yes | Tab bar |
| My Activity | `activity.tsx` | ✅ Yes | Tab bar |
| My Route | `route.tsx` | ✅ Yes | Tab bar |
| Profile | `profile.tsx` | ✅ Yes | Tab bar |
| Edit Profile | `edit-profile.tsx` | ❌ No | Profile button |
| Job Detail | `job/[id].tsx` | ❌ No | Job card tap |
| Notifications | `notifications.tsx` | ❌ No | Bell icon |

**Result:** Clean, uncluttered bottom navigation with only the 4 main tabs visible.

---

**Fix Date:** October 17, 2026  
**Status:** Complete ✅  
**Impact:** UI improvement - cleaner navigation  

