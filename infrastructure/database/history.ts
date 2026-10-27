import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const latestAttemptSelect = {
  id: true,
  status: true,
  errorCategory: true,
  responseCiphertext: true,
  responseKeyVersion: true,
  startedAt: true,
  firstTokenAt: true,
  completedAt: true,
  inputTokens: true,
  outputTokens: true,
  costUsdTenThousandths: true,
} satisfies Prisma.ResponseAttemptSelect;

const historyListSelect = {
  id: true,
  promptCiphertext: true,
  promptKeyVersion: true,
  createdAt: true,
  contestants: {
    orderBy: { displayPosition: "asc" },
    select: {
      id: true,
      responseAttempts: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
        select: { id: true, status: true },
      },
    },
  },
  vote: {
    select: {
      currentRevision: { select: { selectedAttemptId: true } },
    },
  },
} satisfies Prisma.ComparisonSelect;

const historyDetailSelect = {
  id: true,
  promptCiphertext: true,
  promptKeyVersion: true,
  createdAt: true,
  revealedAt: true,
  contestants: {
    orderBy: { displayPosition: "asc" },
    select: {
      id: true,
      displayPosition: true,
      modelVersion: {
        select: {
          versionLabel: true,
          model: { select: { name: true } },
        },
      },
      responseAttempts: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
        select: latestAttemptSelect,
      },
    },
  },
  vote: {
    select: {
      currentRevision: { select: { selectedAttemptId: true } },
    },
  },
} satisfies Prisma.ComparisonSelect;

export type HistoryListRecord = Prisma.ComparisonGetPayload<{
  select: typeof historyListSelect;
}>;

export type HistoryDetailRecord = Prisma.ComparisonGetPayload<{
  select: typeof historyDetailSelect;
}>;

function ownedHistoryWhere(clerkSubject: string) {
  return {
    contentDeletedAt: null,
    owner: { is: { clerkSubject } },
  } satisfies Prisma.ComparisonWhereInput;
}

export async function getHistoryRecords(
  clerkSubject: string,
  options: Readonly<{ skip: number; take: number }>,
) {
  const where = ownedHistoryWhere(clerkSubject);

  const [records, totalCount] = await prisma.$transaction([
    prisma.comparison.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: options.skip,
      take: options.take,
      select: historyListSelect,
    }),
    prisma.comparison.count({ where }),
  ]);

  return { records, totalCount } as const;
}

export function getHistoryRecord(clerkSubject: string, comparisonId: string) {
  return prisma.comparison.findFirst({
    where: {
      id: comparisonId,
      ...ownedHistoryWhere(clerkSubject),
    },
    select: historyDetailSelect,
  });
}

export async function eraseHistoryRecord(
  clerkSubject: string,
  comparisonId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const comparison = await transaction.comparison.findFirst({
      where: {
        id: comparisonId,
        contentDeletedAt: null,
        owner: { is: { clerkSubject } },
      },
      select: { id: true, ownerId: true },
    });

    if (!comparison?.ownerId) return false;

    await transaction.responseAttempt.updateMany({
      where: { comparisonId: comparison.id },
      data: {
        responseCiphertext: null,
        responseKeyVersion: null,
      },
    });

    await transaction.vote.updateMany({
      where: {
        comparisonId: comparison.id,
        userId: comparison.ownerId,
      },
      data: { userId: null },
    });

    await transaction.comparison.update({
      where: { id: comparison.id },
      data: {
        promptCiphertext: null,
        promptKeyVersion: null,
        ownerId: null,
        claimTokenHash: null,
        claimExpiresAt: null,
        contentDeletedAt: new Date(),
      },
    });

    return true;
  });
}
