# 🚚 LoadLink - Logistics Platform

**LoadLink** is a comprehensive mobile application connecting factories with truck drivers for efficient goods transportation across India. Built with React Native, Expo, and Firebase.

[![React Native](https://img.shields.io/badge/React%20Native-0.76-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-52-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.0-orange.svg)](https://firebase.google.com/)

## 📱 Features

### For Factories (Shippers)
- 📦 **Post Transport Jobs**: Create detailed shipping requests with pickup/delivery locations
- 🗺️ **Interactive Map Selection**: Choose locations visually on an interactive map
- 💼 **Manage Jobs**: Track all posted jobs, view bids, accept/reject offers
- 🚛 **Track Deliveries**: Real-time tracking of goods in transit
- 👤 **Profile Management**: Update company details and contact information

### For Truck Drivers
- 🔍 **Smart Job Matching**: AI-powered job recommendations based on your route
- 🗺️ **Route Planning**: Set your route on an interactive map
- 📍 **Live Route Tracking**: GPS-based real-time location tracking
- 💰 **Bidding System**: Submit competitive bids on available jobs
- 📊 **Activity Dashboard**: View active trips, earnings, and history
- ⭐ **Rating System**: Build reputation through customer ratings

### Core Features
- 🔐 **Secure Authentication**: Email/phone login with Firebase Auth
- 🌍 **Multilingual**: Support for English, Hindi, and Marathi
- 📱 **Offline Support**: Core features work without internet
- 🔔 **Push Notifications**: Real-time updates on job status, bids, and trips
- 🎨 **Animated UI**: Smooth animations with truck, clouds, and exhaust effects
- 📍 **Geolocation**: Cell-based spatial indexing for efficient job matching

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native + Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context + Hooks
- **Database**: Firebase Realtime Database
- **Authentication**: Firebase Auth
- **Maps**: Leaflet + OpenStreetMap (WebView)
- **Routing**: OSRM (Open Source Routing Machine)
- **Animations**: React Native Reanimated
- **Type Safety**: TypeScript

### Project Structure
```
loadlink/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (driver)/          # Driver role screens
│   └── (factory)/         # Factory role screens
├── src/
│   ├── components/        # Reusable UI components
│   ├── constants/         # App constants and theme
│   ├── data/              # Static data (cities, etc.)
│   ├── engine/            # Matching algorithm & geo utilities
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Internationalization
│   ├── services/          # Firebase & business logic
│   ├── types/             # TypeScript type definitions
│   ├── ui/                # UI component library
│   ├── utils/             # Utility functions
│   └── validation/        # Input validation schemas
├── assets/                # Images, fonts, icons
├── scripts/               # Utility scripts
└── *.md                   # Documentation files
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI
- Firebase project
- Android Studio (for Android) or Xcode (for iOS)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/V2D-79/LoadLink.git
cd LoadLink
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your Firebase configuration:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. **Set up Firebase**
```bash
# Deploy database rules
firebase deploy --only database

# (Optional) Deploy storage rules
firebase deploy --only storage
```

5. **Start development server**
```bash
npm start
```

## 📱 Running the App

### Using Expo Go
1. Install **Expo Go** on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779))
2. Scan the QR code from the terminal
3. App will load on your device

### Using Android Emulator
```bash
npm run android
```

### Using iOS Simulator
```bash
npm run ios
```

## 🗺️ Key Features Deep Dive

### Smart Job Matching Algorithm
- **Cell-based spatial indexing**: 0.5° grid cells for efficient geographic queries
- **Route corridor matching**: Finds jobs within 50km of driver's route
- **Multi-factor scoring**:
  - Route fit (35 pts)
  - Capacity match (20 pts)
  - Date availability (15 pts)
  - Detour distance (15 pts)
  - Price vs budget (10 pts)
  - Driver rating (5 pts)

### Interactive Maps
- **Full-screen map interface**: Separate activities for route/location selection
- **Multiple selection methods**:
  - Search by city name
  - Use current GPS location
  - Tap anywhere on map
- **Reverse geocoding**: Convert coordinates to human-readable addresses
- **Route visualization**: OSRM-powered optimal route calculation

### Real-time Features
- **Live location tracking**: GPS-based position updates during trips
- **Push notifications**: Instant alerts for bids, job status changes
- **WebSocket-like updates**: Firebase Realtime Database listeners

## 📚 Documentation

Comprehensive documentation is available in the repository:

- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide
- **[HOW_TO_RUN_WITH_EXPO_GO.md](./HOW_TO_RUN_WITH_EXPO_GO.md)** - Expo Go setup
- **[KNOWLEDGE.md](./KNOWLEDGE.md)** - Architecture and design decisions
- **[JOB_MATCHING_FIX.md](./JOB_MATCHING_FIX.md)** - Matching algorithm details
- **[LOCATION_SELECTION_FIX.md](./LOCATION_SELECTION_FIX.md)** - Map implementation
- **[REINDEX_JOBS_GUIDE.md](./REINDEX_JOBS_GUIDE.md)** - Database maintenance

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test User Accounts
Create test accounts through the signup flow or use Firebase Console to add test users.

## 🔧 Configuration

### Firebase Database Rules
Database security rules are in `database.rules.json`. Deploy with:
```bash
firebase deploy --only database
```

### App Configuration
Edit `app.json` for:
- App name and slug
- Version number
- Splash screen
- App icons
- Permissions

## 🌍 Internationalization

LoadLink supports multiple languages:
- **English** (default)
- **Hindi** (हिन्दी)
- **Marathi** (मराठी)

Add translations in `src/i18n/locales/`.

## 📊 Database Schema

### Main Collections
- **`users/`** - User profiles (public data)
- **`userPrivate/`** - Private user data (email, phone, etc.)
- **`jobs/`** - Job postings (public data)
- **`jobPrivate/`** - Job private data (exact addresses)
- **`driverRoutes/`** - Active driver routes
- **`bids/`** - Bid submissions
- **`trips/`** - Active deliveries
- **`notifications/`** - User notifications
- **`trucks/`** - Driver vehicle information

### Indexes
- **`cellIndexJobs/`** - Spatial index for job locations
- **`cellIndexRoutes/`** - Spatial index for driver routes

## 🚀 Deployment

### Build for Production

**Android:**
```bash
eas build --platform android
```

**iOS:**
```bash
eas build --platform ios
```

### Update App
```bash
eas update --branch production
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Vivek Dalavi** - *Initial work* - [@V2D-79](https://github.com/V2D-79)

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- OpenStreetMap for map data
- OSRM for routing engine
- Expo team for the amazing development platform
- React Native community for packages and support

## 📧 Contact

For questions or support:
- GitHub Issues: [Create an issue](https://github.com/V2D-79/LoadLink/issues)
- Email: vivekdalavi7521@gmail.com

## 📈 Project Status

**Current Version**: 1.0.0  
**Status**: Active Development  
**Last Updated**: October 2026

---

## 🎯 Roadmap

### Completed ✅
- [x] User authentication (email/phone)
- [x] Driver and Factory profiles
- [x] Job posting with map selection
- [x] Smart job matching algorithm
- [x] Interactive route planning
- [x] Bidding system
- [x] Real-time tracking
- [x] Push notifications
- [x] Animated home page
- [x] Multilingual support

### In Progress 🚧
- [ ] Payment integration
- [ ] Advanced analytics dashboard
- [ ] Chat/messaging system
- [ ] Document upload (POD, invoices)

### Future Enhancements 🔮
- [ ] AI-powered price suggestions
- [ ] Load pooling/consolidation
- [ ] Blockchain for transparency
- [ ] IoT sensor integration
- [ ] Predictive maintenance
- [ ] Carbon footprint tracking

---

**Made with ❤️ in India 🇮🇳**
