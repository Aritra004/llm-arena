export type SafeErrorCategory =
  "cancelled" | "interrupted" | "rate_limited" | "timed_out" | "unavailable";

export type ComparisonEvent =
  | Readonly<{
      type: "comparison_started";
      comparisonId: string;
      contestants: readonly Readonly<{
        contestantId: string;
        attemptId: string;
        position: number;
      }>[];
    }>
  | Readonly<{
      type: "attempt_started";
      contestantId: string;
      attemptId: string;
    }>
  | Readonly<{
      type: "content_delta";
      contestantId: string;
      attemptId: string;
      delta: string;
    }>
  | Readonly<{
      type: "attempt_completed";
      contestantId: string;
      attemptId: string;
      firstTokenMs: number | null;
      totalMs: number;
      inputTokens: number | null;
      outputTokens: number | null;
    }>
  | Readonly<{
      type: "attempt_failed";
      contestantId: string;
      attemptId: string;
      category: SafeErrorCategory;
      message: string;
      retryable: boolean;
    }>
  | Readonly<{ type: "comparison_completed"; comparisonId: string }>;

export function encodeEvent(event: ComparisonEvent) {
  return `${JSON.stringify(event)}\n`;
}
