# Aroosi Monorepo

A monorepo containing the Aroosi dating/matchmaking application with web and mobile apps.

## Structure

```
aroosi/
├── apps/
│   ├── web/              # Next.js web application
│   └── mobile/           # Expo React Native iOS app
├── packages/
│   ├── shared/           # Shared types, constants, utilities
│   └── config/           # Shared configs (TypeScript, ESLint)
├── firebase.json         # Firebase project config
├── firestore.rules       # Firestore security rules
└── package.json          # npm monorepo config
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Xcode (for iOS development)
- Firebase CLI

### Installation

```bash
# Install all dependencies
npm install
```

### Development

**Web App:**
```bash
npm run dev
# or
cd apps/web && npm run dev
```

**Mobile App:**
```bash
cd apps/mobile
npm start
```

**iOS Local Build:**
```bash
cd apps/mobile
npm run ios:build
npm run ios:open  # Opens Xcode
```

## Firebase Setup

1. Copy your `GoogleService-Info.plist` to `apps/mobile/`
2. Copy your `google-services.json` to `apps/mobile/`
3. Update the Firebase project ID in `.firebaserc`

## Apps

### Web (`apps/web`)
- **Framework:** Next.js 16
- **UI:** React 19, shadcn/ui, Tailwind CSS
- **Backend:** Firebase (Auth, Firestore, Storage)

### Mobile (`apps/mobile`)
- **Framework:** Expo SDK 52, React Native
- **Navigation:** React Navigation 7
- **State:** Zustand
- **Backend:** React Native Firebase

## Packages

### Shared (`packages/shared`)
Common types, constants, and utility functions:
- User, Match, Message types
- App constants
- Helper functions

### Config (`packages/config`)
Shared configuration files:
- TypeScript base config
- ESLint config

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web development server |
| `npm run dev:mobile` | Start mobile Expo server |
| `npm run build` | Build web app |
| `npm run lint` | Lint all packages |
| `npm run type-check` | Type check all packages |

## License

Private
