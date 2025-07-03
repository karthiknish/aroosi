#!/bin/bash

# Script to fetch data from source Convex instance

echo "Fetching data from source instance..."
echo "URL: https://quirky-akita-969.convex.cloud"
echo ""

# Make sure we're in the project root
cd ../..

# Fetch profiles
echo "Fetching profiles..."
npx convex run migration:getAllProfiles --url https://quirky-akita-969.convex.cloud > scripts/migration/source-profiles.json

# Fetch users  
echo "Fetching users..."
npx convex run migration:getAllUsers --url https://quirky-akita-969.convex.cloud > scripts/migration/source-users.json

echo ""
echo "Data fetched successfully!"
echo "Files created:"
echo "  - scripts/migration/source-profiles.json"
echo "  - scripts/migration/source-users.json"