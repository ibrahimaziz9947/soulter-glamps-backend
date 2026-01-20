# Simple Admin Booking Fix Test
$BASE_URL = "http://localhost:5001"

Write-Host "Admin Booking Bug Fix - Quick Test"
Write-Host "===================================="
Write-Host ""

# Login
Write-Host "1. Login as SUPER_ADMIN..."
$loginBody = @{ email = "superadmin@soulter.com"; password = "super123" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "   OK - Logged in"
Write-Host ""

# Get glamp
Write-Host "2. Get glamp..."
$glamps = Invoke-RestMethod -Uri "$BASE_URL/api/glamps" -Headers @{Authorization="Bearer $token"}
$glamp = $glamps.data[0]
Write-Host "   OK - Using glamp: $($glamp.name)"
Write-Host ""

# Test email
$ts = Get-Date -Format "HHmmss"
$email = "test-$ts@example.com"
Write-Host "3. Test email: $email"
Write-Host ""

# Create first booking
Write-Host "4. Create FIRST booking..."
$body1 = @{
    glampId = $glamp.id
    checkInDate = (Get-Date).AddDays(10).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    checkOutDate = (Get-Date).AddDays(12).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    adults = 2
    children = 0
    guest = @{
        fullName = "John Doe"
        email = $email
        phone = "+1111111111"
    }
    paymentStatus = "PENDING"
} | ConvertTo-Json

$booking1 = Invoke-RestMethod -Uri "$BASE_URL/api/admin/bookings" -Method Post -Body $body1 -ContentType "application/json" -Headers @{Authorization="Bearer $token"}
Write-Host "   OK - Booking 1 created: $($booking1.data.id)"
$b1id = $booking1.data.id
Write-Host ""

Start-Sleep -Seconds 1

# Create second booking (SAME email, different name)
Write-Host "5. Create SECOND booking (SAME email, DIFFERENT name)..."
$body2 = @{
    glampId = $glamp.id
    checkInDate = (Get-Date).AddDays(20).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    checkOutDate = (Get-Date).AddDays(22).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    adults = 2
    children = 0
    guest = @{
        fullName = "Jane Smith"  # Different name
        email = $email           # SAME email
        phone = "+2222222222"
    }
    paymentStatus = "PENDING"
} | ConvertTo-Json

$booking2 = Invoke-RestMethod -Uri "$BASE_URL/api/admin/bookings" -Method Post -Body $body2 -ContentType "application/json" -Headers @{Authorization="Bearer $token"}
Write-Host "   OK - Booking 2 created: $($booking2.data.id)"
$b2id = $booking2.data.id
Write-Host ""

Start-Sleep -Seconds 2

# Verify in admin bookings
Write-Host "6. Check /api/admin/bookings..."
$adminBookings = Invoke-RestMethod -Uri "$BASE_URL/api/admin/bookings" -Headers @{Authorization="Bearer $token"}
$found = $adminBookings.data | Where-Object { $_.id -eq $b2id }
if ($found) {
    Write-Host "   OK - FOUND in admin bookings"
} else {
    Write-Host "   ERROR - NOT FOUND in admin bookings!"
    exit 1
}
Write-Host ""

# Verify in super-admin bookings
Write-Host "7. Check /api/super-admin/bookings..."
$superBookings = Invoke-RestMethod -Uri "$BASE_URL/api/super-admin/bookings" -Headers @{Authorization="Bearer $token"}
$found = $superBookings.data.items | Where-Object { $_.id -eq $b2id }
if ($found) {
    Write-Host "   OK - FOUND in super-admin bookings"
} else {
    Write-Host "   WARNING - NOT FOUND (checking expanded date range)..."
    $url = "{0}/api/super-admin/bookings?from=2020-01-01&to=2030-01-01" -f $BASE_URL
    $expanded = Invoke-RestMethod -Uri $url -Headers @{Authorization="Bearer $token"}
    $found = $expanded.data.items | Where-Object { $_.id -eq $b2id }
    if ($found) {
        Write-Host "   OK - Found with expanded range (date filter issue)"
    } else {
        Write-Host "   ERROR - NOT FOUND even with expanded range!"
        exit 1
    }
}
Write-Host ""

Write-Host "===================================="
Write-Host "ALL TESTS PASSED!"
Write-Host "===================================="
Write-Host "Duplicate email handling works correctly"
Write-Host "Booking persisted and visible in lists"
Write-Host ""
Write-Host "Booking 1: $b1id"
Write-Host "Booking 2: $b2id"
Write-Host "Email: $email"
Write-Host ""
