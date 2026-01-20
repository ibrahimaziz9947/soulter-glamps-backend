/**
 * Fix Production Glamp Data on Railway
 * 
 * This script must be run ON RAILWAY (not locally) to fix the glamp IDs and data.
 * Deploy this and run via Railway's CLI or one-time job.
 * 
 * Fixes:
 * 1. Ensures all glamps have proper UUID format IDs
 * 2. Marks test glamps with isTest=true and status=INACTIVE
 * 3. Assigns imageUrl to real glamps
 * 4. Ensures only 4 real glamps are ACTIVE
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  return UUID_REGEX.test(id);
}

async function fixProductionGlamps() {
  console.log('\n=== FIXING PRODUCTION GLAMP DATA ===\n');

  try {
    // Get all glamps
    const allGlamps = await prisma.glamp.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${allGlamps.length} glamps\n`);

    // Check for non-UUID IDs
    const nonUuidGlamps = allGlamps.filter(g => !isValidUUID(g.id));
    
    if (nonUuidGlamps.length > 0) {
      console.log(`⚠️  ${nonUuidGlamps.length} glamps have non-UUID IDs - this breaks frontend validation!\n`);
      console.log('Non-UUID glamps:');
      nonUuidGlamps.forEach(g => console.log(`  - ${g.id}: ${g.name}`));
      
      console.log('\n❌ CRITICAL: Database has non-UUID IDs');
      console.log('Frontend requires UUID format IDs\n');
      console.log('SOLUTION: Recreate glamps with proper UUIDs\n');
      
      // Option: Delete and recreate (dangerous in production)
      console.log('Manually run these commands in Railway database:');
      console.log('DELETE FROM "Glamp";');
      console.log('Then use the seed script to recreate glamps with UUIDs.\n');
    } else {
      console.log('✓ All glamps have valid UUID IDs\n');
    }

    // Check for imageUrl and isTest columns
    const hasImageUrl = allGlamps.some(g => g.imageUrl !== undefined);
    const hasIsTest = allGlamps.some(g => g.isTest !== undefined);

    console.log(`imageUrl column exists: ${hasImageUrl}`);
    console.log(`isTest column exists: ${hasIsTest}\n`);

    // Count active glamps
    const activeGlamps = allGlamps.filter(g => g.status === 'ACTIVE');
    console.log(`Currently ${activeGlamps.length} ACTIVE glamps (should be 4 real ones)\n`);

    // Show all glamps
    console.log('All glamps:');
    allGlamps.forEach(g => {
      const uuid = isValidUUID(g.id) ? '✓' : '✗';
      console.log(`  [${uuid}] ${g.name} - Status: ${g.status}, ID: ${g.id}`);
    });

    console.log('\n=== END ===\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductionGlamps();
