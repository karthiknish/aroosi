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
└── pnpm-workspace.yaml   # pnpm monorepo config
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Xcode (for iOS development)
- Firebase CLI

### Installation

```bash
# Install pnpm if you haven't
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Development

**Web App:**
```bash
pnpm dev
# or
cd apps/web && pnpm dev
```

**Mobile App:**
```bash
cd apps/mobile
pnpm start
```

**iOS Local Build:**
```bash
cd apps/mobile
pnpm ios:build
pnpm ios:open  # Opens Xcode
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
| `pnpm dev` | Start web development server |
| `pnpm dev:mobile` | Start mobile Expo server |
| `pnpm build` | Build web app |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | Type check all packages |

## License

Private
