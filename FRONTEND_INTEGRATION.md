# Frontend Integration Guide

## Backend Configuration Complete ✅

The Express backend is now ready to integrate with your Next.js frontend running on `http://localhost:3001`.

### Changes Made:

1. **Port Changed**: Backend now runs on `http://localhost:5000` (was 3000)
2. **CORS Enabled**: Configured for Next.js frontend with credentials support
3. **Cookie Authentication**: JWT tokens are now set as HTTP-only cookies

---

## Backend Setup

### Start the Backend Server:
```bash
npm run dev
```

Server will start at: **http://localhost:5000**

---

## Frontend Integration

### 1. Login Request from Next.js

```typescript
// In your Next.js app (e.g., app/actions/auth.ts or pages/api/login.ts)

const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // IMPORTANT: This sends cookies
  body: JSON.stringify({
    email: 'admin@soulter.com',
    password: 'admin123',
  }),
});

const data = await response.json();

if (data.success) {
  // Token is automatically stored in HTTP-only cookie
  // User data is available in data.user
  console.log('Logged in as:', data.user);
}
```

### 2. Authenticated Requests

```typescript
// For subsequent API calls, include credentials
const response = await fetch('http://localhost:5000/api/glamps', {
  method: 'GET',
  credentials: 'include', // Sends the JWT cookie
});

const data = await response.json();
```

### 3. Using Authorization Header (Alternative)

You can also use the token from the response:

```typescript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const { token } = await response.json();

// Store token in localStorage or state
localStorage.setItem('token', token);

// Use it in subsequent requests
const apiResponse = await fetch('http://localhost:5000/api/glamps', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

---

## Backend Configuration Details

### CORS Settings:
```javascript
{
  origin: 'http://localhost:3001',      // Next.js frontend
  credentials: true,                     // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
```

### Cookie Settings:
```javascript
{
  httpOnly: true,        // Prevents JavaScript access (XSS protection)
  secure: false,         // Set to true in production with HTTPS
  sameSite: 'lax',       // CSRF protection
  maxAge: 7 days,        // Cookie expiration
}
```

---

## API Endpoints

All endpoints are available at: `http://localhost:5000/api/`

### Authentication:
- `POST /api/auth/login` - Login (sets cookie + returns token)
- `POST /api/auth/create-user` - Create user (SUPER_ADMIN only)

### Glamps:
- `GET /api/glamps` - Get all glamps (public)
- `POST /api/glamps` - Create glamp (ADMIN+)
- `GET /api/glamps/:id` - Get glamp details
- `PUT /api/glamps/:id` - Update glamp (ADMIN+)
- `DELETE /api/glamps/:id` - Delete glamp (SUPER_ADMIN)

### Bookings:
- `GET /api/bookings` - Get all bookings (ADMIN+)
- `POST /api/bookings` - Create booking (public)
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id/status` - Update status (ADMIN+)

### Leads:
- `GET /api/leads` - Get leads (AGENT+)
- `POST /api/leads` - Create lead (AGENT+)
- `PATCH /api/leads/:id` - Update lead (AGENT+)
- `POST /api/leads/:id/convert` - Convert to booking (AGENT+)

### Staff:
- `GET /api/staff` - Get staff (ADMIN+)
- `POST /api/staff` - Create staff (SUPER_ADMIN)
- `PUT /api/staff/:id` - Update staff (SUPER_ADMIN)
- `DELETE /api/staff/:id` - Delete staff (SUPER_ADMIN)

### Finance:
- `GET /api/finance/payments` - Get payments (ADMIN+)
- `POST /api/finance/payments` - Record payment (ADMIN+)
- `GET /api/finance/expenses` - Get expenses (ADMIN+)
- `POST /api/finance/expenses` - Record expense (ADMIN+)
- `GET /api/finance/commissions` - Get commissions (ADMIN+)
- `POST /api/finance/commissions` - Record commission (ADMIN+)
- `GET /api/finance/summary` - Financial summary (ADMIN+)

---

## Test Users

```javascript
SUPER_ADMIN: super@soulter.com / super123
ADMIN:       admin@soulter.com / admin123
AGENT:       agent@soulter.com / agent123
```

---

## Production Notes

### Before deploying to production:

1. **Update CORS origin**:
   ```javascript
   origin: process.env.FRONTEND_URL || 'https://yourdomain.com'
   ```

2. **Enable secure cookies**:
   ```javascript
   secure: true,  // HTTPS only
   ```

3. **Update environment variables**:
   ```env
   NODE_ENV=production
   JWT_SECRET=your-production-secret
   DATABASE_URL=your-production-db
   PORT=5000
   FRONTEND_URL=https://yourdomain.com
   ```

4. **Add rate limiting** (recommended):
   ```bash
   npm install express-rate-limit
   ```

---

## Troubleshooting

### CORS Errors:
- Ensure `credentials: 'include'` is in your fetch requests
- Verify frontend is running on `http://localhost:3000`
- Check browser console for specific CORS errors

### Cookie Not Set:
- Ensure `credentials: 'include'` in fetch
- Check backend port is 5000
- Verify cookie-parser middleware is loaded

### 401 Unauthorized:
- Check token is sent (either cookie or Authorization header)
- Verify token hasn't expired (7 days)
- Ensure user has correct role for the endpoint

---

## Next.js Example Component

```typescript
'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('Logged in:', data.user);
      // Redirect or update state
    } else {
      console.error('Login failed:', data.error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

**Your backend is now fully configured for Next.js integration!** 🎉
