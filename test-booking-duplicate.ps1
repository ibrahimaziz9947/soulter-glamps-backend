# Test Admin Booking with Duplicate Email
# Reproduce bug where success toast shows but booking doesn't persist

$BASE_URL = "http://localhost:5001"

Write-Host "==========================================="
Write-Host "TEST: Admin Booking with Duplicate Email"
Write-Host "==========================================="
Write-Host ""

# Step 1: Login as SUPER_ADMIN
Write-Host "🔐 Logging in as SUPER_ADMIN..."
$loginBody = @{
    email = "super@soulter.com"
    password = "super123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"

if (-not $loginResponse.success) {
    Write-Host "❌ Login failed"
    exit 1
}

$token = $loginResponse.token
Write-Host "✅ Logged in successfully"
Write-Host ""

# Step 2: Get glamps
Write-Host "🏕️  Getting available glamp..."
$glamps = Invoke-RestMethod -Uri "$BASE_URL/api/glamps" -Headers @{Authorization="Bearer $token"}
$glamp = $glamps.data[0]
Write-Host "✅ Using glamp: $($glamp.name) ($($glamp.id))"
Write-Host ""

# Test email that will be reused
$testEmail = "duplicate-test-$(Get-Date -Format 'HHmmss')@example.com"

# Step 3: Create first booking
Write-Host "📝 ATTEMPT 1: Creating first booking with email: $testEmail"
$checkIn1 = (Get-Date).AddDays(10).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$checkOut1 = (Get-Date).AddDays(12).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$booking1Body = @{
    glampId = $glamp.id
    checkInDate = $checkIn1
    checkOutDate = $checkOut1
    adults = 2
    children = 0
    guest = @{
        fullName = "John Doe"
        email = $testEmail
        phone = "+1234567890"
    }
    paymentStatus = "PENDING"
} | ConvertTo-Json

try {
    $booking1 = Invoke-RestMethod -Uri "$BASE_URL/api/admin/bookings" -Method Post -Body $booking1Body -ContentType "application/json" -Headers @{Authorization="Bearer $token"}
    Write-Host "✅ First booking created: $($booking1.data.id)"
} catch {
    Write-Host "❌ First booking failed: $($_.Exception.Message)"
}

Start-Sleep -Seconds 1

# Step 4: Create second booking with SAME email
Write-Host ""
Write-Host "📝 ATTEMPT 2: Creating second booking with SAME email (different name & dates)"
$checkIn2 = (Get-Date).AddDays(20).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$checkOut2 = (Get-Date).AddDays(22).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$booking2Body = @{
    glampId = $glamp.id
    checkInDate = $checkIn2
    checkOutDate = $checkOut2
    adults = 2
    children = 0
    guest = @{
        fullName = "Jane Smith"  # Different name
        email = $testEmail       # SAME email
        phone = "+9876543210"
    }
    paymentStatus = "PENDING"
} | ConvertTo-Json

try {
    $booking2 = Invoke-RestMethod -Uri "$BASE_URL/api/admin/bookings" -Method Post -Body $booking2Body -ContentType "application/json" -Headers @{Authorization="Bearer $token"}
    
    Write-Host ""
    Write-Host "==========================================="
    Write-Host "RESULT: Second Booking"
    Write-Host "==========================================="
    Write-Host "✅ API returned SUCCESS"
    Write-Host "   Booking ID: $($booking2.data.id)"
    
    # Wait for DB
    Start-Sleep -Seconds 2
    
    # Check if appears in admin bookings
    Write-Host ""
    Write-Host "🔍 Checking /api/admin/bookings..."
    $adminBookings = Invoke-RestMethod -Uri "$BASE_URL/api/admin/bookings" -Headers @{Authorization="Bearer $token"}
    $foundInAdmin = $adminBookings.data | Where-Object { $_.id -eq $booking2.data.id }
    
    if ($foundInAdmin) {
        Write-Host "   ✅ FOUND in admin bookings"
    } else {
        Write-Host "   ❌ NOT FOUND in admin bookings (total: $($adminBookings.count))"
        Write-Host "   ❌❌❌ BUG CONFIRMED: Success returned but booking not in list!"
    }
    
    # Check super-admin bookings
    Write-Host ""
    Write-Host "🔍 Checking /api/super-admin/bookings..."
    $superBookings = Invoke-RestMethod -Uri "$BASE_URL/api/super-admin/bookings" -Headers @{Authorization="Bearer $token"}
    $foundInSuper = $superBookings.data.items | Where-Object { $_.id -eq $booking2.data.id }
    
    if ($foundInSuper) {
        Write-Host "   ✅ FOUND in super-admin bookings"
    } else {
        Write-Host "   ❌ NOT FOUND in super-admin bookings (total: $($superBookings.data.total))"
        Write-Host "   ❌❌❌ BUG CONFIRMED: Success returned but booking not in list!"
    }
    
} catch {
    Write-Host ""
    Write-Host "==========================================="
    Write-Host "RESULT: Second Booking"
    Write-Host "==========================================="
    Write-Host "❌ API correctly returned ERROR"
    Write-Host "   Error: $($_.Exception.Message)"
    Write-Host "✅ This is CORRECT behavior (no false success)"
}

Write-Host ""
Write-Host "==========================================="
Write-Host ""
