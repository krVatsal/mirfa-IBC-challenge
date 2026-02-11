"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const crypto_1 = require("@mirfa/crypto");
const fastify = (0, fastify_1.default)({
    logger: true,
});
// In-memory storage
const storage = new Map();
// Enable CORS for frontend
fastify.register(cors_1.default, {
    origin: true, // Allow all origins in development
});
// Health check
fastify.get("/", async () => {
    return { status: "ok", service: "mirfa-ibc-api" };
});
// POST /tx/encrypt - Encrypt and store transaction
fastify.post("/tx/encrypt", async (request, reply) => {
    try {
        const { partyId, payload } = request.body;
        // Validate input
        if (!partyId || typeof partyId !== "string") {
            return reply.code(400).send({
                error: "partyId is required and must be a string",
            });
        }
        if (!payload || typeof payload !== "object") {
            return reply.code(400).send({
                error: "payload is required and must be an object",
            });
        }
        // Encrypt transaction
        const record = (0, crypto_1.encryptTransaction)({ partyId, payload });
        // Store encrypted record
        storage.set(record.id, record);
        return reply.code(201).send({
            id: record.id,
            partyId: record.partyId,
            createdAt: record.createdAt,
            alg: record.alg,
            mk_version: record.mk_version,
        });
    }
    catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
            error: "Encryption failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// GET /tx/:id - Get encrypted record (no decrypt)
fastify.get("/tx/:id", async (request, reply) => {
    const { id } = request.params;
    const record = storage.get(id);
    if (!record) {
        return reply.code(404).send({
            error: "Transaction not found",
        });
    }
    return reply.send(record);
});
// POST /tx/:id/decrypt - Decrypt and return original payload
fastify.post("/tx/:id/decrypt", async (request, reply) => {
    try {
        const { id } = request.params;
        const record = storage.get(id);
        if (!record) {
            return reply.code(404).send({
                error: "Transaction not found",
            });
        }
        // Validate record structure
        (0, crypto_1.validateRecord)(record);
        // Decrypt transaction
        const decrypted = (0, crypto_1.decryptTransaction)(record);
        return reply.send({
            id,
            ...decrypted,
        });
    }
    catch (error) {
        if (error instanceof crypto_1.ValidationError) {
            return reply.code(400).send({
                error: "Validation failed",
                message: error.message,
            });
        }
        if (error instanceof crypto_1.DecryptionError) {
            return reply.code(400).send({
                error: "Decryption failed",
                message: error.message,
            });
        }
        fastify.log.error(error);
        return reply.code(500).send({
            error: "Decryption failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Start server
const start = async () => {
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
        await fastify.listen({ port, host: "0.0.0.0" });
        console.log(`🚀 API server running on http://localhost:${port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
