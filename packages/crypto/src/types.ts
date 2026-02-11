/**
 * Secure transaction record with envelope encryption
 */
export type TxSecureRecord = {
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
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Decryption error
 */
export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}
