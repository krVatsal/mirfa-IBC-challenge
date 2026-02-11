"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.storeTransaction = storeTransaction;
exports.getTransaction = getTransaction;
exports.getAllTransactions = getAllTransactions;
exports.deleteTransaction = deleteTransaction;
exports.closeDatabase = closeDatabase;
const sql_js_1 = __importDefault(require("sql.js"));
const fs_1 = require("fs");
const path_1 = require("path");
const DB_PATH = process.env.DB_PATH || (0, path_1.join)(process.cwd(), "data", "transactions.db");
let db;
// Initialize database
async function initDatabase() {
    const SQL = await (0, sql_js_1.default)();
    // Ensure data directory exists
    const dbDir = (0, path_1.dirname)(DB_PATH);
    if (!(0, fs_1.existsSync)(dbDir)) {
        (0, fs_1.mkdirSync)(dbDir, { recursive: true });
    }
    // Load existing database or create new one
    let database;
    if ((0, fs_1.existsSync)(DB_PATH)) {
        const buffer = (0, fs_1.readFileSync)(DB_PATH);
        database = new SQL.Database(buffer);
        console.log(`📂 Loaded SQLite database from ${DB_PATH}`);
    }
    else {
        database = new SQL.Database();
        console.log(`📂 Created new SQLite database at ${DB_PATH}`);
    }
    // Create table if it doesn't exist
    database.run(`
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
    return database;
}
/**
 * Save database to disk
 */
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        (0, fs_1.writeFileSync)(DB_PATH, buffer);
    }
}
/**
 * Get or initialize database
 */
async function getDb() {
    if (!db) {
        db = await initDatabase();
    }
    return db;
}
/**
 * Store a transaction record
 */
async function storeTransaction(record) {
    const database = await getDb();
    database.run(`INSERT INTO transactions (
      id, partyId, createdAt,
      payload_nonce, payload_ct, payload_tag,
      dek_wrap_nonce, dek_wrapped, dek_wrap_tag,
      alg, mk_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
    ]);
    saveDatabase();
}
/**
 * Get a transaction by ID
 */
async function getTransaction(id) {
    const database = await getDb();
    const result = database.exec(`SELECT * FROM transactions WHERE id = ?`, [id]);
    if (result.length === 0 || result[0].values.length === 0) {
        return undefined;
    }
    const row = result[0].values[0];
    const columns = result[0].columns;
    const record = {};
    columns.forEach((col, idx) => {
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
        alg: record.alg,
        mk_version: record.mk_version,
    };
}
/**
 * Get all transactions (limited)
 */
async function getAllTransactions(limit = 100) {
    const database = await getDb();
    const result = database.exec(`SELECT * FROM transactions ORDER BY created_timestamp DESC LIMIT ?`, [limit]);
    if (result.length === 0) {
        return [];
    }
    const columns = result[0].columns;
    const rows = result[0].values;
    return rows.map((row) => {
        const record = {};
        columns.forEach((col, idx) => {
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
            alg: record.alg,
            mk_version: record.mk_version,
        };
    });
}
/**
 * Delete a transaction by ID
 */
async function deleteTransaction(id) {
    const database = await getDb();
    database.run(`DELETE FROM transactions WHERE id = ?`, [id]);
    saveDatabase();
    return true;
}
/**
 * Close database connection
 */
function closeDatabase() {
    if (db) {
        saveDatabase();
        db.close();
    }
}
// Save database periodically (every 30 seconds)
setInterval(() => {
    saveDatabase();
}, 30000);
// Graceful shutdown
process.on("SIGINT", () => {
    closeDatabase();
    process.exit(0);
});
process.on("SIGTERM", () => {
    closeDatabase();
    process.exit(0);
});
