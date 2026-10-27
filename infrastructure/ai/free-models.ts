export type FreeModel = Readonly<{
  providerModelId: string;
  canonicalSlug: string;
  name: string;
  description: string;
  contextWindowTokens: number | null;
  capabilities: Record<string, boolean>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isZeroPrice(value: unknown) {
  return (
    value === 0 ||
    (typeof value === "string" && /^0+(?:\.0+)?(?:e[+-]?\d+)?$/i.test(value))
  );
}

export function parseFreeModelCatalog(payload: unknown): FreeModel[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("OpenRouter returned an invalid model catalog.");
  }

  const models = new Map<string, FreeModel>();
  for (const entry of payload.data) {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      !/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*:free$/i.test(entry.id) ||
      typeof entry.name !== "string" ||
      !entry.name.trim() ||
      !isRecord(entry.pricing) ||
      !isZeroPrice(entry.pricing.prompt) ||
      !isZeroPrice(entry.pricing.completion) ||
      !Object.values(entry.pricing).every(isZeroPrice) ||
      !isRecord(entry.architecture) ||
      !Array.isArray(entry.architecture.input_modalities) ||
      !entry.architecture.input_modalities.includes("text") ||
      !Array.isArray(entry.architecture.output_modalities) ||
      !entry.architecture.output_modalities.includes("text")
    ) {
      continue;
    }

    const parameters = Array.isArray(entry.supported_parameters)
      ? entry.supported_parameters
      : [];
    models.set(entry.id, {
      providerModelId: entry.id,
      canonicalSlug:
        typeof entry.canonical_slug === "string" && entry.canonical_slug
          ? entry.canonical_slug
          : entry.id,
      name: entry.name
        .replace(/^[^:]+:\s*/, "")
        .replace(/\s*\(free\)\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim(),
      description:
        typeof entry.description === "string" ? entry.description : "",
      contextWindowTokens:
        typeof entry.context_length === "number" &&
        Number.isSafeInteger(entry.context_length) &&
        entry.context_length > 0 &&
        entry.context_length <= 2_147_483_647
          ? entry.context_length
          : null,
      capabilities: {
        textGeneration: true,
        reasoning: parameters.includes("reasoning"),
        agentic: parameters.includes("tools"),
        multimodal: entry.architecture.input_modalities.some(
          (modality) => modality !== "text",
        ),
      },
    });
  }

  if (models.size === 0) {
    throw new Error("OpenRouter returned no verified free text models.");
  }
  return [...models.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export async function fetchFreeModelCatalog(): Promise<FreeModel[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      "OpenRouter's free model catalog is temporarily unavailable.",
    );
  }
  return parseFreeModelCatalog(await response.json());
}
