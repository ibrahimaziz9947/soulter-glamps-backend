# Debug Test Script for Super Admin Bookings API
# This script tests the exact date range showing 33 bookings in dashboard

param(
    [string]$BaseUrl = "http://localhost:5001",
    [string]$Token = $env:SUPER_ADMIN_TOKEN
)

if (-not $Token) {
    Write-Host "❌ Error: SUPER_ADMIN_TOKEN required" -ForegroundColor Red
    Write-Host "Set it with: `$env:SUPER_ADMIN_TOKEN = 'your-token'" -ForegroundColor Yellow
    exit 1
}

$Headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $Token"
}

Write-Host "`n🔍 DEBUGGING SUPER ADMIN BOOKINGS API" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Test 1: Exact date range from user report (2025-12-18 to 2026-01-17)
Write-Host "`n📅 Test 1: Exact date range (2025-12-18 to 2026-01-17)" -ForegroundColor Yellow
Write-Host "Expected: 33 bookings (same as dashboard)" -ForegroundColor Gray

$from = "2025-12-18"
$to = "2026-01-17"
$url = "$BaseUrl/api/super-admin/bookings?from=$from&to=$to&page=1&limit=20"

Write-Host "`nRequest URL: $url" -ForegroundColor White

try {
    $response = Invoke-RestMethod -Uri $url -Headers $Headers -Method Get
    
    Write-Host "`n✅ Response received successfully" -ForegroundColor Green
    Write-Host "`nRESPONSE STRUCTURE:" -ForegroundColor Cyan
    Write-Host "  success: $($response.success)"
    Write-Host "  data.items.length: $($response.data.items.Count)"
    Write-Host "  data.meta.total: $($response.data.meta.total)"
    Write-Host "  data.meta.page: $($response.data.meta.page)"
    Write-Host "  data.meta.limit: $($response.data.meta.limit)"
    Write-Host "  data.meta.totalPages: $($response.data.meta.totalPages)"
    Write-Host "  data.range.from: $($response.data.range.from)"
    Write-Host "  data.range.to: $($response.data.range.to)"
    
    if ($response.data.aggregates) {
        Write-Host "`n📊 AGGREGATES:" -ForegroundColor Cyan
        Write-Host "  totalBookings: $($response.data.aggregates.totalBookings)"
        Write-Host "  confirmedCount: $($response.data.aggregates.confirmedCount)"
        Write-Host "  pendingCount: $($response.data.aggregates.pendingCount)"
        Write-Host "  cancelledCount: $($response.data.aggregates.cancelledCount)"
        Write-Host "  completedCount: $($response.data.aggregates.completedCount)"
        Write-Host "  revenueCents: $($response.data.aggregates.revenueCents)"
    }
    
    if ($response.data.items.Count -gt 0) {
        Write-Host "`n📋 FIRST BOOKING ITEM:" -ForegroundColor Cyan
        $first = $response.data.items[0]
        Write-Host "  id: $($first.id)"
        Write-Host "  createdAt: $($first.createdAt)"
        Write-Host "  status: $($first.status)"
        Write-Host "  customerName: $($first.customerName)"
        Write-Host "  glampName: $($first.glampName)"
        Write-Host "  totalAmountCents: $($first.totalAmountCents)"
        Write-Host "  agentId: $($first.agentId)"
        Write-Host "  checkInDate: $($first.checkInDate)"
        Write-Host "  checkOutDate: $($first.checkOutDate)"
        Write-Host "  guests: $($first.guests)"
    } else {
        Write-Host "`n⚠️  NO BOOKINGS FOUND!" -ForegroundColor Red
        Write-Host "This is the bug - dashboard shows 33 but API returns 0" -ForegroundColor Red
    }
    
    # Compare with dashboard
    if ($response.data.meta.total -eq 33) {
        Write-Host "`n✅ SUCCESS: Total matches dashboard (33)" -ForegroundColor Green
    } elseif ($response.data.meta.total -eq 0) {
        Write-Host "`n❌ BUG CONFIRMED: API returns 0 but dashboard shows 33" -ForegroundColor Red
    } else {
        Write-Host "`n⚠️  MISMATCH: API shows $($response.data.meta.total) but dashboard shows 33" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}

# Test 2: Default params (no date range)
Write-Host "`n`n📅 Test 2: Default params (last 30 days)" -ForegroundColor Yellow
$url2 = "$BaseUrl/api/super-admin/bookings"

try {
    $response2 = Invoke-RestMethod -Uri $url2 -Headers $Headers -Method Get
    Write-Host "✅ Total: $($response2.data.meta.total)" -ForegroundColor Green
    Write-Host "Items returned: $($response2.data.items.Count)" -ForegroundColor White
    Write-Host "Range: $($response2.data.range.from) to $($response2.data.range.to)" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test with different status filters
Write-Host "`n`n📅 Test 3: Filter by CONFIRMED status" -ForegroundColor Yellow
$url3 = "$BaseUrl/api/super-admin/bookings?from=$from&to=$to&status=CONFIRMED"

try {
    $response3 = Invoke-RestMethod -Uri $url3 -Headers $Headers -Method Get
    Write-Host "✅ Confirmed bookings: $($response3.data.meta.total)" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test with ALL status (should be ignored)
Write-Host "`n`n📅 Test 4: Filter by ALL status (should return all)" -ForegroundColor Yellow
$url4 = "$BaseUrl/api/super-admin/bookings?from=$from&to=$to&status=ALL"

try {
    $response4 = Invoke-RestMethod -Uri $url4 -Headers $Headers -Method Get
    Write-Host "✅ Total with 'ALL' status: $($response4.data.meta.total)" -ForegroundColor Green
    if ($response4.data.meta.total -eq $response.data.meta.total) {
        Write-Host "✅ Correctly ignores 'ALL' status filter" -ForegroundColor Green
    } else {
        Write-Host "⚠️  'ALL' filter behavior different" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "🏁 Testing complete" -ForegroundColor Cyan
Write-Host "`nCheck server console for detailed debug logs with:" -ForegroundColor Yellow
Write-Host "  [SUPER ADMIN BOOKINGS] prefix" -ForegroundColor Gray
