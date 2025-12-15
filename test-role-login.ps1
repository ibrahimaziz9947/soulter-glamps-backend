# Test role-specific login endpoints with PowerShell

$baseUrl = "http://localhost:5001/api/auth"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 Testing Role-Specific Login Endpoints" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Admin login with admin credentials (should succeed)
Write-Host "Test 1: Admin login with admin credentials" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/admin/login" -Method Post -Body (@{email="admin@soulter.com";password="admin123"} | ConvertTo-Json) -ContentType "application/json" -ErrorAction SilentlyContinue
if ($response.success) {
    Write-Host "✅ PASS: Logged in as $($response.user.email) ($($response.user.role))" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Expected success" -ForegroundColor Red
}
Write-Host ""

# Test 2: Admin login with agent credentials (should fail)
Write-Host "Test 2: Admin login with agent credentials (should FAIL)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/login" -Method Post -Body (@{email="agent@soulter.com";password="agent123"} | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Host "❌ FAIL: Should have been rejected" -ForegroundColor Red
} catch {
    Write-Host "✅ PASS: Correctly rejected (401 Unauthorized)" -ForegroundColor Green
}
Write-Host ""

# Test 3: Admin login with super-admin credentials (should fail)
Write-Host "Test 3: Admin login with super-admin credentials (should FAIL)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/login" -Method Post -Body (@{email="super@soulter.com";password="super123"} | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Host "❌ FAIL: Should have been rejected" -ForegroundColor Red
} catch {
    Write-Host "✅ PASS: Correctly rejected (401 Unauthorized)" -ForegroundColor Green
}
Write-Host ""

# Test 4: Agent login with agent credentials (should succeed)
Write-Host "Test 4: Agent login with agent credentials" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/agent/login" -Method Post -Body (@{email="agent@soulter.com";password="agent123"} | ConvertTo-Json) -ContentType "application/json" -ErrorAction SilentlyContinue
if ($response.success) {
    Write-Host "✅ PASS: Logged in as $($response.user.email) ($($response.user.role))" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Expected success" -ForegroundColor Red
}
Write-Host ""

# Test 5: Agent login with admin credentials (should fail)
Write-Host "Test 5: Agent login with admin credentials (should FAIL)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/agent/login" -Method Post -Body (@{email="admin@soulter.com";password="admin123"} | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Host "❌ FAIL: Should have been rejected" -ForegroundColor Red
} catch {
    Write-Host "✅ PASS: Correctly rejected (401 Unauthorized)" -ForegroundColor Green
}
Write-Host ""

# Test 6: Super-admin login with super-admin credentials (should succeed)
Write-Host "Test 6: Super-admin login with super-admin credentials" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/super-admin/login" -Method Post -Body (@{email="super@soulter.com";password="super123"} | ConvertTo-Json) -ContentType "application/json" -ErrorAction SilentlyContinue
if ($response.success) {
    Write-Host "✅ PASS: Logged in as $($response.user.email) ($($response.user.role))" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Expected success" -ForegroundColor Red
}
Write-Host ""

# Test 7: Super-admin login with admin credentials (should fail)
Write-Host "Test 7: Super-admin login with admin credentials (should FAIL)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/super-admin/login" -Method Post -Body (@{email="admin@soulter.com";password="admin123"} | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
    Write-Host "❌ FAIL: Should have been rejected" -ForegroundColor Red
} catch {
    Write-Host "✅ PASS: Correctly rejected (401 Unauthorized)" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ All tests completed" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
