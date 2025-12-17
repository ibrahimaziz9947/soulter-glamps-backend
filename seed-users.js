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

// System users with login credentials (EXACT emails as per spec)
const systemUsers = [
  {
    email: 'superadmin@soulter.com',
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
      // Check if password is already hashed (starts with $2b$ for bcrypt)
      const isAlreadyHashed = userData.password.startsWith('$2b$');
      const passwordToUse = isAlreadyHashed ? userData.password : await hashPassword(userData.password);

      // Use upsert for idempotent seeding
      const result = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          // Only update if user exists but data changed
          role: userData.role,
          name: userData.name,
          active: true,
          // Never re-hash password if already hashed
        },
        create: {
          email: userData.email,
          password: passwordToUse,
          role: userData.role,
          name: userData.name,
          active: true,
        },
      });

      // Check if this was a creation or update
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
        select: { createdAt: true, updatedAt: true },
      });

      if (existingUser.createdAt.getTime() === existingUser.updatedAt.getTime()) {
        console.log(`✅ Created: ${userData.email} (${userData.role})`);
        created++;
      } else {
        console.log(`✅ Already exists (verified): ${userData.email} (${userData.role})`);
        existing++;
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
