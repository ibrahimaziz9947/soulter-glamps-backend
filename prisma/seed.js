import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password function
  const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  };

  // Create SUPER_ADMIN
  const superAdminPassword = await hashPassword('super123');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@soulter.com' },
    update: {
      password: superAdminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      active: true,
    },
    create: {
      email: 'super@soulter.com',
      password: superAdminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      active: true,
    },
  });
  console.log('✅ SUPER_ADMIN created:', superAdmin.email);

  // Create ADMIN
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@soulter.com' },
    update: {
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      active: true,
    },
    create: {
      email: 'admin@soulter.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      active: true,
    },
  });
  console.log('✅ ADMIN created:', admin.email);

  // Create AGENT
  const agentPassword = await hashPassword('agent123');
  const agent = await prisma.user.upsert({
    where: { email: 'agent@soulter.com' },
    update: {
      password: agentPassword,
      name: 'Agent User',
      role: 'AGENT',
      active: true,
    },
    create: {
      email: 'agent@soulter.com',
      password: agentPassword,
      name: 'Agent User',
      role: 'AGENT',
      active: true,
    },
  });
  console.log('✅ AGENT created:', agent.email);

  console.log('🎉 Seed completed successfully!');
  console.log('\nTest Credentials:');
  console.log('─────────────────────────────────────');
  console.log('SUPER_ADMIN: super@soulter.com / super123');
  console.log('ADMIN:       admin@soulter.com / admin123');
  console.log('AGENT:       agent@soulter.com / agent123');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
