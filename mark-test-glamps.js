/**
 * Mark test glamps with isTest=true
 * Run this once after applying the isTest migration
 */

import prisma from './src/config/prisma.js';

async function markTestGlamps() {
  console.log('\n========================================');
  console.log('🔧 Marking Test Glamps');
  console.log('========================================\n');

  try {
    // Find all glamps with "Test" in the name
    const testGlamps = await prisma.glamp.findMany({
      where: {
        OR: [
          { name: { contains: 'Test', mode: 'insensitive' } },
          { name: { contains: 'test', mode: 'insensitive' } },
        ]
      }
    });

    if (testGlamps.length === 0) {
      console.log('ℹ️  No test glamps found with "test" in name');
    } else {
      console.log(`Found ${testGlamps.length} test glamp(s):\n`);
      
      for (const glamp of testGlamps) {
        console.log(`  - ${glamp.name}`);
        console.log(`    Current isTest: ${glamp.isTest}`);
        
        if (!glamp.isTest) {
          await prisma.glamp.update({
            where: { id: glamp.id },
            data: { isTest: true }
          });
          console.log(`    ✅ Updated to isTest=true\n`);
        } else {
          console.log(`    ℹ️  Already marked as test\n`);
        }
      }
    }

    console.log('========================================');
    console.log('✅ Test glamp marking completed');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

markTestGlamps();
