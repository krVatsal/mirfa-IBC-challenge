import { describe, it, expect } from "vitest";
import {
  encryptTransaction,
  decryptTransaction,
  validateRecord,
  ValidationError,
  DecryptionError,
} from "./index";
import type { TxSecureRecord, EncryptRequest } from "./types";

describe("Encryption Tests", () => {
  // Test 1: Basic encrypt → decrypt roundtrip
  it("should encrypt and decrypt transaction successfully", () => {
    const request: EncryptRequest = {
      partyId: "party-123",
      payload: {
        amount: 1000,
        currency: "USD",
        sender: "alice",
        receiver: "bob",
      },
    };

    // Encrypt the transaction
    const encrypted = encryptTransaction(request);

    // Verify encrypted record structure
    expect(encrypted).toHaveProperty("id");
    expect(encrypted).toHaveProperty("partyId", "party-123");
    expect(encrypted).toHaveProperty("payload_ct");
    expect(encrypted).toHaveProperty("payload_nonce");
    expect(encrypted).toHaveProperty("payload_tag");
    expect(encrypted.alg).toBe("AES-256-GCM");

    // Decrypt the transaction
    const decrypted = decryptTransaction(encrypted);

    // Verify decrypted data matches original
    expect(decrypted.partyId).toBe(request.partyId);
    expect(decrypted.payload).toEqual(request.payload);
  });

  // Test 2: Tampered ciphertext should fail
  it("should fail when payload ciphertext is tampered", () => {
    const request: EncryptRequest = {
      partyId: "party-456",
      payload: { data: "secret message" },
    };

    const encrypted = encryptTransaction(request);

    // Tamper with the ciphertext by flipping a bit
    const tamperedCiphertext =
      encrypted.payload_ct.substring(0, encrypted.payload_ct.length - 2) +
      (parseInt(encrypted.payload_ct.substring(encrypted.payload_ct.length - 2), 16) ^ 0xff)
        .toString(16)
        .padStart(2, "0");

    const tamperedRecord: TxSecureRecord = {
      ...encrypted,
      payload_ct: tamperedCiphertext,
    };

    // Decryption should fail
    expect(() => decryptTransaction(tamperedRecord)).toThrow(DecryptionError);
    expect(() => decryptTransaction(tamperedRecord)).toThrow(
      /ciphertext or tag may be tampered/
    );
  });

  // Test 3: Tampered authentication tag should fail
  it("should fail when payload authentication tag is tampered", () => {
    const request: EncryptRequest = {
      partyId: "party-789",
      payload: { confidential: "top secret" },
    };

    const encrypted = encryptTransaction(request);

    // Tamper with the authentication tag
    const originalTag = Buffer.from(encrypted.payload_tag, "hex");
    originalTag[0] ^= 0xff; // Flip first byte
    const tamperedTag = originalTag.toString("hex");

    const tamperedRecord: TxSecureRecord = {
      ...encrypted,
      payload_tag: tamperedTag,
    };

    // Decryption should fail due to authentication failure
    expect(() => decryptTransaction(tamperedRecord)).toThrow(DecryptionError);
    expect(() => decryptTransaction(tamperedRecord)).toThrow(
      /ciphertext or tag may be tampered/
    );
  });

  // Test 4: Wrong nonce length should fail
  it("should fail when nonce length is incorrect", () => {
    const request: EncryptRequest = {
      partyId: "party-abc",
      payload: { value: 42 },
    };

    const encrypted = encryptTransaction(request);

    // Create nonce with wrong length (should be 12 bytes = 24 hex chars)
    const shortNonce = encrypted.payload_nonce.substring(0, 20); // 10 bytes instead of 12

    const invalidRecord: TxSecureRecord = {
      ...encrypted,
      payload_nonce: shortNonce,
    };

    // Validation should fail
    expect(() => decryptTransaction(invalidRecord)).toThrow(ValidationError);
    expect(() => decryptTransaction(invalidRecord)).toThrow(
      /payload_nonce must be 12 bytes/
    );
  });

  // Test 5: Wrong nonce length with extra bytes should also fail
  it("should fail when nonce is too long", () => {
    const request: EncryptRequest = {
      partyId: "party-xyz",
      payload: { test: "data" },
    };

    const encrypted = encryptTransaction(request);

    // Create nonce with extra bytes
    const longNonce = encrypted.payload_nonce + "aabbccdd"; // Extra 4 bytes

    const invalidRecord: TxSecureRecord = {
      ...encrypted,
      payload_nonce: longNonce,
    };

    // Validation should fail
    expect(() => decryptTransaction(invalidRecord)).toThrow(ValidationError);
    expect(() => decryptTransaction(invalidRecord)).toThrow(
      /payload_nonce must be 12 bytes/
    );
  });

  // Test 6: Tampered DEK wrapper should fail
  it("should fail when wrapped DEK is tampered", () => {
    const request: EncryptRequest = {
      partyId: "party-def",
      payload: { critical: "information" },
    };

    const encrypted = encryptTransaction(request);

    // Tamper with the wrapped DEK
    const tamperedDEK =
      encrypted.dek_wrapped.substring(0, 10) + "ff" + encrypted.dek_wrapped.substring(12);

    const tamperedRecord: TxSecureRecord = {
      ...encrypted,
      dek_wrapped: tamperedDEK,
    };

    // Decryption should fail when trying to unwrap DEK
    expect(() => decryptTransaction(tamperedRecord)).toThrow(DecryptionError);
  });

  // Test 7: Invalid hex in ciphertext should fail validation
  it("should fail validation with non-hex characters in ciphertext", () => {
    const request: EncryptRequest = {
      partyId: "party-ghi",
      payload: { data: "test" },
    };

    const encrypted = encryptTransaction(request);

    // Replace part of ciphertext with invalid hex characters
    const invalidCiphertext = "zzzz" + encrypted.payload_ct.substring(4);

    const invalidRecord: TxSecureRecord = {
      ...encrypted,
      payload_ct: invalidCiphertext,
    };

    // Validation should fail
    expect(() => validateRecord(invalidRecord)).toThrow(ValidationError);
    expect(() => validateRecord(invalidRecord)).toThrow(/must be valid hex/);
  });

  // Test 8: Multiple transactions should use different nonces
  it("should generate unique nonces for different encryptions", () => {
    const request: EncryptRequest = {
      partyId: "party-jkl",
      payload: { same: "data" },
    };

    const encrypted1 = encryptTransaction(request);
    const encrypted2 = encryptTransaction(request);

    // Nonces should be different (preventing nonce reuse)
    expect(encrypted1.payload_nonce).not.toBe(encrypted2.payload_nonce);
    expect(encrypted1.dek_wrap_nonce).not.toBe(encrypted2.dek_wrap_nonce);

    // Both should decrypt successfully
    const decrypted1 = decryptTransaction(encrypted1);
    const decrypted2 = decryptTransaction(encrypted2);

    expect(decrypted1.payload).toEqual(request.payload);
    expect(decrypted2.payload).toEqual(request.payload);
  });

  // Test 9: Empty payload should work
  it("should handle empty payload object", () => {
    const request: EncryptRequest = {
      partyId: "party-empty",
      payload: {},
    };

    const encrypted = encryptTransaction(request);
    const decrypted = decryptTransaction(encrypted);

    expect(decrypted.payload).toEqual({});
  });

  // Test 10: Complex nested payload should work
  it("should handle complex nested payload", () => {
    const request: EncryptRequest = {
      partyId: "party-nested",
      payload: {
        level1: {
          level2: {
            level3: "deep value",
            array: [1, 2, 3],
          },
        },
        meta: {
          timestamp: "2026-02-12T00:00:00Z",
          version: 1,
        },
      },
    };

    const encrypted = encryptTransaction(request);
    const decrypted = decryptTransaction(encrypted);

    expect(decrypted.payload).toEqual(request.payload);
  });
});
