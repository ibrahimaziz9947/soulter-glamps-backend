-- Add imageUrl and isTest columns to Glamp table
-- This migration is safe to run multiple times (checks if columns exist first)

-- Add imageUrl column (nullable)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Glamp' AND column_name = 'imageUrl'
  ) THEN
    ALTER TABLE "Glamp" ADD COLUMN "imageUrl" TEXT;
  END IF;
END $$;

-- Add isTest column with default false
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Glamp' AND column_name = 'isTest'
  ) THEN
    ALTER TABLE "Glamp" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index on isTest (if doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'Glamp' AND indexname = 'Glamp_isTest_idx'
  ) THEN
    CREATE INDEX "Glamp_isTest_idx" ON "Glamp"("isTest");
  END IF;
END $$;
