# Quick Railway Migration via CLI
# Uses Railway CLI to execute migration directly on production database

Write-Host "`n=== RAILWAY MIGRATION - QUICK FIX ===" -ForegroundColor Cyan

# Check if railway CLI is available
try {
    railway --version | Out-Null
} catch {
    Write-Host "❌ Railway CLI not found. Install it:" -ForegroundColor Red
    Write-Host "   npm i -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Railway CLI found" -ForegroundColor Green

# Method 1: Use railway run to execute prisma migrate deploy
Write-Host "`n--- Method 1: Prisma Migrate Deploy ---" -ForegroundColor Yellow
Write-Host "Running: railway run npx prisma migrate deploy`n"

railway run npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migration deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠ Migration deploy failed. Trying db push..." -ForegroundColor Yellow
    
    # Method 2: Force schema sync (use with caution in production)
    Write-Host "`n--- Method 2: Prisma DB Push (Force Sync) ---" -ForegroundColor Yellow
    Write-Host "Running: railway run npx prisma db push --accept-data-loss`n"
    
    railway run npx prisma db push --accept-data-loss
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Schema pushed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Both methods failed. Manual intervention needed." -ForegroundColor Red
        exit 1
    }
}

# Verify the fix
Write-Host "`n--- Testing Public Endpoint ---" -ForegroundColor Yellow
Start-Sleep -Seconds 3  # Wait for Railway to restart

try {
    $response = Invoke-RestMethod -Uri "https://soulter-backend.up.railway.app/api/glamps" -Method GET
    Write-Host "✅ /api/glamps returned $($response.Count) glamps" -ForegroundColor Green
    $response | Select-Object -First 3 | ForEach-Object {
        Write-Host "   - $($_.name)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠ Endpoint test failed (may need time to restart)" -ForegroundColor Yellow
    Write-Host "Try manually: curl https://soulter-backend.up.railway.app/api/glamps"
}

Write-Host "`n✅ COMPLETE" -ForegroundColor Green
