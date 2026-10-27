import Link from "next/link";
import { Icon } from "@/app/design-system/icons";
import { HistoryDeleteDialog } from "@/app/history/history-delete-dialog";
import type { HistoryDetail, HistoryListItem } from "./history";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function responseWord(count: number) {
  return `${count} ${count === 1 ? "response" : "responses"}`;
}

function responseLetter(position: number) {
  return String.fromCharCode(64 + position);
}

function formatLatency(value: number | null) {
  if (value === null) return "Unavailable";
  if (value < 1_000) return `${Math.round(value)} ms`;
  return `${(value / 1_000).toFixed(1)} s`;
}

function formatTokens(value: number | null) {
  return value === null ? "Unavailable" : value.toLocaleString("en");
}

function formatCost(value: number) {
  return `$${(value / 10_000).toFixed(4)}`;
}

const completionClasses = {
  success: "border-[#d9efd9] bg-[#effbef] text-[#237823]",
  live: "border-[#d9e9d9] bg-[#eff7ef] text-[#237823]",
  warning: "border-[#eadcb5] bg-[#f6ebcf] text-[#795000]",
  danger: "border-[#f0d1cc] bg-[#fff0ee] text-[#a52319]",
} satisfies Record<HistoryListItem["completion"]["tone"], string>;

export function HistoryList({
  items,
}: Readonly<{ items: readonly HistoryListItem[] }>) {
  return (
    <section aria-label="Comparison history">
      <ol className="m-0 grid list-none gap-4 p-0">
        {items.map((item) => (
          <li className="min-w-0" key={item.id}>
            <article className="overflow-hidden rounded-[13px] border border-(--color-border) bg-white transition-colors hover:border-[#b9d8b9]">
              <div className="flex items-start gap-4 p-5 sm:p-6">
                <span className="hidden size-10 shrink-0 place-items-center rounded-[10px] border border-[#d9efd9] bg-[#effbef] text-(--arena-green) sm:grid">
                  <Icon className="size-5!" name="message" />
                </span>
                <div className="min-w-0 flex-1">
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <time
                      className="text-xs text-(--color-muted)"
                      dateTime={item.createdAt.toISOString()}
                    >
                      {dateFormatter.format(item.createdAt)}
                    </time>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${completionClasses[item.completion.tone]}`}
                      >
                        <span
                          className="size-1.5 rounded-full bg-current"
                          aria-hidden="true"
                        />
                        {item.completion.label}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-canvas) px-2 py-1 text-[10px] font-medium text-(--color-muted)">
                        {item.voteLabel === "Voted" ? (
                          <Icon className="size-3!" name="check" />
                        ) : null}
                        {item.voteLabel}
                      </span>
                    </div>
                  </header>
                  <p className="mt-3! mb-0 line-clamp-2 text-sm leading-relaxed font-medium text-(--color-ink) wrap-anywhere">
                    {item.promptPreview}
                  </p>
                </div>
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-(--color-border) bg-(--color-canvas) px-5 py-2.5 sm:px-6">
                <p className="m-0 flex items-center gap-2 text-[11px] text-(--color-muted)">
                  <Icon className="size-3.5!" name="models" />
                  {responseWord(item.responseCount)} compared
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="group inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-(--arena-green)! transition-colors hover:bg-[#effbef] focus-visible:bg-[#effbef]"
                    href={`/history/${item.id}`}
                    aria-label={`Open comparison: ${item.promptPreview}`}
                  >
                    Open comparison
                    <Icon
                      className="size-4! transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      name="chevronRight"
                    />
                  </Link>
                  <HistoryDeleteDialog
                    comparisonId={item.id}
                    promptPreview={item.promptPreview}
                  />
                </div>
              </footer>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HistoryDetailView({
  comparison,
}: Readonly<{ comparison: HistoryDetail }>) {
  const responseColumns =
    comparison.responses.length > 2
      ? "md:grid-cols-2 xl:grid-cols-3"
      : comparison.responses.length === 2
        ? "md:grid-cols-2"
        : "";

  return (
    <>
      <section
        className="mb-6 rounded-[13px] border border-(--color-border) bg-white p-5 sm:p-6"
        aria-labelledby="saved-prompt-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#d9efd9] bg-[#effbef] text-(--arena-green)">
              <Icon className="size-[18px]!" name="message" />
            </span>
            <h2
              id="saved-prompt-title"
              className="m-0! text-[17px]! font-semibold tracking-[-0.4px]!"
            >
              Saved prompt
            </h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${completionClasses[comparison.completion.tone]}`}
          >
            <span
              className="size-1.5 rounded-full bg-current"
              aria-hidden="true"
            />
            {comparison.completion.label}
          </span>
        </div>
        <p className="mt-5! mb-0 border-t border-(--color-border) pt-5 text-sm leading-7 whitespace-pre-wrap text-(--color-body) wrap-anywhere">
          {comparison.prompt}
        </p>
      </section>

      <section
        className={`grid gap-[18px] ${responseColumns}`}
        aria-label="Saved responses"
      >
        {comparison.responses.map((response) => {
          const letter = responseLetter(response.position);
          const identity = response.modelName
            ? `${response.modelName}${response.versionLabel ? ` · ${response.versionLabel}` : ""}`
            : "Identity hidden";

          return (
            <article
              className={`flex min-w-0 flex-col overflow-hidden rounded-[13px] border bg-white ${response.selected ? "border-[#b9d8b9] ring-1 ring-[#d9efd9]" : "border-(--color-border)"}`}
              data-selected={response.selected || undefined}
              key={response.id}
            >
              <header className="border-b border-(--color-border) p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#d9efd9] bg-[#effbef] text-sm font-semibold text-(--arena-green)"
                    aria-hidden="true"
                  >
                    {letter}
                  </span>
                  <div className="min-w-0">
                    <h2 className="m-0! text-[15px]! font-semibold tracking-[-0.3px]!">
                      Response {letter}
                    </h2>
                    <p className="mt-1! mb-0 text-[11px] leading-relaxed text-(--color-muted) wrap-anywhere">
                      {identity}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${completionClasses[response.stateTone]}`}
                  >
                    <span
                      className="size-1.5 rounded-full bg-current"
                      aria-hidden="true"
                    />
                    {response.stateLabel}
                  </span>
                  {response.selected ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-[#d9efd9] bg-[#effbef] px-2 py-1 text-[10px] font-medium text-(--arena-green)">
                      <Icon className="size-3!" name="check" />
                      Your vote
                    </span>
                  ) : null}
                </div>
              </header>
              <div className="min-h-60 flex-1 p-5 sm:p-6">
                {response.body ? (
                  <p className="m-0 text-[13px] leading-7 whitespace-pre-wrap text-(--color-body) wrap-anywhere">
                    {response.body}
                  </p>
                ) : (
                  <div className="rounded-[10px] border border-[#f0d1cc] bg-[#fff0ee] p-4 text-[#a52319]">
                    <strong className="text-xs font-semibold">
                      Response unavailable
                    </strong>
                    <p className="mt-2! mb-0 text-xs leading-relaxed wrap-anywhere">
                      {response.failureMessage ??
                        "The retained response content could not be opened."}
                    </p>
                  </div>
                )}
              </div>
              <footer className="border-t border-(--color-border) bg-(--color-canvas) p-5 sm:px-6">
                <dl
                  className="grid grid-cols-3 gap-3"
                  aria-label={`Response ${letter} measurements`}
                >
                  <div className="min-w-0">
                    <dt className="mb-1.5 flex items-center gap-1.5 text-[10px] text-(--color-muted)">
                      <Icon className="size-3.5! shrink-0" name="timer" />
                      First token
                    </dt>
                    <dd className="text-xs font-semibold tabular-nums text-(--color-ink) wrap-anywhere">
                      {formatLatency(response.firstTokenLatencyMs)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="mb-1.5 flex items-center gap-1.5 text-[10px] text-(--color-muted)">
                      <Icon className="size-3.5! shrink-0" name="tokens" />
                      Output tokens
                    </dt>
                    <dd className="text-xs font-semibold tabular-nums text-(--color-ink) wrap-anywhere">
                      {formatTokens(response.outputTokens)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="mb-1.5 flex items-center gap-1.5 text-[10px] text-(--color-muted)">
                      <Icon className="size-3.5! shrink-0" name="spark" />
                      Cost
                    </dt>
                    <dd className="text-xs font-semibold tabular-nums text-(--color-ink) wrap-anywhere">
                      {formatCost(response.costUsdTenThousandths)}
                    </dd>
                  </div>
                </dl>
              </footer>
            </article>
          );
        })}
      </section>
    </>
  );
}
