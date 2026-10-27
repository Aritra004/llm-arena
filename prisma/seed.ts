import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { fetchFreeModelCatalog } from "../infrastructure/ai/free-models";
import { databaseEnvironment } from "../infrastructure/database-environment";
import { syncModelCatalog } from "../infrastructure/database/sync-model-catalog";

config({ path: [".env.local", ".env"], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseEnvironment.url }),
});

async function main() {
  // Fetch and validate the complete provider catalog before any database writes.
  const models = await fetchFreeModelCatalog();
  const result = await syncModelCatalog(prisma, models);
  console.log("Free model catalog synchronized:", result);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
