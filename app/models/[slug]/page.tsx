import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatCost,
  formatInteger,
  formatLatency,
  formatWinRate,
} from "@/features/leaderboard/leaderboard";
import { formatContextWindow } from "@/features/models/model-catalog";
import {
  EmptyState,
  Metric,
  PageHeader,
  StatusBadge,
} from "../../design-system/components";
import { loadModelCatalog } from "../model-catalog";

export const dynamic = "force-dynamic";

const availability = {
  available: { label: "Available now", tone: "success" },
  degraded: { label: "Degraded", tone: "warning" },
  unavailable: { label: "Unavailable", tone: "neutral" },
} as const;

type ModelDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ModelDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const modelCatalog = await loadModelCatalog().catch(() => null);
  const model = modelCatalog?.find((candidate) => candidate.id === slug);

  return model
    ? { description: model.description, title: model.name }
    : { title: "Model detail" };
}

export default async function ModelDetailPage({
  params,
}: ModelDetailPageProps) {
  const { slug } = await params;
  const modelCatalog = await loadModelCatalog().catch(() => null);

  if (modelCatalog === null) {
    return (
      <div className="page page-reading">
        <Link className="back-link" href="/models">
          ← All models
        </Link>
        <EmptyState
          icon="status"
          title="Model details are temporarily unavailable"
          action={
            <Link className="button button-primary" href={`/models/${slug}`}>
              Try again
            </Link>
          }
        >
          <p>
            Current availability and comparison evidence could not be loaded.
          </p>
        </EmptyState>
      </div>
    );
  }

  const model = modelCatalog.find((candidate) => candidate.id === slug);

  if (!model) {
    notFound();
  }

  const modelAvailability = availability[model.availability];

  return (
    <div className="page page-reading">
      <Link className="back-link" href="/models">
        ← All models
      </Link>
      <PageHeader
        eyebrow={`${model.provider}${model.versionLabel ? ` · ${model.versionLabel}` : ""}`}
        title={model.name}
        description={model.description}
        action={
          <StatusBadge tone={modelAvailability.tone}>
            {modelAvailability.label}
          </StatusBadge>
        }
      />
      <section className="stat-grid" aria-label="Model performance summary">
        <Metric
          icon="leaderboard"
          label="Blind win record"
          value={formatWinRate(model.winRate)}
        />
        <Metric
          icon="status"
          label="Rated appearances"
          value={formatInteger(model.ratings)}
        />
        <Metric
          icon="timer"
          label="Median latency"
          value={formatLatency(model.medianFirstTokenLatencyMs)}
        />
        <Metric
          icon="tokens"
          label="Context window"
          value={formatContextWindow(model.contextWindowTokens)}
        />
        <Metric
          icon="spark"
          label="Average cost"
          value={formatCost(model.averageCostUsdTenThousandths)}
        />
      </section>
      <div className="detail-grid">
        <section className="data-panel">
          <p className="eyebrow">Capability profile</p>
          <h2>Where it performs well</h2>
          {model.capabilities.length === 0 ? (
            <p>No capability profile is published for the active version.</p>
          ) : (
            <ul className="feature-list">
              {model.capabilities.map(({ detail, label }) => (
                <li key={label}>
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="data-panel">
          <p className="eyebrow">Evidence quality</p>
          <h2>Read the rank carefully</h2>
          <p>
            This summary contains {formatInteger(model.ratings)} rated{" "}
            {model.ratings === 1 ? "appearance" : "appearances"} and{" "}
            {formatInteger(model.latencySampleCount)} latency{" "}
            {model.latencySampleCount === 1 ? "sample" : "samples"} from{" "}
            {formatInteger(model.successfulRuns)} successful{" "}
            {model.successfulRuns === 1 ? "call" : "calls"}. Performance can
            vary by prompt type, provider load, and model version.
          </p>
          {model.isComparable ? (
            <Link
              className="button button-primary"
              href={`/?models=${encodeURIComponent(model.id)}#prompt-title`}
            >
              Compare this model
            </Link>
          ) : (
            <button className="button button-primary" type="button" disabled>
              Currently unavailable
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
