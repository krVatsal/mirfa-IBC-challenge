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

#### **CORS_ORIGIN** (Optional)
Whitelist specific origins for CORS. Defaults to `true` (allow all).

```bash
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Optional Variables

- `MASTER_KEY_FILE`: Custom path for Master Key file (default: `data/.master.key` locally, `/tmp/.master.key` in serverless)
- `PORT`: Server port (default: 3001)

## Important Notes

⚠️ **Without `MASTER_KEY` environment variable in serverless:**
- A new key will be generated in `/tmp/.master.key` on each cold start
- Previously encrypted data will become **undecryptable**
- `/tmp` is ephemeral and cleared between invocations

✅ **With `MASTER_KEY` environment variable:**
- The same key is used across all invocations
- Data remains decryptable indefinitely
- More secure and production-ready

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
```

### Local Development

```bash
# Create .env file in apps/api/
echo "MASTER_KEY=your_generated_key_here" > apps/api/.env

# Run development server
pnpm dev
```

## Security Best Practices

1. **Never commit** `.master.key` files or `.env` files to Git
2. **Always set** `MASTER_KEY` as an environment variable in production
3. **Backup** your Master Key securely (password manager, KMS, etc.)
4. **Rotate keys** periodically and re-encrypt data with the new key
5. Use a proper **Key Management Service** (AWS KMS, Google Cloud KMS, HashiCorp Vault) for production systems
