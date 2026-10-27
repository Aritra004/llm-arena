import "server-only";

import { databaseEnvironment } from "./database-environment";

function requireEnvironmentVariable(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export const serverEnvironment = Object.freeze({
  get arcjetKey() {
    return requireEnvironmentVariable("ARCJET_KEY", process.env.ARCJET_KEY);
  },
  get databaseUrl() {
    return databaseEnvironment.url;
  },
  get contentEncryptionKey() {
    return requireEnvironmentVariable(
      "CONTENT_ENCRYPTION_KEY",
      process.env.CONTENT_ENCRYPTION_KEY,
    );
  },
  get nodeEnvironment() {
    return process.env.NODE_ENV;
  },
  get openRouterApiKey() {
    return requireEnvironmentVariable(
      "OPENROUTER_API_KEY",
      process.env.OPENROUTER_API_KEY,
    );
  },
});
