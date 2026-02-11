import { TxSecureRecord, EncryptRequest, DecryptedTx } from "./types";
/**
 * Encrypts a transaction using envelope encryption
 */
export declare function encryptTransaction(request: EncryptRequest): TxSecureRecord;
/**
 * Decrypts a transaction using envelope encryption
 */
export declare function decryptTransaction(record: TxSecureRecord): DecryptedTx;
/**
 * Validates a secure record structure
 */
export declare function validateRecord(record: TxSecureRecord): void;
