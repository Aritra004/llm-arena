import "server-only";

import { ModelAvailability, Prisma } from "../../generated/prisma/client";
import { fetchFreeModelCatalog } from "../../infrastructure/ai/free-models";
import { getModelCatalogRecords } from "../../infrastructure/database/models";
import { prisma } from "../../lib/prisma";

const activeVersionWhere = (now: Date) =>
  ({
    effectiveFrom: { lte: now },
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
  }) satisfies Prisma.ModelVersionWhereInput;

export type PickerModel = Readonly<{
  availability: ModelAvailability;
  contextWindowTokens: number | null;
  description: string;
  id: string;
  name: string;
}>;

export async function listPickerModels(
  now = new Date(),
): Promise<PickerModel[]> {
  const models = await getModelCatalogRecords(now);

  return models.map((model) => ({
    availability: model.availability,
    contextWindowTokens: model.version?.contextWindowTokens ?? null,
    description: model.description,
    id: model.id,
    name: model.name,
  }));
}

export async function resolvePickerSelection(
  modelIds: readonly string[],
  now = new Date(),
) {
  const [freeModels, models] = await Promise.all([
    fetchFreeModelCatalog(),
    prisma.model.findMany({
      where: {
        id: { in: [...modelIds] },
        availability: {
          in: [ModelAvailability.AVAILABLE, ModelAvailability.DEGRADED],
        },
      },
      select: {
        id: true,
        name: true,
        versions: {
          where: activeVersionWhere(now),
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          select: { id: true, providerModelId: true, versionLabel: true },
        },
      },
    }),
  ]);
  const freeIds = new Set(freeModels.map((model) => model.providerModelId));

  const resolvedById = new Map(
    models.flatMap((model) => {
      const version = model.versions[0];
      return version && freeIds.has(version.providerModelId)
        ? [[model.id, { ...model, version }] as const]
        : [];
    }),
  );

  return modelIds
    .map((id) => resolvedById.get(id))
    .filter((model) => model !== undefined);
}
