# Curl Commands to Debug Super Admin Bookings API
# Replace YOUR_TOKEN_HERE with your actual SUPER_ADMIN JWT token

# Test 1: Exact date range (2025-12-18 to 2026-01-17) - Should show 33 bookings
curl -X GET "http://localhost:5001/api/super-admin/bookings?from=2025-12-18&to=2026-01-17&page=1&limit=20" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  | json_pp

# Test 2: Default params (last 30 days)
curl -X GET "http://localhost:5001/api/super-admin/bookings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  | json_pp

# Test 3: Filter by CONFIRMED status
curl -X GET "http://localhost:5001/api/super-admin/bookings?from=2025-12-18&to=2026-01-17&status=CONFIRMED" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  | json_pp

# Test 4: Filter by ALL status (should be ignored and return all)
curl -X GET "http://localhost:5001/api/super-admin/bookings?from=2025-12-18&to=2026-01-17&status=ALL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  | json_pp

# Test 5: Search functionality
curl -X GET "http://localhost:5001/api/super-admin/bookings?search=john" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  | json_pp

# Test 6: Without auth (should return 401)
curl -X GET "http://localhost:5001/api/super-admin/bookings" \
  -H "Content-Type: application/json"

# Windows PowerShell version:
# $token = "YOUR_TOKEN_HERE"
# $headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
# Invoke-RestMethod -Uri "http://localhost:5001/api/super-admin/bookings?from=2025-12-18&to=2026-01-17" -Headers $headers | ConvertTo-Json -Depth 10
