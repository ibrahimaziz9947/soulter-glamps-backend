# 🎯 Quick Start - Production Deployment

## Before You Deploy

1. **Generate JWT Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
   ```
   Copy the output - you'll need it for Railway.

2. **Decide on Frontend URL**
   - Example: `https://myapp.vercel.app`
   - Or custom domain: `https://www.myapp.com`

---

## Deploy in 5 Steps

### Step 1: Create Railway Project (2 min)
1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Provision PostgreSQL**
3. Click on PostgreSQL → **Variables** → Copy `DATABASE_URL`

### Step 2: Deploy Backend (3 min)
1. In Railway, click **New** → **GitHub Repo**
2. Select `soulter-backend` repository
3. Railway auto-detects Node.js and deploys

### Step 3: Set Environment Variables (2 min)
Click on your backend service → **Variables** → Add:

```bash
NODE_ENV=production
DATABASE_URL=<paste-from-step-1>
JWT_SECRET=<paste-from-before-you-deploy>
FRONTEND_URLS=https://your-frontend.vercel.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

### Step 4: Run Migrations (1 min)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Run migrations
railway run npm run migrate:deploy
```

### Step 5: Test (1 min)
```bash
# Replace with your Railway URL
curl https://your-backend.railway.app/health
```

Expected: `{"status":"ok","database":"connected"}`

---

## ✅ Done! Your backend is live.

**Next:** Update your frontend to use the Railway URL

**Frontend Setup:**
```javascript
// .env in frontend
REACT_APP_API_URL=https://your-backend.railway.app

// In API calls
fetch(`${process.env.REACT_APP_API_URL}/api/bookings`, {
  credentials: 'include',  // ← Important for cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
```

---

## 📚 Need More Details?

- **Full Guide:** [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- **Checklist:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Env Vars:** [ENV_VARIABLES.md](./ENV_VARIABLES.md)
- **Summary:** [PRODUCTION_SUMMARY.md](./PRODUCTION_SUMMARY.md)

---

## 🆘 Troubleshooting

**CORS Error?**
- Check `FRONTEND_URLS` includes your frontend domain
- Ensure frontend uses `credentials: 'include'`

**Cookies Not Working?**
- Verify `COOKIE_SECURE=true` and backend uses HTTPS
- Check `COOKIE_SAME_SITE=none`

**Database Connection Failed?**
- Verify `DATABASE_URL` is correct
- Check database is running in Railway

**Migrations Failed?**
- Run `railway run npm run migrate:status`
- Check Railway logs: `railway logs`

---

**Happy Deploying! 🚀**
