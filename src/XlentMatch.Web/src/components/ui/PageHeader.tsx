import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "../../design-system/icons";
import { useI18n } from "../../i18n";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, meta, backTo, backLabel, actions }: PageHeaderProps) {
  const { t } = useI18n();
  const resolvedBackLabel = backLabel ?? t("common_back");
  return (
    <header className="flex flex-col gap-3 pb-4 border-b border-app-border sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backTo && (
          <Link to={backTo} className="inline-flex items-center gap-1.5 text-xs text-app-muted hover:text-app-secondary mb-3">
            <ArrowLeft size={13} />{resolvedBackLabel}
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
