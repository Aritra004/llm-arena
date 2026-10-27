import type {
  LeaderboardEvidence,
  ModelLeaderboardEvidence,
} from "@/infrastructure/database/leaderboard";

export const MINIMUM_RATINGS = 25;

export type LeaderboardRow = Readonly<
  ModelLeaderboardEvidence & {
    isEligible: boolean;
    rank: number | null;
    ratingsNeeded: number;
    winRate: number | null;
  }
>;

export type Leaderboard = Readonly<{
  eligibleModelCount: number;
  rows: readonly LeaderboardRow[];
  totalMeasuredRuns: number;
  totalVerifiedVotes: number;
}>;

function compareEvidence(
  left: ModelLeaderboardEvidence,
  right: ModelLeaderboardEvidence,
) {
  const leftWinRate = left.ratings === 0 ? -1 : left.wins / left.ratings;
  const rightWinRate = right.ratings === 0 ? -1 : right.wins / right.ratings;

  return (
    rightWinRate - leftWinRate ||
    right.ratings - left.ratings ||
    right.wins - left.wins ||
    left.modelName.localeCompare(right.modelName)
  );
}

export function buildLeaderboard(
  evidence: LeaderboardEvidence,
  minimumRatings = MINIMUM_RATINGS,
): Leaderboard {
  if (!Number.isInteger(minimumRatings) || minimumRatings < 1) {
    throw new Error("The leaderboard minimum must be a positive integer.");
  }

  const sortedModels = [...evidence.models].sort(
    (left, right) =>
      Number(right.ratings >= minimumRatings) -
        Number(left.ratings >= minimumRatings) || compareEvidence(left, right),
  );
  let nextRank = 1;

  const rows = sortedModels.map((model): LeaderboardRow => {
    const isEligible = model.ratings >= minimumRatings;

    return {
      ...model,
      isEligible,
      rank: isEligible ? nextRank++ : null,
      ratingsNeeded: Math.max(0, minimumRatings - model.ratings),
      winRate: model.ratings === 0 ? null : model.wins / model.ratings,
    };
  });

  return {
    eligibleModelCount: nextRank - 1,
    rows,
    totalMeasuredRuns: evidence.models.reduce(
      (total, model) => total + model.successfulRuns,
      0,
    ),
    totalVerifiedVotes: evidence.totalVerifiedVotes,
  };
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatWinRate(value: number | null) {
  if (value === null) return "Not rated";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

export function formatLatency(value: number | null) {
  if (value === null) return "Not measured";

  if (value >= 1000) {
    return `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 1,
    }).format(value / 1000)} s`;
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)} ms`;
}

export function formatCost(value: number | null) {
  if (value === null) return "Not measured";

  return `$${(value / 10_000).toFixed(4)}`;
}
