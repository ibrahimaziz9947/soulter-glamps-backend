# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Ensure your `.env` file has:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/soulter_db"
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-key-change-in-production
```

### Step 3: Setup Database
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init_models

# Seed test users
npm run seed
```

### Step 4: Start Server
```bash
npm run dev
```

Server will start at: **http://localhost:3000**

---

## 🧪 Test the API

### 1. Login as SUPER_ADMIN

**Request:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "super@soulter.com",
  "password": "super123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 3,
    "name": "Super Admin",
    "email": "super@soulter.com",
    "role": "SUPER_ADMIN"
  }
}
```

**Copy the token** for use in subsequent requests.

---

### 2. Create a Glamp (ADMIN)

**Request:**
```http
POST http://localhost:3000/api/glamps
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Luxury Mountain Tent",
  "description": "Beautiful glamping tent with stunning mountain view",
  "basePrice": 150000,
  "weekendPrice": 200000,
  "seasonalMultiplier": 1.2,
  "capacity": 4,
  "amenities": {
    "wifi": true,
    "ac": true,
    "kitchen": false,
    "bathroom": true
  },
  "images": ["tent1.jpg", "tent2.jpg"],
  "status": "ACTIVE"
}
```

---

### 3. Create a Booking (Public - No Auth)

**Request:**
```http
POST http://localhost:3000/api/bookings
Content-Type: application/json

{
  "customerName": "John Doe",
  "customerPhone": "08123456789",
  "customerEmail": "john@example.com",
  "checkIn": "2025-12-20",
  "nights": 3,
  "glampId": 1,
  "totalAmount": 450000,
  "paidAmount": 100000
}
```

---

### 4. View All Glamps (Public)

**Request:**
```http
GET http://localhost:3000/api/glamps?page=1&limit=10
```

---

## 📦 Thunder Client

For comprehensive API testing, import the Thunder Client collection:

1. Open VS Code
2. Install Thunder Client extension
3. Import `thunder-client-tests.json`
4. Set environment variables:
   - `BASE_URL`: http://localhost:3000
   - `TOKEN_SUPER_ADMIN`: (paste token from login)
   - `TOKEN_ADMIN`: (paste token from login)
   - `TOKEN_AGENT`: (paste token from login)

---

## 🔐 Test Users

```
SUPER_ADMIN: super@soulter.com / super123
ADMIN:       admin@soulter.com / admin123
AGENT:       agent@soulter.com / agent123
```

---

## 🎯 What's Next?

### Test Role-Based Access:
```http
# SUPER_ADMIN only
GET http://localhost:3000/api/test/super-admin
Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN

# ADMIN and above
GET http://localhost:3000/api/test/admin
Authorization: Bearer YOUR_ADMIN_TOKEN

# AGENT and above
GET http://localhost:3000/api/test/agent
Authorization: Bearer YOUR_AGENT_TOKEN
```

### Create a Lead (as AGENT):
```http
POST http://localhost:3000/api/leads
Authorization: Bearer YOUR_AGENT_TOKEN
Content-Type: application/json

{
  "fullName": "Jane Smith",
  "phone": "08198765432",
  "notes": "Interested in weekend booking for family"
}
```

### Convert Lead to Booking (as AGENT):
```http
POST http://localhost:3000/api/leads/1/convert
Authorization: Bearer YOUR_AGENT_TOKEN
Content-Type: application/json

{
  "customerEmail": "jane@example.com",
  "checkIn": "2025-12-25",
  "nights": 2,
  "glampId": 1,
  "totalAmount": 300000,
  "paidAmount": 150000
}
```

### Record Commission (as ADMIN):
```http
POST http://localhost:3000/api/finance/commissions
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "agentId": 4,
  "amount": 30000,
  "leadId": 1
}
```

### Get Financial Summary (as ADMIN):
```http
GET http://localhost:3000/api/finance/summary?fromDate=2025-01-01&toDate=2025-12-31
Authorization: Bearer YOUR_ADMIN_TOKEN
```

---

## 🐛 Troubleshooting

### Server won't start?
- Check if port 3000 is available
- Verify DATABASE_URL in .env
- Run `npx prisma generate`

### Database errors?
- Run `npx prisma migrate dev`
- Check PostgreSQL is running
- Verify database credentials

### Authentication errors?
- Verify JWT_SECRET is set in .env
- Check token is in format: `Bearer <token>`
- Ensure token hasn't expired (7 days)

### Prisma errors?
- Run `npx prisma generate`
- Check schema.prisma is valid
- Verify all migrations are applied

---

## 📚 Additional Resources

- **Full API Documentation**: See `/API_DOCUMENTATION.md` (if created)
- **Project Structure**: See `/README.md`
- **Testing Guide**: See `/TESTING_GUIDE.md`
- **Thunder Client Tests**: Import `/thunder-client-tests.json`

---

## ✅ Backend Implementation Complete!

All modules are fully functional:
- ✅ Authentication with JWT
- ✅ Role-based authorization
- ✅ Glamps management
- ✅ Bookings (public + admin)
- ✅ Leads management
- ✅ Staff management
- ✅ Finance tracking
- ✅ Commission management

**Happy coding! 🎉**
