import { TxSecureRecord } from "@mirfa/crypto";

// Check if we're using PostgreSQL (production) or SQLite (local dev)
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRES = !!DATABASE_URL;

// Database interface for abstraction
interface DatabaseAdapter {
  init(): Promise<void>;
  storeTransaction(record: TxSecureRecord): Promise<void>;
  getTransaction(id: string): Promise<TxSecureRecord | undefined>;
  getAllTransactions(limit: number): Promise<TxSecureRecord[]>;
  deleteTransaction(id: string): Promise<boolean>;
  close(): Promise<void>;
}

// ============================================
// PostgreSQL Adapter (Production)
// ============================================
class PostgresAdapter implements DatabaseAdapter {
  private pool: any;

  async init(): Promise<void> {
    const { Pool } = await import("pg");
    
    this.pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Neon
      },
      max: 10, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    console.log("🐘 Connected to PostgreSQL (Neon)");

    // Create table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
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

      CREATE INDEX IF NOT EXISTS idx_party_id ON transactions(party_id);
      CREATE INDEX IF NOT EXISTS idx_created_at ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_created_timestamp ON transactions(created_timestamp);
    `);

    console.log("✅ PostgreSQL table initialized");
  }

  async storeTransaction(record: TxSecureRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO transactions (
        id, party_id, created_at,
        payload_nonce, payload_ct, payload_tag,
        dek_wrap_nonce, dek_wrapped, dek_wrap_tag,
        alg, mk_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        record.id,
        record.partyId,
        record.createdAt,
        record.payload_nonce,
        record.payload_ct,
        record.payload_tag,
        record.dek_wrap_nonce,
        record.dek_wrapped,
        record.dek_wrap_tag,
        record.alg,
        record.mk_version,
      ]
    );
  }

  async getTransaction(id: string): Promise<TxSecureRecord | undefined> {
    const result = await this.pool.query(
      `SELECT * FROM transactions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      partyId: row.party_id,
      createdAt: row.created_at,
      payload_nonce: row.payload_nonce,
      payload_ct: row.payload_ct,
      payload_tag: row.payload_tag,
      dek_wrap_nonce: row.dek_wrap_nonce,
      dek_wrapped: row.dek_wrapped,
      dek_wrap_tag: row.dek_wrap_tag,
      alg: row.alg as "AES-256-GCM",
      mk_version: row.mk_version,
    };
  }

  async getAllTransactions(limit: number = 100): Promise<TxSecureRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM transactions ORDER BY created_timestamp DESC LIMIT $1`,
      [limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      partyId: row.party_id,
      createdAt: row.created_at,
      payload_nonce: row.payload_nonce,
      payload_ct: row.payload_ct,
      payload_tag: row.payload_tag,
      dek_wrap_nonce: row.dek_wrap_nonce,
      dek_wrapped: row.dek_wrapped,
      dek_wrap_tag: row.dek_wrap_tag,
      alg: row.alg as "AES-256-GCM",
      mk_version: row.mk_version,
    }));
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM transactions WHERE id = $1`,
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// ============================================
// SQLite Adapter (Local Development)
// ============================================
class SQLiteAdapter implements DatabaseAdapter {
  private db: any;
  private dbPath: string;

  constructor() {
    const { join } = require("path");
    this.dbPath = join(process.cwd(), "data", "transactions.db");
  }

  async init(): Promise<void> {
    const initSqlJs = (await import("sql.js")).default;
    const { readFileSync, writeFileSync, existsSync, mkdirSync } = await import("fs");
    const { dirname, join } = await import("path");

    const SQL = await initSqlJs({
      locateFile: (file) => {
        return join(process.cwd(), "node_modules", "sql.js", "dist", file);
      }
    });

    // Ensure data directory exists
    const dbDir = dirname(this.dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    // Load existing database or create new one
    if (existsSync(this.dbPath)) {
      const buffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
      console.log(`📂 Loaded SQLite database from ${this.dbPath}`);
    } else {
      this.db = new SQL.Database();
      console.log(`📂 Created new SQLite database at ${this.dbPath}`);
    }

    // Create table if it doesn't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        partyId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        payload_nonce TEXT NOT NULL,
        payload_ct TEXT NOT NULL,
        payload_tag TEXT NOT NULL,
        dek_wrap_nonce TEXT NOT NULL,
        dek_wrapped TEXT NOT NULL,
        dek_wrap_tag TEXT NOT NULL,
        alg TEXT NOT NULL,
        mk_version INTEGER NOT NULL,
        created_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_partyId ON transactions(partyId);
      CREATE INDEX IF NOT EXISTS idx_createdAt ON transactions(createdAt);
    `);

    console.log("✅ SQLite table initialized");
  }

  private saveDatabase(): void {
    const { writeFileSync } = require("fs");
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      writeFileSync(this.dbPath, buffer);
    }
  }

  async storeTransaction(record: TxSecureRecord): Promise<void> {
    this.db.run(
      `INSERT INTO transactions (
        id, partyId, createdAt,
        payload_nonce, payload_ct, payload_tag,
        dek_wrap_nonce, dek_wrapped, dek_wrap_tag,
        alg, mk_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.partyId,
        record.createdAt,
        record.payload_nonce,
        record.payload_ct,
        record.payload_tag,
        record.dek_wrap_nonce,
        record.dek_wrapped,
        record.dek_wrap_tag,
        record.alg,
        record.mk_version,
      ]
    );

    this.saveDatabase();
  }

  async getTransaction(id: string): Promise<TxSecureRecord | undefined> {
    const result = this.db.exec(
      `SELECT * FROM transactions WHERE id = ?`,
      [id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return undefined;
    }

    const row = result[0].values[0];
    const columns = result[0].columns;

    const record: any = {};
    columns.forEach((col: string, idx: number) => {
      record[col] = row[idx];
    });

    return {
      id: record.id,
      partyId: record.partyId,
      createdAt: record.createdAt,
      payload_nonce: record.payload_nonce,
      payload_ct: record.payload_ct,
      payload_tag: record.payload_tag,
      dek_wrap_nonce: record.dek_wrap_nonce,
      dek_wrapped: record.dek_wrapped,
      dek_wrap_tag: record.dek_wrap_tag,
      alg: record.alg as "AES-256-GCM",
      mk_version: record.mk_version,
    };
  }

  async getAllTransactions(limit: number = 100): Promise<TxSecureRecord[]> {
    const result = this.db.exec(
      `SELECT * FROM transactions ORDER BY created_timestamp DESC LIMIT ?`,
      [limit]
    );

    if (result.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    const rows = result[0].values;

    return rows.map((row: any) => {
      const record: any = {};
      columns.forEach((col: string, idx: number) => {
        record[col] = row[idx];
      });

      return {
        id: record.id,
        partyId: record.partyId,
        createdAt: record.createdAt,
        payload_nonce: record.payload_nonce,
        payload_ct: record.payload_ct,
        payload_tag: record.payload_tag,
        dek_wrap_nonce: record.dek_wrap_nonce,
        dek_wrapped: record.dek_wrapped,
        dek_wrap_tag: record.dek_wrap_tag,
        alg: record.alg as "AES-256-GCM",
        mk_version: record.mk_version,
      };
    });
  }

  async deleteTransaction(id: string): Promise<boolean> {
    this.db.run(`DELETE FROM transactions WHERE id = ?`, [id]);
    this.saveDatabase();
    return true;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

// ============================================
// Database Factory & Exports
// ============================================
let dbAdapter: DatabaseAdapter | null = null;


// ============================================
// Database Factory & Exports
// ============================================
let dbAdapter: DatabaseAdapter | null = null;

async function getAdapter(): Promise<DatabaseAdapter> {
  if (!dbAdapter) {
    if (USE_POSTGRES) {
      console.log("🔄 Initializing PostgreSQL adapter...");
      dbAdapter = new PostgresAdapter();
    } else {
      console.log("🔄 Initializing SQLite adapter...");
      dbAdapter = new SQLiteAdapter();
    }
    await dbAdapter.init();
  }
  return dbAdapter;
}

export async function storeTransaction(record: TxSecureRecord): Promise<void> {
  const adapter = await getAdapter();
  return adapter.storeTransaction(record);
}

export async function getTransaction(id: string): Promise<TxSecureRecord | undefined> {
  const adapter = await getAdapter();
  return adapter.getTransaction(id);
}

export async function getAllTransactions(limit: number = 100): Promise<TxSecureRecord[]> {
  const adapter = await getAdapter();
  return adapter.getAllTransactions(limit);
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const adapter = await getAdapter();
  return adapter.deleteTransaction(id);
}

export async function closeDatabase(): Promise<void> {
  if (dbAdapter) {
    await dbAdapter.close();
    dbAdapter = null;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDatabase();
  process.exit(0);
});
