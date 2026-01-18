# Super Admin Finance API Test Script (PowerShell)
# Tests all finance endpoints by reusing existing services

$API_URL = if ($env:API_URL) { $env:API_URL } else { "http://localhost:5001" }
$SUPER_ADMIN_EMAIL = if ($env:SUPER_ADMIN_EMAIL) { $env:SUPER_ADMIN_EMAIL } else { "superadmin@example.com" }
$SUPER_ADMIN_PASSWORD = if ($env:SUPER_ADMIN_PASSWORD) { $env:SUPER_ADMIN_PASSWORD } else { "Password123!" }

$authToken = $null

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
        [string]$Method = "GET"
    )
    
    $url = "$API_URL$Endpoint"
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($authToken) {
        $headers["Authorization"] = "Bearer $authToken"
    }
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers
        return @{
            Success = $true
            Data = $response
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
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
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/api/auth/login" `
            -Method POST `
            -Headers @{ "Content-Type" = "application/json" } `
            -Body $body
        
        $script:authToken = $response.token
        Write-Success "Login successful"
        Write-Info "User: $($response.user.name) ($($response.user.role))"
        return $true
    } catch {
        Write-Error-Custom "Login failed: $_"
        return $false
    }
}

function Test-Dashboard {
    Write-Section "📊 Step 2: Test Finance Dashboard"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/finance/dashboard"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Dashboard request successful"
        $kpis = $result.Data.data.kpis
        Write-Info "Total Income: $([math]::Round($kpis.totalIncomeCents / 100, 2)) USD"
        Write-Info "Total Expenses: $([math]::Round($kpis.totalExpensesCents / 100, 2)) USD"
        Write-Info "Net Profit: $([math]::Round($kpis.netProfitCents / 100, 2)) USD"
        return $true
    } else {
        Write-Error-Custom "Dashboard request failed"
        return $false
    }
}

function Test-ProfitLoss {
    Write-Section "💰 Step 3: Test Profit & Loss Statement"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/finance/profit-loss"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "P&L request successful"
        $data = $result.Data.data
        Write-Info "Income: $([math]::Round($data.totalIncomeCents / 100, 2)) USD"
        Write-Info "Expenses: $([math]::Round($data.totalExpensesCents / 100, 2)) USD"
        Write-Info "Net Profit: $([math]::Round($data.netProfitCents / 100, 2)) USD"
        return $true
    } else {
        Write-Error-Custom "P&L request failed"
        return $false
    }
}

function Test-Statements {
    Write-Section "📋 Step 4: Test Financial Statements"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/finance/statements?pageSize=5"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Statements request successful"
        Write-Info "Total transactions: $($result.Data.meta.total)"
        Write-Info "Showing: $($result.Data.data.Count) transactions"
        return $true
    } else {
        Write-Error-Custom "Statements request failed"
        return $false
    }
}

function Test-Expenses {
    Write-Section "💸 Step 5: Test Expenses List"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/finance/expenses"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Expenses request successful"
        Write-Info "Total expenses: $($result.Data.meta.total)"
        return $true
    } else {
        Write-Error-Custom "Expenses request failed"
        return $false
    }
}

function Test-Income {
    Write-Section "💵 Step 6: Test Income List"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/finance/income"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Income request successful"
        Write-Info "Total income entries: $($result.Data.meta.total)"
        return $true
    } else {
        Write-Error-Custom "Income request failed"
        return $false
    }
}

function Test-Purchases {
    Write-Section "🛒 Step 7: Test Purchases List"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/finance/purchases"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Purchases request successful"
        Write-Info "Total purchases: $($result.Data.meta.total)"
        return $true
    } else {
        Write-Error-Custom "Purchases request failed"
        return $false
    }
}

function Test-Payables {
    Write-Section "💳 Step 8: Test Payables"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/finance/payables"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Payables request successful"
        Write-Info "Total payables: $($result.Data.data.Count)"
        return $true
    } else {
        Write-Error-Custom "Payables request failed"
        return $false
    }
}

function Test-Categories {
    Write-Section "📁 Step 9: Test Categories"
    
    $result = Invoke-ApiRequest -Endpoint "/api/super-admin/finance/categories"
    
    if ($result.Success -and $result.Data.success) {
        Write-Success "Categories request successful"
        Write-Info "Total categories: $($result.Data.data.Count)"
        return $true
    } else {
        Write-Error-Custom "Categories request failed"
        return $false
    }
}

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

function Run-Tests {
    Write-Host ""
    Write-Host ("═" * 60) -ForegroundColor Cyan
    Write-Host "  SUPER ADMIN FINANCE API TEST SUITE" -ForegroundColor Cyan
    Write-Host ("═" * 60) -ForegroundColor Cyan
    Write-Host "  API URL: $API_URL" -ForegroundColor Gray
    Write-Host "  Testing: All finance endpoints (reusing existing services)" -ForegroundColor Gray
    Write-Host ("═" * 60) -ForegroundColor Cyan
    
    try {
        # Step 1: Login
        $loginSuccess = Test-Login
        if (-not $loginSuccess) {
            throw "Login failed"
        }
        
        # Step 2-9: Test all finance endpoints
        Test-Dashboard
        Test-ProfitLoss
        Test-Statements
        Test-Expenses
        Test-Income
        Test-Purchases
        Test-Payables
        Test-Categories
        
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
