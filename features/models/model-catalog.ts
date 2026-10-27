import type { ModelAvailability } from "@/generated/prisma/client";
import type { ModelLeaderboardEvidence } from "@/infrastructure/database/leaderboard";
import type { ModelCatalogRecord } from "@/infrastructure/database/models";

const providerNames: Readonly<Record<string, string>> = {
  google: "Google",
  meta: "Meta",
  "meta-llama": "Meta",
  minimax: "MiniMax",
  nvidia: "NVIDIA",
  qwen: "Alibaba Cloud",
  "z-ai": "Z.ai",
};

const capabilityDescriptions: Readonly<
  Record<string, readonly [label: string, detail: string]>
> = {
  agentic: ["Agentic work", "Tool use and multi-step workflows"],
  coding: ["Coding", "Implementation, review, and debugging"],
  multimodal: ["Multimodal", "Understanding beyond plain text"],
  reasoning: ["Reasoning", "Multi-step analysis and problem solving"],
  textGeneration: [
    "Text generation",
    "Instruction following and response generation",
  ],
};

export type PublicModelAvailability = "available" | "degraded" | "unavailable";

export type ModelCapability = Readonly<{
  detail: string;
  label: string;
}>;

export type CatalogModel = Readonly<{
  availability: PublicModelAvailability;
  averageCostUsdTenThousandths: number | null;
  capabilities: readonly ModelCapability[];
  contextWindowTokens: number | null;
  description: string;
  id: string;
  isComparable: boolean;
  latencySampleCount: number;
  medianFirstTokenLatencyMs: number | null;
  name: string;
  provider: string;
  ratings: number;
  successfulRuns: number;
  versionLabel: string | null;
  winRate: number | null;
  wins: number;
}>;

function toPublicAvailability(
  availability: ModelAvailability,
): PublicModelAvailability {
  switch (availability) {
    case "AVAILABLE":
      return "available";
    case "DEGRADED":
      return "degraded";
    case "UNAVAILABLE":
      return "unavailable";
  }
}

function titleCaseIdentifier(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function providerName(providerModelId: string | null) {
  if (!providerModelId) return "No active provider";

  const providerId = providerModelId.split("/", 1)[0];
  return providerNames[providerId] ?? titleCaseIdentifier(providerId);
}

function capabilityProfile(capabilities: unknown): readonly ModelCapability[] {
  if (
    !capabilities ||
    typeof capabilities !== "object" ||
    Array.isArray(capabilities)
  ) {
    return [];
  }

  return Object.entries(capabilities)
    .filter(([, value]) => value === true || typeof value === "string")
    .map(([id, value]) => {
      const knownCapability = capabilityDescriptions[id];

      return {
        label: knownCapability?.[0] ?? titleCaseIdentifier(id),
        detail:
          typeof value === "string"
            ? value
            : (knownCapability?.[1] ?? "Supported by the active model version"),
      };
    });
}

export function buildModelCatalog(
  records: readonly ModelCatalogRecord[],
  evidence: readonly ModelLeaderboardEvidence[],
): readonly CatalogModel[] {
  const evidenceByModelId = new Map(
    evidence.map((model) => [model.modelId, model] as const),
  );

  return records.map((record) => {
    const modelEvidence = evidenceByModelId.get(record.id);
    const availability = record.version
      ? toPublicAvailability(record.availability)
      : "unavailable";
    const ratings = modelEvidence?.ratings ?? 0;

    return {
      availability,
      averageCostUsdTenThousandths:
        modelEvidence?.averageCostUsdTenThousandths ?? null,
      capabilities: capabilityProfile(record.version?.capabilities),
      contextWindowTokens: record.version?.contextWindowTokens ?? null,
      description: record.description,
      id: record.id,
      isComparable: availability !== "unavailable" && record.version !== null,
      latencySampleCount: modelEvidence?.latencySampleCount ?? 0,
      medianFirstTokenLatencyMs:
        modelEvidence?.medianFirstTokenLatencyMs ?? null,
      name: record.name,
      provider: providerName(record.version?.providerModelId ?? null),
      ratings,
      successfulRuns: modelEvidence?.successfulRuns ?? 0,
      versionLabel: record.version?.versionLabel ?? null,
      winRate: ratings === 0 ? null : (modelEvidence?.wins ?? 0) / ratings,
      wins: modelEvidence?.wins ?? 0,
    };
  });
}

export function formatContextWindow(value: number | null) {
  if (value === null) return "Not published";

  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 1,
    }).format(value / 1_000_000)}M tokens`;
  }

  if (value >= 1_000) {
    return `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value / 1_000)}K tokens`;
  }

  return `${new Intl.NumberFormat("en-US").format(value)} tokens`;
}
