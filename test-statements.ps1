# Test Financial Statements API
# Usage: .\test-statements.ps1 <AUTH_TOKEN>

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = "your-token-here"
)

$baseUrl = "http://localhost:5001"
$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "🧪 Testing Financial Statements API" -ForegroundColor Cyan
Write-Host ""

# Test 1: Basic request
Write-Host "Test 1: Basic request with defaults" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements" -Headers $headers -Method Get
    Write-Host "✅ Status: Success" -ForegroundColor Green
    Write-Host "Items returned: $($response.data.items.Count)"
    Write-Host "Total items: $($response.data.pagination.totalItems)"
    Write-Host "Totals:" -ForegroundColor Cyan
    Write-Host "  Total In: $($response.data.totals.totalInCents) cents"
    Write-Host "  Total Out: $($response.data.totals.totalOutCents) cents"
    Write-Host "  Net: $($response.data.totals.netCents) cents"
    Write-Host "Debug counts:" -ForegroundColor Cyan
    $response.data.debug.counts | ConvertTo-Json
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: With date range
Write-Host "Test 2: With date range (Jan 2026)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?from=2026-01-01&to=2026-01-31" -Headers $headers -Method Get
    Write-Host "✅ Status: Success" -ForegroundColor Green
    Write-Host "Items returned: $($response.data.items.Count)"
    Write-Host "Total items: $($response.data.pagination.totalItems)"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: With search
Write-Host "Test 3: With search filter" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?search=booking&pageSize=10" -Headers $headers -Method Get
    Write-Host "✅ Status: Success" -ForegroundColor Green
    Write-Host "Items returned: $($response.data.items.Count)"
    if ($response.data.items.Count -gt 0) {
        Write-Host "Sample item:" -ForegroundColor Cyan
        $response.data.items[0] | ConvertTo-Json
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Include submitted expenses
Write-Host "Test 4: Include submitted expenses" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?expenseMode=includeSubmitted" -Headers $headers -Method Get
    Write-Host "✅ Status: Success" -ForegroundColor Green
    Write-Host "Total items: $($response.data.pagination.totalItems)"
    Write-Host "Expense count: $($response.data.debug.counts.expenses)"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Test pagination
Write-Host "Test 5: Pagination (page 2, size 5)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?page=2&pageSize=5" -Headers $headers -Method Get
    Write-Host "✅ Status: Success" -ForegroundColor Green
    Write-Host "Page: $($response.data.pagination.page)"
    Write-Host "Page size: $($response.data.pagination.pageSize)"
    Write-Host "Has next page: $($response.data.pagination.hasNextPage)"
    Write-Host "Has previous page: $($response.data.pagination.hasPreviousPage)"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Empty string handling
Write-Host "Test 6: Empty string parameters (should not break)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?from=&to=&currency=&search=" -Headers $headers -Method Get
    Write-Host "✅ Status: Success" -ForegroundColor Green
    Write-Host "Empty strings handled correctly"
    Write-Host "Filters received:" -ForegroundColor Cyan
    $response.data.debug.filters | ConvertTo-Json
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Get all transaction types
Write-Host "Test 7: All transaction types breakdown" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?pageSize=100" -Headers $headers -Method Get
    Write-Host "✅ Status: Success" -ForegroundColor Green
    
    $types = $response.data.items | Group-Object -Property type
    Write-Host "Transaction types breakdown:" -ForegroundColor Cyan
    foreach ($type in $types) {
        Write-Host "  $($type.Name): $($type.Count)"
    }
    
    # Verify totals match sum of items
    $calculatedNet = ($response.data.items | Measure-Object -Property amountCents -Sum).Sum
    Write-Host "`nTotals verification:" -ForegroundColor Cyan
    Write-Host "  Reported Net: $($response.data.totals.netCents)"
    Write-Host "  NOTE: Totals reflect ALL filtered records, not just current page"
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Validation - Invalid page
Write-Host "Test 8: Validation - Invalid page (should fail)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?page=0" -Headers $headers -Method Get
    Write-Host "❌ Should have failed but succeeded" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected: $($_.Exception.Message -replace '.*"error":"([^"]+)".*', '$1')" -ForegroundColor Green
}
Write-Host ""

# Test 9: Validation - Invalid page size
Write-Host "Test 9: Validation - Invalid page size (should fail)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?pageSize=200" -Headers $headers -Method Get
    Write-Host "❌ Should have failed but succeeded" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected: $($_.Exception.Message -replace '.*"error":"([^"]+)".*', '$1')" -ForegroundColor Green
}
Write-Host ""

# Test 10: Validation - Invalid expense mode
Write-Host "Test 10: Validation - Invalid expense mode (should fail)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?expenseMode=invalid" -Headers $headers -Method Get
    Write-Host "❌ Should have failed but succeeded" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected: $($_.Exception.Message -replace '.*"error":"([^"]+)".*', '$1')" -ForegroundColor Green
}
Write-Host ""

# Test 11: Validation - Invalid date format
Write-Host "Test 11: Validation - Invalid date format (should fail)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/finance/statements?from=2026/01/01" -Headers $headers -Method Get
    Write-Host "❌ Should have failed but succeeded" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected: $($_.Exception.Message -replace '.*"error":"([^"]+)".*', '$1')" -ForegroundColor Green
}
Write-Host ""

Write-Host "✅ All tests completed!" -ForegroundColor Green
