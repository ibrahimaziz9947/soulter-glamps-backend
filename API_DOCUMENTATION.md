# Soulter Backend Authentication & Routes

## Authentication System

### Overview
The authentication system uses JWT tokens with role-based access control (RBAC).

### User Roles
- **SUPER_ADMIN**: Full system access, can create admins and agents
- **ADMIN**: Manage bookings, glamps, staff, finance, and reports
- **AGENT**: Manage own leads and commissions

### Authentication Flow

#### 1. Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "ADMIN"
  }
}
```

#### 2. Create User (SUPER_ADMIN only)
**Endpoint:** `POST /api/auth/create-user`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "Jane Doe",
  "role": "ADMIN"
}
```

**Allowed Roles:** ADMIN, AGENT

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "Jane Doe",
    "role": "ADMIN",
    "active": true,
    "createdAt": "2025-12-07T..."
  }
}
```

### Middleware

#### Authentication Middleware (`authRequired`)
- Verifies JWT token from Authorization header
- Fetches user from database
- Checks if user is active
- Attaches user to `req.user`

**Usage:**
```javascript
import { authRequired } from '../middleware/auth.js';

router.get('/protected', authRequired, (req, res) => {
  // req.user is available here
});
```

#### Role-based Middleware
- `requireSuperAdmin` - Only SUPER_ADMIN
- `requireAdmin` - SUPER_ADMIN and ADMIN
- `requireAgent` - SUPER_ADMIN, ADMIN, and AGENT

**Usage:**
```javascript
import { authRequired } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

router.post('/admin-only', authRequired, requireAdmin, controller);
```

### Utilities

#### Password Hashing (`src/utils/hash.js`)
```javascript
import { hashPassword, comparePassword } from '../utils/hash.js';

const hashed = await hashPassword('mypassword');
const isValid = await comparePassword('mypassword', hashed);
```

#### JWT Tokens (`src/utils/jwt.js`)
```javascript
import { signToken, verifyToken } from '../utils/jwt.js';

const token = signToken({ userId: user.id }); // Expires in 7 days
const decoded = verifyToken(token);
```

#### Response Format (`src/utils/response.js`)
```javascript
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';

// Success
successResponse(res, { user }, 'User created', 201);

// Error
errorResponse(res, 'User not found', 404);

// Paginated
paginatedResponse(res, items, page, limit, total);
```

## API Routes Structure

### Authentication Routes (`/api/auth`)
- `POST /auth/login` - User login (Public)
- `POST /auth/create-user` - Create user (SUPER_ADMIN)

### Agent Routes (`/api/agents`)
- `GET /agents` - Get all agents (ADMIN+)
- `GET /agents/:id` - Get agent by ID (AGENT+)
- `PUT /agents/:id` - Update agent (ADMIN+)
- `DELETE /agents/:id` - Delete agent (ADMIN+)

### Lead Routes (`/api/leads`)
- `GET /leads` - Get all leads (AGENT+)
- `POST /leads` - Create lead (AGENT+)
- `GET /leads/:id` - Get lead by ID (AGENT+)
- `PUT /leads/:id` - Update lead (AGENT+)
- `DELETE /leads/:id` - Delete lead (ADMIN+)

### Booking Routes (`/api/bookings`)
- `GET /bookings` - Get all bookings (ADMIN+)
- `POST /bookings` - Create booking (Public - no auth)
- `GET /bookings/:id` - Get booking by ID (Public)
- `PUT /bookings/:id` - Update booking (ADMIN+)
- `PATCH /bookings/:id/cancel` - Cancel booking (Public)
- `DELETE /bookings/:id` - Delete booking (ADMIN+)

### Commission Routes (`/api/commissions`)
- `GET /commissions` - Get my commissions (AGENT+)
- `GET /commissions/all` - Get all commissions (ADMIN+)
- `POST /commissions` - Create commission (ADMIN+)
- `PATCH /commissions/:id/status` - Update status (ADMIN+)
- `GET /commissions/:id` - Get commission by ID (AGENT+)

### Staff Routes (`/api/staff`)
- `GET /staff` - Get all staff (ADMIN+)
- `POST /staff` - Create staff (ADMIN+)
- `GET /staff/:id` - Get staff by ID (ADMIN+)
- `PUT /staff/:id` - Update staff (ADMIN+)
- `DELETE /staff/:id` - Delete staff (ADMIN+)

### Glamp Routes (`/api/glamps`)
- `GET /glamps` - Get all glamps (Public)
- `GET /glamps/:id` - Get glamp by ID (Public)
- `POST /glamps` - Create glamp (ADMIN+)
- `PUT /glamps/:id` - Update glamp (ADMIN+)
- `DELETE /glamps/:id` - Delete glamp (ADMIN+)
- `POST /glamps/availability` - Check availability (Public)

### Finance Routes (`/api/finance`)
#### Income
- `GET /finance/income` - Get all income (ADMIN+)
- `POST /finance/income` - Create income (ADMIN+)
- `GET /finance/income/:id` - Get income by ID (ADMIN+)
- `PUT /finance/income/:id` - Update income (ADMIN+)
- `DELETE /finance/income/:id` - Delete income (ADMIN+)

#### Expenses
- `GET /finance/expenses` - Get all expenses (ADMIN+)
- `POST /finance/expenses` - Create expense (ADMIN+)
- `GET /finance/expenses/:id` - Get expense by ID (ADMIN+)
- `PUT /finance/expenses/:id` - Update expense (ADMIN+)
- `DELETE /finance/expenses/:id` - Delete expense (ADMIN+)

#### Summary
- `GET /finance/summary` - Get financial summary (ADMIN+)
- `GET /finance/monthly/:year/:month` - Get monthly report (ADMIN+)

### Report Routes (`/api/reports`)
- `POST /reports/bookings` - Generate booking report (ADMIN+)
- `POST /reports/financial` - Generate financial report (ADMIN+)
- `POST /reports/commissions` - Generate commission report (ADMIN+)
- `POST /reports/occupancy` - Generate occupancy report (ADMIN+)
- `GET /reports` - Get all saved reports (ADMIN+)
- `GET /reports/:id` - Get report by ID (ADMIN+)
- `DELETE /reports/:id` - Delete report (SUPER_ADMIN)

## Environment Variables

Add to `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/soulter_backend"
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secure-secret-key-here
```

## Testing Authentication

### 1. Login as SUPER_ADMIN
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@soulter.com",
    "password": "yourpassword"
  }'
```

### 2. Create New User
```bash
curl -X POST http://localhost:3000/api/auth/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "email": "agent@soulter.com",
    "password": "password123",
    "name": "Agent Name",
    "role": "AGENT"
  }'
```

## Next Steps

1. Implement controller functions for each module
2. Add input validation
3. Implement pagination for list endpoints
4. Add filtering and sorting capabilities
5. Create service layer for business logic
6. Add comprehensive error handling
7. Implement rate limiting
8. Add API documentation with Swagger
