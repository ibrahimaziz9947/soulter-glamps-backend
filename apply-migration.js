// Temporary script to apply the purchase payment tracking migration
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Applying purchase payment tracking migration...');
    
    await prisma.$executeRawUnsafe(`
      -- Create PurchasePaymentStatus enum if it doesn't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PurchasePaymentStatus') THEN
          CREATE TYPE "PurchasePaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');
        END IF;
      END $$;
    `);
    
    console.log('✅ Created PurchasePaymentStatus enum');
    
    await prisma.$executeRawUnsafe(`
      -- Add columns if they don't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Purchase' AND column_name='paymentStatus') THEN
          ALTER TABLE "Purchase" 
          ADD COLUMN "paymentStatus" "PurchasePaymentStatus" NOT NULL DEFAULT 'UNPAID',
          ADD COLUMN "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
          ADD COLUMN "dueDate" TIMESTAMP(3),
          ADD COLUMN "paidAt" TIMESTAMP(3);
        END IF;
      END $$;
    `);
    
    console.log('✅ Added payment tracking columns to Purchase table');
    
    await prisma.$executeRawUnsafe(`
      -- Create index if it doesn't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Purchase_paymentStatus_idx') THEN
          CREATE INDEX "Purchase_paymentStatus_idx" ON "Purchase"("paymentStatus");
        END IF;
      END $$;
    `);
    
    console.log('✅ Created payment status index');
    console.log('🎉 Migration applied successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
