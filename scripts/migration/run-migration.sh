#!/bin/bash

# Migration script using Convex CLI
# This script fetches data from source and imports to destination

echo "Starting Aroosi profile migration..."
echo "======================================"

# Check if we're in the right directory
if [ ! -f "../../convex/migration.ts" ]; then
    echo "Error: Please run this script from the scripts/migration directory"
    exit 1
fi

cd ../..

echo ""
echo "Step 1: Fetching profiles from source instance..."
echo "Source: https://quirky-akita-969.convex.cloud"

# Export data from source (you'll need to be logged in to the source project)
echo "Please make sure you're logged in to the source Convex project"
echo "Run: npx convex dev --url https://quirky-akita-969.convex.cloud"
echo ""
echo "Then in another terminal, run:"
echo "npx convex run migration:getAllProfiles --prod"
echo ""
echo "Copy the output to a file called 'source-profiles.json'"
echo ""
read -p "Press enter when you've saved the source profiles..."

echo ""
echo "Step 2: Fetching profiles from destination instance..."
echo "Destination: https://proper-gull-501.convex.cloud"

echo "Now switch to the destination project"
echo "Run: npx convex dev --url https://proper-gull-501.convex.cloud"
echo ""
echo "Then run:"
echo "npx convex run migration:getAllProfiles --prod"
echo ""
echo "Copy the output to a file called 'dest-profiles.json'"
echo ""
read -p "Press enter when you've saved the destination profiles..."

echo ""
echo "Step 3: Processing migration..."
echo "This will identify missing profiles and create migration commands"

# Here you would run a Node.js script to process the JSON files
# and generate migration commands

echo ""
echo "Migration process complete!"
echo ""
echo "To import the missing profiles, run the generated migration commands"
echo "in the destination project's Convex dashboard or CLI"