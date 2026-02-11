# MIRFA IBC Challenge - Secure Transaction Service

A TurboRepo monorepo implementing a secure transaction service with envelope encryption using AES-256-GCM.

## 🏗️ Architecture

```
mirfa-IBC-challenge/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify backend
├── packages/
│   └── crypto/       # Shared encryption logic
└── turbo.json        # TurboRepo configuration
```

## ✨ Features

- **Envelope Encryption**: AES-256-GCM with DEK (Data Encryption Key) wrapping
- **Secure Storage**: Encrypted records with proper nonce, ciphertext, and authentication tags
- **Type-Safe**: Full TypeScript implementation
- **Validation**: Comprehensive validation for nonce, tag, and ciphertext
- **Monorepo**: TurboRepo for efficient builds and caching

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Start development servers (both API and Web)
pnpm dev
```

This will start:
- API server on `http://localhost:3001`
- Web frontend on `http://localhost:3000`

### Build for Production

```bash
pnpm build
```

### Start Production Servers

```bash
pnpm start
```

## 📦 Packages

### `@mirfa/crypto`

Shared encryption package implementing envelope encryption.

**Key Functions:**
- `encryptTransaction(request)` - Encrypts a transaction using envelope encryption
- `decryptTransaction(record)` - Decrypts a transaction
- `validateRecord(record)` - Validates record structure

**Envelope Encryption Flow:**
1. Generate random DEK (32 bytes)
2. Encrypt payload using DEK (AES-256-GCM)
3. Wrap DEK using Master Key (AES-256-GCM)
4. Store everything as hex strings

### `@mirfa/api`

Fastify backend API with three endpoints:

#### `POST /tx/encrypt`

Encrypts and stores a transaction.

**Request:**
```json
{
  "partyId": "party_123",
  "payload": { "amount": 100, "currency": "AED" }
}
```

**Response:**
```json
{
  "id": "...",
  "partyId": "party_123",
  "createdAt": "2026-02-11T...",
  "alg": "AES-256-GCM",
  "mk_version": 1
}
```

#### `GET /tx`

Returns a list of all stored transactions (metadata only, limited to 100).

**Response:**
```json
{
  "count": 5,
  "transactions": [
    {
      "id": "...",
      "partyId": "party_123",
      "createdAt": "...",
      "alg": "AES-256-GCM",
      "mk_version": 1
    }
  ]
}
```

#### `GET /tx/:id`

Returns the stored encrypted record (no decryption).

**Response:**
```json
{
  "id": "...",
  "partyId": "party_123",
  "createdAt": "...",
  "payload_nonce": "...",
  "payload_ct": "...",
  "payload_tag": "...",
  "dek_wrap_nonce": "...",
  "dek_wrapped": "...",
  "dek_wrap_tag": "...",
  "alg": "AES-256-GCM",
  "mk_version": 1
}
```

#### `POST /tx/:id/decrypt`

Decrypts and returns the original payload.

**Response:**
```json
{
  "id": "...",
  "partyId": "party_123",
  "payload": { "amount": 100, "currency": "AED" },
  "createdAt": "..."
}
```

### `@mirfa/web`

Next.js frontend with a clean, modern UI for:
- Entering partyId and JSON payload
- Encrypting and saving transactions
- Fetching encrypted records
- Decrypting and viewing original data

## 🔐 Security Features

### Envelope Encryption

The system uses envelope encryption with AES-256-GCM:

1. **Data Encryption Key (DEK)**: Random 32-byte key generated for each transaction
2. **Payload Encryption**: Payload encrypted with DEK
3. **DEK Wrapping**: DEK encrypted with Master Key
4. **Authentication**: GCM mode provides authentication tags (16 bytes)
5. **Nonces**: Random 12-byte nonces for each encryption operation

### Validation

All encrypted records are validated for:
- ✅ Nonce length (must be 12 bytes)
- ✅ Tag length (must be 16 bytes)
- ✅ Valid hex encoding
- ✅ Ciphertext integrity
- ✅ Tag verification (prevents tampering)

### Error Handling

- `ValidationError` - Invalid input or corrupted data
- `DecryptionError` - Decryption failure or tampered data

## 📊 Data Model

```typescript
type TxSecureRecord = {
  id: string;
  partyId: string;
  createdAt: string;

  // Encrypted payload parts
  payload_nonce: string;  // 12 bytes hex
  payload_ct: string;     // ciphertext hex
  payload_tag: string;    // 16 bytes hex

  // Wrapped DEK parts
  dek_wrap_nonce: string; // 12 bytes hex
  dek_wrapped: string;    // 32 bytes hex (wrapped DEK)
  dek_wrap_tag: string;   // 16 bytes hex

  alg: "AES-256-GCM";
  mk_version: 1;
};
```

## 🛠️ Technology Stack

- **TurboRepo** - Monorepo management
- **TypeScript** - Type safety
- **Fastify** - High-performance backend
- **Next.js** - React framework
- **Node.js Crypto** - Native encryption (AES-256-GCM)
- **Tailwind CSS** - Styling

## 🔧 Environment Variables

### API (`apps/api`)

```env
PORT=3001
MASTER_KEY=<64-character hex string>  # Optional, auto-generated if not provided
```

### Web (`apps/web`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📝 Development Notes

### Storage

Using **SQLite** (via sql.js) for persistent storage:
- Database file: `apps/api/data/transactions.db`
- Auto-saves every 30 seconds
- Persists across server restarts
- Pure JavaScript implementation (no native dependencies)
- Indexed by `partyId` and `createdAt` for efficient queries

To change the database location:
```bash
export DB_PATH=/path/to/custom/transactions.db
```

### Master Key Management

The master key is currently:
- Auto-generated if not provided
- Stored in environment variable
- Should use KMS (Key Management Service) in production

### Security Considerations

- ✅ AES-256-GCM for encryption
- ✅ Random nonces (never reused)
- ✅ Authentication tags prevent tampering
- ✅ Envelope encryption protects DEKs
- ⚠️ Master key should be in KMS
- ⚠️ Use HTTPS in production
- ⚠️ Implement rate limiting
- ⚠️ Add request authentication

## 📄 License

MIT

## 🎯 Challenge Completed

This project fulfills all requirements:
- ✅ TurboRepo monorepo structure
- ✅ Fastify backend with 4 endpoints
- ✅ Next.js frontend with encryption UI
- ✅ Envelope encryption with AES-256-GCM
- ✅ Proper validation rules
- ✅ TypeScript throughout
- ✅ Runs with `pnpm install && pnpm dev`
- ✅ **SQLite persistent storage** (bonus)
- ✅ Clean, modern UI
- ✅ Full error handling

Built with ❤️ for the MIRFA IBC Challenge
