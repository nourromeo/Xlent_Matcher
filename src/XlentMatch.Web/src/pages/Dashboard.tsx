import { useEffect, useMemo, useState } from "react";
import { FileText, Briefcase, Users, ArrowUpRight, ChevronRight } from "../design-system/icons";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { consultantsApi } from "../services/consultantsApi";
import { assignmentsApi } from "../services/assignmentsApi";
import { cvUploadsApi, type CvUploadRecord } from "../services/cvUploadsApi";
import { matchingApi } from "../services/matchingApi";
import type { AssignmentApi, Consultant, MatchResultApi } from "../types";
import { useI18n } from "../i18n";
import { formatDateTime } from "../services/localeFormat";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-lg p-4 shadow-app-surface">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] text-app-muted uppercase tracking-wider font-medium">
          {label}
        </p>
        <div
          className="w-7 h-7 rounded flex items-center justify-center"
          style={
            accent
              ? {
                  background: "var(--color-brand-subtle)",
                  color: "var(--color-brand)",
                }
              : {
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text-muted)",
                }
          }
        >
          <Icon size={14} />
        </div>
      </div>
      <p className="text-xl font-semibold text-app-primary tracking-tight">
        {value}
      </p>
      <p className="text-[10px] text-app-faint mt-1">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const { t, locale } = useI18n();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [uploads, setUploads] = useState<CvUploadRecord[]>([]);
  const [matches, setMatches] = useState<MatchResultApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [consultantData, assignmentData, uploadData] = await Promise.all([
          consultantsApi.getAll(),
          assignmentsApi.getAll(),
          cvUploadsApi.getAll(),
        ]);

        if (cancelled) return;

        setConsultants(consultantData);
        setAssignments(assignmentData);
        setUploads(uploadData);

        const resultSets = await Promise.allSettled(
          assignmentData.map((item) => matchingApi.getForAssignment(item.id)),
        );

        if (cancelled) return;

        const failedMatchLoads = resultSets.filter(
          (result) => result.status === "rejected",
        );
        if (failedMatchLoads.length > 0) {
          setError(t("dashboard_match_load_error"));
        }

        setMatches(
          resultSets
            .filter(
              (result): result is PromiseFulfilledResult<MatchResultApi[]> =>
                result.status === "fulfilled",
            )
            .flatMap((result) => result.value)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            ),
        );
      } catch (requestError) {
        if (!cancelled) {
          setError(t("dashboard_load_error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const assignmentById = useMemo(
    () => new Map(assignments.map((item) => [item.id, item])),
    [assignments],
  );

  const bestMatchByAssignment = useMemo(() => {
    const best = new Map<number, MatchResultApi>();
    for (const match of matches) {
      const current = best.get(match.assignmentId);
      if (
        !current ||
        match.rank < current.rank ||
        (match.rank === current.rank && match.score > current.score)
      ) {
        best.set(match.assignmentId, match);
      }
    }
    return best;
  }, [matches]);
  const latestMatchedAssignments = useMemo(() => {
    return [...bestMatchByAssignment.entries()]
      .map(([assignmentId, match]) => ({
        assignment: assignmentById.get(assignmentId),
        match,
        lastMatchedAt: matches
          .filter((item) => item.assignmentId === assignmentId)
          .reduce((latest, item) => Math.max(latest, new Date(item.createdAt).getTime()), 0),
      }))
      .filter((item): item is typeof item & { assignment: AssignmentApi } => item.assignment !== undefined)
      .sort((a, b) => b.lastMatchedAt - a.lastMatchedAt)
      .slice(0, 5);
  }, [assignmentById, bestMatchByAssignment, matches]);
  const activeCvs = uploads.filter((item) => item.status === "Indexed" && item.isActive && item.consultantId != null);
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t("dash_title")}
        description={t("dashboard_description")}
      />

      {error && (
        <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-secondary">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label={t("dashboard_consultants_label")}
          value={loading ? "—" : String(consultants.length)}
          sub={t("dashboard_consultants_sub")}
          icon={Users}
          accent
        />
        <StatCard
          label={t("dashboard_assignments_label")}
          value={loading ? "—" : String(assignments.length)}
          sub={t("dashboard_assignments_sub")}
          icon={Briefcase}
        />
        <StatCard
          label={t("dashboard_active_cvs")}
          value={loading ? "—" : String(activeCvs.length)}
          sub={t("dashboard_approved_cvs")}
          icon={FileText}
        />

      </div>

      <div className="space-y-4">
        <section className="bg-app-surface border border-app-border rounded-lg overflow-hidden shadow-app-surface">
          <div className="flex items-center justify-between px-4 py-3 border-b border-app-border">
            <div>
              <p className="text-xs font-medium text-app-primary">{t("dashboard_recent_matches")}</p>
              <p className="text-[10px] text-app-muted mt-0.5">
                {t("dashboard_latest_five")}
              </p>
            </div>
            {assignments.length > 5 && (
              <Link
                to="/client-assignments"
                className="shrink-0 text-[10px] text-app-brand hover:text-app-primary"
              >
                {t("dashboard_view_all")}
              </Link>
            )}
          </div>

          <div className="hidden md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_80px_110px_24px] gap-3 px-4 py-2 border-b border-app-border text-[10px] uppercase tracking-wide text-app-faint">
            <span>{t("dashboard_assignment")}</span>
            <span>{t("dashboard_best_consultant")}</span>
            <span>{t("dashboard_score")}</span>
            <span>{t("dashboard_latest")}</span>
            <span />
          </div>

          {latestMatchedAssignments.length === 0 && !loading ? (
            <p className="px-4 py-8 text-xs text-app-faint text-center">
              {t("dashboard_no_matches")}
            </p>
          ) : (
            <div>
              {latestMatchedAssignments.map(({ assignment, match, lastMatchedAt }) => (
                <Link
                  key={assignment.id}
                  to={`/matching?assignment=${assignment.id}`}
                  className="block hover:bg-app-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand"
                >
                  <div className="grid grid-cols-1 gap-2 px-4 py-3 border-b border-app-border-subtle last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_80px_110px_24px] md:items-center md:gap-3">
                    <p className="text-xs font-medium text-app-primary truncate">{assignment.title}</p>
                    <p className="text-xs text-app-secondary truncate">{match.consultantName}</p>
                    <span className="text-xs font-mono text-app-primary">{match.score}%</span>
                    <span className="text-[10px] text-app-muted">{formatDateTime(new Date(lastMatchedAt).toISOString(), locale)}</span>
                    <ChevronRight size={14} className="text-app-muted md:justify-self-end" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-app-border bg-app-surface px-4 py-3 shadow-app-surface">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-app-muted" />
            <div>
              <p className="text-xs font-medium text-app-primary">{t("dashboard_cv_library")}</p>
              <p className="text-[10px] text-app-muted">
                {loading ? "—" : activeCvs.length} {t("dashboard_active_cvs").toLowerCase()} · {loading ? "—" : uploads.filter((item) => item.status === "Review").length} {t("dashboard_pending_review").toLowerCase()}
              </p>
            </div>
          </div>
          <Link to="/cv-upload" className="inline-flex items-center gap-1 text-xs text-app-brand hover:text-app-primary">
            {t("dashboard_view_library")} <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
