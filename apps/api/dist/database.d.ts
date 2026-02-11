import { Database } from "sql.js";
import { TxSecureRecord } from "@mirfa/crypto";
/**
 * Get or initialize database
 */
export declare function getDb(): Promise<Database>;
/**
 * Store a transaction record
 */
export declare function storeTransaction(record: TxSecureRecord): Promise<void>;
/**
 * Get a transaction by ID
 */
export declare function getTransaction(id: string): Promise<TxSecureRecord | undefined>;
/**
 * Get all transactions (limited)
 */
export declare function getAllTransactions(limit?: number): Promise<TxSecureRecord[]>;
/**
 * Delete a transaction by ID
 */
export declare function deleteTransaction(id: string): Promise<boolean>;
/**
 * Close database connection
 */
export declare function closeDatabase(): void;
