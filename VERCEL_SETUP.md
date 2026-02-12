# 🎯 Quick Setup for Neon PostgreSQL on Vercel

## Step 1: Set Environment Variables in Vercel

Go to your Vercel project → **Settings** → **Environment Variables**

### Add these 2 required variables:

#### 1. MASTER_KEY
```bash
# Generate locally:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output (yours will be different):
a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890
```

**In Vercel:**
- Name: `MASTER_KEY`
- Value: `<paste your generated hex string>`
- Environments: ✅ Production ✅ Preview ✅ Development

---

#### 2. DATABASE_URL  
```bash
# Your Neon PostgreSQL connection string:
postgresql://neondb_owner:npg_EWp0yY1cnLxJ@ep-dark-surf-a8jginb7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require
```

**In Vercel:**
- Name: `DATABASE_URL`
- Value: `<paste your Neon connection string>`
- Environments: ✅ Production ✅ Preview ✅ Development

---

#### 3. CORS_ORIGIN (Optional)
```bash
# Your frontend URL (or leave this out to allow all origins):
https://your-frontend.vercel.app
```

---

## Step 2: Deploy

After adding environment variables, redeploy:

```bash
git add .
git commit -m "feat: Add PostgreSQL support with Neon"
git push
```

Vercel will automatically redeploy with the new environment variables.

---

## How It Works

### Local Development
- No `DATABASE_URL` → Uses **SQLite** (`data/transactions.db`)
- Fast and simple for development
- Data persists locally

### Production (Vercel)
- `DATABASE_URL` set → Uses **PostgreSQL** (Neon)
- Data persists across all deployments
- Scalable and production-ready
- Connection pooling enabled

---

## Verify It's Working

Check your Vercel deployment logs:
```
✅ Should see: "🐘 Connected to PostgreSQL (Neon)"
❌ Not: "📂 Loaded SQLite database from /tmp/transactions.db"
```

Test the API:
```bash
curl https://your-api.vercel.app/
# Should return: {"status":"ok","message":"Transaction encryption API"}
```

---

## Troubleshooting

### "Error: No pg..." 
- Run `pnpm install` in the root directory
- Commit and push the updated `pnpm-lock.yaml`

### "Connection timeout"
- Verify DATABASE_URL is correct in Vercel settings
- Check Neon database is active (not paused)
- Ensure `sslmode=require` is in the connection string

### "Data not persisting"
- Verify DATABASE_URL is set in Vercel
- Check logs show "PostgreSQL" not "SQLite"
- Check Neon database has the `transactions` table

---

## Database Schema (Auto-created)

The app automatically creates this table on first connection:

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  party_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload_nonce TEXT NOT NULL,
  payload_ct TEXT NOT NULL,
  payload_tag TEXT NOT NULL,
  dek_wrap_nonce TEXT NOT NULL,
  dek_wrapped TEXT NOT NULL,
  dek_wrap_tag TEXT NOT NULL,
  alg TEXT NOT NULL,
  mk_version INTEGER NOT NULL,
  created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

No manual setup required! 🎉
