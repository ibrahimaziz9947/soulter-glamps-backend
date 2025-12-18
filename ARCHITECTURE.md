# 🏗️ Production Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION SETUP                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         HTTPS          ┌──────────────────┐
│                  │    ┌──────────────┐    │                  │
│   Frontend       │────│    CORS      │───▶│   Backend API    │
│   (Vercel/       │◀───│  Credentials │────│   (Railway)      │
│    Netlify)      │    └──────────────┘    │                  │
│                  │                         │  Port: 5001      │
└──────────────────┘                         └──────────────────┘
       │                                              │
       │                                              │
       │ Set-Cookie                                   │ Prisma
       │ (httpOnly, secure, sameSite=none)           │ Client
       │                                              │
       ▼                                              ▼
┌──────────────────┐                         ┌──────────────────┐
│                  │                         │                  │
│  Browser         │                         │  PostgreSQL      │
│  Cookie Storage  │                         │  (Railway DB)    │
│                  │                         │                  │
└──────────────────┘                         └──────────────────┘
```

---

## Request Flow

### 1. Authentication Flow

```
Frontend                    Backend                     Database
   │                           │                            │
   │  POST /api/auth/login     │                            │
   │──────────────────────────▶│                            │
   │  {email, password}        │                            │
   │                           │  findUnique({email})       │
   │                           │───────────────────────────▶│
   │                           │                            │
   │                           │◀───────────────────────────│
   │                           │  User data                 │
   │                           │                            │
   │                           │  1. Verify password        │
   │                           │  2. Generate JWT           │
   │                           │  3. Set cookie             │
   │                           │                            │
   │◀──────────────────────────│                            │
   │  Set-Cookie: auth_token   │                            │
   │  {user: {...}}            │                            │
   │                           │                            │
```

### 2. Authenticated Request Flow

```
Frontend                    Backend                     Database
   │                           │                            │
   │  GET /api/bookings        │                            │
   │  Cookie: auth_token       │                            │
   │──────────────────────────▶│                            │
   │                           │                            │
   │                           │  1. Extract cookie         │
   │                           │  2. Verify JWT             │
   │                           │  3. Fetch user             │
   │                           │───────────────────────────▶│
   │                           │◀───────────────────────────│
   │                           │  User + Role               │
   │                           │                            │
   │                           │  4. Check authorization    │
   │                           │  5. Query bookings         │
   │                           │───────────────────────────▶│
   │                           │◀───────────────────────────│
   │                           │  Bookings data             │
   │◀──────────────────────────│                            │
   │  {bookings: [...]}        │                            │
   │                           │                            │
```

---

## Environment Configuration

### Development Environment

```
┌────────────────────────────────────────────┐
│         DEVELOPMENT (localhost)            │
├────────────────────────────────────────────┤
│                                            │
│  Frontend: http://localhost:3000          │
│  Backend:  http://localhost:5001          │
│  Database: postgresql://localhost:5432    │
│                                            │
│  CORS: ['http://localhost:3000']          │
│  Cookies: secure=false, sameSite=lax      │
│                                            │
└────────────────────────────────────────────┘
```

### Production Environment

```
┌────────────────────────────────────────────┐
│         PRODUCTION (cloud)                 │
├────────────────────────────────────────────┤
│                                            │
│  Frontend: https://myapp.vercel.app       │
│  Backend:  https://api.railway.app        │
│  Database: postgresql://railway.internal  │
│                                            │
│  CORS: [process.env.FRONTEND_URLS]        │
│  Cookies: secure=true, sameSite=none      │
│                                            │
└────────────────────────────────────────────┘
```

---

## Database Migration Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Migration Process                      │
└─────────────────────────────────────────────────────────┘

Developer                Railway CLI              Database
    │                         │                       │
    │  railway run            │                       │
    │  npm run migrate:deploy │                       │
    │────────────────────────▶│                       │
    │                         │                       │
    │                         │  1. Check migrations  │
    │                         │  2. Apply pending     │
    │                         │──────────────────────▶│
    │                         │                       │
    │                         │  3. Update schema     │
    │                         │  4. Record in table   │
    │                         │                       │
    │                         │◀──────────────────────│
    │◀────────────────────────│                       │
    │  ✅ Migrations applied   │                       │
    │                         │                       │
```

---

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Security Stack                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: HTTPS (SSL/TLS)                               │
│  ├─ Railway auto-provisions SSL certificates            │
│  └─ All traffic encrypted                               │
│                                                          │
│  Layer 2: CORS Whitelist                                │
│  ├─ Only allowed origins can make requests              │
│  └─ Credentials enabled for trusted domains             │
│                                                          │
│  Layer 3: JWT Authentication                            │
│  ├─ 256-bit secret key                                  │
│  ├─ 7-day token expiration                              │
│  └─ Stored in httpOnly cookies (XSS protection)         │
│                                                          │
│  Layer 4: Role-Based Authorization                      │
│  ├─ SUPER_ADMIN, ADMIN, AGENT, CUSTOMER roles           │
│  ├─ Middleware checks on every protected route          │
│  └─ Database-level user validation                      │
│                                                          │
│  Layer 5: Database Security                             │
│  ├─ SSL-enabled connections                             │
│  ├─ Parameterized queries (Prisma)                      │
│  └─ Environment-based credentials                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Cookie Configuration

### Development (Local)
```javascript
{
  httpOnly: true,      // ✅ Prevents JavaScript access (XSS protection)
  secure: false,       // HTTP allowed for localhost
  sameSite: 'lax',     // Same-site only (CSRF protection)
  domain: undefined,   // Current domain only
  path: '/',           // All paths
  maxAge: 604800000    // 7 days
}
```

### Production (Cross-Domain)
```javascript
{
  httpOnly: true,      // ✅ Prevents JavaScript access
  secure: true,        // ✅ HTTPS only
  sameSite: 'none',    // ✅ Allow cross-domain (with secure=true)
  domain: '.myapp.com',// ✅ Optional: Share across subdomains
  path: '/',           // All paths
  maxAge: 604800000    // 7 days
}
```

---

## File Structure

```
soulter-backend/
│
├── 📄 Configuration Files
│   ├── .env.example              ← Environment template
│   ├── .nvmrc                    ← Node version (20)
│   ├── railway.json              ← Railway config
│   ├── Procfile                  ← Process definition
│   └── package.json              ← Dependencies + scripts
│
├── 📚 Documentation
│   ├── README.md                 ← Main documentation
│   ├── QUICK_DEPLOY.md           ← 5-step deployment guide
│   ├── RAILWAY_DEPLOYMENT.md     ← Complete deployment guide
│   ├── DEPLOYMENT_CHECKLIST.md   ← Production checklist
│   ├── ENV_VARIABLES.md          ← Environment variables reference
│   ├── PRODUCTION_SUMMARY.md     ← Summary of changes
│   └── ARCHITECTURE.md           ← This file
│
├── 🗄️ Database
│   └── prisma/
│       ├── schema.prisma         ← Database schema
│       ├── seed.js               ← Database seeder
│       └── migrations/           ← Migration history
│
└── 💻 Application Code
    └── src/
        ├── server.js             ← Express app (CORS, routes)
        ├── config/
        │   └── prisma.js         ← Prisma client (production-ready)
        ├── controllers/
        │   └── auth.controller.js← Cookie configuration
        ├── middleware/
        │   ├── auth.js           ← JWT verification
        │   └── roles.js          ← Authorization
        └── routes/               ← API endpoints
```

---

## Deployment Checklist Visual

```
┌─────────────────────────────────────────────────────────┐
│              Production Deployment Flow                  │
└─────────────────────────────────────────────────────────┘

   Step 1: Preparation
   ┌────────────────────────────────┐
   │ ✅ Generate JWT secret          │
   │ ✅ Copy frontend URL            │
   │ ✅ Review documentation         │
   └────────────────────────────────┘
                │
                ▼
   Step 2: Database Setup
   ┌────────────────────────────────┐
   │ ✅ Create Railway PostgreSQL    │
   │ ✅ Copy DATABASE_URL            │
   └────────────────────────────────┘
                │
                ▼
   Step 3: Deploy Backend
   ┌────────────────────────────────┐
   │ ✅ Connect GitHub repository    │
   │ ✅ Railway auto-deploys         │
   └────────────────────────────────┘
                │
                ▼
   Step 4: Configure Environment
   ┌────────────────────────────────┐
   │ ✅ Set NODE_ENV=production      │
   │ ✅ Set DATABASE_URL             │
   │ ✅ Set JWT_SECRET               │
   │ ✅ Set FRONTEND_URLS            │
   │ ✅ Set cookie settings          │
   └────────────────────────────────┘
                │
                ▼
   Step 5: Run Migrations
   ┌────────────────────────────────┐
   │ ✅ Install Railway CLI          │
   │ ✅ railway run migrate:deploy   │
   └────────────────────────────────┘
                │
                ▼
   Step 6: Testing
   ┌────────────────────────────────┐
   │ ✅ Test /health endpoint        │
   │ ✅ Test authentication          │
   │ ✅ Test CORS                    │
   └────────────────────────────────┘
                │
                ▼
   Step 7: Go Live! 🚀
   ┌────────────────────────────────┐
   │ ✅ Update frontend API URL      │
   │ ✅ Monitor Railway logs         │
   │ ✅ Set up alerts                │
   └────────────────────────────────┘
```

---

## Key Differences: Dev vs Production

| Aspect              | Development                 | Production                    |
|---------------------|-----------------------------|------------------------------ |
| **Protocol**        | HTTP                        | HTTPS ✅                      |
| **Database**        | Local PostgreSQL/SQLite     | Railway Cloud PostgreSQL      |
| **CORS Origins**    | localhost:3000, :3001       | Production frontend URLs      |
| **Cookie Secure**   | `false`                     | `true` ✅                     |
| **Cookie SameSite** | `lax`                       | `none` ✅                     |
| **JWT Secret**      | Simple dev secret           | Strong 256-bit secret ✅      |
| **Logs**            | Verbose (query, error)      | Minimal (error, warn) ✅      |
| **Environment**     | `NODE_ENV=development`      | `NODE_ENV=production` ✅      |

---

## Health Check Endpoint

The `/health` endpoint provides real-time status:

```json
{
  "status": "ok",
  "timestamp": "2024-12-18T10:30:00.000Z",
  "environment": "production",
  "database": "connected"
}
```

**Use Cases:**
- Railway health checks
- Monitoring services (UptimeRobot, Pingdom)
- CI/CD pipeline validation
- Load balancer health checks

---

## Monitoring & Logging

```
┌─────────────────────────────────────────────────────────┐
│                  Monitoring Setup                        │
└─────────────────────────────────────────────────────────┘

   Railway Dashboard
   ├── Metrics Tab
   │   ├── CPU Usage
   │   ├── Memory Usage
   │   ├── Network Traffic
   │   └── Response Times
   │
   ├── Logs Tab
   │   ├── Application logs
   │   ├── Error logs
   │   ├── Request logs
   │   └── Database logs
   │
   └── Alerts
       ├── Deployment failures
       ├── High resource usage
       └── Service downtime
```

---

## Success Criteria

✅ **Backend is production-ready when:**

- [ ] Health check returns 200 with "database": "connected"
- [ ] Authentication flow works (login sets cookie)
- [ ] Protected routes require authentication
- [ ] CORS allows frontend requests
- [ ] Cookies are sent cross-domain
- [ ] Database migrations are applied
- [ ] No errors in Railway logs
- [ ] All environment variables are set
- [ ] Frontend can communicate with backend
- [ ] SSL certificate is active (HTTPS)

---

**Your backend is architected for scale! 🏗️**
