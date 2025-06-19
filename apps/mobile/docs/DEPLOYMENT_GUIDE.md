# Aroosi Mobile App - Deployment Guide

This comprehensive guide covers the complete setup process for deploying the Aroosi mobile app to both the Apple App Store and Google Play Store.

## Prerequisites

### Development Environment
- **Node.js**: 18.x or later
- **Expo CLI**: Latest version (`npm install -g @expo/cli`)
- **EAS CLI**: Latest version (`npm install -g eas-cli`)
- **Git**: For version control

### Required Accounts
- **Expo Account**: [expo.dev](https://expo.dev)
- **Apple Developer Account**: $99/year - [developer.apple.com](https://developer.apple.com)
- **Google Play Console**: $25 one-time fee - [play.google.com/console](https://play.google.com/console)

### External Service Accounts
- **Clerk**: Authentication service
- **Convex**: Database and backend
- **Stripe**: Payment processing
- **OneSignal**: Push notifications
- **Sentry**: Error tracking (optional)

## Initial Setup

### 1. Expo and EAS Configuration

```bash
# Navigate to mobile app directory
cd apps/mobile

# Install dependencies
npm install

# Login to Expo
npx expo login

# Login to EAS
eas login

# Initialize EAS project
eas init

# Configure project
eas project:init
```

### 2. Environment Variables

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Update `.env` with your actual values:

```env
# Required for both platforms
EXPO_PUBLIC_API_URL=https://api.aroosi.com
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key
EXPO_PUBLIC_CONVEX_URL=https://your_convex_url
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id
```

### 3. Update App Configuration

Edit `app.json` with your actual values:

```json
{
  "expo": {
    "owner": "your-expo-username",
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id"
      }
    }
  }
}
```

## Apple App Store Setup

### 1. Apple Developer Account Setup

1. **Join Apple Developer Program**
   - Visit [developer.apple.com](https://developer.apple.com)
   - Enroll in the program ($99/year)
   - Complete identity verification

2. **App Store Connect Setup**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Create new app:
     - Platform: iOS
     - Name: "Aroosi - Afghan Matrimony"
     - Bundle ID: `com.aroosi.matrimony`
     - SKU: `aroosi-matrimony-ios`
     - User Access: Full Access

### 2. iOS App Configuration

1. **Bundle Identifier**
   - Ensure `com.aroosi.matrimony` is registered in Apple Developer portal
   - Configure App ID with required capabilities:
     - Push Notifications
     - Sign in with Apple (optional)
     - In-App Purchase

2. **Certificates and Provisioning Profiles**
   ```bash
   # EAS will handle this automatically, but you can also generate manually
   eas credentials:configure --platform ios
   ```

3. **App Store Connect App Information**
   - **Privacy Policy URL**: `https://aroosi.com/privacy`
   - **Terms of Use URL**: `https://aroosi.com/terms`
   - **Support URL**: `https://aroosi.com/support`
   - **Marketing URL**: `https://aroosi.com`

### 3. iOS In-App Purchases Setup

1. **Create Subscription Groups**
   - Group Name: "Aroosi Premium Subscriptions"
   - Reference Name: `aroosi_premium_subs`

2. **Create Auto-Renewable Subscriptions**

   **Premium Monthly**:
   - Product ID: `com.aroosi.premium.monthly`
   - Reference Name: `Premium Monthly`
   - Duration: 1 Month
   - Price: £14.99

   **Premium Plus Monthly**:
   - Product ID: `com.aroosi.premiumplus.monthly`
   - Reference Name: `Premium Plus Monthly`
   - Duration: 1 Month
   - Price: £39.99

3. **Configure Subscription Details**
   - Add localized descriptions for English
   - Upload subscription preview images
   - Set up promotional offers (optional)

### 4. iOS Build and Submission

```bash
# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

## Google Play Store Setup

### 1. Google Play Console Setup

1. **Create Developer Account**
   - Visit [play.google.com/console](https://play.google.com/console)
   - Pay $25 registration fee
   - Complete account verification

2. **Create New App**
   - App name: "Aroosi - Afghan Matrimony"
   - Default language: English (United Kingdom)
   - App or game: App
   - Free or paid: Free (with in-app purchases)

### 2. Android App Configuration

1. **Package Name**
   - Use: `com.aroosi.matrimony`
   - This cannot be changed after first upload

2. **App Signing**
   ```bash
   # Configure Android credentials
   eas credentials:configure --platform android
   ```

3. **Google Services Setup**
   - Enable Google Play Console API
   - Create service account key
   - Download `service-account-key.json`
   - Place in mobile app root (add to .gitignore)

### 3. Android In-App Purchases Setup

1. **Create Subscription Products**

   **Premium Monthly**:
   - Product ID: `premium_monthly`
   - Name: Premium Monthly Subscription
   - Description: Unlimited messaging, profile views, and advanced features
   - Price: £14.99
   - Billing period: Monthly

   **Premium Plus Monthly**:
   - Product ID: `premium_plus_monthly`
   - Name: Premium Plus Monthly Subscription
   - Description: All Premium features plus incognito mode and unlimited boosts
   - Price: £39.99
   - Billing period: Monthly

2. **Configure Base Plans**
   - Set up monthly billing cycles
   - Configure free trial periods (optional)
   - Set up grace periods and account hold

### 4. Android Build and Submission

```bash
# Build Android App Bundle
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --latest
```

## Store Listing Setup

### Apple App Store Listing

1. **App Information**
   - Name: "Aroosi - Afghan Matrimony"
   - Subtitle: "Find Your Perfect Afghan Match"
   - Category: Lifestyle
   - Content Rating: 17+ (Mature)

2. **App Description** (from `store-config/app-store-listing.json`)

3. **Keywords**
   ```
   afghan,matrimony,marriage,matchmaking,dating,relationships,muslim,cultural,traditional,family,authentic,secure
   ```

4. **Screenshots and Assets**
   - Upload iPhone screenshots (6.7", 6.5", 5.5")
   - Upload iPad screenshots (12.9")
   - App preview videos (optional)

5. **App Review Information**
   - Contact email: support@aroosi.com
   - Contact phone: +44 20 1234 5678
   - Review notes: See `store-config/app-store-listing.json`

### Google Play Store Listing

1. **Store Listing**
   - Short description (80 characters)
   - Full description (from `store-config/play-store-listing.json`)
   - App icon (512x512px)
   - Feature graphic (1024x500px)

2. **Screenshots**
   - Phone screenshots (minimum 2, maximum 8)
   - Tablet screenshots (recommended)
   - All screenshots 16:9 to 2:1 aspect ratio

3. **Categorization**
   - Category: Lifestyle
   - Tags: dating, relationships, matrimony, cultural
   - Content rating: Mature 17+

## Automated Deployment Setup

### 1. GitHub Secrets Configuration

Add these secrets to your GitHub repository:

```bash
EXPO_TOKEN=your_expo_access_token
EAS_PROJECT_ID=your_eas_project_id
SLACK_WEBHOOK=your_slack_webhook_url (optional)
```

### 2. EAS Secrets

```bash
# Add sensitive environment variables to EAS
eas secret:create --scope project --name CLERK_SECRET_KEY --value your_clerk_secret
eas secret:create --scope project --name STRIPE_SECRET_KEY --value your_stripe_secret
eas secret:create --scope project --name CONVEX_DEPLOY_KEY --value your_convex_deploy_key
```

### 3. Workflow Triggers

The automated workflows will trigger on:

- **Production Build**: Push to `main` branch
- **Preview Build**: Pull requests to `main` or `develop`
- **OTA Updates**: Push to `develop` or `staging` branches
- **Manual Builds**: GitHub Actions workflow dispatch

## Testing and Quality Assurance

### 1. Internal Testing

```bash
# Build development client
eas build --platform all --profile development

# Install on test devices
# Use Expo Go or development build for testing
```

### 2. TestFlight (iOS) Setup

1. **Add Internal Testers**
   - Go to App Store Connect > TestFlight
   - Add team members as internal testers
   - Enable automatic distribution

2. **External Testing**
   - Create external test groups
   - Add beta testers with email addresses
   - Submit for Beta App Review

### 3. Internal App Sharing (Android)

1. **Upload Test Builds**
   - Use Internal App Sharing for quick testing
   - Share with QA team and stakeholders

2. **Closed Testing**
   - Create closed testing track
   - Add testers via email or Google Groups

## Pre-Launch Checklist

### Technical Requirements
- [ ] App builds successfully on both platforms
- [ ] All API endpoints are functional
- [ ] In-app purchases are configured and working
- [ ] Push notifications are set up
- [ ] App icons and assets are uploaded
- [ ] Privacy policy and terms are accessible
- [ ] Age rating is set correctly (17+)

### Store Requirements
- [ ] App Store Connect app is created
- [ ] Google Play Console app is created
- [ ] Screenshots uploaded for all device types
- [ ] App descriptions are complete and accurate
- [ ] Keywords and tags are optimized
- [ ] Contact information is provided
- [ ] Review notes include login credentials

### Legal and Compliance
- [ ] Privacy policy mentions data collection
- [ ] Terms of service include subscription terms
- [ ] GDPR compliance for EU users
- [ ] Content moderation policies are in place
- [ ] User verification process is documented

## Launch Strategy

### Soft Launch (Recommended)
1. **Phase 1**: Launch in UK only
2. **Phase 2**: Expand to US, Canada, Australia
3. **Phase 3**: Global rollout

### Marketing Preparation
- [ ] App Store Optimization (ASO) research
- [ ] Social media accounts set up
- [ ] Landing page updated with download links
- [ ] Press kit prepared
- [ ] Influencer outreach planned

## Post-Launch Monitoring

### Analytics Setup
- [ ] App Store Connect analytics
- [ ] Google Play Console analytics
- [ ] Expo Analytics (if enabled)
- [ ] Custom analytics via Convex

### Performance Monitoring
- [ ] Crash reporting via Sentry
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Review monitoring and response

### Regular Updates
- [ ] Bug fixes via OTA updates
- [ ] Feature updates via app store releases
- [ ] Seasonal content updates
- [ ] Security patches

## Troubleshooting Common Issues

### Build Failures
1. **Dependency conflicts**: Clear cache and reinstall
2. **Platform-specific errors**: Check EAS build logs
3. **Asset issues**: Verify all required assets exist

### Submission Rejections
1. **App Store**: Review Apple's guidelines carefully
2. **Play Store**: Check policy compliance
3. **Content issues**: Ensure cultural sensitivity

### In-App Purchase Issues
1. **Sandbox testing**: Use test accounts
2. **Receipt validation**: Implement server-side validation
3. **Restore purchases**: Test on clean devices

## Support and Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Google Play Developer Documentation](https://developer.android.com/distribute/play-console)

### Community Support
- [Expo Discord](https://discord.gg/expo)
- [React Native Community](https://reactnative.dev/community/overview)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

### Emergency Contacts
- **Technical Lead**: your-tech-lead@aroosi.com
- **Project Manager**: your-pm@aroosi.com
- **Support Team**: support@aroosi.com

## Security Considerations

### Production Security
- [ ] All API keys are in environment variables
- [ ] No sensitive data in app bundle
- [ ] Certificate pinning implemented (future)
- [ ] Biometric authentication enabled
- [ ] Data encryption at rest and in transit

### Store Security
- [ ] Two-factor authentication enabled on all accounts
- [ ] Limited access to production certificates
- [ ] Regular security audits
- [ ] Incident response plan

This deployment guide ensures a smooth and successful launch of the Aroosi mobile app on both major app stores while maintaining security, quality, and cultural sensitivity standards.