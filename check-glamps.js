import prisma from './src/config/prisma.js';

async function checkGlamps() {
  try {
    const glamps = await prisma.glamp.findMany({
      select: { id: true, name: true, isTest: true }
    });
    
    console.log('\nAll Glamps in Database:');
    console.log('=======================');
    glamps.forEach(g => {
      console.log(`- ${g.name}`);
      console.log(`  ID: ${g.id}`);
      console.log(`  isTest: ${g.isTest || false}`);
    });
    
    // Identify test glamps (ones with "Test" in name)
    const testGlamps = glamps.filter(g => g.name.toLowerCase().includes('test'));
    if (testGlamps.length > 0) {
      console.log('\nTest Glamps Found:');
      console.log('==================');
      testGlamps.forEach(g => console.log(`- ${g.name} (${g.id})`));
    } else {
      console.log('\nNo test glamps found with "test" in name');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGlamps();
