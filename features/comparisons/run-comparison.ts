import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { ResponseErrorCategory } from "@/generated/prisma/client";
import { streamOpenRouter } from "@/infrastructure/ai/openrouter";
import {
  completeAttempt,
  createComparisonRecords,
  failAttempt,
  markAttemptStreaming,
} from "@/infrastructure/database/comparisons";
import { resolvePickerSelection } from "@/app/arena/model-catalog";
import type { ComparisonEvent, SafeErrorCategory } from "./contracts";
import { encryptPrivateText } from "./private-content";

function safeFailure(error: unknown): {
  category: SafeErrorCategory;
  databaseCategory: ResponseErrorCategory;
  message: string;
  retryable: boolean;
} {
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      category: "cancelled",
      databaseCategory: ResponseErrorCategory.CANCELLED,
      message: "This response was cancelled.",
      retryable: true,
    };
  }
  const status =
    error && typeof error === "object" ? Reflect.get(error, "status") : null;
  if (status === 404) {
    return {
      category: "unavailable",
      databaseCategory: ResponseErrorCategory.UNAVAILABLE,
      message:
        "This model is no longer available for free. Choose another model.",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      category: "rate_limited",
      databaseCategory: ResponseErrorCategory.RATE_LIMITED,
      message: "This model is busy right now. Try it again shortly.",
      retryable: true,
    };
  }
  return {
    category: "unavailable",
    databaseCategory: ResponseErrorCategory.UNAVAILABLE,
    message:
      "This response could not finish. The other results are still usable.",
    retryable: true,
  };
}

export async function prepareComparison(
  prompt: string,
  modelIds: readonly string[],
) {
  let models;
  try {
    models = await resolvePickerSelection(modelIds);
  } catch {
    return {
      ok: false,
      message:
        "Free model availability could not be checked. Try again shortly.",
    } as const;
  }
  if (models.length !== modelIds.length) {
    return {
      ok: false,
      message: "One of those models is no longer available.",
    } as const;
  }
  const encryptedPrompt = encryptPrivateText(prompt);
  const claimToken = randomBytes(32).toString("base64url");
  const claimTokenHash = Uint8Array.from(
    createHash("sha256").update(claimToken).digest(),
  );
  const comparison = await createComparisonRecords({
    promptCiphertext: encryptedPrompt.ciphertext,
    promptKeyVersion: encryptedPrompt.keyVersion,
    claimTokenHash,
    models,
  });
  return { ok: true, comparison, claimToken } as const;
}

export async function runContestant(
  contestant: Readonly<{
    id: string;
    attemptId: string;
    providerModelId: string;
  }>,
  prompt: string,
  signal: AbortSignal,
  emit: (event: ComparisonEvent) => void,
) {
  const startedAt = new Date();
  let firstTokenAt: Date | null = null;
  let firstTokenTime: number | null = null;
  let responseText = "";
  try {
    await markAttemptStreaming(contestant.attemptId);
    emit({
      type: "attempt_started",
      contestantId: contestant.id,
      attemptId: contestant.attemptId,
    });
    const usage = await streamOpenRouter(
      contestant.providerModelId,
      prompt,
      signal,
      ({ delta }) => {
        if (firstTokenAt === null) {
          firstTokenAt = new Date();
          firstTokenTime = firstTokenAt.getTime();
        }
        responseText += delta;
        emit({
          type: "content_delta",
          contestantId: contestant.id,
          attemptId: contestant.attemptId,
          delta,
        });
      },
    );
    const completedAt = new Date();
    const encryptedResponse = encryptPrivateText(responseText);
    await completeAttempt({
      attemptId: contestant.attemptId,
      responseCiphertext: encryptedResponse.ciphertext,
      responseKeyVersion: encryptedResponse.keyVersion,
      firstTokenAt,
      completedAt,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
    emit({
      type: "attempt_completed",
      contestantId: contestant.id,
      attemptId: contestant.attemptId,
      firstTokenMs:
        firstTokenTime === null ? null : firstTokenTime - startedAt.getTime(),
      totalMs: completedAt.getTime() - startedAt.getTime(),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  } catch (error: unknown) {
    const failure = safeFailure(error);
    await failAttempt(contestant.attemptId, failure.databaseCategory);
    emit({
      type: "attempt_failed",
      contestantId: contestant.id,
      attemptId: contestant.attemptId,
      category: failure.category,
      message: failure.message,
      retryable: failure.retryable,
    });
  }
}
