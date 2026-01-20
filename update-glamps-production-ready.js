/**
 * Production-Ready Glamp Update Script
 * 
 * Purpose:
 * - Mark test/demo glamps as INACTIVE
 * - Assign imageUrl to real production glamps
 * - Idempotent: safe to run multiple times
 * 
 * Usage: node update-glamps-production-ready.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test glamp name patterns
const TEST_PATTERNS = [
  /test/i,
  /demo/i,
  /sample/i,
  /placeholder/i,
  /example/i,
  /temp/i,
];

// Image URL mapping for real glamps
const GLAMP_IMAGE_MAPPING = {
  'Premium Private Glamp': '/images/glamps/glamp1.jpg',
  // Additional mappings can be added here
};

// Default images for other real glamps
const DEFAULT_IMAGES = [
  '/images/glamps/glamp2.jpg',
  '/images/glamps/glamp3.jpg',
  '/images/glamps/glamp4.jpg',
];

/**
 * Check if glamp name matches test patterns
 */
function isTestGlamp(name) {
  return TEST_PATTERNS.some(pattern => pattern.test(name));
}

/**
 * Main update function
 */
async function updateGlampsForProduction() {
  console.log('\n========================================');
  console.log('GLAMP PRODUCTION UPDATE SCRIPT');
  console.log('========================================\n');

  try {
    // Step 1: Fetch all glamps
    console.log('📋 STEP 1: Fetching all glamps from database...\n');
    
    const allGlamps = await prisma.glamp.findMany({
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${allGlamps.length} glamps in database:\n`);
    console.log('ID'.padEnd(40) + ' | Name'.padEnd(40) + ' | Status'.padEnd(15) + ' | isTest');
    console.log('-'.repeat(120));
    
    allGlamps.forEach(glamp => {
      const isTest = glamp.isTest !== undefined ? glamp.isTest : 'N/A';
      console.log(
        glamp.id.padEnd(40) + ' | ' +
        glamp.name.padEnd(40) + ' | ' +
        glamp.status.padEnd(15) + ' | ' +
        isTest
      );
    });

    // Step 2: Identify test and real glamps
    console.log('\n\n📋 STEP 2: Identifying test vs real glamps...\n');

    const testGlamps = [];
    const realGlamps = [];

    allGlamps.forEach(glamp => {
      if (isTestGlamp(glamp.name)) {
        testGlamps.push(glamp);
      } else {
        realGlamps.push(glamp);
      }
    });

    console.log(`✓ Identified ${testGlamps.length} TEST glamps:`);
    testGlamps.forEach(g => console.log(`  - ${g.name} (${g.id})`));
    
    console.log(`\n✓ Identified ${realGlamps.length} REAL glamps:`);
    realGlamps.forEach(g => console.log(`  - ${g.name} (${g.id})`));

    // Step 3: Update test glamps to INACTIVE
    console.log('\n\n🔧 STEP 3: Marking test glamps as INACTIVE...\n');

    const testUpdates = [];
    for (const glamp of testGlamps) {
      if (glamp.status !== 'INACTIVE') {
        const updated = await prisma.glamp.update({
          where: { id: glamp.id },
          data: { 
            status: 'INACTIVE',
            isTest: true, // Also mark isTest flag
          },
        });
        testUpdates.push(updated);
        console.log(`✓ UPDATED: "${glamp.name}" → status=INACTIVE, isTest=true`);
      } else {
        console.log(`⊘ SKIPPED: "${glamp.name}" already INACTIVE`);
      }
    }

    // Step 4: Assign imageUrl to real glamps
    console.log('\n\n🖼️  STEP 4: Assigning imageUrl to real glamps...\n');

    const imageUpdates = [];
    let imageIndex = 0;

    for (const glamp of realGlamps) {
      // Check if specific mapping exists
      let imageUrl = GLAMP_IMAGE_MAPPING[glamp.name];
      
      // Otherwise assign from default pool
      if (!imageUrl && imageIndex < DEFAULT_IMAGES.length) {
        imageUrl = DEFAULT_IMAGES[imageIndex];
        imageIndex++;
      }

      if (imageUrl) {
        // Only update if imageUrl is different or not set
        if (glamp.imageUrl !== imageUrl) {
          const updated = await prisma.glamp.update({
            where: { id: glamp.id },
            data: { 
              imageUrl,
              isTest: false, // Ensure real glamps are marked as non-test
            },
          });
          imageUpdates.push(updated);
          console.log(`✓ UPDATED: "${glamp.name}" → imageUrl="${imageUrl}"`);
        } else {
          console.log(`⊘ SKIPPED: "${glamp.name}" already has imageUrl="${imageUrl}"`);
        }
      } else {
        console.log(`⚠ WARNING: No image URL available for "${glamp.name}"`);
      }
    }

    // Step 5: Summary
    console.log('\n\n========================================');
    console.log('UPDATE SUMMARY');
    console.log('========================================\n');

    console.log(`📊 Total glamps processed: ${allGlamps.length}`);
    console.log(`   - Real glamps: ${realGlamps.length}`);
    console.log(`   - Test glamps: ${testGlamps.length}\n`);

    console.log(`✓ Status updates: ${testUpdates.length} glamps marked INACTIVE`);
    testUpdates.forEach(g => console.log(`   - ${g.name}`));

    console.log(`\n✓ Image updates: ${imageUpdates.length} glamps assigned imageUrl`);
    imageUpdates.forEach(g => console.log(`   - ${g.name} → ${g.imageUrl}`));

    // Step 6: Verify final state
    console.log('\n\n📋 FINAL STATE: Public-facing glamps (ACTIVE only):\n');

    const publicGlamps = await prisma.glamp.findMany({
      where: {
        status: 'ACTIVE',
        isTest: false,
      },
      orderBy: { name: 'asc' },
    });

    console.log('Name'.padEnd(40) + ' | imageUrl');
    console.log('-'.repeat(80));
    publicGlamps.forEach(g => {
      console.log(
        g.name.padEnd(40) + ' | ' + (g.imageUrl || '(not set)')
      );
    });

    console.log(`\n✅ SUCCESS: ${publicGlamps.length} glamps will appear on customer site`);
    console.log('\n========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR during update:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateGlampsForProduction()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
