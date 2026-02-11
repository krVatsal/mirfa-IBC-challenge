import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import {
  TxSecureRecord,
  EncryptRequest,
  DecryptedTx,
  ValidationError,
  DecryptionError,
} from "./types";

const KEY_FILE = process.env.MASTER_KEY_FILE || join(process.cwd(), "data", ".master.key");

/**
 * Get or generate master key
 * Master Key for wrapping DEKs
 * In production, this should be stored in a secure key management service (KMS)
 */
function getMasterKey(): Buffer {
  // 1. Check environment variable first
  if (process.env.MASTER_KEY) {
    console.log("🔑 Using MASTER_KEY from environment variable");
    return Buffer.from(process.env.MASTER_KEY, "hex");
  }

  // 2. Check if key file exists
  if (existsSync(KEY_FILE)) {
    console.log(`🔑 Loaded Master Key from ${KEY_FILE}`);
    const keyHex = readFileSync(KEY_FILE, "utf-8").trim();
    return Buffer.from(keyHex, "hex");
  }

  // 3. Generate new key and save it
  console.log(`🔑 Generating new Master Key and saving to ${KEY_FILE}`);
  const newKey = randomBytes(32);
  const keyHex = newKey.toString("hex");
  
  // Ensure directory exists
  const keyDir = dirname(KEY_FILE);
  if (!existsSync(keyDir)) {
    mkdirSync(keyDir, { recursive: true });
  }
  
  writeFileSync(KEY_FILE, keyHex, "utf-8");
  console.log("⚠️  Master Key saved. Keep this file secure and backed up!");
  
  return newKey;
}

const MASTER_KEY = getMasterKey();

const ALGORITHM = "aes-256-gcm";
const NONCE_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits authentication tag
const DEK_LENGTH = 32; // 256 bits

/**
 * Validates hex string
 */
function isValidHex(hex: string): boolean {
  return /^[0-9a-fA-F]*$/.test(hex);
}

/**
 * Validates nonce length (must be 12 bytes)
 */
function validateNonce(nonce: string, fieldName: string): void {
  if (!isValidHex(nonce)) {
    throw new ValidationError(`${fieldName} must be valid hex`);
  }
  const bytes = Buffer.from(nonce, "hex");
  if (bytes.length !== NONCE_LENGTH) {
    throw new ValidationError(`${fieldName} must be ${NONCE_LENGTH} bytes`);
  }
}

/**
 * Validates tag length (must be 16 bytes)
 */
function validateTag(tag: string, fieldName: string): void {
  if (!isValidHex(tag)) {
    throw new ValidationError(`${fieldName} must be valid hex`);
  }
  const bytes = Buffer.from(tag, "hex");
  if (bytes.length !== TAG_LENGTH) {
    throw new ValidationError(`${fieldName} must be ${TAG_LENGTH} bytes`);
  }
}

/**
 * Validates hex ciphertext
 */
function validateCipherText(ct: string, fieldName: string): void {
  if (!isValidHex(ct)) {
    throw new ValidationError(`${fieldName} must be valid hex`);
  }
  if (ct.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
}

/**
 * Encrypts data using AES-256-GCM
 */
function encrypt(
  data: Buffer,
  key: Buffer
): { nonce: string; ciphertext: string; tag: string } {
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, nonce);

  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    nonce: nonce.toString("hex"),
    ciphertext: ciphertext.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Decrypts data using AES-256-GCM
 */
function decrypt(
  ciphertext: string,
  key: Buffer,
  nonce: string,
  tag: string
): Buffer {
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(nonce, "hex")
    );
    decipher.setAuthTag(Buffer.from(tag, "hex"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "hex")),
      decipher.final(),
    ]);

    return plaintext;
  } catch (error) {
    throw new DecryptionError(
      "Decryption failed: ciphertext or tag may be tampered"
    );
  }
}

/**
 * Encrypts a transaction using envelope encryption
 */
export function encryptTransaction(request: EncryptRequest): TxSecureRecord {
  // 1. Generate random DEK (Data Encryption Key)
  const dek = randomBytes(DEK_LENGTH);

  // 2. Encrypt payload using DEK
  const payloadJson = JSON.stringify(request.payload);
  const payloadBuffer = Buffer.from(payloadJson, "utf-8");
  const {
    nonce: payload_nonce,
    ciphertext: payload_ct,
    tag: payload_tag,
  } = encrypt(payloadBuffer, dek);

  // 3. Wrap DEK using Master Key
  const {
    nonce: dek_wrap_nonce,
    ciphertext: dek_wrapped,
    tag: dek_wrap_tag,
  } = encrypt(dek, MASTER_KEY);

  // 4. Create and return secure record
  const record: TxSecureRecord = {
    id: randomBytes(16).toString("hex"),
    partyId: request.partyId,
    createdAt: new Date().toISOString(),

    payload_nonce,
    payload_ct,
    payload_tag,

    dek_wrap_nonce,
    dek_wrapped,
    dek_wrap_tag,

    alg: "AES-256-GCM",
    mk_version: 1,
  };

  return record;
}

/**
 * Decrypts a transaction using envelope encryption
 */
export function decryptTransaction(record: TxSecureRecord): DecryptedTx {
  // Validate all fields
  validateNonce(record.payload_nonce, "payload_nonce");
  validateTag(record.payload_tag, "payload_tag");
  validateCipherText(record.payload_ct, "payload_ct");

  validateNonce(record.dek_wrap_nonce, "dek_wrap_nonce");
  validateTag(record.dek_wrap_tag, "dek_wrap_tag");
  validateCipherText(record.dek_wrapped, "dek_wrapped");

  try {
    // 1. Unwrap DEK using Master Key
    const dek = decrypt(
      record.dek_wrapped,
      MASTER_KEY,
      record.dek_wrap_nonce,
      record.dek_wrap_tag
    );

    // 2. Decrypt payload using DEK
    const payloadBuffer = decrypt(
      record.payload_ct,
      dek,
      record.payload_nonce,
      record.payload_tag
    );

    // 3. Parse payload JSON
    const payloadJson = payloadBuffer.toString("utf-8");
    const payload = JSON.parse(payloadJson);

    return {
      partyId: record.partyId,
      payload,
      createdAt: record.createdAt,
    };
  } catch (error) {
    if (error instanceof DecryptionError || error instanceof ValidationError) {
      throw error;
    }
    throw new DecryptionError(`Decryption failed: ${(error as Error).message}`);
  }
}

/**
 * Validates a secure record structure
 */
export function validateRecord(record: TxSecureRecord): void {
  validateNonce(record.payload_nonce, "payload_nonce");
  validateTag(record.payload_tag, "payload_tag");
  validateCipherText(record.payload_ct, "payload_ct");

  validateNonce(record.dek_wrap_nonce, "dek_wrap_nonce");
  validateTag(record.dek_wrap_tag, "dek_wrap_tag");
  validateCipherText(record.dek_wrapped, "dek_wrapped");

  if (record.alg !== "AES-256-GCM") {
    throw new ValidationError("Invalid algorithm");
  }

  if (record.mk_version !== 1) {
    throw new ValidationError("Invalid master key version");
  }
}
