# 🚀 Deployment Guide

## Environment Variables

### Required for Production (Vercel/AWS Lambda)

#### **MASTER_KEY** (Critical)
The Master Key used for envelope encryption. **Must be set** in serverless environments to persist the key across function invocations.

```bash
# Generate a secure 32-byte (256-bit) key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**In Vercel:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `MASTER_KEY` with the generated hex value
4. Apply to Production, Preview, and Development environments

#### **DATABASE_URL** (Required for Production)
PostgreSQL connection string for persistent data storage. Without this, the app uses SQLite locally.

**Example (Neon PostgreSQL):**
```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

**In Vercel:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `DATABASE_URL` with your Neon/PostgreSQL connection string
4. Apply to Production, Preview, and Development environments

**Get a free PostgreSQL database:**
- [Neon](https://neon.tech/) - Serverless PostgreSQL (recommended for Vercel)
- [Supabase](https://supabase.com/) - PostgreSQL + authentication
- [Railway](https://railway.app/) - PostgreSQL hosting
- [Vercel Postgres](https://vercel.com/storage/postgres) - Native Vercel integration

#### **CORS_ORIGIN** (Optional)
Whitelist specific origins for CORS. Defaults to `true` (allow all).

```bash
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Optional Variables

- `MASTER_KEY_FILE`: Custom path for Master Key file (default: `data/.master.key` locally, `/tmp/.master.key` in serverless)
- `PORT`: Server port (default: 3001)

## Database Architecture

The application automatically detects which database to use:

### Local Development (SQLite)
- No `DATABASE_URL` set → Uses SQLite
- Database file: `data/transactions.db`
- Perfect for development and testing
- Data persists locally

### Production (PostgreSQL)
- `DATABASE_URL` set → Uses PostgreSQL
- Connection pooling enabled (max 10 connections)
- SSL/TLS encryption
- Data persists across all deployments
- Scalable and production-ready

## Important Notes

⚠️ **Environment Variables in Production:**

### Master Key Storage
- **Required**: Set `MASTER_KEY` environment variable in Vercel
- Without it: A new key is generated on each cold start
- Result: Previously encrypted data becomes **undecryptable**
- Solution: Generate once, set as env var, keep secure backup

### Database Storage
- **Development**: SQLite in `data/transactions.db` (automatic)
- **Production**: PostgreSQL via `DATABASE_URL` (required for persistent data)
- **Without DATABASE_URL in production**: Falls back to SQLite in `/tmp` - **data is lost** on cold starts

✅ **Production Checklist:**
1. ✅ Set `MASTER_KEY` environment variable
2. ✅ Set `DATABASE_URL` to your PostgreSQL connection string  
3. ✅ Set `CORS_ORIGIN` to your frontend URL (optional)
4. ✅ Backup your Master Key securely

### Production Recommendations
1. Use Neon PostgreSQL for serverless-optimized database
2. Store `MASTER_KEY` in environment variables
3. Use proper Key Management Service (AWS KMS, Google Cloud KMS) for enterprise
4. Implement key rotation strategy for compliance

## Deployment Steps

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables (or use Vercel dashboard)
vercel env add MASTER_KEY
# Paste your generated Master Key when prompted

vercel env add DATABASE_URL  
# Paste your PostgreSQL connection string (from Neon, Supabase, etc.)

vercel env add CORS_ORIGIN
# Paste your frontend URL (e.g., https://your-app.vercel.app)
```

### Local Development

```bash
# Create .env file in apps/api/
cat > apps/api/.env << EOF
MASTER_KEY=your_generated_key_here
DATABASE_URL=postgresql://localhost/mydb  # Optional, defaults to SQLite
EOF

# Run development server
pnpm dev
```

## Quick Start with Neon PostgreSQL

1. **Sign up at [neon.tech](https://neon.tech/)** (free tier available)

2. **Create a new project** → Copy the connection string

3. **Add to Vercel:**
   ```bash
   # Format: postgresql://user:password@host/database?sslmode=require
   DATABASE_URL=postgresql://neondb_owner:npg_xxx@ep-xxx.neon.tech/neondb?sslmode=require
   ```

4. **Deploy:**
   ```bash
   git push
   # Vercel will auto-deploy with the new environment variable
   ```

## Security Best Practices

1. **Never commit** `.master.key` files or `.env` files to Git
2. **Always set** `MASTER_KEY` as an environment variable in production
3. **Backup** your Master Key securely (password manager, KMS, etc.)
4. **Rotate keys** periodically and re-encrypt data with the new key
5. Use a proper **Key Management Service** (AWS KMS, Google Cloud KMS, HashiCorp Vault) for production systems
