import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "../design-system/icons";
import {
  formatCost,
  formatInteger,
  formatLatency,
  formatWinRate,
} from "@/features/leaderboard/leaderboard";
import {
  formatContextWindow,
  type CatalogModel,
} from "@/features/models/model-catalog";
import { loadModelCatalog } from "./model-catalog";

export const metadata: Metadata = { title: "Models" };
export const dynamic = "force-dynamic";

const availability = {
  available: {
    label: "Available",
    className: "border-[#d9efd9] bg-[#effbef] text-[#237823]",
  },
  degraded: {
    label: "Degraded",
    className: "border-[#eadcb5] bg-[#f6ebcf] text-[#795000]",
  },
  unavailable: {
    label: "Unavailable",
    className:
      "border-(--color-border) bg-(--color-surface-muted) text-(--color-muted)",
  },
} as const;

function CatalogStat({
  icon,
  label,
  value,
  detail,
}: Readonly<{
  icon: IconName;
  label: string;
  value: number;
  detail: string;
}>) {
  return (
    <div className="relative grid gap-y-2 rounded-[13px] border border-(--color-border) bg-white p-5 sm:px-6 sm:py-[22px]">
      <dt className="pr-14 text-[13px] font-medium text-(--color-muted)">
        {label}
        <span className="absolute top-5 right-5 grid size-10 place-items-center rounded-[10px] border border-[#d9efd9] bg-[#effbef] text-(--arena-green) sm:top-[22px] sm:right-6">
          <Icon className="size-5!" name={icon} />
        </span>
      </dt>
      <dd className="pr-14 text-[34px] leading-[1.15] font-semibold tracking-[-1.2px] tabular-nums">
        {formatInteger(value)}
      </dd>
      <dd className="text-[11px] leading-relaxed text-(--color-muted)">
        {detail}
      </dd>
    </div>
  );
}

function ModelCard({ model }: Readonly<{ model: CatalogModel }>) {
  const status = availability[model.availability];
  const metrics: readonly { icon: IconName; label: string; value: string }[] = [
    {
      icon: "leaderboard",
      label: "Win record",
      value: formatWinRate(model.winRate),
    },
    {
      icon: "timer",
      label: "Median latency",
      value: formatLatency(model.medianFirstTokenLatencyMs),
    },
    {
      icon: "tokens",
      label: "Context window",
      value: formatContextWindow(model.contextWindowTokens),
    },
    {
      icon: "spark",
      label: "Average cost",
      value: formatCost(model.averageCostUsdTenThousandths),
    },
  ];

  return (
    <article className="flex min-w-0 flex-col rounded-[13px] border border-(--color-border) bg-white transition-colors hover:border-[#b9d8b9]">
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#d9efd9] bg-[#effbef] text-(--arena-green)">
              <Icon className="size-[18px]!" name="models" />
            </span>
            <p className="m-0 text-xs font-medium text-(--color-muted) wrap-anywhere">
              {model.provider}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${status.className}`}
          >
            <span
              className="size-1.5 rounded-full bg-current"
              aria-hidden="true"
            />
            {status.label}
          </span>
        </header>

        <h3 className="mb-2 text-lg leading-snug font-semibold tracking-[-0.4px] wrap-anywhere">
          {model.name}
        </h3>
        <p className="mb-5 text-[13px] leading-relaxed text-(--color-body) wrap-anywhere">
          {model.description}
        </p>

        <dl
          className="mt-auto grid grid-cols-2 gap-x-4 gap-y-5 rounded-[10px] border border-[#e9efe9] bg-(--color-canvas) p-4"
          aria-label={`${model.name} summary measurements`}
        >
          {metrics.map((metric) => (
            <div className="min-w-0" key={metric.label}>
              <dt className="mb-1.5 flex items-center gap-1.5 text-[10px] text-(--color-muted)">
                <Icon className="size-3.5! shrink-0" name={metric.icon} />
                {metric.label}
              </dt>
              <dd
                className={`text-[13px] font-semibold tabular-nums ${metric.icon === "leaderboard" ? "text-(--arena-green)" : "text-(--color-ink)"}`}
              >
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4! mb-0 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-relaxed text-(--color-muted)">
          <span>{formatInteger(model.ratings)} rated appearances</span>
          <span>{formatInteger(model.successfulRuns)} measured calls</span>
        </p>
      </div>

      <Link
        className="group flex min-h-12 items-center justify-between gap-3 rounded-b-[12px] border-t border-(--color-border) px-5 py-3 text-xs font-semibold text-(--arena-green)! transition-colors hover:bg-[#effbef] focus-visible:bg-[#effbef] sm:px-6"
        href={`/models/${model.id}`}
        aria-label={`View ${model.name} details`}
      >
        View model details
        <Icon
          className="size-4! transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          name="chevronRight"
        />
      </Link>
    </article>
  );
}

export default async function ModelsPage() {
  const modelCatalog = await loadModelCatalog().catch(() => null);

  return (
    <div className="mx-auto max-w-[1320px] pt-2 pb-10 sm:pt-3">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0! text-[clamp(28px,2.5vw,38px)]! leading-[1.15]! font-semibold tracking-[-1.5px]!">
          Model <span className="text-(--arena-green)">catalog</span>
        </h1>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#2cbb2c] bg-(--color-accent) px-4 py-2.5 text-xs font-semibold text-(--color-on-accent)! transition-colors hover:bg-(--color-accent-strong)"
          href="/"
        >
          <Icon className="size-4!" name="arena" />
          Compare models
        </Link>
      </header>

      {!modelCatalog?.length ? (
        <section
          className="flex min-h-80 flex-col items-center justify-center rounded-[13px] border border-(--color-border) bg-white px-6 py-12 text-center"
          aria-labelledby="catalog-state-title"
        >
          <span className="mb-5 grid size-12 place-items-center rounded-xl border border-[#d9efd9] bg-[#effbef] text-(--arena-green)">
            <Icon
              className="size-6!"
              name={modelCatalog === null ? "status" : "models"}
            />
          </span>
          <h2 id="catalog-state-title" className="mb-2! text-lg! font-semibold">
            {modelCatalog === null
              ? "The model catalog is temporarily unavailable"
              : "No models are in the catalog yet"}
          </h2>
          <p className="mb-0 max-w-md text-[13px] leading-relaxed text-(--color-muted)">
            {modelCatalog === null
              ? "Current availability and comparison evidence could not be loaded. Please try again."
              : "Models will appear here once they are added to the catalog."}
          </p>
          {modelCatalog === null ? (
            <Link
              className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#d9efd9] bg-[#effbef] px-4 py-2 text-xs font-semibold text-(--arena-green)! hover:bg-[#e3f5e3]"
              href="/models"
            >
              Try again
            </Link>
          ) : null}
        </section>
      ) : (
        <>
          <dl
            className="mb-7 grid gap-3 sm:grid-cols-3 sm:gap-[18px]"
            aria-label="Catalog summary"
          >
            <CatalogStat
              icon="models"
              label="Total models"
              value={modelCatalog.length}
              detail="Free tier models in the arena"
            />
            <CatalogStat
              icon="check"
              label="Ready to compare"
              value={modelCatalog.filter((model) => model.isComparable).length}
              detail="Selectable for a new comparison"
            />
            <CatalogStat
              icon="spark"
              label="Providers"
              value={
                new Set(
                  modelCatalog
                    .filter((model) => model.versionLabel !== null)
                    .map((model) => model.provider),
                ).size
              }
              detail="Represented in the current catalog"
            />
          </dl>

          <section aria-labelledby="catalog-title">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="catalog-title"
                className="m-0! text-[17px]! font-semibold tracking-[-0.4px]!"
              >
                All models
              </h2>
              <span className="rounded-md border border-(--color-border) bg-white px-2.5 py-1 text-[11px] text-(--color-muted)">
                {formatInteger(modelCatalog.length)}{" "}
                {modelCatalog.length === 1 ? "model" : "models"}
              </span>
            </div>
            <div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-3">
              {modelCatalog.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
