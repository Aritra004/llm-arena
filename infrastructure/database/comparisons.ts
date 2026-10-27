import "server-only";

import {
  ResponseAttemptStatus,
  ResponseErrorCategory,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function createComparisonRecords(input: {
  readonly promptCiphertext: Uint8Array<ArrayBuffer>;
  readonly promptKeyVersion: string;
  readonly claimTokenHash: Uint8Array<ArrayBuffer>;
  readonly models: readonly Readonly<{
    version: Readonly<{ id: string; providerModelId: string }>;
  }>[];
}) {
  const created = await prisma.comparison.create({
    data: {
      promptCiphertext: input.promptCiphertext,
      promptKeyVersion: input.promptKeyVersion,
      claimTokenHash: input.claimTokenHash,
      claimExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      contestants: {
        create: input.models.map((model, index) => ({
          displayPosition: index + 1,
          modelVersionId: model.version.id,
          responseAttempts: {
            create: { attemptNumber: 1, startedAt: new Date() },
          },
        })),
      },
    },
    select: { id: true },
  });
  const comparison = await prisma.comparison.findUniqueOrThrow({
    where: { id: created.id },
    select: {
      id: true,
      contestants: {
        orderBy: { displayPosition: "asc" },
        select: {
          id: true,
          displayPosition: true,
          modelVersion: { select: { providerModelId: true } },
          responseAttempts: { take: 1, select: { id: true } },
        },
      },
    },
  });

  return {
    id: comparison.id,
    contestants: comparison.contestants.map((contestant) => ({
      id: contestant.id,
      position: contestant.displayPosition,
      providerModelId: contestant.modelVersion.providerModelId,
      attemptId: contestant.responseAttempts[0]!.id,
    })),
  } as const;
}

export function markAttemptStreaming(attemptId: string) {
  return prisma.responseAttempt.update({
    where: { id: attemptId },
    data: { status: ResponseAttemptStatus.STREAMING },
  });
}

export function completeAttempt(input: {
  readonly attemptId: string;
  readonly responseCiphertext: Uint8Array<ArrayBuffer>;
  readonly responseKeyVersion: string;
  readonly firstTokenAt: Date | null;
  readonly completedAt: Date;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
}) {
  return prisma.responseAttempt.update({
    where: { id: input.attemptId },
    data: {
      status: ResponseAttemptStatus.SUCCEEDED,
      responseCiphertext: input.responseCiphertext,
      responseKeyVersion: input.responseKeyVersion,
      firstTokenAt: input.firstTokenAt,
      completedAt: input.completedAt,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
    },
  });
}

export function failAttempt(
  attemptId: string,
  category: ResponseErrorCategory,
) {
  return prisma.responseAttempt.update({
    where: { id: attemptId },
    data: {
      status:
        category === ResponseErrorCategory.CANCELLED
          ? ResponseAttemptStatus.CANCELLED
          : ResponseAttemptStatus.FAILED,
      errorCategory: category,
      completedAt: new Date(),
    },
  });
}
