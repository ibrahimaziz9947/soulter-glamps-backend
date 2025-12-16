// ============================================
// SEED SCRIPT - System Users Only
// ============================================
// This script seeds ONLY system operator accounts (SUPER_ADMIN, ADMIN, AGENT)
// 
// IMPORTANT: CUSTOMER users are NOT seeded here
// - CUSTOMER is a business entity, not a system operator
// - CUSTOMER records are created dynamically during booking flow
// - CUSTOMER users do NOT require login credentials
// - This approach maintains clear separation between operators and customers
//
// This script is idempotent - safe to run multiple times

import prisma from './src/config/prisma.js';
import { hashPassword } from './src/utils/hash.js';

// System users with login credentials
const systemUsers = [
  {
    email: 'super@soulter.com',
    password: 'super123',
    role: 'SUPER_ADMIN',
    name: 'Super Admin',
  },
  {
    email: 'admin@soulter.com',
    password: 'admin123',
    role: 'ADMIN',
    name: 'Admin User',
  },
  {
    email: 'agent@soulter.com',
    password: 'agent123',
    role: 'AGENT',
    name: 'Agent User',
  },
];

async function seedSystemUsers() {
  console.log('\n========================================');
  console.log('🌱 Seeding System Users (Operators Only)');
  console.log('========================================');
  console.log('ℹ️  NOTE: CUSTOMER users are NOT seeded');
  console.log('   Customers are created during booking flow\n');

  let created = 0;
  let existing = 0;

  try {
    for (const userData of systemUsers) {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`✅ Already exists: ${userData.email} (${userData.role})`);
        existing++;
      } else {
        // Create new user with hashed password
        const hashedPassword = await hashPassword(userData.password);
        await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            name: userData.name,
            active: true,
          },
        });
        console.log(`✅ Created: ${userData.email} (${userData.role})`);
        created++;
      }
    }

    console.log('\n========================================');
    console.log(`✅ Seeding completed`);
    console.log(`   Created: ${created} | Existing: ${existing}`);
    console.log('========================================\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedSystemUsers();
