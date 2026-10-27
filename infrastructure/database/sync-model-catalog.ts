import { createHash } from "node:crypto";

import { ModelAvailability, PrismaClient } from "../../generated/prisma/client";
import type { FreeModel } from "../ai/free-models";

function fingerprint(model: FreeModel) {
  const capabilities = Object.fromEntries(
    Object.entries(model.capabilities).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );

  return createHash("sha256")
    .update(
      JSON.stringify({
        providerModelId: model.providerModelId,
        canonicalSlug: model.canonicalSlug,
        name: model.name,
        description: model.description,
        contextWindowTokens: model.contextWindowTokens,
        capabilities,
      }),
    )
    .digest("hex")
    .slice(0, 24);
}

function catalogId(providerModelId: string) {
  const slug = providerModelId
    .replace(/:free$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = createHash("sha256")
    .update(providerModelId)
    .digest("hex")
    .slice(0, 16);

  return `${slug}-${suffix}`;
}

export async function syncModelCatalog(
  prisma: Pick<PrismaClient, "$transaction">,
  catalog: readonly FreeModel[],
  now = new Date(),
) {
  if (catalog.length === 0 || !Number.isFinite(now.getTime())) {
    throw new Error("Cannot synchronize an empty catalog or invalid date.");
  }

  const providerIds = new Set<string>();
  for (const model of catalog) {
    if (
      !model.providerModelId.endsWith(":free") ||
      providerIds.has(model.providerModelId)
    ) {
      throw new Error("The catalog must contain unique free model IDs.");
    }
    providerIds.add(model.providerModelId);
  }

  return prisma.$transaction(
    async (transaction) => {
      const existingModels = await transaction.model.findMany({
        orderBy: { id: "asc" },
        include: { versions: { orderBy: { effectiveFrom: "desc" } } },
      });
      const availableIds = new Set<string>();
      let createdModels = 0;
      let createdVersions = 0;

      for (const model of catalog) {
        // Prefer the current owner, then a historical owner, to retain stable
        // model URLs and every existing contestant/version relationship.
        const candidates = existingModels.filter(
          (existing) =>
            !availableIds.has(existing.id) &&
            existing.versions.some(
              (version) => version.providerModelId === model.providerModelId,
            ),
        );
        const existing =
          candidates.find(
            (candidate) =>
              candidate.versions.find(
                (version) =>
                  version.effectiveFrom <= now &&
                  (version.effectiveTo === null || version.effectiveTo > now),
              )?.providerModelId === model.providerModelId,
          ) ?? candidates[0];
        const modelId = existing?.id ?? catalogId(model.providerModelId);

        if (
          availableIds.has(modelId) ||
          (!existing && existingModels.some((entry) => entry.id === modelId))
        ) {
          throw new Error(`Model catalog ID collision: ${modelId}`);
        }
        availableIds.add(modelId);

        if (!existing) {
          await transaction.model.create({
            data: {
              id: modelId,
              name: model.name,
              description: model.description,
              availability: ModelAvailability.AVAILABLE,
            },
          });
          createdModels += 1;
        } else if (
          existing.name !== model.name ||
          existing.description !== model.description ||
          existing.availability !== ModelAvailability.AVAILABLE
        ) {
          await transaction.model.update({
            where: { id: modelId },
            data: {
              name: model.name,
              description: model.description,
              availability: ModelAvailability.AVAILABLE,
            },
          });
        }

        const versionBase = `openrouter-${fingerprint(model)}`;
        const currentVersion = existing?.versions.find(
          (version) =>
            version.effectiveFrom <= now &&
            (version.effectiveTo === null || version.effectiveTo > now),
        );
        if (
          currentVersion &&
          (currentVersion.versionLabel === versionBase ||
            currentVersion.versionLabel.startsWith(`${versionBase}-`))
        ) {
          continue;
        }

        const labels = new Set(
          existing?.versions.map((version) => version.versionLabel) ?? [],
        );
        let versionLabel = versionBase;
        for (let revision = 2; labels.has(versionLabel); revision += 1) {
          // If metadata changes back, append a new period rather than reopening
          // a closed version used by historical comparisons.
          versionLabel = `${versionBase}-${revision}`;
        }
        const openVersions =
          existing?.versions.filter(
            (version) => version.effectiveTo === null,
          ) ?? [];
        const effectiveFrom = new Date(
          Math.max(
            now.getTime(),
            ...openVersions.map(
              (version) => version.effectiveFrom.getTime() + 1,
            ),
          ),
        );

        if (openVersions.length > 0) {
          await transaction.modelVersion.updateMany({
            where: { modelId, effectiveTo: null },
            data: { effectiveTo: effectiveFrom },
          });
        }
        await transaction.modelVersion.create({
          data: {
            modelId,
            providerModelId: model.providerModelId,
            versionLabel,
            capabilities: model.capabilities,
            contextWindowTokens: model.contextWindowTokens,
            effectiveFrom,
          },
        });
        createdVersions += 1;
      }

      const disabled = await transaction.model.updateMany({
        where: {
          id: { notIn: [...availableIds] },
          availability: { not: ModelAvailability.UNAVAILABLE },
        },
        data: { availability: ModelAvailability.UNAVAILABLE },
      });

      return {
        availableModels: availableIds.size,
        createdModels,
        createdVersions,
        disabledModels: disabled.count,
      };
    },
    { isolationLevel: "Serializable", maxWait: 15_000, timeout: 120_000 },
  );
}
