# Apply glamp schema migration to Railway database
# This adds imageUrl and isTest columns safely

Write-Host "`n=== APPLYING GLAMP MIGRATION TO RAILWAY ===" -ForegroundColor Cyan

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL not set. Please run:" -ForegroundColor Red
    Write-Host "   railway variables" -ForegroundColor Yellow
    Write-Host "Then set the DATABASE_URL environment variable." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ DATABASE_URL configured" -ForegroundColor Green

# Run Prisma migrate deploy (production-safe)
Write-Host "`nRunning: npx prisma migrate deploy" -ForegroundColor Yellow
Write-Host "This will apply pending migrations to production database...`n"

npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migration applied successfully!" -ForegroundColor Green
    
    # Verify columns exist
    Write-Host "`nVerifying schema..." -ForegroundColor Yellow
    npx prisma db execute --stdin <<EOF
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Glamp' 
  AND column_name IN ('imageUrl', 'isTest')
ORDER BY column_name;
EOF
    
    Write-Host "`n✅ Railway database schema updated!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart Railway deployment (automatic after push)" -ForegroundColor White
    Write-Host "  2. Test: curl https://soulter-backend.up.railway.app/api/glamps" -ForegroundColor White
    
} else {
    Write-Host "`n❌ Migration failed!" -ForegroundColor Red
    Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
