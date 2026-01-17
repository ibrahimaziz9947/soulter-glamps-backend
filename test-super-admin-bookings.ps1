# Super Admin Bookings API Test Script
# PowerShell version for easy Windows testing

param(
    [string]$BaseUrl = "http://localhost:5001",
    [string]$Token = ""
)

if (-not $Token) {
    Write-Host "❌ Error: SUPER_ADMIN_TOKEN required" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\test-super-admin-bookings.ps1 -Token 'your-jwt-token-here'"
    Write-Host ""
    Write-Host "Or set environment variable:" -ForegroundColor Yellow
    Write-Host "  `$env:SUPER_ADMIN_TOKEN = 'your-jwt-token-here'"
    Write-Host "  .\test-super-admin-bookings.ps1"
    exit 1
}

$Headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $Token"
}

function Test-GetAllBookings {
    Write-Host "`n=== Testing GET /api/super-admin/bookings ===" -ForegroundColor Cyan
    
    # Test 1: Default params
    Write-Host "`nTest 1: Get all bookings (default params)" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/super-admin/bookings" -Headers $Headers -Method Get
        Write-Host "✅ Success: $($response.success)" -ForegroundColor Green
        Write-Host "Items count: $($response.data.items.Count)"
        Write-Host "Total: $($response.data.meta.total)"
        Write-Host "Pages: $($response.data.meta.totalPages)"
        
        return $response.data.items[0].id
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
    
    # Test 2: With pagination
    Write-Host "`nTest 2: With pagination (page=1, limit=5)" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/super-admin/bookings?page=1&limit=5" -Headers $Headers -Method Get
        Write-Host "✅ Items count: $($response.data.items.Count)" -ForegroundColor Green
        Write-Host "Meta: Page $($response.data.meta.page) of $($response.data.meta.totalPages)"
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 3: With status filter
    Write-Host "`nTest 3: Filter by status (CONFIRMED)" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/super-admin/bookings?status=CONFIRMED" -Headers $Headers -Method Get
        Write-Host "✅ Items count: $($response.data.items.Count)" -ForegroundColor Green
        if ($response.data.items.Count -gt 0) {
            Write-Host "First item status: $($response.data.items[0].status)"
        }
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 4: With search
    Write-Host "`nTest 4: Search functionality" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/super-admin/bookings?search=test" -Headers $Headers -Method Get
        Write-Host "✅ Items count: $($response.data.items.Count)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test 5: With date range
    Write-Host "`nTest 5: Date range (last 7 days)" -ForegroundColor Yellow
    try {
        $to = Get-Date -Format "yyyy-MM-dd"
        $from = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/super-admin/bookings?from=$from&to=$to" -Headers $Headers -Method Get
        Write-Host "✅ Items count: $($response.data.items.Count)" -ForegroundColor Green
        Write-Host "Range: $($response.data.range.from) to $($response.data.range.to)"
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Test-GetBookingById {
    param([string]$BookingId)
    
    Write-Host "`n=== Testing GET /api/super-admin/bookings/:id ===" -ForegroundColor Cyan
    
    if (-not $BookingId) {
        Write-Host "⚠️  No booking ID available, skipping test" -ForegroundColor Yellow
        return
    }
    
    Write-Host "`nTest: Get booking by ID: $BookingId" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/super-admin/bookings/$BookingId" -Headers $Headers -Method Get
        Write-Host "✅ Success: $($response.success)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Booking Details:" -ForegroundColor White
        Write-Host "  ID: $($response.data.id)"
        Write-Host "  Status: $($response.data.status)"
        Write-Host "  Amount (cents): $($response.data.totalAmount)"
        Write-Host "  Customer: $($response.data.customer.name)"
        Write-Host "  Agent: $(if ($response.data.agent) { $response.data.agent.name } else { 'None' })"
        Write-Host "  Glamp: $($response.data.glamp.name)"
        Write-Host "  Glamp Price/Night (cents): $($response.data.glamp.pricePerNight)"
        Write-Host "  Commission: $(if ($response.data.commission) { "$($response.data.commission.amount) cents" } else { 'No' })"
        Write-Host "  Incomes: $($response.data.incomes.Count)"
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test non-existent booking
    Write-Host "`nTest: Non-existent booking (404)" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/super-admin/bookings/invalid-id" -Headers $Headers -Method Get -ErrorAction Stop
        Write-Host "⚠️  Unexpected success" -ForegroundColor Yellow
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host "✅ Correctly returned 404 Not Found" -ForegroundColor Green
        } else {
            Write-Host "❌ Unexpected status code: $statusCode" -ForegroundColor Red
        }
    }
}

function Test-UnauthorizedAccess {
    Write-Host "`n=== Testing Unauthorized Access ===" -ForegroundColor Cyan
    
    Write-Host "`nTest: Access without token (401)" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/super-admin/bookings" -Method Get -ErrorAction Stop
        Write-Host "⚠️  Unexpected success - endpoint not protected!" -ForegroundColor Yellow
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "✅ Correctly returned 401 Unauthorized" -ForegroundColor Green
        } else {
            Write-Host "❌ Unexpected status code: $statusCode" -ForegroundColor Red
        }
    }
}

# Main execution
Write-Host "🚀 Starting Super Admin Bookings API Tests" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor White
Write-Host "Token configured: $(if ($Token) { '✅ Yes' } else { '❌ No' })" -ForegroundColor White

try {
    # Test unauthorized access
    Test-UnauthorizedAccess
    
    # Test authorized endpoints
    $firstBookingId = Test-GetAllBookings
    Test-GetBookingById -BookingId $firstBookingId
    
    Write-Host "`n✅ All tests completed!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Test error: $($_.Exception.Message)" -ForegroundColor Red
}
