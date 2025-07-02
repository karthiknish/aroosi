# Aroosi Profile Migration

This script migrates missing profiles from one Convex instance to another.

## Setup

1. Install dependencies:

```bash
cd scripts/migration
npm install
```

2. Create a `.env` file in the migration directory with your authentication tokens:

```env
# Source instance token (read access)
SOURCE_CONVEX_TOKEN=your_source_token_here

# Destination instance token (write access)
DEST_CONVEX_TOKEN=your_destination_token_here
```

## Usage

### Migrate Missing Profiles

To migrate profiles that exist in the source but not in the destination:

```bash
npm run migrate-profiles
```

The script will:

1. Fetch all profiles from both instances
2. Identify profiles that exist in source but not in destination (by clerkId)
3. Migrate missing profiles including:
   - User records
   - Profile data
   - Associated images (if any)

### Important Notes

- The script uses `clerkId` as the unique identifier
- Profile IDs and creation times are regenerated in the destination
- Image storage IDs need to be migrated separately (storage migration not included)
- The script requires admin/migration permissions on both instances

### Extending the Migration

To migrate additional data types (interests, messages, etc.), you can:

1. Add new query/mutation functions in `convex/migration.ts`
2. Update the migration script to handle the new data types
3. Consider relationships and foreign keys when migrating

## Troubleshooting

- **Authentication errors**: Ensure your tokens have the correct permissions
- **Type errors**: The script handles type conversions for enum fields
- **Missing data**: Check that all required fields are present in the source data
