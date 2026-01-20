/**
 * Diagnose Glamp ID Format Issue
 * 
 * Check if glamps have valid UUID format IDs
 * Frontend expects UUID format but database may have old integer IDs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// UUID regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  return UUID_REGEX.test(id);
}

async function diagnoseGlamps() {
  console.log('\n========================================');
  console.log('GLAMP ID FORMAT DIAGNOSTIC');
  console.log('========================================\n');

  try {
    const glamps = await prisma.glamp.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        isTest: true,
        imageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${glamps.length} glamps in database:\n`);

    console.log('ID'.padEnd(40) + ' | Valid UUID? | Name'.padEnd(30) + ' | Status');
    console.log('-'.repeat(110));

    let uuidCount = 0;
    let nonUuidCount = 0;

    glamps.forEach(glamp => {
      const isUuid = isValidUUID(glamp.id);
      if (isUuid) uuidCount++;
      else nonUuidCount++;

      console.log(
        glamp.id.padEnd(40) + ' | ' +
        (isUuid ? '✓ YES' : '✗ NO ').padEnd(12) + ' | ' +
        glamp.name.padEnd(30) + ' | ' +
        glamp.status
      );
    });

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================\n');

    console.log(`Total glamps: ${glamps.length}`);
    console.log(`Valid UUID format: ${uuidCount}`);
    console.log(`Non-UUID format: ${nonUuidCount}`);

    if (nonUuidCount > 0) {
      console.log('\n⚠️  PROBLEM IDENTIFIED:');
      console.log(`${nonUuidCount} glamps have non-UUID IDs (likely old integer IDs)`);
      console.log('Frontend validation rejects non-UUID IDs\n');

      console.log('SOLUTION OPTIONS:');
      console.log('1. Migrate old IDs to UUID format (requires data migration)');
      console.log('2. Update frontend to accept both UUID and integer IDs');
      console.log('3. Delete old glamps and recreate with UUID IDs\n');

      console.log('Glamps with non-UUID IDs:');
      glamps.filter(g => !isValidUUID(g.id)).forEach(g => {
        console.log(`  - ID: ${g.id}, Name: ${g.name}`);
      });
    } else {
      console.log('\n✓ All glamps have valid UUID format IDs');
      console.log('The ID format is NOT the issue.');
      console.log('Check frontend filtering logic for other issues.\n');
    }

    // Check ACTIVE glamps specifically
    const activeGlamps = glamps.filter(g => g.status === 'ACTIVE' && !g.isTest);
    const activeUuidGlamps = activeGlamps.filter(g => isValidUUID(g.id));

    console.log('\n========================================');
    console.log('CUSTOMER-FACING GLAMPS (ACTIVE, non-test)');
    console.log('========================================\n');

    console.log(`Total ACTIVE glamps: ${activeGlamps.length}`);
    console.log(`With valid UUID: ${activeUuidGlamps.length}`);
    console.log(`Without valid UUID: ${activeGlamps.length - activeUuidGlamps.length}\n`);

    if (activeUuidGlamps.length > 0) {
      console.log('Glamps that SHOULD appear on customer site:');
      activeUuidGlamps.forEach(g => {
        console.log(`  ✓ ${g.name} (${g.id})`);
      });
    } else {
      console.log('❌ NO glamps will appear on customer site due to UUID validation!');
    }

    console.log('\n========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseGlamps();
