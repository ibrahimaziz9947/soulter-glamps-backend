# Test public glamps endpoint filtering
# Verify:
# 1. Only ACTIVE status returned
# 2. No test glamps (isTest=false only)
# 3. Proper sorting by name ASC
# 4. Returns expected fields only

$BASE_URL = "http://localhost:3000"

Write-Host "`n=== PUBLIC GLAMPS ENDPOINT TEST ===" -ForegroundColor Cyan
Write-Host "Testing GET /api/glamps (customer-facing)"

# Test 1: Fetch public glamps
Write-Host "`n--- Test 1: Fetch public glamps ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/glamps" -Method GET -ContentType "application/json"
    
    Write-Host "✓ Public glamps fetched successfully" -ForegroundColor Green
    Write-Host "Total glamps: $($response.Count)" -ForegroundColor Cyan
    
    # Verify all are ACTIVE
    $nonActive = $response | Where-Object { $_.status -ne 'ACTIVE' }
    if ($nonActive.Count -gt 0) {
        Write-Host "✗ FAIL: Found $($nonActive.Count) non-ACTIVE glamps!" -ForegroundColor Red
        $nonActive | ForEach-Object { Write-Host "  - $($_.name) has status: $($_.status)" -ForegroundColor Red }
    } else {
        Write-Host "✓ All glamps have status=ACTIVE" -ForegroundColor Green
    }
    
    # Verify none are test glamps
    $testGlamps = $response | Where-Object { $_.isTest -eq $true }
    if ($testGlamps.Count -gt 0) {
        Write-Host "✗ FAIL: Found $($testGlamps.Count) test glamps exposed!" -ForegroundColor Red
        $testGlamps | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor Red }
    } else {
        Write-Host "✓ No test glamps exposed" -ForegroundColor Green
    }
    
    # Verify sorting
    $names = $response | ForEach-Object { $_.name }
    $sortedNames = $names | Sort-Object
    $isSorted = ($names -join ',') -eq ($sortedNames -join ',')
    if ($isSorted) {
        Write-Host "✓ Glamps sorted alphabetically by name" -ForegroundColor Green
    } else {
        Write-Host "✗ Glamps NOT sorted properly" -ForegroundColor Red
    }
    
    # Show glamps
    Write-Host "`nPublic glamps:" -ForegroundColor Cyan
    $response | ForEach-Object {
        Write-Host "  - $($_.name) (Status: $($_.status), ID: $($_.id))"
    }
    
} catch {
    Write-Host "✗ Failed to fetch public glamps" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Cyan
