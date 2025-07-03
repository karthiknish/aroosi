#!/bin/bash

echo "Deploying migration functions to both Convex instances..."
echo "========================================================"

cd ../..

# Deploy to source instance
echo ""
echo "1. Deploying to source instance (quirky-akita-969)..."
CONVEX_DEPLOYMENT=dev:quirky-akita-969 npx convex deploy -y

# Deploy to destination instance  
echo ""
echo "2. Deploying to destination instance (proper-gull-501)..."
CONVEX_DEPLOYMENT=prod:proper-gull-501 npx convex deploy -y

echo ""
echo "Deployment complete!"
echo ""
echo "You can now run the migration script."