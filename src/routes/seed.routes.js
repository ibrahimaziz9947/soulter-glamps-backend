/**
 * Temporary Seed Route - FOR PRODUCTION SETUP ONLY
 * DELETE THIS FILE AFTER SEEDING
 */

import express from 'express';
import prisma from '../config/prisma.js';
import { hashPassword } from '../utils/hash.js';

const router = express.Router();

// System users with login credentials
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

/**
 * TEMPORARY ENDPOINT - Seed system users in production
 * Access: https://your-railway-url.up.railway.app/api/seed/users
 * DELETE THIS ROUTE AFTER USE
 */
router.post('/users', async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🌱 Seeding System Users via API');
    console.log('========================================\n');

    let created = 0;
    let existing = 0;

    for (const userData of systemUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⏭️  User already exists: ${userData.email}`);
        existing++;
        continue;
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user
      await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          name: userData.name,
          active: true,
        },
      });

      console.log(`✅ Created: ${userData.name} (${userData.email})`);
      created++;
    }

    console.log('\n========================================');
    console.log('✅ User seeding completed');
    console.log(`   Created: ${created} | Existing: ${existing}`);
    console.log('========================================\n');

    res.json({
      success: true,
      message: 'System users seeded successfully',
      stats: {
        created,
        existing,
        total: systemUsers.length,
      },
      users: systemUsers.map(u => ({
        email: u.email,
        role: u.role,
        name: u.name,
        password: '(hidden)', // Don't expose passwords in response
      })),
    });
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed users',
      details: error.message,
    });
  }
});

export default router;
