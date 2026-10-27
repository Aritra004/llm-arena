import "server-only";

import { prisma } from "@/lib/prisma";

export type ModelLeaderboardEvidence = Readonly<{
  availability: "available" | "degraded" | "unavailable";
  averageCostUsdTenThousandths: number | null;
  latencySampleCount: number;
  medianFirstTokenLatencyMs: number | null;
  modelId: string;
  modelName: string;
  ratings: number;
  successfulRuns: number;
  wins: number;
}>;

export type LeaderboardEvidence = Readonly<{
  models: readonly ModelLeaderboardEvidence[];
  totalVerifiedVotes: number;
}>;

type RawModelLeaderboardEvidence = Readonly<{
  availability: "AVAILABLE" | "DEGRADED" | "UNAVAILABLE";
  averageCostUsdTenThousandths: number | null;
  latencySampleCount: number;
  medianFirstTokenLatencyMs: number | null;
  modelId: string;
  modelName: string;
  ratings: number;
  successfulRuns: number;
  wins: number;
}>;

function toPublicAvailability(
  availability: RawModelLeaderboardEvidence["availability"],
): ModelLeaderboardEvidence["availability"] {
  switch (availability) {
    case "AVAILABLE":
      return "available";
    case "DEGRADED":
      return "degraded";
    case "UNAVAILABLE":
      return "unavailable";
  }
}

export async function getLeaderboardEvidence(): Promise<LeaderboardEvidence> {
  const [models, totalVerifiedVotes] = await Promise.all([
    prisma.$queryRaw<RawModelLeaderboardEvidence[]>`
      WITH "currentVotes" AS (
        SELECT
          vote."id" AS "voteId",
          vote."comparisonId",
          winner_version."modelId" AS "winningModelId"
        FROM "Vote" AS vote
        INNER JOIN "VoteRevision" AS current_revision
          ON current_revision."id" = vote."currentRevisionId"
          AND current_revision."voteId" = vote."id"
          AND current_revision."comparisonId" = vote."comparisonId"
        INNER JOIN "ResponseAttempt" AS selected_attempt
          ON selected_attempt."id" = current_revision."selectedAttemptId"
          AND selected_attempt."comparisonId" = vote."comparisonId"
          AND selected_attempt."status" = 'SUCCEEDED'
        INNER JOIN "Contestant" AS winner
          ON winner."id" = selected_attempt."contestantId"
          AND winner."comparisonId" = vote."comparisonId"
        INNER JOIN "ModelVersion" AS winner_version
          ON winner_version."id" = winner."modelVersionId"
      ),
      "ratedAppearances" AS (
        SELECT
          current_vote."voteId",
          current_vote."winningModelId",
          contestant."id" AS "contestantId",
          model_version."modelId"
        FROM "currentVotes" AS current_vote
        INNER JOIN "Contestant" AS contestant
          ON contestant."comparisonId" = current_vote."comparisonId"
        INNER JOIN "ModelVersion" AS model_version
          ON model_version."id" = contestant."modelVersionId"
        WHERE EXISTS (
          SELECT 1
          FROM "ResponseAttempt" AS completed_attempt
          WHERE completed_attempt."contestantId" = contestant."id"
            AND completed_attempt."comparisonId" = contestant."comparisonId"
            AND completed_attempt."status" = 'SUCCEEDED'
        )
      ),
      "voteMetrics" AS (
        SELECT
          appearance."modelId",
          COUNT(*)::int AS "ratings",
          COUNT(*) FILTER (
            WHERE appearance."winningModelId" = appearance."modelId"
          )::int AS "wins"
        FROM "ratedAppearances" AS appearance
        GROUP BY appearance."modelId"
      ),
      "latestSuccessfulAttempts" AS (
        SELECT DISTINCT ON (attempt."contestantId")
          attempt."contestantId",
          attempt."costUsdTenThousandths",
          CASE
            WHEN attempt."firstTokenAt" IS NULL THEN NULL
            ELSE EXTRACT(
              EPOCH FROM (attempt."firstTokenAt" - attempt."startedAt")
            ) * 1000
          END AS "firstTokenLatencyMs"
        FROM "ResponseAttempt" AS attempt
        WHERE attempt."status" = 'SUCCEEDED'
        ORDER BY attempt."contestantId", attempt."attemptNumber" DESC
      ),
      "callMetrics" AS (
        SELECT
          model_version."modelId",
          COUNT(*)::int AS "successfulRuns",
          COUNT(latest_attempt."firstTokenLatencyMs")::int AS "latencySampleCount",
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY latest_attempt."firstTokenLatencyMs"
          )::float8 AS "medianFirstTokenLatencyMs",
          AVG(latest_attempt."costUsdTenThousandths")::float8
            AS "averageCostUsdTenThousandths"
        FROM "latestSuccessfulAttempts" AS latest_attempt
        INNER JOIN "Contestant" AS contestant
          ON contestant."id" = latest_attempt."contestantId"
        INNER JOIN "ModelVersion" AS model_version
          ON model_version."id" = contestant."modelVersionId"
        GROUP BY model_version."modelId"
      )
      SELECT
        model."id" AS "modelId",
        model."name" AS "modelName",
        model."availability"::text AS "availability",
        COALESCE(vote_metrics."ratings", 0)::int AS "ratings",
        COALESCE(vote_metrics."wins", 0)::int AS "wins",
        COALESCE(call_metrics."successfulRuns", 0)::int AS "successfulRuns",
        COALESCE(call_metrics."latencySampleCount", 0)::int AS "latencySampleCount",
        call_metrics."medianFirstTokenLatencyMs" AS "medianFirstTokenLatencyMs",
        call_metrics."averageCostUsdTenThousandths"
          AS "averageCostUsdTenThousandths"
      FROM "Model" AS model
      LEFT JOIN "voteMetrics" AS vote_metrics
        ON vote_metrics."modelId" = model."id"
      LEFT JOIN "callMetrics" AS call_metrics
        ON call_metrics."modelId" = model."id"
      WHERE model."availability" <> 'UNAVAILABLE'
        OR COALESCE(vote_metrics."ratings", 0) > 0
        OR COALESCE(call_metrics."successfulRuns", 0) > 0
      ORDER BY model."name" ASC
    `,
    prisma.vote.count(),
  ]);

  return {
    totalVerifiedVotes,
    models: models.map((model) => ({
      ...model,
      availability: toPublicAvailability(model.availability),
    })),
  };
}
