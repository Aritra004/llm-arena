import { Icon } from "../design-system/icons";

export type CardState = Readonly<{
  contestantId: string;
  attemptId: string;
  position: number;
  body: string;
  state: "pending" | "streaming" | "complete" | "failed";
  error: string | null;
  latency: number | null;
  tokens: number | null;
  modelName: string | null;
  versionLabel: string | null;
}>;

const letters = ["A", "B", "C"] as const;

export function ResponsePlaceholder({
  position,
  preparing = false,
}: Readonly<{ position: number; preparing?: boolean }>) {
  const letter = letters[position - 1];

  return (
    <article className="arena-response-card" aria-label={`Response ${letter}`}>
      <header className="arena-response-header">
        <span className="arena-response-letter">{letter}</span>
        <h3>Response {letter}</h3>
        <span className="arena-card-status">
          {preparing ? "Preparing" : "Standby"}
        </span>
      </header>
      <div
        className={`arena-response-empty${preparing ? " is-preparing" : ""}`}
      >
        <span
          className={preparing ? "arena-spinner" : "arena-empty-icon"}
          aria-hidden="true"
        >
          {!preparing && <Icon name="message" />}
        </span>
        <strong>
          {preparing ? "Preparing a response…" : "A fresh perspective awaits"}
        </strong>
        <p>
          {preparing
            ? "Connecting to your selected models."
            : "Send a prompt to see what this model thinks."}
        </p>
        {preparing && <LoadingLines />}
      </div>
      <footer className="arena-placeholder-footer">
        <Icon name="lock" /> Identity hidden until you vote
      </footer>
    </article>
  );
}

function LoadingLines() {
  return (
    <div className="arena-loading-lines" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function ResponseCard({
  card,
  canVote,
  isVoting,
  onVote,
}: Readonly<{
  card: CardState;
  canVote: boolean;
  isVoting: boolean;
  onVote: () => void;
}>) {
  const letter = letters[card.position - 1] ?? "A";
  const waiting =
    card.state === "pending" || (card.state === "streaming" && !card.body);
  const status = {
    pending: "Preparing",
    streaming: "Writing",
    complete: "Complete",
    failed: "Unavailable",
  }[card.state];

  return (
    <article
      className="arena-response-card"
      aria-labelledby={`response-${letter}-title`}
    >
      <header className="arena-response-header">
        <span className="arena-response-letter" aria-hidden="true">
          {letter}
        </span>
        <h3 id={`response-${letter}-title`} title={card.modelName ?? undefined}>
          {card.modelName ?? `Response ${letter}`}
        </h3>
        <span className="arena-card-status" data-state={card.state}>
          {card.state === "streaming" && (
            <span className="arena-live-dot" aria-hidden="true" />
          )}
          {status}
        </span>
      </header>
      <div
        className="arena-response-body"
        tabIndex={0}
        aria-label={`Response ${letter} content`}
        aria-busy={waiting}
      >
        {waiting ? (
          <div className="arena-response-waiting">
            <span className="arena-spinner" aria-hidden="true" />
            <p>Thinking it through…</p>
            <LoadingLines />
          </div>
        ) : (
          <>
            {card.body && <p className="arena-response-text">{card.body}</p>}
            {card.state === "failed" && (
              <div className="inline-error" role="alert">
                <strong>This response could not finish.</strong>
                <p>{card.error}</p>
              </div>
            )}
          </>
        )}
      </div>
      <footer className="arena-response-footer">
        <div
          className="arena-response-metrics"
          aria-label={`Response ${letter} measurements`}
        >
          <span title="Time to first token">
            <Icon name="timer" />
            {card.latency === null
              ? "—"
              : `${(card.latency / 1000).toFixed(2)}s`}
          </span>
          <span title="Output tokens">
            <Icon name="tokens" />
            {card.tokens === null ? "—" : card.tokens} tokens
          </span>
          <span>Free</span>
        </div>
        <button
          className="arena-vote-button"
          type="button"
          disabled={!canVote || isVoting || card.state !== "complete"}
          onClick={onVote}
        >
          <Icon name="check" />
          {isVoting ? "Recording vote…" : `Vote for ${letter}`}
        </button>
        {card.modelName && (
          <p className="arena-version-label">{card.versionLabel}</p>
        )}
      </footer>
    </article>
  );
}
