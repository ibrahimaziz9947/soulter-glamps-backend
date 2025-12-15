// Quick script to check existing users
import prisma from './src/config/prisma.js';

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
      },
    });

    console.log('\n========================================');
    console.log('📋 Current Users in Database:');
    console.log('========================================\n');

    if (users.length === 0) {
      console.log('❌ No users found in database!\n');
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Active: ${user.active}`);
        console.log('---');
      });
      console.log(`\nTotal users: ${users.length}\n`);
    }

    // Check for required users
    const requiredUsers = [
      { email: 'admin@soulter.com', role: 'ADMIN' },
      { email: 'agent@soulter.com', role: 'AGENT' },
      { email: 'super@soulter.com', role: 'SUPER_ADMIN' },
    ];

    console.log('========================================');
    console.log('✅ Required Users Check:');
    console.log('========================================\n');

    for (const required of requiredUsers) {
      const exists = users.find(u => u.email === required.email && u.role === required.role);
      if (exists) {
        console.log(`✅ ${required.role}: ${required.email} - EXISTS`);
      } else {
        console.log(`❌ ${required.role}: ${required.email} - MISSING`);
      }
    }
    console.log('\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkUsers();
