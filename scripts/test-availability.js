
import { checkAvailability } from '../src/services/booking.service.js';
import prisma from '../src/config/prisma.js';

async function main() {
  try {
    console.log('Fetching active glamps...');
    const glamps = await prisma.glamp.findMany({
      where: { status: 'ACTIVE' },
      take: 2
    });

    if (glamps.length < 2) {
      console.log('Not enough glamps to test multi-glamp availability.');
      return;
    }

    const glamp1 = glamps[0];
    const glamp2 = glamps[1];
    
    console.log(`Testing availability for Glamp 1: ${glamp1.name} (${glamp1.id})`);
    console.log(`Testing availability for Glamp 2: ${glamp2.name} (${glamp2.id})`);

    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 10); // 10 days from now
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2); // 2 nights

    console.log(`Checking dates: ${checkIn.toISOString()} to ${checkOut.toISOString()}`);

    // Test 1: Single Glamp
    console.log('\n--- Test 1: Single Glamp Check ---');
    const result1 = await checkAvailability(glamp1.id, checkIn, checkOut);
    console.log('Result 1:', result1.available ? 'Available' : 'Conflict');

    // Test 2: Multiple Glamps
    console.log('\n--- Test 2: Multiple Glamps Check ---');
    const result2 = await checkAvailability([glamp1.id, glamp2.id], checkIn, checkOut);
    console.log('Result 2:', result2.available ? 'Available' : 'Conflict');
    if (!result2.available) {
        console.log('Conflicts:', JSON.stringify(result2.conflicts, null, 2));
    }

    // Test 3: Multiple Glamps with String Input (should fail if not parsed by controller, but service expects array or string)
    // The service handles string or array.
    console.log('\n--- Test 3: Service robustness ---');
    const result3 = await checkAvailability(glamp1.id, checkIn, checkOut);
    console.log('Result 3 (Single string):', result3.available);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
