"use client";

import { useState } from "react";
import type { TxSecureRecord } from "@mirfa/crypto";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type EncryptResponse = {
  id: string;
  partyId: string;
  createdAt: string;
  alg: string;
  mk_version: number;
};

type DecryptResponse = {
  id: string;
  partyId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export default function Home() {
  const [partyId, setPartyId] = useState("");
  const [payloadText, setPayloadText] = useState(
    '{\n  "amount": 100,\n  "currency": "AED"\n}'
  );
  const [txId, setTxId] = useState("");
  const [encryptedRecord, setEncryptedRecord] = useState<TxSecureRecord | null>(
    null
  );
  const [decryptedData, setDecryptedData] = useState<DecryptResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEncrypt = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = JSON.parse(payloadText);

      const response = await fetch(`${API_URL}/tx/encrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partyId,
          payload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Encryption failed");
      }

      const data: EncryptResponse = await response.json();
      setTxId(data.id);
      setEncryptedRecord(null);
      setDecryptedData(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to encrypt");
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    setError("");
    setLoading(true);
    try {
      if (!txId) {
        throw new Error("Please enter a transaction ID");
      }

      const response = await fetch(`${API_URL}/tx/${txId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fetch failed");
      }

      const data: TxSecureRecord = await response.json();
      setEncryptedRecord(data);
      setDecryptedData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    setError("");
    setLoading(true);
    try {
      if (!txId) {
        throw new Error("Please enter a transaction ID");
      }

      const response = await fetch(`${API_URL}/tx/${txId}/decrypt`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Decryption failed");
      }

      const data: DecryptResponse = await response.json();
      setDecryptedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decrypt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            🔐 Secure Transaction Service
          </h1>
          <p className="text-gray-400 text-lg">
            Envelope Encryption with AES-256-GCM
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input Form */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">
                1. Encrypt & Save
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Party ID
                  </label>
                  <input
                    type="text"
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    placeholder="party_123"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    JSON Payload
                  </label>
                  <textarea
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono text-sm"
                  />
                </div>

                <button
                  onClick={handleEncrypt}
                  disabled={loading || !partyId}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-lg"
                >
                  {loading ? "Processing..." : "🔒 Encrypt & Save"}
                </button>

                {txId && (
                  <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                    <p className="text-sm text-gray-300 mb-1">
                      Transaction ID:
                    </p>
                    <p className="font-mono text-green-400 break-all">
                      {txId}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-purple-400">
                2. Fetch & Decrypt
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder="Enter transaction ID"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white font-mono text-sm"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleFetch}
                    disabled={loading || !txId}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-lg"
                  >
                    📦 Fetch
                  </button>
                  <button
                    onClick={handleDecrypt}
                    disabled={loading || !txId}
                    className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-lg"
                  >
                    🔓 Decrypt
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
                <p className="text-red-400 font-semibold">❌ Error</p>
                <p className="text-red-300 mt-1">{error}</p>
              </div>
            )}

            {encryptedRecord && (
              <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                <h3 className="text-xl font-semibold mb-4 text-purple-400">
                  📦 Encrypted Record
                </h3>
                <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-sm font-mono text-gray-300 border border-gray-700">
                  {JSON.stringify(encryptedRecord, null, 2)}
                </pre>
              </div>
            )}

            {decryptedData && (
              <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                <h3 className="text-xl font-semibold mb-4 text-green-400">
                  🔓 Decrypted Data
                </h3>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Party ID:</p>
                      <p className="text-green-400 font-mono">
                        {decryptedData.partyId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Payload:</p>
                      <pre className="text-green-400 font-mono text-sm mt-1">
                        {JSON.stringify(decryptedData.payload, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Created At:</p>
                      <p className="text-green-400 font-mono text-sm">
                        {decryptedData.createdAt}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!error && !encryptedRecord && !decryptedData && (
              <div className="bg-gray-800 rounded-lg p-8 shadow-xl border border-gray-700 text-center">
                <div className="text-6xl mb-4">🔐</div>
                <p className="text-gray-400">
                  Encrypt data and fetch results to see them here
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            🔒 Using AES-256-GCM envelope encryption with DEK wrapping
          </p>
          <p className="mt-1">
            Built with Next.js, Fastify & TurboRepo
          </p>
        </footer>
      </div>
    </div>
  );
}
