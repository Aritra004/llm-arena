import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: Readonly<{
  children: ReactNode;
  tone?: "danger" | "live" | "neutral" | "success" | "warning";
}>) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function Metric({
  icon,
  label,
  value,
}: Readonly<{ icon: IconName; label: string; value: string }>) {
  return (
    <div className="metric">
      <Icon name={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: Readonly<{
  icon: IconName;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}>) {
  return (
    <section className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <h2>{title}</h2>
      <div>{children}</div>
      {action}
    </section>
  );
}
