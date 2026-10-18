# Visual Navigation Map & Data Flow

## Auth State Flow (Fixed)

```
┌─────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW (FIXED)                      │
└─────────────────────────────────────────────────────────────┘

User Enters Credentials
        │
        ↓
┌───────────────────┐
│  loginUser()      │ ← Firebase signInWithEmailAndPassword()
│  Returns: User    │
└────────┬──────────┘
         │
         ↓
┌───────────────────┐
│ Keep Loading ⏳   │ ← DO NOT navigate yet!
│ Spinner Visible   │
└────────┬──────────┘
         │
         ↓
┌───────────────────────────────┐
│ Firebase onAuthStateChanged   │ ← Fires automatically
└───────────┬───────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ useAuth Hook Detects Change      │
│ Fetches: users/{uid}             │
│ Returns: { role, displayName }   │
└───────────┬──────────────────────┘
            │
            ↓
┌─────────────────────────────────┐
│ Context Updates                  │
│ { firebaseUser, role, profile } │
└───────────┬─────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ Login Screen useEffect Triggers  │
│ Detects: firebaseUser && role    │
└───────────┬──────────────────────┘
            │
            ├─→ role === 'factory' → router.replace('/(factory)/jobs')
            │
            └─→ role === 'driver'  → router.replace('/(driver)/find')
```

## Complete App Navigation Tree

```
┌─────────────────────────────────────────────────────────────┐
│                    APP NAVIGATION TREE                       │
└─────────────────────────────────────────────────────────────┘

                        app/index.tsx
                     (Root Auth Guard)
                             │
                ┌────────────┴────────────┐
                │                         │
           NOT LOGGED IN             LOGGED IN
                │                         │
                ↓                    ┌────┴─────┐
       ┌────────────────┐            │          │
       │  /(auth)       │      role='factory' role='driver'
       │  Landing Page  │            │          │
       └────────┬───────┘            ↓          ↓
                │          ┌──────────────┐  ┌──────────────┐
       ┌────────┴────────┐ │  /(factory)  │  │   /(driver)  │
       │                 │ │   Tab Nav    │  │   Tab Nav    │
       ↓                 ↓ └──────┬───────┘  └──────┬───────┘
  ┌─────────┐    ┌──────────┐    │                  │
  │  Login  │    │  Signup  │    │                  │
  └─────────┘    └──────────┘    │                  │
                                  │                  │
              ┌───────────────────┼──────────────────┤
              │                   │                  │
              ↓                   ↓                  ↓
         ┌─────────┐         ┌────────┐        ┌─────────┐
         │  Jobs   │         │  Post  │        │  Find   │
         │ (List)  │         │ (New)  │        │ (Jobs)  │
         └────┬────┘         └────────┘        └────┬────┘
              │                                      │
              ↓                                      ↓
         ┌─────────┐                            ┌─────────┐
         │ Job/[id]│                            │Activity │
         │ Detail  │                            │(Bids)   │
         └─────────┘                            └─────────┘
```

## Database Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE DATA FLOW                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ Firebase RTDB    │
│ (Real-time DB)   │
└────────┬─────────┘
         │
         │ onValue() listener
         ↓
┌─────────────────────────────┐
│  useRTDBValue / useRTDBList │ ← Custom hooks
│  (src/hooks/useRTDB.ts)     │
└────────┬────────────────────┘
         │
         ↓
┌─────────────────────┐
│  React Component    │ ← Automatic re-renders on data change
│  (Screen)           │
└─────────────────────┘

Example:
┌────────────────┐
│  users/{uid}   │ ← Database path
└────────┬───────┘
         │
         ↓
   useRTDBValue<UserPublic>('users/ABC123')
         │
         ↓
   { data: UserPublic, loading: boolean, error: string }
         │
         ↓
   <Text>{data.displayName}</Text>
```

## Auth Context Propagation

```
┌─────────────────────────────────────────────────────────────┐
│              AUTH CONTEXT PROPAGATION                        │
└─────────────────────────────────────────────────────────────┘

app/_layout.tsx
    │
    └─→ <AuthProvider>
            │
            ├─→ useAuth() hook
            │      │
            │      ├─→ onAuthStateChanged()
            │      └─→ Fetches user profile from RTDB
            │
            └─→ <AuthContext.Provider value={auth}>
                    │
                    ├─→ index.tsx (reads: firebaseUser, role)
                    │
                    ├─→ login.tsx (reads: firebaseUser, role)
                    │
                    ├─→ factory/_layout.tsx (reads: firebaseUser, role)
                    │
                    └─→ driver/_layout.tsx (reads: firebaseUser, role)

Any component can access via:
    const { firebaseUser, role, userProfile } = useAuthContext();
```

## Data Fetching Points

```
┌─────────────────────────────────────────────────────────────┐
│               DATA FETCHING ACROSS SCREENS                   │
└─────────────────────────────────────────────────────────────┘

DRIVER SCREENS:
┌────────────────────┬──────────────────────┬─────────────────┐
│      Screen        │     Database Path    │      Hook       │
├────────────────────┼──────────────────────┼─────────────────┤
│ find.tsx           │ driverRoutes/{uid}   │ useRTDBValue    │
│ find.tsx           │ jobs (all)           │ useRTDBList     │
│ activity.tsx       │ bidsByDriver/{uid}   │ useRTDBValue    │
│ activity.tsx       │ jobs/{jobId}         │ useRTDBValue    │
│ profile.tsx        │ users/{uid}          │ useAuthContext  │
│ route.tsx          │ driverRoutes/{uid}   │ useRTDBValue    │
│ job/[id].tsx       │ jobs/{jobId}         │ useRTDBValue    │
│ job/[id].tsx       │ bids/{jobId}         │ useRTDBList     │
└────────────────────┴──────────────────────┴─────────────────┘

FACTORY SCREENS:
┌────────────────────┬──────────────────────┬─────────────────┐
│      Screen        │     Database Path    │      Hook       │
├────────────────────┼──────────────────────┼─────────────────┤
│ jobs.tsx           │ jobs (all)           │ useRTDBList     │
│ job/[id].tsx       │ jobs/{jobId}         │ useRTDBValue    │
│ job/[id].tsx       │ bids/{jobId}         │ useRTDBList     │
│ job/[id].tsx       │ assignments/{jobId}  │ useRTDBValue    │
│ profile.tsx        │ users/{uid}          │ useAuthContext  │
│ post.tsx           │ [write only]         │ set()           │
└────────────────────┴──────────────────────┴─────────────────┘

All data updates in REAL-TIME automatically!
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING FLOW                       │
└─────────────────────────────────────────────────────────────┘

User Action (Login, Signup, etc.)
        │
        ↓
   try { ... }
        │
        ├─→ SUCCESS
        │      │
        │      └─→ Continue flow
        │
        └─→ CATCH ERROR
               │
               ├─→ Firebase Auth Error
               │      │
               │      ├─→ auth/invalid-credential
               │      │      └─→ "Incorrect mobile number or password"
               │      │
               │      ├─→ auth/too-many-requests
               │      │      └─→ "Too many attempts, try later"
               │      │
               │      └─→ auth/user-disabled
               │             └─→ "Account disabled, contact support"
               │
               ├─→ Network Error
               │      └─→ "Check connection and try again"
               │
               └─→ Database Error
                      ├─→ Permission denied
                      │      └─→ "Cannot access data (offline?)"
                      │
                      └─→ Other
                             └─→ Generic error message

All errors display:
- User-friendly message
- Shake animation
- Retry option
- Log to console for debugging
```

## State Management Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT LAYERS                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│  Firebase Auth                   │ ← Source of truth
│  (User credentials)              │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│  Firebase RTDB                   │ ← Profile data
│  users/{uid} → role, name, etc.  │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│  useAuth Hook                    │ ← Sync layer
│  Combines Auth + RTDB            │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│  AuthContext                     │ ← React Context
│  { firebaseUser, role, profile } │
└────────────┬────────────────────┘
             │
             ├────────────────────┐
             │                    │
             ↓                    ↓
┌──────────────────┐    ┌──────────────────┐
│  All Components  │    │  Layout Guards   │
│  useAuthContext()│    │  Check role      │
└──────────────────┘    └──────────────────┘

Data flows DOWN (one direction)
Updates flow UP (via Firebase callbacks)
```

## Route Guards Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                      ROUTE GUARDS                            │
└─────────────────────────────────────────────────────────────┘

User Navigates to: /(factory)/jobs
        │
        ↓
┌────────────────────────────┐
│ Factory Layout Guard       │
│ if (!user || role !== ...) │
└────────┬───────────────────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ↓         ↓
 ALLOW    REDIRECT
  TO       TO
/(factory) /(auth)
  /jobs    /landing
```

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM OVERVIEW                           │
└─────────────────────────────────────────────────────────────┘

Auth: Firebase Authentication + RTDB Profiles
      ↓
Navigation: Expo Router (file-based)
      ↓
Guards: Role-based (factory/driver)
      ↓
Data: Real-time Firebase RTDB
      ↓
Hooks: useAuth, useRTDBValue, useRTDBList
      ↓
UI: React Native + Reanimated

STATUS: ✅ ALL WORKING
```

This visual guide shows how all pieces fit together!

