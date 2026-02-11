/**
 * Secure transaction record with envelope encryption
 */
export type TxSecureRecord = {
    id: string;
    partyId: string;
    createdAt: string;
    payload_nonce: string;
    payload_ct: string;
    payload_tag: string;
    dek_wrap_nonce: string;
    dek_wrapped: string;
    dek_wrap_tag: string;
    alg: "AES-256-GCM";
    mk_version: 1;
};
/**
 * Encryption request
 */
export type EncryptRequest = {
    partyId: string;
    payload: Record<string, unknown>;
};
/**
 * Decrypted transaction
 */
export type DecryptedTx = {
    partyId: string;
    payload: Record<string, unknown>;
    createdAt: string;
};
/**
 * Validation error
 */
export declare class ValidationError extends Error {
    constructor(message: string);
}
/**
 * Decryption error
 */
export declare class DecryptionError extends Error {
    constructor(message: string);
}
