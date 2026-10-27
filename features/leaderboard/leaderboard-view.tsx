import Link from "next/link";
import { EmptyState, StatusBadge } from "@/app/design-system/components";
import { Icon } from "@/app/design-system/icons";
import type { Leaderboard, LeaderboardRow } from "./leaderboard";
import {
  MINIMUM_RATINGS,
  formatCost,
  formatInteger,
  formatLatency,
  formatWinRate,
} from "./leaderboard";
import styles from "./leaderboard.module.css";

const availability = {
  available: { label: "Available", tone: "success" },
  degraded: { label: "Degraded", tone: "warning" },
  unavailable: { label: "Unavailable", tone: "neutral" },
} as const;

function formatRank(rank: number | null) {
  return rank === null ? "—" : String(rank).padStart(2, "0");
}

function qualificationLabel(row: LeaderboardRow) {
  if (row.isEligible) return `Ranked ${formatRank(row.rank)}`;
  if (row.ratingsNeeded === MINIMUM_RATINGS) return "Awaiting first rating";
  return `${formatInteger(row.ratingsNeeded)} more to rank`;
}

function LeaderboardTable({ rows }: Readonly<{ rows: Leaderboard["rows"] }>) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className="sr-only">
          All-time model rankings based on completed blind ratings
        </caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Model</th>
            <th scope="col">Win record</th>
            <th scope="col">Ratings</th>
            <th scope="col">Median latency</th>
            <th scope="col">Average cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const modelAvailability = availability[row.availability];

            return (
              <tr key={row.modelId} data-eligible={row.isEligible}>
                <td data-label="Rank" className={styles.rankCell}>
                  <span className={styles.rank} data-leading={row.rank === 1}>
                    {formatRank(row.rank)}
                  </span>
                </td>
                <th scope="row" data-label="Model">
                  <div className={styles.model}>
                    <span className={styles.modelName}>{row.modelName}</span>
                    <span className={styles.modelDetails}>
                      <StatusBadge tone={modelAvailability.tone}>
                        {modelAvailability.label}
                      </StatusBadge>
                      <span>{qualificationLabel(row)}</span>
                    </span>
                  </div>
                </th>
                <td data-label="Win record">
                  <div className={styles.cellValue}>
                    <strong className={styles.winRate}>
                      {formatWinRate(row.winRate)}
                    </strong>
                    <small>
                      {formatInteger(row.wins)}{" "}
                      {row.wins === 1 ? "win" : "wins"}
                    </small>
                  </div>
                </td>
                <td data-label="Ratings">
                  <div className={styles.cellValue}>
                    <span>{formatInteger(row.ratings)}</span>
                    {!row.isEligible ? (
                      <progress
                        aria-label={`${row.modelName} ranking qualification progress`}
                        max={MINIMUM_RATINGS}
                        value={row.ratings}
                      />
                    ) : null}
                  </div>
                </td>
                <td data-label="Median latency">
                  <div className={styles.cellValue}>
                    <span>{formatLatency(row.medianFirstTokenLatencyMs)}</span>
                    <small>
                      {formatInteger(row.latencySampleCount)} latency samples
                    </small>
                  </div>
                </td>
                <td data-label="Average cost">
                  {formatCost(row.averageCostUsdTenThousandths)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LeaderboardView({
  leaderboard,
}: Readonly<{ leaderboard: Leaderboard }>) {
  if (leaderboard.rows.length === 0) {
    return (
      <EmptyState icon="leaderboard" title="No models are in the arena yet">
        <p>
          Add a supported model to the catalog before collecting comparisons and
          rankings.
        </p>
        <Link className="button button-primary" href="/models">
          Browse the model catalog
        </Link>
      </EmptyState>
    );
  }

  const eligibleSummary =
    leaderboard.eligibleModelCount === 0
      ? "No model has reached the ranking threshold yet. Every completed blind rating moves the board closer to its first qualified result."
      : `${formatInteger(leaderboard.eligibleModelCount)} ${leaderboard.eligibleModelCount === 1 ? "model has" : "models have"} enough evidence to rank. Models still collecting ratings remain visible below the ranked entries.`;

  return (
    <>
      <section className={styles.summary} aria-label="Leaderboard summary">
        <div className={styles.stat}>
          <span className={styles.statIcon}>
            <Icon name="leaderboard" />
          </span>
          <span className={styles.statLabel}>Ranked models</span>
          <strong>{formatInteger(leaderboard.eligibleModelCount)}</strong>
          <small>
            Of {formatInteger(leaderboard.rows.length)} models in the arena
          </small>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>
            <Icon name="spark" />
          </span>
          <span className={styles.statLabel}>Blind votes</span>
          <strong>{formatInteger(leaderboard.totalVerifiedVotes)}</strong>
          <small>Community choices, made without model names</small>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>
            <Icon name="timer" />
          </span>
          <span className={styles.statLabel}>Measured calls</span>
          <strong>{formatInteger(leaderboard.totalMeasuredRuns)}</strong>
          <small>Successful responses with real measurements</small>
        </div>
      </section>

      <aside className={styles.notice}>
        <Icon name="status" />
        <div>
          <strong>{MINIMUM_RATINGS} ratings to qualify</strong>
          <p>{eligibleSummary}</p>
        </div>
        <Link className={styles.compareLink} href="/">
          Cast your vote <Icon name="chevronRight" />
        </Link>
      </aside>

      <section className={styles.panel} aria-labelledby="ranking-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="ranking-title">Model rankings</h2>
            <p>Community preference, backed by real performance.</p>
          </div>
          <span className={styles.modelCount}>
            {formatInteger(leaderboard.rows.length)}{" "}
            {leaderboard.rows.length === 1 ? "model" : "models"}
          </span>
        </div>
        <LeaderboardTable rows={leaderboard.rows} />
      </section>
    </>
  );
}

export function LeaderboardUnavailable() {
  return (
    <EmptyState
      icon="status"
      title="The leaderboard is temporarily unavailable"
    >
      <p>
        Ranking evidence could not be loaded. Your comparisons and votes are
        unaffected.
      </p>
      <Link className="button button-primary" href="/leaderboard">
        Try again
      </Link>
    </EmptyState>
  );
}
