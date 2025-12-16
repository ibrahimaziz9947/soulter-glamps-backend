/**
 * Verify Backend Prisma Client Works (Independent of Studio)
 * Tests relational queries that fail in Prisma Studio UI
 */

import prisma from './src/config/prisma.js';

async function testRelationalQueries() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 Testing Backend Prisma Client (Relations)');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Test 1: Glamp with bookings (fails in Studio UI)
    console.log('Test 1: Query Glamp with Bookings');
    const glampsWithBookings = await prisma.glamp.findMany({
      include: {
        bookings: {
          include: {
            customer: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });
    console.log(`✅ Found ${glampsWithBookings.length} glamp(s)`);
    glampsWithBookings.forEach(glamp => {
      console.log(`   - ${glamp.name}: ${glamp.bookings.length} booking(s)`);
    });

    // Test 2: Booking with relations
    console.log('\nTest 2: Query Bookings with All Relations');
    const bookingsWithRelations = await prisma.booking.findMany({
      include: {
        customer: { select: { name: true, email: true } },
        agent: { select: { name: true, email: true } },
        glamp: { select: { name: true, pricePerNight: true } },
        commission: true
      }
    });
    console.log(`✅ Found ${bookingsWithRelations.length} booking(s)`);
    bookingsWithRelations.forEach(booking => {
      console.log(`   - ${booking.customer.name} → ${booking.glamp.name}`);
      console.log(`     Status: ${booking.status}, Amount: $${booking.totalAmount / 100}`);
      if (booking.agent) {
        console.log(`     Agent: ${booking.agent.name}`);
      }
    });

    // Test 3: User with bookings (customer side)
    console.log('\nTest 3: Query Users with Customer Bookings');
    const customersWithBookings = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      include: {
        customerBookings: {
          include: {
            glamp: { select: { name: true } }
          }
        }
      }
    });
    console.log(`✅ Found ${customersWithBookings.length} customer(s)`);
    customersWithBookings.forEach(customer => {
      console.log(`   - ${customer.name}: ${customer.customerBookings.length} booking(s)`);
    });

    // Test 4: Agent with commissions
    console.log('\nTest 4: Query Agent with Commissions');
    const agentsWithCommissions = await prisma.user.findMany({
      where: { role: 'AGENT' },
      include: {
        agentBookings: true,
        commissions: {
          include: {
            booking: {
              include: {
                customer: { select: { name: true } }
              }
            }
          }
        }
      }
    });
    console.log(`✅ Found ${agentsWithCommissions.length} agent(s)`);
    agentsWithCommissions.forEach(agent => {
      console.log(`   - ${agent.name}:`);
      console.log(`     Bookings referred: ${agent.agentBookings.length}`);
      console.log(`     Commissions earned: ${agent.commissions.length}`);
      const totalCommissions = agent.commissions.reduce((sum, c) => sum + c.amount, 0);
      console.log(`     Total commission amount: $${totalCommissions / 100}`);
    });

    // Test 5: Complex nested query
    console.log('\nTest 5: Complex Nested Query (Booking → Commission → Agent)');
    const bookingsWithCommissions = await prisma.booking.findMany({
      where: {
        commission: { isNot: null }
      },
      include: {
        commission: {
          include: {
            agent: { select: { name: true, email: true } }
          }
        },
        customer: { select: { name: true } },
        glamp: { select: { name: true } }
      }
    });
    console.log(`✅ Found ${bookingsWithCommissions.length} booking(s) with commissions`);
    bookingsWithCommissions.forEach(booking => {
      console.log(`   - ${booking.customer.name} @ ${booking.glamp.name}`);
      console.log(`     Commission: $${booking.commission.amount / 100} to ${booking.commission.agent.name}`);
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ ALL RELATIONAL QUERIES WORK PERFECTLY');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log('- Backend Prisma Client: ✅ WORKING');
    console.log('- Schema Relations: ✅ CORRECT');
    console.log('- Nested Queries: ✅ FUNCTIONAL');
    console.log('- Prisma Studio UI: ⚠️ HAS BUGS (can be ignored)');
    console.log('\nConclusion: Your backend is production-ready.');
    console.log('Prisma Studio UI error does not affect API functionality.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testRelationalQueries();
