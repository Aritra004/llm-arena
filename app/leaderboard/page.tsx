import type { Metadata } from "next";
import { buildLeaderboard } from "@/features/leaderboard/leaderboard";
import {
  LeaderboardUnavailable,
  LeaderboardView,
} from "@/features/leaderboard/leaderboard-view";
import { getLeaderboardEvidence } from "@/infrastructure/database/leaderboard";
import { MethodologyDialog } from "@/features/leaderboard/methodology-dialog";
import styles from "@/features/leaderboard/leaderboard.module.css";

export const metadata: Metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const evidence = await getLeaderboardEvidence().catch(() => null);
  const leaderboard = evidence ? buildLeaderboard(evidence) : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>
            Leader<span>board</span>
          </h1>
          <p>
            See how free models perform in blind, community-rated comparisons.
          </p>
        </div>
        <MethodologyDialog />
      </header>
      {leaderboard ? (
        <LeaderboardView leaderboard={leaderboard} />
      ) : (
        <LeaderboardUnavailable />
      )}
    </div>
  );
}
