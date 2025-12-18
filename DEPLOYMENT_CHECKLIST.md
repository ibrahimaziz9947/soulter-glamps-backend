# ✅ Production Deployment Checklist

Use this checklist to ensure your backend is production-ready before deploying to Railway.

---

## 🔐 Security Configuration

- [ ] **Strong JWT Secret Generated**
  - Use `openssl rand -base64 64` or `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`
  - Minimum 256 bits (32 bytes)
  - Never commit to version control

- [ ] **Environment Variables Secured**
  - `.env` file in `.gitignore`
  - All secrets in Railway environment variables
  - No hardcoded credentials in code

- [ ] **Database Connection Secured**
  - Using SSL-enabled PostgreSQL connection
  - Database URL includes `?sslmode=require` if needed
  - Database has strong password

- [ ] **CORS Properly Configured**
  - `FRONTEND_URLS` environment variable set
  - Only includes trusted frontend domains
  - No wildcard (*) origins in production

---

## 🗄️ Database Setup

- [ ] **PostgreSQL Database Created**
  - Railway Postgres provisioned OR external database setup
  - Database is accessible and running

- [ ] **DATABASE_URL Configured**
  - Format: `postgresql://user:password@host:port/database?schema=public`
  - Set in Railway environment variables
  - Tested connection successful

- [ ] **Migrations Deployed**
  - Run `npm run migrate:deploy` via Railway CLI
  - All migrations applied successfully
  - Check status with `npm run migrate:status`

- [ ] **Database Seeded (if needed)**
  - Initial users created (SUPER_ADMIN, ADMIN, AGENT)
  - Initial glamps/data seeded if required
  - ⚠️ Only run once on fresh database

---

## 🍪 Cookie & Authentication Setup

- [ ] **Cookie Domain Configured**
  - Set `COOKIE_DOMAIN` if using subdomains (e.g., `.yourdomain.com`)
  - Leave empty if frontend and backend on different domains

- [ ] **Cookie Security Enabled**
  - `COOKIE_SECURE=true` for HTTPS
  - `COOKIE_SAME_SITE=none` for cross-domain
  - `httpOnly` flag enabled in code ✅ (already set)

- [ ] **JWT Configuration**
  - Token expiration appropriate (7 days default)
  - Token verification working correctly
  - Refresh token strategy (if implemented)

- [ ] **Frontend Integration**
  - Frontend uses `credentials: 'include'` in fetch requests
  - Frontend handles 401 responses (redirect to login)
  - Frontend stores user state correctly

---

## 🌐 API & CORS Configuration

- [ ] **CORS Origins Set**
  - `FRONTEND_URLS` includes all production domains
  - Format: `https://domain1.com,https://domain2.com`
  - No trailing slashes
  - Includes both www and non-www if applicable

- [ ] **API Endpoints Tested**
  - Health check endpoint: `/health`
  - Authentication endpoints: `/api/auth/*`
  - Protected routes require authentication
  - Role-based authorization working

- [ ] **Error Handling**
  - Production error messages are user-friendly
  - Sensitive info not exposed in errors
  - Errors logged but not leaked to clients

---

## 🚂 Railway Configuration

- [ ] **Railway Project Created**
  - Backend service deployed
  - GitHub repository connected
  - Auto-deploy enabled (or manual deploy strategy)

- [ ] **Build Configuration**
  - Start command: `npm run start`
  - Build command: `npm install && npm run build`
  - Node version specified in `.nvmrc` (20)

- [ ] **Environment Variables Set**
  ```bash
  NODE_ENV=production
  DATABASE_URL=postgresql://...
  JWT_SECRET=...
  FRONTEND_URLS=https://...
  COOKIE_DOMAIN=...
  COOKIE_SECURE=true
  COOKIE_SAME_SITE=none
  PORT=${{PORT}}  # Railway auto-provides
  ```

- [ ] **Port Configuration**
  - Using `process.env.PORT` in code ✅ (already set)
  - Railway's dynamic `${{PORT}}` variable used

- [ ] **Custom Domain (Optional)**
  - Custom domain added in Railway
  - DNS CNAME record configured
  - SSL certificate provisioned (auto by Railway)

---

## 🧪 Testing & Validation

- [ ] **Health Check Working**
  ```bash
  curl https://your-backend.railway.app/health
  ```
  - Returns 200 status
  - Shows `"status": "ok"`
  - Database connection verified

- [ ] **Authentication Flow Tested**
  - Admin login works
  - Agent login works
  - Token is set in cookies
  - Protected routes require authentication

- [ ] **CORS Tested**
  - Frontend can make requests
  - Credentials sent correctly
  - No CORS errors in browser console

- [ ] **Database Operations Tested**
  - Create operations work
  - Read operations work
  - Update operations work
  - Delete operations work
  - Relationships functioning correctly

- [ ] **Error Scenarios Tested**
  - Invalid credentials return 401
  - Missing token returns 401
  - Invalid data returns 400
  - Not found returns 404
  - Server errors return 500

---

## 📊 Monitoring & Logging

- [ ] **Railway Logs Configured**
  - Logs visible in Railway dashboard
  - Production logs set to error/warn level ✅ (configured in Prisma)
  - No sensitive data logged

- [ ] **Monitoring Set Up**
  - Railway metrics enabled
  - CPU/Memory usage monitored
  - Response time tracked

- [ ] **Alerts Configured**
  - Deployment failure alerts
  - High resource usage alerts
  - Error rate alerts

- [ ] **Backup Strategy**
  - Database backups enabled
  - Backup frequency defined
  - Recovery process documented

---

## 📱 Frontend Integration

- [ ] **Frontend Environment Variables**
  - `REACT_APP_API_URL` or equivalent set to Railway URL
  - API base URL uses HTTPS
  - No hardcoded localhost URLs

- [ ] **API Client Configuration**
  - Using correct production API URL
  - `credentials: 'include'` for authenticated requests
  - Proper error handling

- [ ] **Cookie Handling**
  - Browser accepts cookies from API domain
  - No third-party cookie blocking issues
  - SameSite=None with Secure flag

---

## 🔄 Deployment Process

- [ ] **Version Control**
  - Latest code committed to main branch
  - No uncommitted changes
  - Git tags for releases

- [ ] **Dependencies Updated**
  - `npm install` runs successfully
  - No security vulnerabilities (`npm audit`)
  - All dependencies in `package.json`

- [ ] **Prisma Client Generated**
  - `postinstall` script runs `prisma generate` ✅ (configured)
  - Prisma Client matches schema

- [ ] **Initial Deployment**
  - First deployment successful
  - No build errors
  - Service is running

---

## ✅ Final Checks

- [ ] **End-to-End Testing**
  - User can register/login
  - User can create bookings
  - Admin can view dashboard
  - Agent functions work

- [ ] **Performance Check**
  - API response times acceptable (<500ms)
  - Database queries optimized
  - No N+1 query issues

- [ ] **Security Audit**
  - No exposed secrets in code
  - No CORS wildcards
  - Proper authentication on all routes
  - Rate limiting (if implemented)

- [ ] **Documentation Updated**
  - API documentation current
  - Environment variables documented
  - Deployment process documented

---

## 🚀 Ready to Deploy!

Once all items are checked:

1. ✅ Review this checklist one more time
2. ✅ Deploy to Railway
3. ✅ Run smoke tests on production
4. ✅ Monitor logs for first hour
5. ✅ Inform team/stakeholders

---

## 🆘 Rollback Plan

If deployment fails:

1. Check Railway logs immediately
2. Identify the error
3. Rollback to previous deployment in Railway dashboard
4. Fix issue locally
5. Test thoroughly
6. Redeploy

---

## 📞 Emergency Contacts

- Railway Status: https://railway.app/status
- Railway Discord: https://discord.gg/railway
- Project Lead: [Your contact info]
- Database Admin: [Your contact info]
