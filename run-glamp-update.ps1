# Run the glamp production update script
# This script is idempotent and safe to run multiple times

Write-Host "`n=== RUNNING GLAMP PRODUCTION UPDATE ===" -ForegroundColor Cyan
Write-Host "This will:"
Write-Host "  1. List all glamps in database"
Write-Host "  2. Mark test glamps as INACTIVE"
Write-Host "  3. Assign imageUrl to real glamps"
Write-Host "  4. Verify final public-facing glamps`n"

# Run the update script
node update-glamps-production-ready.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Update completed successfully!" -ForegroundColor Green
    
    # Test the public endpoint
    Write-Host "`n--- Testing public endpoint ---" -ForegroundColor Yellow
    Write-Host "Fetching GET /api/glamps (customer-facing)...`n"
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/glamps" -Method GET
        Write-Host "Public glamps endpoint returns $($response.Count) glamps:" -ForegroundColor Cyan
        $response | ForEach-Object {
            Write-Host "  ✓ $($_.name) - $($_.imageUrl)" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠ Could not test endpoint (server may not be running)" -ForegroundColor Yellow
        Write-Host "Error: $($_.Exception.Message)"
    }
    
} else {
    Write-Host "`n❌ Update failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host "`n=== COMPLETE ===" -ForegroundColor Cyan
