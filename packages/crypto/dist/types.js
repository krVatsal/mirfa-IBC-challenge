"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecryptionError = exports.ValidationError = void 0;
/**
 * Validation error
 */
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
/**
 * Decryption error
 */
class DecryptionError extends Error {
    constructor(message) {
        super(message);
        this.name = "DecryptionError";
    }
}
exports.DecryptionError = DecryptionError;
