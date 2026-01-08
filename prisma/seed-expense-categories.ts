import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed script for ExpenseCategory records
 * This script is idempotent - it will not create duplicates
 */
async function seedExpenseCategories() {
  console.log('🌱 Seeding ExpenseCategory records...\n');

  const categories = [
    {
      name: 'Utilities',
      description: 'Electricity, water, internet, and other utility expenses',
      active: true,
    },
    {
      name: 'Staff',
      description: 'Staff salaries, bonuses, and employee-related expenses',
      active: true,
    },
    {
      name: 'Maintenance',
      description: 'Property maintenance, repairs, and equipment upkeep',
      active: true,
    },
    {
      name: 'Housekeeping',
      description: 'Cleaning supplies, laundry, and housekeeping services',
      active: true,
    },
    {
      name: 'Transportation',
      description: 'Vehicle expenses, fuel, and transportation services',
      active: true,
    },
    {
      name: 'Marketing',
      description: 'Advertising, promotions, and marketing campaigns',
      active: true,
    },
    {
      name: 'Food & Beverage',
      description: 'Food supplies, beverages, and dining-related expenses',
      active: true,
    },
  ];

  let createdCount = 0;
  let existingCount = 0;

  for (const category of categories) {
    try {
      // Check if category already exists
      const existingCategory = await prisma.expenseCategory.findUnique({
        where: { name: category.name },
      });

      if (existingCategory) {
        console.log(`✓ Category already exists: ${category.name}`);
        existingCount++;
      } else {
        // Create new category
        await prisma.expenseCategory.create({
          data: category,
        });
        console.log(`✨ Category created: ${category.name}`);
        createdCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing category "${category.name}":`, error);
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`   - Created: ${createdCount}`);
  console.log(`   - Already existed: ${existingCount}`);
  console.log(`   - Total: ${categories.length}`);
  console.log('\n✅ ExpenseCategory seeding completed!\n');
}

// Main execution
seedExpenseCategories()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
