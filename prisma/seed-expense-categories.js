import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedExpenseCategories() {
  console.log('🌱 Seeding ExpenseCategory records...\n');

  const categories = [
    { name: 'Utilities', description: 'Electricity, water, internet, and other utility expenses', active: true },
    { name: 'Staff', description: 'Staff salaries, bonuses, and employee-related expenses', active: true },
    { name: 'Maintenance', description: 'Property maintenance, repairs, and equipment upkeep', active: true },
    { name: 'Housekeeping', description: 'Cleaning supplies, laundry, and housekeeping services', active: true },
    { name: 'Transportation', description: 'Vehicle expenses, fuel, and transportation services', active: true },
    { name: 'Marketing', description: 'Advertising, promotions, and marketing campaigns', active: true },
    { name: 'Food & Beverage', description: 'Food supplies, beverages, and dining-related expenses', active: true },
  ];

  for (const category of categories) {
    const existing = await prisma.expenseCategory.findUnique({
      where: { name: category.name },
    });

    if (existing) {
      console.log(`✓ Category already exists: ${category.name}`);
    } else {
      await prisma.expenseCategory.create({ data: category });
      console.log(`✨ Category created: ${category.name}`);
    }
  }

  console.log('\n✅ ExpenseCategory seeding completed!\n');
}

seedExpenseCategories()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
