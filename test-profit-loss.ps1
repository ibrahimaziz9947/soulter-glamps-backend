# Test Profit & Loss V1 API
# Usage: .\test-profit-loss.ps1

$ErrorActionPreference = "Stop"

# Configuration
$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:5001" }
$TOKEN = if ($env:TEST_TOKEN) { $env:TEST_TOKEN } else { "" }

if (-not $TOKEN) {
    Write-Host "Error: TEST_TOKEN environment variable is required" -ForegroundColor Red
    Write-Host "Usage: `$env:TEST_TOKEN='your_jwt_token'; .\test-profit-loss.ps1"
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Profit & Loss V1 API Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Base URL: $BASE_URL"
Write-Host "Token: $($TOKEN.Substring(0, [Math]::Min(20, $TOKEN.Length)))..."

# Test 1: Get P&L without filters
Write-Host "`n--- Test 1: GET /api/finance/profit-loss (no filters) ---" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/finance/profit-loss" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        }
    
    Write-Host "Status: 200" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
    if ($response.success) {
        Write-Host "`nSummary:" -ForegroundColor Cyan
        Write-Host "  Total Income: $($response.data.summary.totalIncomeCents) cents"
        Write-Host "  Total Expenses: $($response.data.summary.totalExpensesCents) cents"
        Write-Host "  Total Purchases: $($response.data.summary.totalPurchasesCents) cents"
        Write-Host "  Net Profit: $($response.data.summary.netProfitCents) cents"
        
        if ($response.data.breakdown) {
            Write-Host "  Income sources: $($response.data.breakdown.incomeBySource.Count)"
            Write-Host "  Expense categories: $($response.data.breakdown.expensesByCategory.Count)"
            Write-Host "  Vendors: $($response.data.breakdown.purchasesByVendor.Count)"
        }
        
        Write-Host "`nTest 1: PASSED" -ForegroundColor Green
    }
} catch {
    Write-Host "Test 1: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test 2: Get P&L with date range
Write-Host "`n--- Test 2: GET /api/finance/profit-loss?from=2026-01-01&to=2026-01-31 ---" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/finance/profit-loss?from=2026-01-01&to=2026-01-31" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        }
    
    Write-Host "Status: 200" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host "`nTest 2: PASSED" -ForegroundColor Green
} catch {
    Write-Host "Test 2: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test 3: Get P&L with currency filter
Write-Host "`n--- Test 3: GET /api/finance/profit-loss?currency=USD ---" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/finance/profit-loss?currency=USD" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        }
    
    Write-Host "Status: 200" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host "`nTest 3: PASSED" -ForegroundColor Green
} catch {
    Write-Host "Test 3: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test 4: Get P&L without breakdown
Write-Host "`n--- Test 4: GET /api/finance/profit-loss?includeBreakdown=false ---" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/finance/profit-loss?includeBreakdown=false" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        }
    
    Write-Host "Status: 200" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
    if ($response.data.breakdown -eq $null) {
        Write-Host "`nBreakdown correctly excluded" -ForegroundColor Cyan
        Write-Host "`nTest 4: PASSED" -ForegroundColor Green
    } else {
        Write-Host "`nTest 4: FAILED - Breakdown should not be included" -ForegroundColor Red
    }
} catch {
    Write-Host "Test 4: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test 5: Get P&L with all filters combined
Write-Host "`n--- Test 5: GET /api/finance/profit-loss with all filters ---" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/finance/profit-loss?from=2026-01-01&to=2026-12-31&currency=USD&includeBreakdown=true" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        }
    
    Write-Host "Status: 200" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host "`nTest 5: PASSED" -ForegroundColor Green
} catch {
    Write-Host "Test 5: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test 6: Get P&L summary endpoint (no breakdown)
Write-Host "`n--- Test 6: GET /api/finance/profit-loss/summary ---" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/finance/profit-loss/summary?from=2026-01-01&to=2026-01-31" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        }
    
    Write-Host "Status: 200" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    
    if ($response.data.breakdown -eq $null -and $response.data.filters -ne $null -and $response.data.summary -ne $null) {
        Write-Host "`nSummary endpoint correctly returns only filters and summary" -ForegroundColor Cyan
        Write-Host "`nTest 6: PASSED" -ForegroundColor Green
    } else {
        Write-Host "`nTest 6: FAILED - Should have filters and summary but no breakdown" -ForegroundColor Red
    }
} catch {
    Write-Host "Test 6: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test 7: Validate invalid date format
Write-Host "`n--- Test 7: GET /api/finance/profit-loss with invalid date ---" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/finance/profit-loss?from=invalid-date" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        } -ErrorAction Stop
    
    Write-Host "Test 7: FAILED - Should have returned 400 error" -ForegroundColor Red
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($_.Exception.Response.StatusCode.value__ -eq 400 -and $errorDetails.success -eq $false) {
        Write-Host "Status: 400" -ForegroundColor Green
        Write-Host "Error: $($errorDetails.error)" -ForegroundColor Green
        Write-Host "`nTest 7: PASSED" -ForegroundColor Green
    } else {
        Write-Host "Test 7: FAILED" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

# Test 8: Validate date range (from > to)
Write-Host "`n--- Test 8: GET /api/finance/profit-loss with invalid date range ---" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/finance/profit-loss?from=2026-12-31&to=2026-01-01" `
        -Method Get `
        -Headers @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "application/json"
        } -ErrorAction Stop
    
    Write-Host "Test 8: FAILED - Should have returned 400 error" -ForegroundColor Red
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($_.Exception.Response.StatusCode.value__ -eq 400 -and $errorDetails.success -eq $false) {
        Write-Host "Status: 400" -ForegroundColor Green
        Write-Host "Error: $($errorDetails.error)" -ForegroundColor Green
        Write-Host "`nTest 8: PASSED" -ForegroundColor Green
    } else {
        Write-Host "Test 8: FAILED" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Tests Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
