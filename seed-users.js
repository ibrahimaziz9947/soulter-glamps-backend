# Seed script to ensure required users exist
# Run this script to create or reset the 3 main users

import prisma from './src/config/prisma.js';
import { hashPassword } from './src/utils/hash.js';

const requiredUsers = [
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
  {
    email: 'super@soulter.com',
    password: 'super123',
    role: 'SUPER_ADMIN',
    name: 'Super Admin',
  },
];

async function seedUsers() {
  console.log('\n========================================');
  console.log('🌱 Seeding Required Users');
  console.log('========================================\n');

  try {
    for (const userData of requiredUsers) {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`✅ User already exists: ${userData.email} (${userData.role})`);
        
        // Optionally update password if needed
        // const hashedPassword = await hashPassword(userData.password);
        // await prisma.user.update({
        //   where: { email: userData.email },
        //   data: { password: hashedPassword },
        // });
        // console.log(`   Password updated`);
      } else {
        // Create new user
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
        console.log(`✅ User created: ${userData.email} (${userData.role})`);
      }
    }

    console.log('\n========================================');
    console.log('✅ Seeding completed successfully');
    console.log('========================================\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedUsers();
