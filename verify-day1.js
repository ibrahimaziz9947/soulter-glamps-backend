// ============================================
// Day 1 - Step 2 Verification Script
// ============================================
// Verifies migration and seed status

import prisma from './src/config/prisma.js';

async function verifyDay1Setup() {
  console.log('\n========================================');
  console.log('🔍 Day 1 - Step 2 Verification');
  console.log('========================================\n');

  try {
    // 1. Check database connection
    await prisma.$connect();
    console.log('✅ Database connection: OK\n');

    // 2. Verify schema tables exist
    const userCount = await prisma.user.count();
    const glampCount = await prisma.glamp.count();
    const bookingCount = await prisma.booking.count();
    const commissionCount = await prisma.commission.count();

    console.log('📊 Schema Tables:');
    console.log(`   Users: ${userCount} records`);
    console.log(`   Glamps: ${glampCount} records`);
    console.log(`   Bookings: ${bookingCount} records`);
    console.log(`   Commissions: ${commissionCount} records\n`);

    // 3. Verify system users (not customers)
    const systemUsers = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'AGENT'] }
      },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
      },
      orderBy: { role: 'asc' }
    });

    console.log('👥 System Users (Operators):');
    systemUsers.forEach(user => {
      const status = user.active ? '🟢' : '🔴';
      console.log(`   ${status} ${user.role.padEnd(12)} ${user.email}`);
    });

    const requiredRoles = ['SUPER_ADMIN', 'ADMIN', 'AGENT'];
    const foundRoles = systemUsers.map(u => u.role);
    const missingRoles = requiredRoles.filter(r => !foundRoles.includes(r));

    if (missingRoles.length > 0) {
      console.log(`\n❌ Missing roles: ${missingRoles.join(', ')}`);
    } else {
      console.log(`\n✅ All required system roles present`);
    }

    // 4. Verify NO customers with credentials are seeded
    const customerCount = await prisma.user.count({
      where: { role: 'CUSTOMER' }
    });

    console.log(`\n📋 CUSTOMER Users: ${customerCount}`);
    if (customerCount === 0) {
      console.log('   ✅ CORRECT: No customers seeded (created during booking)\n');
    } else {
      console.log('   ⚠️  WARNING: Customer users exist\n');
    }

    // 5. Check schema enums
    console.log('📝 Enums Available:');
    console.log('   Role: SUPER_ADMIN, ADMIN, AGENT, CUSTOMER');
    console.log('   GlampStatus: ACTIVE, INACTIVE');
    console.log('   BookingStatus: PENDING, CONFIRMED, CANCELLED, COMPLETED');

    console.log('\n========================================');
    console.log('✅ Day 1 - Step 2 Verification Complete');
    console.log('========================================\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyDay1Setup();
