-- Add availability column to Glamp table
-- Safe to run multiple times

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Glamp' AND column_name = 'availability'
  ) THEN
    ALTER TABLE "Glamp" ADD COLUMN "availability" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Create index on availability
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'Glamp' AND indexname = 'Glamp_availability_idx'
  ) THEN
    CREATE INDEX "Glamp_availability_idx" ON "Glamp"("availability");
  END IF;
END $$;
