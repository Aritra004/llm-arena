import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { serverEnvironment } from "../infrastructure/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: serverEnvironment.databaseUrl,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (serverEnvironment.nodeEnvironment !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
