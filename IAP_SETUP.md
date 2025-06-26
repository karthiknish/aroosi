# In-App Purchase Setup Guide

This guide covers the complete setup for in-app purchases across iOS and Android platforms.

## Overview

The IAP system consists of:
- **Mobile App**: React Native with `react-native-iap` for purchase handling
- **API Backend**: Next.js endpoints for purchase validation and subscription management
- **Database**: Convex for storing subscription data

## Environment Configuration

Add these variables to your `.env.local` file:

```bash
# Apple App Store Configuration
APPLE_SHARED_SECRET="your_apple_shared_secret_here"

# Google Play Store Configuration  
GOOGLE_PLAY_PACKAGE_NAME="com.yourapp.package"
GOOGLE_PLAY_API_KEY="your_google_play_api_key_here"
```

## Apple App Store Setup

### 1. Get Apple Shared Secret

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** → Your App → **App Information**
3. Scroll to **App-Specific Shared Secret**
4. Click **Generate** if not already created
5. Copy the shared secret to your `.env.local` as `APPLE_SHARED_SECRET`

### 2. Configure Products

Your iOS products should match these IDs:
- `com.aroosi.premium.monthly` - Premium Monthly Plan
- `com.aroosi.premiumplus.monthly` - Premium Plus Monthly Plan

### 3. Test Environment

- Use sandbox accounts for testing
- The API automatically handles production/sandbox receipt validation

## Google Play Store Setup

### 1. Enable Google Play Developer API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select your project
3. Enable **Google Play Developer API**
4. Create credentials (Service Account Key)
5. Download the JSON key file

### 2. Configure API Access

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup** → **API access**
3. Link your Google Cloud project
4. Grant necessary permissions to your service account

### 3. Get API Key

Use the service account JSON to generate an access token, or use the API key from your Google Cloud project.

### 4. Configure Products

Your Android products should match these IDs:
- `aroosi_premium_monthly` - Premium Monthly Plan
- `aroosi_premium_plus_monthly` - Premium Plus Monthly Plan

## API Endpoints

### Purchase Validation
- **Endpoint**: `POST /api/subscription/validate-purchase`
- **Purpose**: Validates and processes new purchases
- **Platforms**: iOS and Android

### Restore Purchases
- **Endpoint**: `POST /api/subscription/restore`  
- **Purpose**: Restores previously purchased subscriptions
- **Platforms**: iOS and Android

### Check Status
- **Endpoint**: `GET /api/subscription/status`
- **Purpose**: Gets current subscription status
- **Platforms**: Both

## Mobile App Integration

The mobile app uses the `useInAppPurchase` hook which handles:
- Product loading
- Purchase initiation
- Receipt validation
- Subscription restoration
- Error handling

### Key Functions
- `initializePurchases()` - Sets up IAP connection
- `purchaseProduct(productId)` - Initiates purchase
- `restorePurchases()` - Restores previous purchases
- `validatePurchase(receipt)` - Validates with backend

## Database Schema

Subscriptions are stored in the user profile with:
```typescript
{
  subscriptionPlan: "premium" | "premiumPlus" | null,
  subscriptionExpiresAt: number | null,
  updatedAt: number
}
```

## Testing

### iOS Testing
1. Use sandbox Apple ID accounts
2. Test in iOS Simulator or device
3. Verify receipt validation works for both production and sandbox

### Android Testing
1. Use test accounts in Google Play Console
2. Upload signed APK to internal testing track
3. Test purchase flow with test accounts

## Troubleshooting

### Common Issues

1. **Apple Receipt Validation Fails**
   - Check `APPLE_SHARED_SECRET` is correct
   - Verify product IDs match App Store Connect
   - Ensure app is properly signed

2. **Google Play Validation Fails**
   - Verify API credentials are correct
   - Check package name matches exactly
   - Ensure service account has proper permissions

3. **Mobile App Can't Connect**
   - Verify API endpoints are deployed
   - Check network connectivity
   - Validate authentication tokens

### Debug Logs

Enable debug logging in the mobile app:
```typescript
// In useInAppPurchase.ts
console.log('Purchase validation result:', result);
```

Check API logs for validation errors:
```bash
# View API logs
npm run dev
```

## Security Notes

- Never expose shared secrets in client code
- Always validate purchases server-side
- Store sensitive credentials in environment variables
- Use HTTPS for all API communications
- Implement proper error handling and logging

## Production Checklist

- [ ] Apple Shared Secret configured
- [ ] Google Play API credentials set up
- [ ] Product IDs match store configurations
- [ ] API endpoints deployed and accessible
- [ ] Database schema updated
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Testing completed on both platforms