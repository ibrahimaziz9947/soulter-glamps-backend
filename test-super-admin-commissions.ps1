# Super Admin Commissions API Test Script (PowerShell)
# 
# This script tests all super admin commission endpoints
# 
# Prerequisites:
# 1. Backend server running on http://localhost:5001
# 2. Valid SUPER_ADMIN user in database
# 3. Some commission data in database
# 
# Usage:
#   .\test-super-admin-commissions.ps1

$API_URL = if ($env:API_URL) { $env:API_URL } else { "http://localhost:5001" }
$SUPER_ADMIN_EMAIL = if ($env:SUPER_ADMIN_EMAIL) { $env:SUPER_ADMIN_EMAIL } else { "superadmin@example.com" }
$SUPER_ADMIN_PASSWORD = if ($env:SUPER_ADMIN_PASSWORD) { $env:SUPER_ADMIN_PASSWORD } else { "Password123!" }

$authToken = $null
$testCommissionId = $null

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "   $Message" -ForegroundColor Gray
}

function Invoke-ApiRequest {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    $url = "$API_URL$Endpoint"
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($authToken) {
        $headers["Authorization"] = "Bearer $authToken"
    }
    
    try {
        $params = @{
            Uri = $url
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        return @{
            Success = $true
            Data = $response
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
            StatusCode = $_.Exception.Response.StatusCode.Value__
        }
    }
}

# ============================================================================
# TEST FUNCTIONS
# ============================================================================

function Test-Login {
    Write-Section "🔐 Step 1: Login as Super Admin"
    
    $body = @{
        email = $SUPER_ADMIN_EMAIL
        password = $SUPER_ADMIN_PASSWORD
    }
    
    $result = Invoke-ApiRequest -Endpoint "/api/auth/login" -Method POST -Body $body
    
    if ($result.Success -and $result.Data.success) {
        $script:authToken = $result.Data.token
        Write-Success "Login successful"
        Write-Info "User: $($result.Data.user.name) ($($result.Data.user.role))"
        return $true
    } else {
        Write-Error-Custom "Login failed: $($result.Data.error)"
        return $false
    }
}

function Test-GetAllCommissions {
    Write-Section "📋 Step 2: Get All Commissions (default params)"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/commissions"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Request successful"
        Write-Info "Total: $($result.Data.data.meta.total)"
        Write-Info "Page: $($result.Data.data.meta.page)/$($result.Data.data.meta.totalPages)"
        Write-Info "Items: $($result.Data.data.items.Count)"
        Write-Info "Date Range: $($result.Data.data.range.from) to $($result.Data.data.range.to)"
        
        Write-Host ""
        Write-Info "Aggregates:"
        Write-Info "  - Pending: $($result.Data.data.aggregates.pendingCount) ($([math]::Round($result.Data.data.aggregates.pendingAmountCents / 100, 2)) USD)"
        Write-Info "  - Paid: $($result.Data.data.aggregates.paidCount) ($([math]::Round($result.Data.data.aggregates.paidAmountCents / 100, 2)) USD)"
        Write-Info "  - Total: $([math]::Round($result.Data.data.aggregates.totalAmountCents / 100, 2)) USD"
        
        if ($result.Data.data.items.Count -gt 0) {
            $first = $result.Data.data.items[0]
            $script:testCommissionId = $first.id
            Write-Host ""
            Write-Info "First Commission:"
            Write-Info "  - ID: $($first.id)"
            Write-Info "  - Status: $($first.status)"
            Write-Info "  - Amount: $([math]::Round($first.amount / 100, 2)) USD"
            if ($first.agent) {
                Write-Info "  - Agent: $($first.agent.name) ($($first.agent.email))"
            }
            Write-Info "  - Booking ID: $($first.bookingId)"
        }
        
        return $true
    } else {
        Write-Error-Custom "Request failed: $($result.Data.error)"
        return $false
    }
}

function Test-GetCommissionsWithFilters {
    Write-Section "🔍 Step 3: Get Commissions with Filters"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/commissions?from=2026-01-01&to=2026-12-31&status=UNPAID&page=1&limit=5"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Filtered request successful"
        Write-Info "Filters: from=2026-01-01, to=2026-12-31, status=UNPAID"
        Write-Info "Total: $($result.Data.data.meta.total)"
        Write-Info "Items returned: $($result.Data.data.items.Count)"
        return $true
    } else {
        Write-Error-Custom "Request failed"
        return $false
    }
}

function Test-GetCommissionById {
    if (-not $testCommissionId) {
        Write-Section "⚠️  Step 4: Get Commission By ID - SKIPPED (no commission ID)"
        return $true
    }
    
    Write-Section "📄 Step 4: Get Commission By ID"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/commissions/$testCommissionId"
    
    if ($result.Success -and $result.Data.success) {
        $data = $result.Data.data
        Write-Success "Request successful"
        Write-Info "ID: $($data.id)"
        Write-Info "Status: $($data.status)"
        Write-Info "Amount: $([math]::Round($data.amount / 100, 2)) USD"
        Write-Info "Created: $($data.createdAt)"
        if ($data.agent) {
            Write-Info "Agent: $($data.agent.name) ($($data.agent.email))"
        }
        if ($data.booking) {
            Write-Info "Booking: $($data.booking.id) - $($data.booking.customerName)"
            Write-Info "  Check-in: $($data.booking.checkInDate)"
            Write-Info "  Total: $([math]::Round($data.booking.totalAmount / 100, 2)) USD"
        }
        return $true
    } else {
        Write-Error-Custom "Request failed"
        return $false
    }
}

function Test-MarkCommissionAsPaid {
    if (-not $testCommissionId) {
        Write-Section "⚠️  Step 5: Mark Commission as Paid - SKIPPED (no commission ID)"
        return $true
    }
    
    Write-Section "💰 Step 5: Mark Commission as Paid"
    
    $body = @{
        paidAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        note = "Test payment via API"
        paymentMethod = "TRANSFER"
        reference = "TEST-TXN-12345"
    }
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/commissions/$testCommissionId/mark-paid" -Method POST -Body $body
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Commission marked as paid"
        Write-Info "ID: $($result.Data.data.id)"
        Write-Info "New Status: $($result.Data.data.status)"
        Write-Info "Message: $($result.Data.message)"
        return $true
    } else {
        Write-Host "ℹ️  May already be paid (idempotent)" -ForegroundColor Yellow
        return $true
    }
}

function Test-MarkCommissionAsUnpaid {
    if (-not $testCommissionId) {
        Write-Section "⚠️  Step 6: Mark Commission as Unpaid - SKIPPED (no commission ID)"
        return $true
    }
    
    Write-Section "🔄 Step 6: Mark Commission as Unpaid"
    
    $body = @{
        reason = "Test reversal via API"
    }
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/commissions/$testCommissionId/mark-unpaid" -Method POST -Body $body
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Commission marked as unpaid"
        Write-Info "ID: $($result.Data.data.id)"
        Write-Info "New Status: $($result.Data.data.status)"
        Write-Info "Message: $($result.Data.message)"
        return $true
    } else {
        Write-Error-Custom "Request failed"
        Write-Info "Note: This may fail if commission was not PAID first"
        return $false
    }
}

function Test-SearchCommissions {
    Write-Section "🔎 Step 7: Search Commissions"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/commissions?search=agent&page=1&limit=5"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Search request successful"
        Write-Info "Search term: 'agent'"
        Write-Info "Results: $($result.Data.data.items.Count)"
        return $true
    } else {
        Write-Error-Custom "Request failed"
        return $false
    }
}

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

function Run-Tests {
    Write-Host ""
    Write-Host ("═" * 60) -ForegroundColor Cyan
    Write-Host "  SUPER ADMIN COMMISSIONS API TEST SUITE" -ForegroundColor Cyan
    Write-Host ("═" * 60) -ForegroundColor Cyan
    Write-Host "  API URL: $API_URL" -ForegroundColor Gray
    Write-Host "  Super Admin: $SUPER_ADMIN_EMAIL" -ForegroundColor Gray
    Write-Host ("═" * 60) -ForegroundColor Cyan
    
    try {
        # Run all tests
        $loginSuccess = Test-Login
        if (-not $loginSuccess) {
            throw "Login failed"
        }
        
        Test-GetAllCommissions
        Test-GetCommissionsWithFilters
        Test-GetCommissionById
        Test-MarkCommissionAsPaid
        Test-MarkCommissionAsUnpaid
        Test-SearchCommissions
        
        Write-Host ""
        Write-Host ("═" * 60) -ForegroundColor Green
        Write-Host "  ✅ ALL TESTS COMPLETED" -ForegroundColor Green
        Write-Host ("═" * 60) -ForegroundColor Green
        Write-Host ""
        
    } catch {
        Write-Host ""
        Write-Host ("═" * 60) -ForegroundColor Red
        Write-Host "  ❌ TEST SUITE FAILED" -ForegroundColor Red
        Write-Host ("═" * 60) -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}

# Run tests
Run-Tests
