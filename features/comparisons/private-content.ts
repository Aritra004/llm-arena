import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnvironment } from "@/infrastructure/env";

const keyVersion = "v1";

function encryptionKey() {
  const key = Buffer.from(serverEnvironment.contentEncryptionKey, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CONTENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  }
  return key;
}

export function encryptPrivateText(value: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: Uint8Array.from(
      Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]),
    ),
    keyVersion,
  } as const;
}

export function decryptPrivateText(envelope: Uint8Array) {
  const bytes = Buffer.from(envelope);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    bytes.subarray(0, 12),
  );
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([
    decipher.update(bytes.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
