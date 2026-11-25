import type { ReactNode } from "react";

type EntitySummaryProps = {
  title: string;
  subtitle?: ReactNode;
  metadata?: ReactNode;
  leading?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  variant?: "default" | "compact";
};

export function EntitySummary({ title, subtitle, metadata, leading, badges, actions, variant = "default" }: EntitySummaryProps) {
  return (
    <section className={`px-6 bg-app-surface flex flex-col flex-none sm:flex-row sm:items-center ${variant === "compact" ? "py-3 gap-2" : "py-4 gap-3"}`}>
      {leading && <div className="flex-none">{leading}</div>}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-sm font-semibold text-app-primary">{title}</h2>
          {badges}
        </div>
        {subtitle && <p className="text-xs text-app-secondary mt-1">{subtitle}</p>}
        {metadata && <p className="text-xs text-app-muted mt-1">{metadata}</p>}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </section>
  );
}
