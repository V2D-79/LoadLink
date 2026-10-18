# LoadLink — Complete Project Knowledge File

> **Purpose:** Any AI assistant or developer should read this file first to fully understand the
> project, its architecture, current state, and conventions. This prevents redundant work and
> reduces token usage.

---

## 1. App Summary

**LoadLink** is a production-quality React Native (Expo) app that connects:

- **Factories / Organisations / Individuals** — who need goods transported
- **Truck Drivers / Transporters** — who have trucks available or are returning empty

**Core value proposition:** A factory in Pune needs goods sent to Kolhapur. A driver who just
delivered in Pune is heading back toward Kolhapur with an empty truck. LoadLink detects this
match, ranks it, and facilitates bidding, assignment, live tracking, and handover confirmation.

**Platform:** Android (Expo Go), React Native, Firebase Realtime Database + Auth.

---

## 2. Tech Stack (LOCKED — do not change)

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 52, New Architecture enabled |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router v4 (file-based) |
| Auth | Firebase Auth JS SDK v11 (modular), custom AsyncStorage persistence |
| Database | Firebase Realtime Database (RTDB) |
| Forms | react-hook-form + zod |
| Animations | react-native-reanimated v3 |
| Maps | Leaflet in react-native-webview |
| Fonts | Source Serif 4 (headings) + IBM Plex Sans (body) via Google Fonts |
| Icons | Inline SVG via react-native-svg (no icon font dependencies) |
| Crypto | Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`) |
| i18n | react-i18next (en / mr / hi) |

**Firebase config:**
```javascript
{
  apiKey: "AIzaSyANHacQZ26WWzhE-y7IxlVyuWidxuGQEe4",
  authDomain: "loadlink-1dab7.firebaseapp.com",
  projectId: "loadlink-1dab7",
  databaseURL: "https://loadlink-1dab7-default-rtdb.firebaseio.com",
  storageBucket: "loadlink-1dab7.firebasestorage.app",
  messagingSenderId: "662134783181",
  appId: "1:662134783181:web:5ee538ff59dfb2968dbd84"
}
```

---

## 3. Project Structure

```
loadlink/
├── app/
│   ├── _layout.tsx                  Root layout (fonts, auth context, error boundary)
│   ├── index.tsx                    Entry redirect (auth guard)
│   ├── (auth)/
│   │   ├── _layout.tsx              Auth stack navigator
│   │   ├── landing.tsx              App landing / role selection
│   │   ├── login.tsx                Login (phone or email)
│   │   ├── signup.tsx               3-step signup wizard (factory or driver+truck)
│   │   └── forgot-password.tsx      Firebase password reset
│   ├── (factory)/
│   │   ├── _layout.tsx              Factory tab navigator (My Jobs | Post Job | Track | Profile)
│   │   ├── jobs.tsx                 Factory My Jobs (Active / Past / All tabs)
│   │   ├── post.tsx                 5-step Post Job wizard
│   │   ├── track.tsx                Live driver tracking (Leaflet WebView)
│   │   ├── profile.tsx              Factory profile + active job panel + rating modal
│   │   ├── notifications.tsx        Factory notification feed
│   │   └── job/[id].tsx             Factory job detail (bids list, offer assignment)
│   └── (driver)/
│       ├── _layout.tsx              Driver tab navigator (Find | Activity | Route | Profile)
│       ├── find.tsx                 Driver Find Jobs (matching engine results)
│       ├── activity.tsx             Driver activity (bids, offers, trips)
│       ├── route.tsx                Driver set/view active route
│       ├── profile.tsx              Driver profile + active trip panel + handover codes
│       ├── notifications.tsx        Driver notification feed
│       └── job/[id].tsx             Driver job detail (place/revise/withdraw bid, accept offer)
│
├── src/
│   ├── constants/
│   │   ├── app.ts                   DB_PATHS, all enums, labels, tuneable constants
│   │   └── theme.ts                 COLORS, FONTS, FONT_SIZES, SPACING, RADII, SHADOWS
│   ├── data/
│   │   └── cities.ts                GeoNames India cities dataset (lat/lng/state)
│   ├── engine/
│   │   ├── geo.ts                   Haversine, cell key, corridor check, detour
│   │   ├── match.ts                 6-factor scoring, cell index writers/queries
│   │   └── index.ts                 Barrel export
│   ├── hooks/
│   │   ├── AuthContext.tsx           Firebase auth state + RTDB profile subscription
│   │   ├── useRTDB.ts               useRTDBValue, useRTDBList, fetchOnce
│   │   └── useNotifications.ts      Real-time notifications with markRead/markAllRead
│   ├── i18n/
│   │   ├── index.ts                 i18next setup
│   │   └── locales/ (en, mr, hi)
│   ├── services/
│   │   ├── asyncStoragePersistence.ts  Custom Firebase auth persistence adapter
│   │   ├── firebase.ts              getFirebaseApp, getFirebaseAuth, getFirebaseDB
│   │   ├── authService.ts           signup (factory/driver), login, phone uniqueness
│   │   ├── bidService.ts            placeBid, reviseBid, withdrawBid, offerAssignment,
│   │   │                            acceptAssignment, rejectAssignment, getDriverBidForJob
│   │   └── tripService.ts           Status transitions, handover codes, live location,
│   │                                trip events, submitReview
│   ├── ui/
│   │   ├── index.ts                 Barrel: Button, Input, Card, Chip, SkeletonBox,
│   │   │                            JobCardSkeleton, EmptyState, BottomSheet, Logo,
│   │   │                            LogoWithName, ErrorBoundary, NotificationList
│   │   ├── Button.tsx               Primary / outline / ghost / danger variants
│   │   ├── Input.tsx                Labelled text input with error display
│   │   ├── Card.tsx                 Pressable card with StyleProp<ViewStyle> support
│   │   ├── Chip.tsx                 Status + label chips
│   │   ├── EmptyState.tsx           Vector illustration + heading + subText + action
│   │   ├── SkeletonLoader.tsx       SkeletonBox + JobCardSkeleton
│   │   ├── BottomSheet.tsx          Modal bottom sheet
│   │   ├── Logo.tsx                 SVG truck logo + LogoWithName
│   │   ├── ErrorBoundary.tsx        React error boundary
│   │   └── NotificationList.tsx     Animated notification list with unread styling
│   ├── utils/
│   │   └── crypto.ts                sha256Hex, generateHandoverCode (6-digit),
│   │                                hashHandoverCode, phoneToInternalEmail
│   └── validation/
│       └── auth.ts                  Zod schemas: login, factorySignup, driverSignup,
│                                    forgotPassword, changePassword
│
├── database.rules.json              Firebase RTDB security rules (fully specified)
├── app.json                         Expo config (SDK 52, New Architecture)
├── package.json                     Dependencies
├── tsconfig.json                    Strict TypeScript
├── babel.config.js
├── metro.config.js
└── .env                             EXPO_PUBLIC_FIREBASE_* env vars
```

---

## 4. Firebase RTDB Schema

All paths are defined in `src/constants/app.ts → DB_PATHS`.

```
users/{uid}                          Public profile (fullName, role, city, state,
                                     averageRating, ratingCount, language, createdAt)
userPrivate/{uid}                    Phone, GST, primaryTruckId, expoPushToken
phoneIndex/{sha256(phone)}           → uid (uniqueness check)
emailByPhone/{sha256(phone)}         → internal email (driver login)
trucks/{driverUid}/{truckId}         regNumber, vehicleType, bodyType, maxCapacityTonnes
jobs/{jobId}                         Public job header:
                                       factoryUid, status, pickupCity, pickupState,
                                       pickupLat, pickupLng, deliveryCity, deliveryState,
                                       deliveryLat, deliveryLng, goodsCategory,
                                       weightTonnes, budgetInr, bidCount,
                                       availableFrom, availableUntil, paymentTerms,
                                       requiredVehicleType, requiredBodyType,
                                       specialInstructions, assignedDriverUid,
                                       assignedTruckId, currentAssignmentId,
                                       createdAt, updatedAt
jobPrivate/{jobId}                   pickupAddress, deliveryAddress,
                                     pickupCodeHash, pickupCodeGeneratedAt,
                                     deliveryCodeHash, deliveryCodeGeneratedAt,
                                     pickupConfirmedAt, deliveryConfirmedAt
bids/{jobId}/{bidId}                 driverUid, truckId, amountInr, notes, status,
                                     createdAt, updatedAt
                                     Status: active | superseded | withdrawn | declined | selected
bidsByDriver/{driverUid}/{jobId}     bidId, amountInr, updatedAt  (quick lookup index)
assignments/{jobId}/{assignmentId}   driverUid, truckId, bidId, status,
                                     offeredAt, expiresAt, acceptedAt, rejectedAt
                                     Status: offered | accepted | rejected | expired
driverRoutes/{driverUid}             startCity, startLat/Lng, endCity, endLat/Lng,
                                     vehicleType, bodyType, availableCapacityTonnes,
                                     availableFrom, availableUntil, averageRating, isActive
cellIndexJobs/{cellKey}/{jobId}      true   (spatial index for matching)
cellIndexRoutes/{cellKey}/{driverUid} true  (spatial index for matching)
liveLocation/{driverUid}             lat, lng, accuracy, heading, updatedAt
tripEvents/{jobId}/{eventId}         status, actorUid, note, ts
reviews/{revieweeUid}/{reviewId}     jobId, reviewerUid, role, stars, comment, createdAt
notifications/{uid}/{notifId}        type, title, body, read, jobId?, createdAt
```

---

## 5. Job Status Machine

```
open → offered → accepted → heading_to_pickup → loaded → in_transit → delivered → completed
                                                                                        ↑
Any state → cancelled (factory action)                                    markCompleted()
```

**Handover codes:**
- Pickup: factory generates 6-digit code → writes `pickupCodeHash` to `jobPrivate` → driver
  enters code → system verifies SHA-256 → status becomes `loaded`
- Delivery: driver generates 6-digit code on arrival → writes `deliveryCodeHash` → factory
  enters code → status becomes `delivered` → rating modal → `completed`

---

## 6. Matching Engine (`src/engine/`)

**Spatial indexing:** 0.5° grid cells (`GRID_CELL_SIZE_DEGREES`). Jobs and routes write cell
keys covering their route bounding box. Queries enumerate cells along a route and fetch jobs.

**Scoring (6 dimensions, weights in `SCORE_WEIGHTS`):**

| Dimension | Weight | Description |
|-----------|--------|-------------|
| routeFit | 35% | Corridor match (pickup/delivery within 25km of driver route) |
| capacityFit | 20% | Job weight vs truck capacity |
| dateFit | 15% | Availability window overlap |
| detour | 15% | Added km vs direct route (max 40km) |
| priceVsBudget | 10% | Driver rating vs factory budget |
| driverRating | 5% | Driver average rating |

---

## 7. Bidding Rules

- **D3:** Bid `amountInr` must be strictly `< budgetInr` (if set). Controlled by `BID_RULE = 'lt'`.
- **D4:** Partial visibility — drivers see bid count + lowest bid + their own bid. Factory sees all.
- **D5:** Offer TTL = 12 hours (`OFFER_TTL_HOURS`). Driver must accept before expiry.
- Rate-limit: 10 seconds between bids by same driver on same job (`BID_RATE_LIMIT_SECONDS`).
- A new bid supersedes the driver's previous bid on the same job.

---

## 8. Key Design Decisions / Known Fixes

### Firebase Auth persistence
Firebase JS SDK v11 removed `getReactNativePersistence`. The solution is to polyfill
`window.localStorage` in React Native using AsyncStorage, then use Firebase's built-in
`browserLocalPersistence`.

The polyfill in `src/services/firebase.ts` implements the full localStorage API
(getItem, setItem, removeItem, clear, key, length) backed by AsyncStorage. This approach:
- Works with Firebase's existing persistence layer without custom adapters
- Provides proper class definition that Firebase expects  
- Persists auth state across app restarts
- Is initialized before Firebase Auth, ensuring proper setup

**Important:** The localStorage polyfill is created at module load time, before any
Firebase services are initialized, ensuring AsyncStorage is the backing store for all
Firebase auth persistence operations.

### TypeScript strict `StyleProp`
`Card.tsx` style prop uses `StyleProp<ViewStyle>` (not bare `ViewStyle`) to accept conditional
style arrays like `[s.card, isActive && s.cardActive]`.

### Dynamic routes type-narrowing
Expo Router's typed `href` does not include dynamic segments at compile time. Use
`router.push(path as any)` for paths like `/(factory)/job/${jobId}`.

### EmptyState props
`EmptyState` uses `heading` (not `title`) and `subText` (not `subtitle`).

### Chip status prop
`Chip` accepts a `status` prop that maps to a colour. Values: `open`, `offered`, `accepted`,
`heading_to_pickup`, `loaded`, `in_transit`, `delivered`, `completed`, `cancelled`.

---

## 9. Environment Variables (`.env`)

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyANHacQZ26WWzhE-y7IxlVyuWidxuGQEe4
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=loadlink-1dab7.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://loadlink-1dab7-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=loadlink-1dab7
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=loadlink-1dab7.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=662134783181
EXPO_PUBLIC_FIREBASE_APP_ID=1:662134783181:web:5ee538ff59dfb2968dbd84
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-C7YHSN1NNX
```

---

## 10. Running the App

```bash
cd loadlink
npm run start          # Start Metro + Expo dev server
# Then scan QR code with Expo Go app on Android
```

TypeScript check:
```bash
node_modules/.bin/tsc.cmd --noEmit --skipLibCheck
```

Deploy RTDB rules:
```bash
firebase deploy --only database
```

---

## 11. What Is NOT Yet Built (Future Phases)

- [ ] Push notifications via Expo Notifications + Firebase Cloud Messaging
- [ ] Background GPS tracking (foreground-only currently)
- [ ] Admin / moderation dashboard
- [ ] Multi-truck support (UI only shows primaryTruck)
- [ ] Job cancellation flow (status exists, no UI)
- [ ] Driver document upload (licence, RC, insurance)
- [ ] Payment integration (Razorpay / UPI)
- [ ] WhatsApp OTP fallback for phone auth
- [ ] Advanced route history and trip analytics
- [ ] Web portal for factories

---

## 12. AI Model Note

If an AI model is needed in the project, there is a model called `qwine` available for use.
