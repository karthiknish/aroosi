# Aroosi Mobile App

A modern React Native dating app built with Expo, featuring excellent UX design and comprehensive functionality.

## 🚀 Features

### Core Features
- **Secure Authentication** - Clerk-powered auth with email verification
- **Profile Management** - Comprehensive profile creation and editing
- **Smart Discovery** - Swipe-based matching with advanced filters
- **Real-time Messaging** - Chat system with typing indicators
- **Premium Subscriptions** - Multiple subscription tiers with Stripe
- **Advanced Security** - JWT validation, rate limiting, input sanitization

### User Experience
- **Smooth Animations** - Gesture-based interactions with React Native Reanimated
- **Responsive Design** - Optimized for all screen sizes
- **Offline Support** - Secure local storage with encrypted preferences
- **Dark Mode Ready** - Complete theming system
- **Accessibility** - WCAG compliant components

## 🛠 Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Authentication**: Clerk
- **Backend**: Convex real-time database
- **Payments**: Stripe
- **State Management**: React Query + Context
- **Styling**: Custom design system
- **Storage**: Expo SecureStore
- **Animations**: React Native Reanimated
- **Gestures**: React Native Gesture Handler

## 📱 App Structure

```
app/
├── (auth)/                 # Authentication screens
│   ├── welcome.tsx         # Landing page
│   ├── sign-in.tsx         # Sign in form
│   ├── sign-up.tsx         # Sign up with verification
│   └── forgot-password.tsx # Password reset
├── (tabs)/                 # Main app tabs
│   ├── search.tsx          # Discovery/swipe interface
│   ├── matches.tsx         # Matches list
│   ├── profile.tsx         # User profile
│   └── premium.tsx         # Subscription plans
├── chat.tsx               # Chat interface
├── profile-setup.tsx      # Multi-step profile creation
├── profile-detail.tsx     # Profile viewing
├── settings.tsx           # App settings
└── _layout.tsx           # Root navigation

components/
├── ui/                    # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── Avatar.tsx

constants/
├── Colors.ts              # Color palette
└── Layout.ts              # Spacing and typography

utils/
├── api.ts                 # API client
├── validation.ts          # Form validation
├── formatting.ts          # Data formatting
└── storage.ts             # Secure storage
```

## 🎨 Design System

### Colors
- **Primary**: Red-based palette for brand identity
- **Neutral**: Gray scale for text and backgrounds
- **Semantic**: Success, warning, error states
- **Gradients**: Modern gradient combinations

### Typography
- **Scale**: 9 font sizes from xs to 5xl
- **Weights**: Normal, medium, semibold, bold
- **Line Heights**: Optimized for readability

### Components
- **Buttons**: 5 variants (primary, secondary, outline, ghost, danger)
- **Inputs**: With validation, icons, and error states
- **Cards**: Elevated, outlined, and default variants
- **Avatars**: Multiple sizes with online indicators

## 🔐 Security Features

### Authentication & Authorization
- JWT token validation with signature verification
- Automatic token refresh
- Role-based permissions (user, premium, admin)
- Secure token storage with Expo SecureStore

### API Security
- Rate limiting per endpoint and user
- Input sanitization and validation
- CORS protection
- Request size limits
- Security event logging

### Data Protection
- Encrypted local storage
- Personal data anonymization
- Secure image upload with validation
- Payment data handled by Stripe (PCI compliant)

## 🔧 Development

### Prerequisites
```bash
Node.js 18+
Expo CLI
iOS Simulator / Android Emulator
```

### Installation
```bash
cd apps/mobile
npm install
```

### Environment Setup
Create `.env.local`:
```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CONVEX_URL=https://...
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### Development Commands
```bash
# Start development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android  
npx expo start --android

# Build for production
npx expo build

# Type checking
npx tsc --noEmit

# Linting
npx eslint .
```

## 📦 Building & Deployment

### Development Build
```bash
npx eas build --platform all --profile development
```

### Production Build
```bash
npx eas build --platform all --profile production
```

### App Store Submission
```bash
npx eas submit --platform ios
npx eas submit --platform android
```

## 🚀 Performance Monitoring

### Metrics Tracked
- App startup time
- Screen transition speeds
- API response times
- Crash rates
- User engagement

### Analytics
- User journey tracking
- Feature usage statistics
- Performance bottlenecks
- Error reporting

## 📱 Platform Compatibility

### iOS
- iOS 13.0+
- iPhone and iPad support
- Face ID / Touch ID integration
- Push notifications
- Background app refresh

### Android
- Android 6.0+ (API 23)
- Material Design components
- Biometric authentication
- Firebase Cloud Messaging
- Background sync

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the style guide
4. Add tests for new features
5. Submit a pull request

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Consistent naming conventions
- Comprehensive JSDoc comments

## 📄 License

This project is proprietary software. All rights reserved.
