"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptTransaction = encryptTransaction;
exports.decryptTransaction = decryptTransaction;
exports.validateRecord = validateRecord;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const types_1 = require("./types");
const KEY_FILE = process.env.MASTER_KEY_FILE || (0, path_1.join)(process.cwd(), "data", ".master.key");
/**
 * Get or generate master key
 * Master Key for wrapping DEKs
 * In production, this should be stored in a secure key management service (KMS)
 */
function getMasterKey() {
    // 1. Check environment variable first
    if (process.env.MASTER_KEY) {
        console.log("🔑 Using MASTER_KEY from environment variable");
        return Buffer.from(process.env.MASTER_KEY, "hex");
    }
    // 2. Check if key file exists
    if ((0, fs_1.existsSync)(KEY_FILE)) {
        console.log(`🔑 Loaded Master Key from ${KEY_FILE}`);
        const keyHex = (0, fs_1.readFileSync)(KEY_FILE, "utf-8").trim();
        return Buffer.from(keyHex, "hex");
    }
    // 3. Generate new key and save it
    console.log(`🔑 Generating new Master Key and saving to ${KEY_FILE}`);
    const newKey = (0, crypto_1.randomBytes)(32);
    const keyHex = newKey.toString("hex");
    // Ensure directory exists
    const keyDir = (0, path_1.dirname)(KEY_FILE);
    if (!(0, fs_1.existsSync)(keyDir)) {
        (0, fs_1.mkdirSync)(keyDir, { recursive: true });
    }
    (0, fs_1.writeFileSync)(KEY_FILE, keyHex, "utf-8");
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
function isValidHex(hex) {
    return /^[0-9a-fA-F]*$/.test(hex);
}
/**
 * Validates nonce length (must be 12 bytes)
 */
function validateNonce(nonce, fieldName) {
    if (!isValidHex(nonce)) {
        throw new types_1.ValidationError(`${fieldName} must be valid hex`);
    }
    const bytes = Buffer.from(nonce, "hex");
    if (bytes.length !== NONCE_LENGTH) {
        throw new types_1.ValidationError(`${fieldName} must be ${NONCE_LENGTH} bytes`);
    }
}
/**
 * Validates tag length (must be 16 bytes)
 */
function validateTag(tag, fieldName) {
    if (!isValidHex(tag)) {
        throw new types_1.ValidationError(`${fieldName} must be valid hex`);
    }
    const bytes = Buffer.from(tag, "hex");
    if (bytes.length !== TAG_LENGTH) {
        throw new types_1.ValidationError(`${fieldName} must be ${TAG_LENGTH} bytes`);
    }
}
/**
 * Validates hex ciphertext
 */
function validateCipherText(ct, fieldName) {
    if (!isValidHex(ct)) {
        throw new types_1.ValidationError(`${fieldName} must be valid hex`);
    }
    if (ct.length === 0) {
        throw new types_1.ValidationError(`${fieldName} cannot be empty`);
    }
}
/**
 * Encrypts data using AES-256-GCM
 */
function encrypt(data, key) {
    const nonce = (0, crypto_1.randomBytes)(NONCE_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, nonce);
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
function decrypt(ciphertext, key, nonce, tag) {
    try {
        const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, Buffer.from(nonce, "hex"));
        decipher.setAuthTag(Buffer.from(tag, "hex"));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(ciphertext, "hex")),
            decipher.final(),
        ]);
        return plaintext;
    }
    catch (error) {
        throw new types_1.DecryptionError("Decryption failed: ciphertext or tag may be tampered");
    }
}
/**
 * Encrypts a transaction using envelope encryption
 */
function encryptTransaction(request) {
    // 1. Generate random DEK (Data Encryption Key)
    const dek = (0, crypto_1.randomBytes)(DEK_LENGTH);
    // 2. Encrypt payload using DEK
    const payloadJson = JSON.stringify(request.payload);
    const payloadBuffer = Buffer.from(payloadJson, "utf-8");
    const { nonce: payload_nonce, ciphertext: payload_ct, tag: payload_tag, } = encrypt(payloadBuffer, dek);
    // 3. Wrap DEK using Master Key
    const { nonce: dek_wrap_nonce, ciphertext: dek_wrapped, tag: dek_wrap_tag, } = encrypt(dek, MASTER_KEY);
    // 4. Create and return secure record
    const record = {
        id: (0, crypto_1.randomBytes)(16).toString("hex"),
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
function decryptTransaction(record) {
    // Validate all fields
    validateNonce(record.payload_nonce, "payload_nonce");
    validateTag(record.payload_tag, "payload_tag");
    validateCipherText(record.payload_ct, "payload_ct");
    validateNonce(record.dek_wrap_nonce, "dek_wrap_nonce");
    validateTag(record.dek_wrap_tag, "dek_wrap_tag");
    validateCipherText(record.dek_wrapped, "dek_wrapped");
    try {
        // 1. Unwrap DEK using Master Key
        const dek = decrypt(record.dek_wrapped, MASTER_KEY, record.dek_wrap_nonce, record.dek_wrap_tag);
        // 2. Decrypt payload using DEK
        const payloadBuffer = decrypt(record.payload_ct, dek, record.payload_nonce, record.payload_tag);
        // 3. Parse payload JSON
        const payloadJson = payloadBuffer.toString("utf-8");
        const payload = JSON.parse(payloadJson);
        return {
            partyId: record.partyId,
            payload,
            createdAt: record.createdAt,
        };
    }
    catch (error) {
        if (error instanceof types_1.DecryptionError || error instanceof types_1.ValidationError) {
            throw error;
        }
        throw new types_1.DecryptionError(`Decryption failed: ${error.message}`);
    }
}
/**
 * Validates a secure record structure
 */
function validateRecord(record) {
    validateNonce(record.payload_nonce, "payload_nonce");
    validateTag(record.payload_tag, "payload_tag");
    validateCipherText(record.payload_ct, "payload_ct");
    validateNonce(record.dek_wrap_nonce, "dek_wrap_nonce");
    validateTag(record.dek_wrap_tag, "dek_wrap_tag");
    validateCipherText(record.dek_wrapped, "dek_wrapped");
    if (record.alg !== "AES-256-GCM") {
        throw new types_1.ValidationError("Invalid algorithm");
    }
    if (record.mk_version !== 1) {
        throw new types_1.ValidationError("Invalid master key version");
    }
}
