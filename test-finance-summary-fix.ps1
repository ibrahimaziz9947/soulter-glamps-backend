#!/usr/bin/env pwsh
#
# Test Super Admin Finance Summary - Verify Bug Fixes
# Tests the exact production scenario that was failing
#

$ErrorActionPreference = "Continue"

# Configuration
$BASE_URL = "http://localhost:5001"
$SUPER_ADMIN_EMAIL = "superadmin@example.com"
$SUPER_ADMIN_PASSWORD = "Password123!"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUPER ADMIN FINANCE SUMMARY - BUG FIX TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================================
# 1. LOGIN AS SUPER ADMIN
# ============================================================================
Write-Host "[1/4] Logging in as SUPER_ADMIN..." -ForegroundColor Yellow

$loginPayload = @{
    email = $SUPER_ADMIN_EMAIL
    password = $SUPER_ADMIN_PASSWORD
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginPayload

    if ($loginResponse.success -and $loginResponse.token) {
        $token = $loginResponse.token
        Write-Host "✅ Login successful" -ForegroundColor Green
        Write-Host "   User: $($loginResponse.user.email)" -ForegroundColor Gray
        Write-Host "   Role: $($loginResponse.user.role)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Login failed: No token received" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# 2. TEST FINANCE PING (Health Check)
# ============================================================================
Write-Host "`n[2/4] Testing finance ping endpoint..." -ForegroundColor Yellow

try {
    $pingResponse = Invoke-RestMethod -Uri "$BASE_URL/api/super-admin/finance/ping" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $token"
        }

    if ($pingResponse.success) {
        Write-Host "✅ Finance ping successful" -ForegroundColor Green
        Write-Host "   Database: $($pingResponse.database)" -ForegroundColor Gray
        Write-Host "   Message: $($pingResponse.message)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Finance ping failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Finance ping error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# 3. TEST FINANCE SUMMARY - EXACT PRODUCTION SCENARIO
# ============================================================================
Write-Host "`n[3/4] Testing finance summary (2025-12-19 to 2026-01-18)..." -ForegroundColor Yellow
Write-Host "   This is the exact date range that was failing in production" -ForegroundColor Gray

try {
    $summaryResponse = Invoke-RestMethod -Uri "$BASE_URL/api/super-admin/finance/summary?from=2025-12-19&to=2026-01-18" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $token"
        }

    if ($summaryResponse.success) {
        Write-Host "✅ Finance summary successful" -ForegroundColor Green
        Write-Host "`n   PROFIT & LOSS:" -ForegroundColor Cyan
        Write-Host "   - Revenue: `$$([math]::Round($summaryResponse.data.profitLoss.revenueCents / 100, 2))" -ForegroundColor Gray
        Write-Host "   - Expenses: `$$([math]::Round($summaryResponse.data.profitLoss.expenseCents / 100, 2))" -ForegroundColor Gray
        Write-Host "   - Profit: `$$([math]::Round($summaryResponse.data.profitLoss.profitCents / 100, 2))" -ForegroundColor Gray
        
        Write-Host "`n   LEDGER:" -ForegroundColor Cyan
        Write-Host "   - Total entries: $($summaryResponse.data.ledger.totalEntries)" -ForegroundColor Gray
        Write-Host "   - Latest entries shown: $($summaryResponse.data.ledger.latestEntries.Count)" -ForegroundColor Gray
        
        if ($summaryResponse.data.ledger.latestEntries.Count -gt 0) {
            Write-Host "   - First entry: $($summaryResponse.data.ledger.latestEntries[0].type) - $($summaryResponse.data.ledger.latestEntries[0].description)" -ForegroundColor Gray
        }
        
        if ($summaryResponse.data.ledger.totals) {
            Write-Host "   - Total In: `$$([math]::Round($summaryResponse.data.ledger.totals.totalInCents / 100, 2))" -ForegroundColor Gray
            Write-Host "   - Total Out: `$$([math]::Round([math]::Abs($summaryResponse.data.ledger.totals.totalOutCents) / 100, 2))" -ForegroundColor Gray
            Write-Host "   - Net: `$$([math]::Round($summaryResponse.data.ledger.totals.netCents / 100, 2))" -ForegroundColor Gray
        }
        
        Write-Host "`n   PAYABLES:" -ForegroundColor Cyan
        Write-Host "   - Open count: $($summaryResponse.data.payables.openCount)" -ForegroundColor Gray
        Write-Host "   - Open amount: `$$([math]::Round($summaryResponse.data.payables.openAmountCents / 100, 2))" -ForegroundColor Gray
        
        Write-Host "`n   RECEIVABLES:" -ForegroundColor Cyan
        Write-Host "   - Count: $($summaryResponse.data.receivables.count)" -ForegroundColor Gray
        Write-Host "   - Amount: `$$([math]::Round($summaryResponse.data.receivables.amountCents / 100, 2))" -ForegroundColor Gray
        
        # Verify critical fix: latestEntries must be an array, not crash
        if ($null -eq $summaryResponse.data.ledger.latestEntries) {
            Write-Host "`n❌ CRITICAL: latestEntries is null (should be array)" -ForegroundColor Red
        } elseif ($summaryResponse.data.ledger.latestEntries -is [array]) {
            Write-Host "`n✅ FIX VERIFIED: latestEntries is an array (was crashing on .map)" -ForegroundColor Green
        }
        
    } else {
        Write-Host "❌ Finance summary failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Finance summary error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode.value__ -eq 500) {
        Write-Host "`n⚠️  STILL GETTING 500 ERROR - Bug not fixed yet" -ForegroundColor Red
    }
}

# ============================================================================
# 4. TEST WITH DEFAULT DATE RANGE (Last 30 Days)
# ============================================================================
Write-Host "`n[4/4] Testing finance summary with default date range..." -ForegroundColor Yellow

try {
    $defaultResponse = Invoke-RestMethod -Uri "$BASE_URL/api/super-admin/finance/summary" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $token"
        }

    if ($defaultResponse.success) {
        Write-Host "✅ Default date range successful" -ForegroundColor Green
        Write-Host "   Date range: $($defaultResponse.data.range.from) to $($defaultResponse.data.range.to)" -ForegroundColor Gray
        Write-Host "   Ledger entries: $($defaultResponse.data.ledger.totalEntries)" -ForegroundColor Gray
        Write-Host "   Latest shown: $($defaultResponse.data.ledger.latestEntries.Count)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Default date range failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Default date range error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ If all tests passed, the following bugs are fixed:" -ForegroundColor Green
Write-Host "   1. 500 error on .map crash (ledger.items undefined)" -ForegroundColor Gray
Write-Host "   2. Auth token detection with debug logging" -ForegroundColor Gray
Write-Host "   3. Safe defaults prevent crashes on empty data" -ForegroundColor Gray
Write-Host "`n⚠️  Check Railway logs for debug output:" -ForegroundColor Yellow
Write-Host "   - 'Ledger response keys: ...'" -ForegroundColor Gray
Write-Host "   - 'hasAuthHeader: true/false'" -ForegroundColor Gray
Write-Host "   - 'resolvedUserRole: SUPER_ADMIN'" -ForegroundColor Gray
Write-Host "`n========================================`n" -ForegroundColor Cyan
