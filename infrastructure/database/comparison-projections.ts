import "server-only";

import { Prisma } from "../../generated/prisma/client";

const responseMeasurementSelect = {
  id: true,
  attemptNumber: true,
  status: true,
  errorCategory: true,
  startedAt: true,
  firstTokenAt: true,
  completedAt: true,
  inputTokens: true,
  outputTokens: true,
  costUsdTenThousandths: true,
} satisfies Prisma.ResponseAttemptSelect;

export const blindComparisonSelect = {
  id: true,
  revealedAt: true,
  contestants: {
    orderBy: { displayPosition: "asc" },
    select: {
      id: true,
      displayPosition: true,
      responseAttempts: {
        orderBy: { attemptNumber: "asc" },
        select: responseMeasurementSelect,
      },
    },
  },
} satisfies Prisma.ComparisonSelect;

export const revealedComparisonSelect = {
  ...blindComparisonSelect,
  contestants: {
    orderBy: { displayPosition: "asc" },
    select: {
      ...blindComparisonSelect.contestants.select,
      modelVersion: {
        select: {
          versionLabel: true,
          model: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ComparisonSelect;

export type BlindComparisonRecord = Prisma.ComparisonGetPayload<{
  select: typeof blindComparisonSelect;
}>;

export type RevealedComparisonRecord = Prisma.ComparisonGetPayload<{
  select: typeof revealedComparisonSelect;
}>;
