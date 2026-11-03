import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { assignmentsApi } from "../services/assignmentsApi";
import type { AssignmentApi } from "../types";

export type AiRankingSection = "select" | "pending" | "results" | "saved";

export default function AiRankingHeader({ assignmentId, section }: { assignmentId: number; section: AiRankingSection }) {
  const { t } = useI18n();
  const [assignment, setAssignment] = useState<AssignmentApi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    assignmentsApi.getById(assignmentId)
      .then(data => { if (!cancelled) setAssignment(data); })
      .catch(() => { if (!cancelled) setAssignment(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [assignmentId]);

  const sectionLabel = {
    select: t("ai_section_select"),
    pending: t("ai_section_pending"),
    results: t("ai_section_results"),
    saved: t("ai_section_saved"),
  }[section];

  return (
    <header className="rounded-xl border border-app-border bg-app-surface px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to={`/matching/${assignmentId}`} className="text-xs text-app-muted hover:text-app-brand">← {t("ai_back")}</Link>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="text-lg font-semibold text-app-primary">{t("ai_ranking_label")}</h1>
            <span className="text-sm text-app-muted">· {sectionLabel}</span>
          </div>
        </div>
        <div className="min-w-[min(100%,22rem)] rounded-lg border border-app-border-subtle bg-app-raised px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">{t("ai_assignment_label")}</p>
          {loading ? <p className="mt-1 text-sm text-app-muted">{t("ai_assignment_loading")}</p> : assignment ? (
            <>
              <p className="mt-1 truncate text-sm font-semibold text-app-primary">{assignment.title}</p>
              <p className="mt-1 text-xs text-app-muted">{assignment.referenceNumber} · {assignment.customerName}</p>
            </>
          ) : <p className="mt-1 text-sm text-app-danger">{t("ai_assignment_not_found")}</p>}
        </div>
      </div>
    </header>
  );
}
