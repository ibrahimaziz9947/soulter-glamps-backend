/**
 * Apply Glamp Migration to Railway Database
 * 
 * This script connects to the production database and applies the schema changes:
 * - Adds imageUrl column (nullable String)
 * - Adds isTest column (Boolean, default false)
 * - Creates index on isTest
 * 
 * Safe to run multiple times (idempotent)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('\n========================================');
  console.log('APPLYING GLAMP SCHEMA MIGRATION');
  console.log('========================================\n');

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✓ Connected\n');

    console.log('Applying migration SQL...\n');

    // Check if imageUrl column exists
    const imageUrlCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Glamp' AND column_name = 'imageUrl'
    `;

    if (imageUrlCheck.length === 0) {
      console.log('Adding imageUrl column...');
      await prisma.$executeRaw`ALTER TABLE "Glamp" ADD COLUMN "imageUrl" TEXT`;
      console.log('✓ imageUrl column added');
    } else {
      console.log('⊘ imageUrl column already exists');
    }

    // Check if isTest column exists
    const isTestCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Glamp' AND column_name = 'isTest'
    `;

    if (isTestCheck.length === 0) {
      console.log('\nAdding isTest column...');
      await prisma.$executeRaw`ALTER TABLE "Glamp" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false`;
      console.log('✓ isTest column added');
    } else {
      console.log('\n⊘ isTest column already exists');
    }

    // Check if index exists
    const indexCheck = await prisma.$queryRaw`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'Glamp' AND indexname = 'Glamp_isTest_idx'
    `;

    if (indexCheck.length === 0) {
      console.log('\nCreating index on isTest...');
      await prisma.$executeRaw`CREATE INDEX "Glamp_isTest_idx" ON "Glamp"("isTest")`;
      console.log('✓ Index created');
    } else {
      console.log('\n⊘ Index already exists');
    }

    // Verify schema
    console.log('\n\nVerifying schema...');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Glamp' 
        AND column_name IN ('imageUrl', 'isTest')
      ORDER BY column_name
    `;

    console.log('\nGlamp table columns:');
    console.log('Column'.padEnd(15) + 'Type'.padEnd(20) + 'Nullable'.padEnd(15) + 'Default');
    console.log('-'.repeat(70));
    columns.forEach(col => {
      console.log(
        col.column_name.padEnd(15) +
        col.data_type.padEnd(20) +
        col.is_nullable.padEnd(15) +
        (col.column_default || 'none')
      );
    });

    console.log('\n========================================');
    console.log('MIGRATION APPLIED SUCCESSFULLY');
    console.log('========================================\n');

    console.log('Next steps:');
    console.log('1. Restart Railway service (or wait for auto-deploy)');
    console.log('2. Test: GET https://soulter-backend.up.railway.app/api/glamps');
    console.log('3. Run: node update-glamps-production-ready.js (to mark test glamps)\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
applyMigration()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
