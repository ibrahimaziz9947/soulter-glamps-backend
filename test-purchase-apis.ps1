# Test Purchase API Endpoints
# This script tests the new Purchase module endpoints

$baseUrl = "http://localhost:5001/api"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PURCHASE API ENDPOINT TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Login as Admin to get token
Write-Host "Step 1: Logging in as Admin..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
        email="admin@soulter.com"
        password="admin123"
    } | ConvertTo-Json) -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "✓ Login successful! Token obtained." -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Setup headers with auth token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n----------------------------------------`n" -ForegroundColor Gray

# Step 2: Test GET /api/finance/purchases (List - should be empty initially)
Write-Host "Step 2: Testing GET /api/finance/purchases (List purchases)" -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/finance/purchases" -Method Get -Headers $headers
    Write-Host "✓ List purchases successful!" -ForegroundColor Green
    Write-Host "  Total purchases: $($listResponse.pagination.total)" -ForegroundColor Gray
    Write-Host "  Response structure:" -ForegroundColor Gray
    Write-Host "    - success: $($listResponse.success)" -ForegroundColor Gray
    Write-Host "    - data: Array with $($listResponse.data.Count) items" -ForegroundColor Gray
    Write-Host "    - pagination: page=$($listResponse.pagination.page), limit=$($listResponse.pagination.limit), total=$($listResponse.pagination.total)" -ForegroundColor Gray
    Write-Host "    - summary: totalAmount=$($listResponse.summary.totalAmount), count=$($listResponse.summary.count)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n----------------------------------------`n" -ForegroundColor Gray

# Step 3: Test GET /api/finance/purchases/summary
Write-Host "Step 3: Testing GET /api/finance/purchases/summary" -ForegroundColor Yellow
try {
    $summaryResponse = Invoke-RestMethod -Uri "$baseUrl/finance/purchases/summary" -Method Get -Headers $headers
    Write-Host "✓ Get summary successful!" -ForegroundColor Green
    Write-Host "  Total count: $($summaryResponse.data.totalCount)" -ForegroundColor Gray
    Write-Host "  Total amount (cents): $($summaryResponse.data.totalAmountCents)" -ForegroundColor Gray
    Write-Host "  Status breakdown: $($summaryResponse.data.totalsByStatus | ConvertTo-Json -Compress)" -ForegroundColor Gray
    Write-Host "  Currency breakdown: $($summaryResponse.data.totalsByCurrency | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n----------------------------------------`n" -ForegroundColor Gray

# Step 4: Test POST /api/finance/purchases (Create)
Write-Host "Step 4: Testing POST /api/finance/purchases (Create purchase)" -ForegroundColor Yellow
$purchaseData = @{
    amount = 50000
    currency = "USD"
    purchaseDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    vendorName = "Test Vendor Inc"
    status = "DRAFT"
    reference = "PO-TEST-001"
    notes = "Test purchase for API validation"
}
try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/finance/purchases" -Method Post -Headers $headers -Body ($purchaseData | ConvertTo-Json)
    Write-Host "✓ Create purchase successful!" -ForegroundColor Green
    Write-Host "  Purchase ID: $($createResponse.data.id)" -ForegroundColor Gray
    Write-Host "  Vendor: $($createResponse.data.vendorName)" -ForegroundColor Gray
    Write-Host "  Amount: $($createResponse.data.amount) $($createResponse.data.currency)" -ForegroundColor Gray
    Write-Host "  Status: $($createResponse.data.status)" -ForegroundColor Gray
    $createdPurchaseId = $createResponse.data.id
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host "`n----------------------------------------`n" -ForegroundColor Gray

# Step 5: Test GET /api/finance/purchases/:id (Get by ID)
if ($createdPurchaseId) {
    Write-Host "Step 5: Testing GET /api/finance/purchases/:id (Get by ID)" -ForegroundColor Yellow
    try {
        $getByIdResponse = Invoke-RestMethod -Uri "$baseUrl/finance/purchases/$createdPurchaseId" -Method Get -Headers $headers
        Write-Host "✓ Get purchase by ID successful!" -ForegroundColor Green
        Write-Host "  Purchase ID: $($getByIdResponse.data.id)" -ForegroundColor Gray
        Write-Host "  Vendor: $($getByIdResponse.data.vendorName)" -ForegroundColor Gray
        Write-Host "  Created by: $($getByIdResponse.data.createdBy.name) ($($getByIdResponse.data.createdBy.role))" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "`n----------------------------------------`n" -ForegroundColor Gray

    # Step 6: Test PATCH /api/finance/purchases/:id (Update)
    Write-Host "Step 6: Testing PATCH /api/finance/purchases/:id (Update)" -ForegroundColor Yellow
    $updateData = @{
        status = "CONFIRMED"
        notes = "Updated: Purchase confirmed and processed"
    }
    try {
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/finance/purchases/$createdPurchaseId" -Method Patch -Headers $headers -Body ($updateData | ConvertTo-Json)
        Write-Host "✓ Update purchase successful!" -ForegroundColor Green
        Write-Host "  New status: $($updateResponse.data.status)" -ForegroundColor Gray
        Write-Host "  Updated notes: $($updateResponse.data.notes)" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "`n----------------------------------------`n" -ForegroundColor Gray

    # Step 7: Test DELETE /api/finance/purchases/:id (Soft delete)
    Write-Host "Step 7: Testing DELETE /api/finance/purchases/:id (Soft delete)" -ForegroundColor Yellow
    try {
        $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/finance/purchases/$createdPurchaseId" -Method Delete -Headers $headers
        Write-Host "✓ Soft delete successful!" -ForegroundColor Green
        Write-Host "  Message: $($deleteResponse.message)" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "`n----------------------------------------`n" -ForegroundColor Gray

    # Step 8: Test POST /api/finance/purchases/:id/restore (Restore)
    Write-Host "Step 8: Testing POST /api/finance/purchases/:id/restore (Restore)" -ForegroundColor Yellow
    try {
        $restoreResponse = Invoke-RestMethod -Uri "$baseUrl/finance/purchases/$createdPurchaseId/restore" -Method Post -Headers $headers
        Write-Host "✓ Restore purchase successful!" -ForegroundColor Green
        Write-Host "  Purchase ID: $($restoreResponse.data.id)" -ForegroundColor Gray
        Write-Host "  Status: $($restoreResponse.data.status)" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PURCHASE API TESTS COMPLETED" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# CURL equivalents (for reference):
Write-Host "`nCURL EQUIVALENTS:" -ForegroundColor Magenta
Write-Host "=================" -ForegroundColor Magenta
Write-Host @"

# 1. Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@soulter.com","password":"admin123"}'

# 2. List purchases
curl -X GET http://localhost:5001/api/finance/purchases \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get summary
curl -X GET http://localhost:5001/api/finance/purchases/summary \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Create purchase
curl -X POST http://localhost:5001/api/finance/purchases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "USD",
    "purchaseDate": "2026-01-13T10:00:00Z",
    "vendorName": "Test Vendor Inc",
    "status": "DRAFT",
    "reference": "PO-TEST-001",
    "notes": "Test purchase"
  }'

# 5. Get by ID
curl -X GET http://localhost:5001/api/finance/purchases/PURCHASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# 6. Update purchase
curl -X PATCH http://localhost:5001/api/finance/purchases/PURCHASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED", "notes": "Updated"}'

# 7. Delete purchase
curl -X DELETE http://localhost:5001/api/finance/purchases/PURCHASE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# 8. Restore purchase
curl -X POST http://localhost:5001/api/finance/purchases/PURCHASE_ID/restore \
  -H "Authorization: Bearer YOUR_TOKEN"

"@ -ForegroundColor Gray
