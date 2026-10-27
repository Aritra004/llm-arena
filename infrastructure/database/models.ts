import "server-only";

import { ModelAvailability, Prisma } from "@/generated/prisma/client";
import { fetchFreeModelCatalog } from "@/infrastructure/ai/free-models";
import { prisma } from "@/lib/prisma";

const activeVersionWhere = (now: Date) =>
  ({
    effectiveFrom: { lte: now },
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
  }) satisfies Prisma.ModelVersionWhereInput;

export type ModelCatalogRecord = Readonly<{
  availability: ModelAvailability;
  description: string;
  id: string;
  name: string;
  version: Readonly<{
    capabilities: Prisma.JsonValue;
    contextWindowTokens: number | null;
    providerModelId: string;
    versionLabel: string;
  }> | null;
}>;

export async function getModelCatalogRecords(
  now = new Date(),
): Promise<ModelCatalogRecord[]> {
  const [freeModels, models] = await Promise.all([
    fetchFreeModelCatalog(),
    prisma.model.findMany({
      where: {
        availability: {
          in: [ModelAvailability.AVAILABLE, ModelAvailability.DEGRADED],
        },
      },
      orderBy: { name: "asc" },
      select: {
        availability: true,
        description: true,
        id: true,
        name: true,
        versions: {
          where: activeVersionWhere(now),
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          select: {
            capabilities: true,
            contextWindowTokens: true,
            providerModelId: true,
            versionLabel: true,
          },
        },
      },
    }),
  ]);
  const freeIds = new Set(freeModels.map((model) => model.providerModelId));

  return models.flatMap(({ versions, ...model }) => {
    const version = versions[0];
    return version && freeIds.has(version.providerModelId)
      ? [{ ...model, version }]
      : [];
  });
}
