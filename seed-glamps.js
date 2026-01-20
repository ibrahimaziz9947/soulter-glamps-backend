/**
 * Seed Glamps for Development
 */

import prisma from './src/config/prisma.js';

async function seedGlamps() {
  console.log('\n========================================');
  console.log('🌱 Seeding Glamps');
  console.log('========================================\n');

  const glamps = [
    {
      name: 'Luxury Safari Tent',
      description: 'Experience luxury camping with a king-size bed, private bathroom, and stunning mountain views.',
      pricePerNight: 25000, // $250
      maxGuests: 2,
      status: 'ACTIVE',
      imageUrl: '/images/glamps/luxury-safari-tent.jpg',
    },
    {
      name: 'Family Dome',
      description: 'Spacious geodesic dome perfect for families. Features 2 bedrooms, kitchenette, and outdoor deck.',
      pricePerNight: 25000, // $250
      maxGuests: 6,
      status: 'ACTIVE',
      imageUrl: '/images/glamps/family-dome.jpg',
    },
    {
      name: 'Lakeside Cabin',
      description: 'Cozy cabin overlooking the lake. Wood-burning stove, full kitchen, and private dock.',
      pricePerNight: 20000, // $200
      maxGuests: 4,
      status: 'ACTIVE',
      imageUrl: '/images/glamps/lakeside-cabin.jpg',
    },
    {
      name: 'Treehouse Retreat',
      description: 'Elevated treehouse with 360-degree forest views. Perfect for a romantic getaway.',
      pricePerNight: 18000, // $180
      maxGuests: 2,
      status: 'ACTIVE',
      imageUrl: '/images/glamps/treehouse-retreat.jpg',
    },
  ];

  let created = 0;
  let existing = 0;

  for (const glampData of glamps) {
    const existingGlamp = await prisma.glamp.findFirst({
      where: { name: glampData.name },
    });

    if (existingGlamp) {
      // Update fields if they're missing or different
      const updateData = {};
      
      if (!existingGlamp.imageUrl && glampData.imageUrl) {
        updateData.imageUrl = glampData.imageUrl;
      }
      
      // Ensure isTest field is set
      if (existingGlamp.isTest === undefined || existingGlamp.isTest === null) {
        updateData.isTest = glampData.isTest || false;
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.glamp.update({
          where: { id: existingGlamp.id },
          data: updateData,
        });
        console.log(`✅ Updated: ${glampData.name}`);
      } else {
        console.log(`ℹ️  Already exists: ${glampData.name}`);
      }
      existing++;
    } else {
      await prisma.glamp.create({ data: glampData });
      console.log(`✅ Created: ${glampData.name}`);
      created++;
    }
  }

  console.log('\n========================================');
  console.log('✅ Glamp seeding completed');
  console.log(`   Created: ${created} | Existing: ${existing}`);
  console.log('========================================\n');

  await prisma.$disconnect();
}

seedGlamps().catch((error) => {
  console.error('❌ Error seeding glamps:', error);
  process.exit(1);
});
