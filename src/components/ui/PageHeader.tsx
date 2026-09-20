import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "../../design-system/icons";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, meta, backTo, backLabel = "Back", actions }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 pb-4 border-b border-app">
      <div className="min-w-0">
        {backTo && (
          <Link to={backTo} className="inline-flex items-center gap-1.5 text-xs text-app-muted hover:text-app-secondary mb-3">
            <ArrowLeft size={13} />{backLabel}
          </Link>
        )}
        {eyebrow && <p className="text-[10px] uppercase tracking-wider text-app-muted mb-1">{eyebrow}</p>}
        <h1 className="text-lg font-semibold text-app-primary">{title}</h1>
        {(description || meta) && <p className="text-xs text-app-muted mt-1">{description || meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
