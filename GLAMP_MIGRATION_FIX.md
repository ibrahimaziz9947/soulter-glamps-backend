# GLAMP MIGRATION FIX - 500 ERROR ON /api/glamps

## Problem
Railway backend throws 500 error:
```
Invalid `prisma.glamp.findMany()` invocation:
The column `Glamp.isTest` does not exist in the current database.
```

## Root Cause
- Schema changes (imageUrl, isTest) were committed and deployed
- BUT database migration was NOT applied on Railway
- Code references columns that don't exist in production DB

## Solution Options

### Option 1: Use Railway Dashboard (RECOMMENDED - Easiest)

1. Go to Railway dashboard: https://railway.app
2. Select your `soulter-backend` project
3. Click on the service
4. Go to **Settings** tab
5. Scroll to **Deploy** section
6. In the **Custom Start Command**, temporarily change to:
   ```
   npx prisma migrate deploy && npm start
   ```
7. Click **Save** and **Redeploy**
8. This will apply pending migrations before starting the server
9. After successful deployment, revert the start command back to `npm start`

### Option 2: Run Migration Locally (if you have DATABASE_URL)

1. Get DATABASE_URL from Railway:
   ```bash
   # In Railway dashboard:
   # - Go to service > Variables
   # - Copy DATABASE_URL value
   ```

2. Set it locally:
   ```powershell
   $env:DATABASE_URL = "postgresql://postgres:xxx@metro.proxy.rlwy.net:xxxxx/railway"
   ```

3. Apply migration:
   ```powershell
   node apply-glamp-migration.js
   ```

4. OR use Prisma directly:
   ```powershell
   npx prisma migrate deploy
   ```

### Option 3: Manual SQL (Advanced)

1. Connect to Railway database via psql or Railway's database view
2. Run this SQL:

```sql
-- Add imageUrl column (nullable)
ALTER TABLE "Glamp" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Add isTest column with default false
ALTER TABLE "Glamp" ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false;

-- Create index on isTest
CREATE INDEX IF NOT EXISTS "Glamp_isTest_idx" ON "Glamp"("isTest");
```

## Verification

After applying migration, verify the fix:

```powershell
# Test public endpoint (should return 200 now)
Invoke-RestMethod -Uri "https://soulter-backend.up.railway.app/api/glamps"

# Or use curl
curl https://soulter-backend.up.railway.app/api/glamps
```

Expected response:
```json
[
  {
    "id": "xxx",
    "name": "Premium Private Glamp",
    "description": "...",
    "pricePerNight": 500,
    "maxGuests": 4,
    "status": "ACTIVE",
    "imageUrl": null,
    "features": [...],
    "amenities": [...]
  }
]
```

## Next Steps (After Migration Applied)

1. Run glamp update script to assign images and hide test glamps:
   ```powershell
   node update-glamps-production-ready.js
   ```

2. Verify only 4 real glamps appear on customer site

## Files Created
- `prisma/migrations/20260121011833_add_glamp_image_and_test_fields/migration.sql` - Migration SQL
- `apply-glamp-migration.js` - Node script to apply migration
- `update-glamps-production-ready.js` - Script to mark test glamps and assign images
