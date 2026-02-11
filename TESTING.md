# Test the encryption/decryption flow

## Quick Test Commands

### Build all packages
```bash
cd C:\Users\kumar\mirfa-IBC-challenge
pnpm install
pnpm build
```

### Start development servers
```bash
# Terminal 1 - Start API
cd apps/api
pnpm dev

# Terminal 2 - Start Web
cd apps/web
pnpm dev
```

### Test the API manually
```powershell
# Encrypt a transaction
Invoke-RestMethod -Method POST -Uri http://localhost:3001/tx/encrypt -ContentType "application/json" -Body '{"partyId": "party_123", "payload": {"amount": 100, "currency": "AED"}}'

# Get encrypted record (replace {id} with actual ID)
Invoke-RestMethod -Uri http://localhost:3001/tx/{id}

# Decrypt transaction
Invoke-RestMethod -Method POST -Uri http://localhost:3001/tx/{id}/decrypt
```

## Expected Flow

1. Open http://localhost:3000
2. Enter a partyId (e.g., "party_123")
3. Modify JSON payload if needed
4. Click "Encrypt & Save" - you'll get a transaction ID
5. Click "Fetch" to see the encrypted record
6. Click "Decrypt" to see the original payload

## Troubleshooting

If you get module not found errors:
```bash
cd packages/crypto
pnpm build
cd ../..
pnpm install
```

If ports are in use:
- API: Set PORT=3002 in apps/api/.env
- Web: Start with: pnpm dev -- -p 3005
