$baseUrl = "http://localhost:5001/api"

# Login
$loginBody = @{
    email = "admin@soulter.com"
    password = "admin123"
} | ConvertTo-Json

$loginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.token

$headers = @{
    "Authorization" = "Bearer $token"
}

# Test purchases list
$list = Invoke-RestMethod -Uri "$baseUrl/finance/purchases" -Headers $headers
Write-Host "✓ GET /api/finance/purchases works!" -ForegroundColor Green
Write-Host "  Total: $($list.pagination.total)" -ForegroundColor Gray

# Test purchases summary
$summary = Invoke-RestMethod -Uri "$baseUrl/finance/purchases/summary" -Headers $headers
Write-Host "✓ GET /api/finance/purchases/summary works!" -ForegroundColor Green
Write-Host "  Total count: $($summary.data.totalCount)" -ForegroundColor Gray
