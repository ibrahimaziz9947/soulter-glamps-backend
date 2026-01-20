# Test Glamp Image URL Feature

$BASE_URL = "http://localhost:5001"

Write-Host "`nTesting Glamp imageUrl Feature" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Test 1: Get all glamps
Write-Host "`n1. GET /api/glamps - Check imageUrl in response"
try {
    $glamps = Invoke-RestMethod -Uri "$BASE_URL/api/glamps"
    if ($glamps.success) {
        $firstGlamp = $glamps.data[0]
        Write-Host "   Total glamps: $($glamps.data.Count)" -ForegroundColor Green
        if ($null -ne $firstGlamp) {
            Write-Host "   First glamp: $($firstGlamp.name)"
            Write-Host "   Has imageUrl field: $(if ($null -ne $firstGlamp.PSObject.Properties['imageUrl']) {'YES'} else {'NO'})" -ForegroundColor $(if ($null -ne $firstGlamp.PSObject.Properties['imageUrl']) {'Green'} else {'Red'})
            if ($null -ne $firstGlamp.imageUrl) {
                Write-Host "   imageUrl value: $($firstGlamp.imageUrl)" -ForegroundColor Green
            } else {
                Write-Host "   imageUrl value: null" -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Login as admin
Write-Host "`n2. Login as admin for create/update tests"
try {
    $login = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post `
        -Body (@{email="admin@soulter.com"; password="admin123"} | ConvertTo-Json) `
        -ContentType "application/json"
    $token = $login.token
    Write-Host "   Logged in successfully" -ForegroundColor Green
    
    # Test 3: Create glamp with imageUrl
    Write-Host "`n3. POST /api/glamps - Create glamp with imageUrl"
    $newGlamp = @{
        name = "Test Glamp $(Get-Date -Format 'HHmmss')"
        description = "Test glamp with image"
        pricePerNightCents = 15000
        maxGuests = 2
        status = "ACTIVE"
        imageUrl = "/images/glamps/test-glamp.jpg"
    } | ConvertTo-Json
    
    $created = Invoke-RestMethod -Uri "$BASE_URL/api/glamps" -Method Post `
        -Body $newGlamp -ContentType "application/json" `
        -Headers @{Authorization="Bearer $token"}
    
    if ($created.success) {
        Write-Host "   Created glamp ID: $($created.data.id)" -ForegroundColor Green
        Write-Host "   imageUrl: $($created.data.imageUrl)" -ForegroundColor Green
        $testGlampId = $created.data.id
        
        # Test 4: Update glamp imageUrl
        Write-Host "`n4. PUT /api/glamps/:id - Update imageUrl"
        $update = @{
            imageUrl = "/images/glamps/test-glamp-updated.jpg"
        } | ConvertTo-Json
        
        $updated = Invoke-RestMethod -Uri "$BASE_URL/api/glamps/$testGlampId" -Method Put `
            -Body $update -ContentType "application/json" `
            -Headers @{Authorization="Bearer $token"}
        
        if ($updated.success) {
            Write-Host "   Updated imageUrl: $($updated.data.imageUrl)" -ForegroundColor Green
        }
        
        # Test 5: Get specific glamp
        Write-Host "`n5. GET /api/glamps/:id - Verify imageUrl persisted"
        $fetched = Invoke-RestMethod -Uri "$BASE_URL/api/glamps/$testGlampId"
        Write-Host "   Fetched imageUrl: $($fetched.data.imageUrl)" -ForegroundColor Green
        
        # Cleanup
        Write-Host "`n6. DELETE /api/glamps/:id - Cleanup test glamp"
        $deleted = Invoke-RestMethod -Uri "$BASE_URL/api/glamps/$testGlampId" -Method Delete `
            -Headers @{Authorization="Bearer $token"}
        Write-Host "   Deleted test glamp" -ForegroundColor Green
    }
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Test completed!" -ForegroundColor Cyan
Write-Host ""
