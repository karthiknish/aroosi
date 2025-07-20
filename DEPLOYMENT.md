# Aroosi Web Deployment Guide

## Overview
This guide covers the complete deployment process for the Aroosi web application, including CI/CD setup, environment configuration, and production deployment.

## Tech Stack
- **Frontend**: Next.js 15 with TypeScript
- **Backend**: Convex (serverless backend)
- **Database**: Convex managed database
- **Authentication**: Clerk
- **Payments**: Stripe
- **Email**: Resend
- **Deployment**: Vercel
- **Testing**: Jest + Playwright

## Prerequisites

### Required Accounts
- [GitHub](https://github.com) - Repository hosting
- [Vercel](https://vercel.com) - Deployment platform
- [Clerk](https://clerk.com) - Authentication
- [Convex](https://convex.dev) - Backend
- [Stripe](https://stripe.com) - Payments
- [Resend](https://resend.com) - Email service

### Required Tools
- Node.js 20+
- npm
- Git

## Initial Setup

### 1. Repository Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd aroosi

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 2. Environment Configuration
Edit `.env.local` with your actual values:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex Backend
CONVEX_DEPLOYMENT=your_deployment_name
NEXT_PUBLIC_CONVEX_URL=https://your_deployment.convex.cloud

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...
```

### 3. Convex Setup
```bash
# Install Convex CLI
npm install -g convex

# Login to Convex
npx convex login

# Initialize Convex (if not already done)
npx convex dev

# Deploy Convex functions
npx convex deploy
```

### 4. Clerk Setup
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Configure authentication providers
4. Copy the publishable and secret keys
5. Set up webhook endpoints for user events

### 5. Stripe Setup
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create products and pricing plans
3. Configure webhook endpoints
4. Test with Stripe CLI

## GitHub Secrets Configuration

### Required Secrets
Add these to your GitHub repository settings:

#### Vercel Deployment
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

#### Application Secrets
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`

#### Optional Secrets
- `CODECOV_TOKEN` - For test coverage reports
- `SNYK_TOKEN` - For security scanning
- `SLACK_WEBHOOK_URL` - For deployment notifications

## CI/CD Pipeline

### Workflow Overview
1. **CI** (`.github/workflows/ci.yml`):
   - Linting with ESLint
   - Type checking with TypeScript
   - Unit tests with Jest
   - Build verification
   - E2E tests with Playwright

2. **CD** (`.github/workflows/cd.yml`):
   - Staging deployment on `develop` branch
   - Production deployment on `main` branch
   - Automatic notifications

3. **Security** (`.github/workflows/security.yml`):
   - CodeQL analysis
   - Dependency vulnerability scanning
   - Secrets detection

4. **Dependencies** (`.github/workflows/dependencies.yml`):
   - Weekly dependency updates
   - Automated PR creation
   - Security fixes

## Deployment Process

### Staging Deployment
1. Push to `develop` branch
2. Automatic deployment to staging environment
3. URL: `https://aroosi-staging.vercel.app`

### Production Deployment
1. Merge to `main` branch
2. Automatic deployment to production
3. URL: `https://aroosi.com`

### Manual Deployment
```bash
# Deploy to Vercel
vercel --prod

# Or use Vercel CLI
npx vercel --prod
```

## Testing Strategy

### Local Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run E2E tests
npx playwright test

# Run E2E tests in UI mode
npx playwright test --ui
```

### Production Testing
- Test authentication flow
- Verify payment processing
- Check email delivery
- Validate Convex functions

## Monitoring and Analytics

### Error Tracking
- **Sentry**: Real-time error monitoring
- **Vercel Analytics**: Performance metrics
- **Convex Dashboard**: Backend monitoring

### Performance Monitoring
- **Core Web Vitals**: LCP, FID, CLS
- **API Response Times**: Convex function performance
- **Database Queries**: Query optimization

## Environment Management

### Development
- Local development with `npm run dev`
- Convex development server
- Hot reload enabled

### Staging
- Automatic deployment from `develop` branch
- Production-like environment
- Test data and configurations

### Production
- Automatic deployment from `main` branch
- Production database and services
- Optimized builds

## Rollback Strategy

### Automatic Rollback
- Vercel provides automatic rollback on failed deployments
- Previous deployments are always available

### Manual Rollback
```bash
# List previous deployments
vercel ls

# Rollback to specific deployment
vercel --prod <deployment-url>
```

## Security Best Practices

### Environment Variables
- Never commit secrets to repository
- Use GitHub secrets for CI/CD
- Rotate keys regularly

### API Security
- Validate all inputs
- Use HTTPS everywhere
- Implement rate limiting

### Authentication
- Use Clerk for secure authentication
- Implement proper session management
- Enable 2FA for admin accounts

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

#### Convex Issues
```bash
# Check Convex status
npx convex status

# Redeploy functions
npx convex deploy
```

#### Environment Issues
```bash
# Verify environment variables
vercel env ls
```

### Debug Commands
```bash
# Check Vercel deployment logs
vercel logs

# Test Convex functions
npx convex run your:function
```

## Support and Documentation

### Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Clerk Documentation](https://clerk.com/docs)

### Getting Help
- Check GitHub Issues
- Review deployment logs
- Contact team leads
- Check service status pages

## Quick Reference

### Commands
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Type checking

# Testing
npm test            # Run Jest tests
npx playwright test # Run E2E tests

# Deployment
vercel              # Deploy to preview
vercel --prod       # Deploy to production
```

### URLs
- **Production**: https://aroosi.com
- **Staging**: https://aroosi-staging.vercel.app
- **Convex Dashboard**: https://dashboard.convex.dev
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Clerk Dashboard**: https://dashboard.clerk.com