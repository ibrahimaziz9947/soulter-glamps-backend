# 🚀 Railway Deployment Guide

## Prerequisites

- ✅ Railway account ([railway.app](https://railway.app))
- ✅ GitHub repository with your backend code
- ✅ PostgreSQL database (Railway provides one-click setup)

---

## 🗄️ Step 1: Set Up PostgreSQL Database

### Option A: Railway Postgres (Recommended)

1. Go to [railway.app](https://railway.app)
2. Click **New Project**
3. Select **Provision PostgreSQL**
4. Once created, click on the PostgreSQL service
5. Go to **Variables** tab
6. Copy the `DATABASE_URL` (you'll need this later)

### Option B: External Database (Supabase, Neon, etc.)

1. Create a PostgreSQL database on your provider
2. Get the connection string in this format:
   ```
   postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
   ```

---

## 🚂 Step 2: Deploy Backend to Railway

### 2.1 Connect GitHub Repository

1. In Railway, click **New Project**
2. Select **Deploy from GitHub repo**
3. Authorize Railway to access your GitHub account
4. Select the `soulter-backend` repository
5. Railway will auto-detect your project settings

### 2.2 Configure Build Settings

Railway should auto-detect Node.js, but verify:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Port**: `5001` (or use Railway's `PORT` variable)

---

## ⚙️ Step 3: Configure Environment Variables

In Railway dashboard, go to your backend service → **Variables** tab and add:

### Required Variables

```bash
# Node Environment
NODE_ENV=production

# Database (from Step 1)
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-256-bit-key-change-this-production

# Frontend URLs (comma-separated, no spaces)
FRONTEND_URLS=https://your-frontend.vercel.app,https://www.your-frontend.com

# Cookie Configuration
COOKIE_DOMAIN=.your-domain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

# Port (Railway auto-provides this)
PORT=${{PORT}}
```

### 🔑 Generate Strong JWT Secret

Use one of these methods:

**Option 1: OpenSSL**
```bash
openssl rand -base64 64
```

**Option 2: Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Option 3: Online Generator**
- [RandomKeygen](https://randomkeygen.com/)

---

## 🗃️ Step 4: Run Database Migrations

### 4.1 Access Railway CLI (Recommended)

Install Railway CLI:
```bash
npm i -g @railway/cli
```

Login and link project:
```bash
railway login
railway link
```

Run migrations:
```bash
railway run npm run migrate:deploy
```

### 4.2 Alternative: Manual Migration

1. In Railway dashboard, go to your backend service
2. Click **Settings** → **Deploy Trigger**
3. Add a custom start command:
   ```bash
   npm run migrate:deploy && npm start
   ```
4. Railway will run migrations before starting the server

### 4.3 Verify Migration Status

Check migration status:
```bash
railway run npm run migrate:status
```

---

## 🌐 Step 5: Configure Custom Domain (Optional)

1. In Railway dashboard, go to your backend service
2. Click **Settings** → **Domains**
3. Click **Generate Domain** for a Railway subdomain (e.g., `api.railway.app`)
4. Or add your custom domain:
   - Click **Custom Domain**
   - Enter `api.yourdomain.com`
   - Add CNAME record in your DNS provider:
     ```
     Type: CNAME
     Name: api
     Value: [railway-provided-value]
     ```

---

## 🔐 Step 6: Configure CORS for Frontend

Update `FRONTEND_URLS` in Railway environment variables:

### For Vercel Deployment
```bash
FRONTEND_URLS=https://your-app.vercel.app,https://www.your-custom-domain.com
```

### For Netlify Deployment
```bash
FRONTEND_URLS=https://your-app.netlify.app,https://www.your-custom-domain.com
```

### Important CORS Notes:
- ✅ Include both `www` and non-`www` versions if using custom domain
- ✅ No trailing slashes in URLs
- ✅ Comma-separated, no spaces
- ✅ Use HTTPS in production

---

## 🍪 Step 7: Configure Cookie Settings

### Set Cookie Domain

If frontend and backend share the same root domain:

**Example 1: Subdomains**
- Frontend: `app.yourdomain.com`
- Backend: `api.yourdomain.com`
- Cookie Domain: `.yourdomain.com` (note the leading dot)

**Example 2: Different Domains**
- Frontend: `myapp.vercel.app`
- Backend: `myapi.railway.app`
- Cookie Domain: Leave empty or omit (cookies won't work cross-domain by default)
- Solution: Use Authorization header instead

### Environment Variables
```bash
COOKIE_DOMAIN=.yourdomain.com  # Only if sharing root domain
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

---

## 🧪 Step 8: Test Deployment

### 8.1 Health Check

Test the health endpoint:
```bash
curl https://your-backend.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-18T10:30:00.000Z",
  "environment": "production",
  "database": "connected"
}
```

### 8.2 Test Authentication

Test login endpoint:
```bash
curl -X POST https://your-backend.railway.app/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}' \
  -c cookies.txt
```

### 8.3 Test Protected Route

```bash
curl -X GET https://your-backend.railway.app/api/bookings \
  -b cookies.txt
```

---

## 🌱 Step 9: Seed Production Database (Optional)

### ⚠️ WARNING: Only run on fresh databases!

1. Connect via Railway CLI:
   ```bash
   railway run npm run seed
   ```

2. Or use Railway dashboard:
   - Go to backend service
   - Click **Settings** → **Deploy Trigger**
   - Add one-time command: `npm run seed`
   - Remove after running once

---

## 📊 Step 10: Monitor Your Application

### Railway Dashboard Monitoring

1. **Metrics Tab**: View CPU, Memory, Network usage
2. **Logs Tab**: Real-time application logs
3. **Deployments Tab**: Track deployment history

### Set Up Alerts

1. Go to **Settings** → **Alerts**
2. Configure alerts for:
   - High memory usage (>80%)
   - Deployment failures
   - Service downtime

### View Logs

```bash
railway logs
```

Or in Railway dashboard: **Your Service** → **Logs**

---

## 🔧 Troubleshooting

### Issue: Database Connection Failed

**Error**: `Can't reach database server`

**Solution**:
1. Verify `DATABASE_URL` in environment variables
2. Check database service is running
3. Ensure connection string format:
   ```
   postgresql://user:password@host:port/database?schema=public
   ```

### Issue: CORS Errors

**Error**: `Access to fetch blocked by CORS policy`

**Solution**:
1. Verify `FRONTEND_URLS` includes your frontend domain
2. Ensure no trailing slashes in URLs
3. Check frontend is using HTTPS in production
4. Verify `credentials: true` in frontend fetch requests

### Issue: Cookies Not Working

**Error**: Authentication fails, cookies not sent

**Solution**:
1. Ensure `COOKIE_SECURE=true` and backend uses HTTPS
2. Set `COOKIE_SAME_SITE=none` for cross-domain
3. Set `COOKIE_DOMAIN` correctly (e.g., `.yourdomain.com`)
4. In frontend, use `credentials: 'include'` in fetch requests

### Issue: Migrations Fail

**Error**: `Migration failed`

**Solution**:
1. Check `DATABASE_URL` is correct
2. Run migration status:
   ```bash
   railway run npm run migrate:status
   ```
3. Reset if needed (⚠️ deletes data):
   ```bash
   railway run npx prisma migrate reset
   ```

### Issue: Server Won't Start

**Error**: `Application failed to respond`

**Solution**:
1. Check logs: `railway logs`
2. Verify all environment variables are set
3. Ensure `PORT` is using `${{PORT}}` (Railway's dynamic port)
4. Check for missing dependencies in `package.json`

---

## 🔄 Continuous Deployment

Railway automatically deploys when you push to your main branch.

### Disable Auto-Deploy

1. Go to **Settings** → **Deploy Trigger**
2. Toggle off **Auto-Deploy**

### Manual Deploy

1. Go to **Deployments** tab
2. Click **New Deployment**
3. Select branch or commit

---

## ✅ Production Checklist

Before going live, verify:

- [ ] ✅ PostgreSQL database created and accessible
- [ ] ✅ All environment variables configured in Railway
- [ ] ✅ Strong JWT_SECRET generated and set
- [ ] ✅ FRONTEND_URLS includes all production domains
- [ ] ✅ Database migrations deployed successfully
- [ ] ✅ Health check endpoint responding
- [ ] ✅ Authentication flow tested (login/logout)
- [ ] ✅ CORS configured correctly
- [ ] ✅ Cookies working cross-domain (if applicable)
- [ ] ✅ Custom domain configured (optional)
- [ ] ✅ SSL/HTTPS enabled (Railway provides free SSL)
- [ ] ✅ Monitoring and alerts set up
- [ ] ✅ Error logs reviewed in Railway dashboard
- [ ] ✅ Database seeded with initial data (if needed)
- [ ] ✅ Production data backed up

---

## 🚀 Going Live

Once checklist is complete:

1. Update frontend environment variables to use production API URL
2. Deploy frontend to production
3. Test end-to-end user flows
4. Monitor Railway logs for first 24 hours
5. Set up regular database backups

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Prisma Production Checklist](https://www.prisma.io/docs/guides/performance-and-optimization/production-checklist)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 🆘 Support

If you encounter issues:

1. Check Railway logs: `railway logs`
2. Check Railway status: [railway.app/status](https://railway.app/status)
3. Railway Discord: [discord.gg/railway](https://discord.gg/railway)
4. Railway Docs: [docs.railway.app](https://docs.railway.app)
