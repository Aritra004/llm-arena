function requireDatabaseUrl(value: string | undefined) {
  if (!value) {
    throw new Error("DATABASE_URL is not configured");
  }

  return value;
}

export const databaseEnvironment = Object.freeze({
  get url() {
    return requireDatabaseUrl(process.env.DATABASE_URL);
  },
});
