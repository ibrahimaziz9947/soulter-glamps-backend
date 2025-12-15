// Test if user passwords are correctly hashed
import prisma from './src/config/prisma.js';
import { comparePassword } from './src/utils/hash.js';

async function testPasswords() {
  try {
    const testCases = [
      { email: 'admin@soulter.com', password: 'admin123', expectedRole: 'ADMIN' },
      { email: 'agent@soulter.com', password: 'agent123', expectedRole: 'AGENT' },
      { email: 'super@soulter.com', password: 'super123', expectedRole: 'SUPER_ADMIN' },
    ];

    console.log('\n========================================');
    console.log('🔐 Testing User Passwords:');
    console.log('========================================\n');

    for (const test of testCases) {
      const user = await prisma.user.findUnique({
        where: { email: test.email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
        },
      });

      if (!user) {
        console.log(`❌ ${test.expectedRole}: User ${test.email} not found`);
        continue;
      }

      const passwordMatch = await comparePassword(test.password, user.password);
      const roleMatch = user.role === test.expectedRole;

      if (passwordMatch && roleMatch) {
        console.log(`✅ ${test.expectedRole}: ${test.email}`);
        console.log(`   Password: CORRECT (${test.password})`);
        console.log(`   Role: CORRECT (${user.role})`);
      } else {
        console.log(`❌ ${test.expectedRole}: ${test.email}`);
        if (!passwordMatch) {
          console.log(`   Password: INCORRECT (expected: ${test.password})`);
        }
        if (!roleMatch) {
          console.log(`   Role: INCORRECT (expected: ${test.expectedRole}, got: ${user.role})`);
        }
      }
      console.log('');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testPasswords();
