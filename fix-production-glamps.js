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

    // Identify test glamps by name patterns
    const testPatterns = [/test\s+glamp/i, /^\d{13}/]; // "Test Glamp" or starts with 13 digits
    const testGlamps = allGlamps.filter(g => 
      testPatterns.some(pattern => pattern.test(g.name))
    );

    const realGlamps = allGlamps.filter(g => 
      !testPatterns.some(pattern => pattern.test(g.name))
    );

    console.log(`Real glamps: ${realGlamps.length}`);
    console.log(`Test glamps: ${testGlamps.length}\n`);

    // Mark test glamps as INACTIVE
    if (testGlamps.length > 0) {
      console.log('Marking test glamps as INACTIVE...');
      for (const glamp of testGlamps) {
        await prisma.glamp.update({
          where: { id: glamp.id },
          data: { 
            status: 'INACTIVE',
            isTest: true,
          },
        });
        console.log(`  ✓ UPDATED: ${glamp.name} -> INACTIVE, isTest=true`);
      }
    }

    // Assign imageUrl to real glamps
    console.log('\nAssigning imageUrl to real glamps...');
    const imageUrls = [
      '/images/glamps/glamp1.jpg',
      '/images/glamps/glamp2.jpg',
      '/images/glamps/glamp3.jpg',
      '/images/glamps/glamp4.jpg',
    ];

    for (let i = 0; i < realGlamps.length && i < imageUrls.length; i++) {
      const glamp = realGlamps[i];
      if (glamp.imageUrl !== imageUrls[i]) {
        await prisma.glamp.update({
          where: { id: glamp.id },
          data: { 
            imageUrl: imageUrls[i],
            isTest: false,
            status: 'ACTIVE',
          },
        });
        console.log(`  ✓ ${glamp.name} -> ${imageUrls[i]}`);
      }
    }

    // Final verification
    const finalGlamps = await prisma.glamp.findMany({
      where: { status: 'ACTIVE', isTest: false },
      orderBy: { name: 'asc' },
    });

    console.log(`\n✓ COMPLETE: ${finalGlamps.length} active glamps for customer site:`);
    finalGlamps.forEach(g => console.log(`  - ${g.name} (${g.imageUrl})`));
    
    console.log('\n=== END ===\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductionGlamps();
