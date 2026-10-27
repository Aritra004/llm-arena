import "server-only";

import { ResponseAttemptStatus } from "@/generated/prisma/client";
import {
  getHistoryRecord,
  getHistoryRecords,
  type HistoryDetailRecord,
  type HistoryListRecord,
} from "@/infrastructure/database/history";
import { decryptPrivateText } from "@/features/comparisons/private-content";

export const HISTORY_PAGE_SIZE = 12;

type Completion = Readonly<{
  label: "Completed" | "Failed" | "In progress" | "Partial";
  tone: "danger" | "live" | "success" | "warning";
}>;

export type HistoryListItem = Readonly<{
  id: string;
  createdAt: Date;
  promptPreview: string;
  responseCount: number;
  completion: Completion;
  voteLabel: "Not voted" | "Voted";
}>;

export type HistoryResponse = Readonly<{
  id: string;
  position: number;
  modelName: string | null;
  versionLabel: string | null;
  body: string | null;
  stateLabel: string;
  stateTone: "danger" | "live" | "success" | "warning";
  failureMessage: string | null;
  firstTokenLatencyMs: number | null;
  outputTokens: number | null;
  costUsdTenThousandths: number;
  selected: boolean;
}>;

export type HistoryDetail = Readonly<{
  id: string;
  createdAt: Date;
  prompt: string;
  completion: Completion;
  responses: readonly HistoryResponse[];
}>;

function decryptContent(
  ciphertext: Uint8Array | null,
  keyVersion: string | null,
) {
  if (!ciphertext || keyVersion !== "v1") return null;

  try {
    return decryptPrivateText(ciphertext);
  } catch {
    return null;
  }
}

function promptPreview(prompt: string | null) {
  if (!prompt) return "Private prompt unavailable";
  const compact = prompt.replace(/\s+/g, " ").trim();
  return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
}

function completionFor(statuses: readonly string[]): Completion {
  const succeeded = statuses.filter(
    (status) => status === ResponseAttemptStatus.SUCCEEDED,
  ).length;
  const active = statuses.some(
    (status) =>
      status === ResponseAttemptStatus.PENDING ||
      status === ResponseAttemptStatus.STREAMING,
  );

  if (statuses.length > 0 && succeeded === statuses.length) {
    return { label: "Completed", tone: "success" };
  }
  if (active) return { label: "In progress", tone: "live" };
  if (succeeded > 0) return { label: "Partial", tone: "warning" };
  return { label: "Failed", tone: "danger" };
}

function listItem(record: HistoryListRecord): HistoryListItem {
  const statuses = record.contestants.flatMap((contestant) =>
    contestant.responseAttempts.map((attempt) => attempt.status),
  );

  return {
    id: record.id,
    createdAt: record.createdAt,
    promptPreview: promptPreview(
      decryptContent(record.promptCiphertext, record.promptKeyVersion),
    ),
    responseCount: record.contestants.length,
    completion: completionFor(statuses),
    voteLabel: record.vote?.currentRevision ? "Voted" : "Not voted",
  };
}

function stateFor(status: string) {
  switch (status) {
    case ResponseAttemptStatus.SUCCEEDED:
      return { label: "Complete", tone: "success" } as const;
    case ResponseAttemptStatus.PENDING:
    case ResponseAttemptStatus.STREAMING:
      return { label: "In progress", tone: "live" } as const;
    case ResponseAttemptStatus.CANCELLED:
      return { label: "Cancelled", tone: "warning" } as const;
    default:
      return { label: "Failed", tone: "danger" } as const;
  }
}

function failureMessage(category: string | null, status: string) {
  if (status === ResponseAttemptStatus.SUCCEEDED) return null;
  if (
    status === ResponseAttemptStatus.PENDING ||
    status === ResponseAttemptStatus.STREAMING
  ) {
    return "This response has not reached a final state.";
  }

  switch (category) {
    case "RATE_LIMITED":
      return "This model was busy and could not finish the response.";
    case "TIMED_OUT":
      return "This response exceeded the available time.";
    case "CANCELLED":
      return "This response was cancelled.";
    case "INTERRUPTED":
      return "The connection ended before this response finished.";
    default:
      return "This model could not finish the response.";
  }
}

function firstTokenLatency(
  attempt: HistoryDetailRecord["contestants"][number]["responseAttempts"][number],
) {
  if (!attempt.firstTokenAt) return null;
  return Math.max(
    0,
    attempt.firstTokenAt.getTime() - attempt.startedAt.getTime(),
  );
}

function detail(record: HistoryDetailRecord): HistoryDetail {
  const selectedAttemptId =
    record.vote?.currentRevision.selectedAttemptId ?? null;
  const attempts = record.contestants.flatMap(
    (contestant) => contestant.responseAttempts,
  );

  return {
    id: record.id,
    createdAt: record.createdAt,
    prompt:
      decryptContent(record.promptCiphertext, record.promptKeyVersion) ??
      "This private prompt is no longer available.",
    completion: completionFor(attempts.map((attempt) => attempt.status)),
    responses: record.contestants.map((contestant) => {
      const attempt = contestant.responseAttempts[0];
      const revealed = record.revealedAt !== null;

      if (!attempt) {
        return {
          id: contestant.id,
          position: contestant.displayPosition,
          modelName: revealed ? contestant.modelVersion.model.name : null,
          versionLabel: revealed ? contestant.modelVersion.versionLabel : null,
          body: null,
          stateLabel: "Unavailable",
          stateTone: "danger",
          failureMessage: "No response attempt was retained for this model.",
          firstTokenLatencyMs: null,
          outputTokens: null,
          costUsdTenThousandths: 0,
          selected: false,
        };
      }

      const state = stateFor(attempt.status);
      return {
        id: attempt.id,
        position: contestant.displayPosition,
        modelName: revealed ? contestant.modelVersion.model.name : null,
        versionLabel: revealed ? contestant.modelVersion.versionLabel : null,
        body: decryptContent(
          attempt.responseCiphertext,
          attempt.responseKeyVersion,
        ),
        stateLabel: state.label,
        stateTone: state.tone,
        failureMessage: failureMessage(attempt.errorCategory, attempt.status),
        firstTokenLatencyMs: firstTokenLatency(attempt),
        outputTokens: attempt.outputTokens,
        costUsdTenThousandths: attempt.costUsdTenThousandths,
        selected: selectedAttemptId === attempt.id,
      };
    }),
  };
}

export async function loadHistoryPage(clerkSubject: string, page: number) {
  const result = await getHistoryRecords(clerkSubject, {
    skip: (page - 1) * HISTORY_PAGE_SIZE,
    take: HISTORY_PAGE_SIZE,
  });

  return {
    items: result.records.map(listItem),
    totalCount: result.totalCount,
    totalPages: Math.max(1, Math.ceil(result.totalCount / HISTORY_PAGE_SIZE)),
  } as const;
}

export async function loadHistoryDetail(
  clerkSubject: string,
  comparisonId: string,
) {
  const record = await getHistoryRecord(clerkSubject, comparisonId);
  return record ? detail(record) : null;
}
