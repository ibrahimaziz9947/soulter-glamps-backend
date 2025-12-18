# 🔧 Environment Variables Reference

## Required Variables

### `NODE_ENV`
- **Description**: Application environment
- **Values**: `development` | `production`
- **Default**: `development`
- **Example**: `production`

### `DATABASE_URL`
- **Description**: PostgreSQL connection string
- **Format**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`
- **Example**: `postgresql://postgres:mypass@db.railway.app:5432/railway?schema=public`
- **Notes**: 
  - Get from Railway Postgres service variables tab
  - Ensure `?schema=public` is included
  - Add `?sslmode=require` for SSL connections if needed

### `JWT_SECRET`
- **Description**: Secret key for signing JWT tokens
- **Requirement**: Minimum 256 bits (32 bytes)
- **Example**: `super-secret-jwt-key-256-bits-minimum-change-this-in-production`
- **Generate**: 
  ```bash
  openssl rand -base64 64
  # or
  node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
  ```

### `FRONTEND_URLS`
- **Description**: Comma-separated list of allowed frontend origins for CORS
- **Format**: `https://domain1.com,https://domain2.com`
- **Example**: `https://myapp.vercel.app,https://www.mycustomdomain.com`
- **Notes**:
  - No trailing slashes
  - Must use HTTPS in production
  - No spaces between URLs
  - Include both www and non-www if needed

---

## Optional Variables

### `PORT`
- **Description**: Server port number
- **Default**: `5001`
- **Railway**: Use `${{PORT}}` (Railway provides this automatically)
- **Example**: `5001`

### `COOKIE_DOMAIN`
- **Description**: Domain for cross-subdomain cookies
- **Format**: `.yourdomain.com` (note the leading dot)
- **Example**: `.myapp.com`
- **When to use**: Only when frontend and backend share the same root domain
- **Leave empty if**: Using different domains (e.g., Vercel frontend + Railway backend)

### `COOKIE_SECURE`
- **Description**: Whether cookies should only be sent over HTTPS
- **Values**: `true` | `false`
- **Production**: `true` (required for HTTPS)
- **Development**: `false`

### `COOKIE_SAME_SITE`
- **Description**: SameSite cookie attribute
- **Values**: `strict` | `lax` | `none`
- **Production**: `none` (required for cross-domain with COOKIE_SECURE=true)
- **Development**: `lax`

---

## Railway Configuration

In Railway dashboard, set environment variables:

```bash
# Production Settings
NODE_ENV=production

# Database
DATABASE_URL=postgresql://postgres:password@db.railway.internal:5432/railway?schema=public

# Security
JWT_SECRET=<generate-strong-random-secret>

# Frontend
FRONTEND_URLS=https://myapp.vercel.app,https://www.mycustomdomain.com

# Cookies (optional)
COOKIE_DOMAIN=.mycustomdomain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

# Port (Railway auto-provides)
PORT=${{PORT}}
```

---

## Development Configuration

Create a `.env` file locally (DO NOT commit):

```bash
# Development Settings
NODE_ENV=development

# Local Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/soulter?schema=public

# Development Secret
JWT_SECRET=dev-secret-key-not-for-production

# Local Frontend
FRONTEND_URLS=http://localhost:3000,http://localhost:3001

# Development Cookies
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# Port
PORT=5001
```

---

## Validation

### Check Required Variables

```javascript
// Add to server.js or create a validation script
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}
```

### Test Database Connection

```bash
# Via Railway CLI
railway run npx prisma db pull

# Or test health endpoint
curl https://your-backend.railway.app/health
```

---

## Troubleshooting

### Issue: CORS errors
**Check**: `FRONTEND_URLS` is set correctly
- No trailing slashes
- Using HTTPS in production
- All required origins included

### Issue: Cookies not working
**Check**:
- `COOKIE_SECURE=true` when using HTTPS
- `COOKIE_SAME_SITE=none` for cross-domain
- `COOKIE_DOMAIN` set correctly (or empty)
- Frontend using `credentials: 'include'`

### Issue: Database connection fails
**Check**:
- `DATABASE_URL` format is correct
- Database service is running
- Firewall/network allows connection
- Schema parameter included: `?schema=public`

### Issue: JWT errors
**Check**:
- `JWT_SECRET` is set and same across deployments
- JWT_SECRET is sufficiently random and long
- Token hasn't expired (7 days default)

---

## Security Best Practices

✅ **DO**:
- Use strong, random JWT_SECRET (minimum 256 bits)
- Use environment variables for all secrets
- Use HTTPS in production (COOKIE_SECURE=true)
- Restrict CORS to specific origins
- Rotate JWT_SECRET periodically
- Use different secrets for different environments

❌ **DON'T**:
- Commit `.env` file to version control
- Use default or weak JWT_SECRET
- Use wildcard (*) CORS origins
- Share production secrets
- Hardcode secrets in code
- Use development secrets in production

---

## Reference Links

- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Prisma Connection URLs](https://www.prisma.io/docs/reference/database-reference/connection-urls)
- [Express Cookie Options](https://expressjs.com/en/api.html#res.cookie)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
