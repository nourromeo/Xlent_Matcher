import { useEffect, useMemo, useState } from "react";
import { FileText, Briefcase, GitMerge, Users, Clock, CheckCircle, AlertCircle, ArrowUpRight } from "../design-system/icons";
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
    <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] text-app-muted uppercase tracking-wider font-medium">{label}</p>
        <div
          className="w-7 h-7 rounded flex items-center justify-center"
          style={accent
            ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)" }
            : { background: "var(--color-surface-raised)", color: "var(--color-text-muted)" }}
        >
          <Icon size={14} />
        </div>
      </div>
      <p className="text-xl font-semibold text-app-primary tracking-tight">{value}</p>
      <p className="text-[10px] text-app-faint mt-1">{sub}</p>
    </div>
  );
}

const uploadIcon = (status: CvUploadRecord["status"]) =>
  status === "Indexed"
    ? <CheckCircle size={10} style={{ color: "var(--color-success)" }} />
    : status === "Error"
      ? <AlertCircle size={10} style={{ color: "var(--color-danger)" }} />
      : <Clock size={10} style={{ color: "var(--color-brand)" }} />;

export default function Dashboard() {
  const { t, locale } = useI18n();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [uploads, setUploads] = useState<CvUploadRecord[]>([]);
  const [matches, setMatches] = useState<MatchResultApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dismissedMatchIds, setDismissedMatchIds] = useState<number[]>(() => {
    try {
      const stored = window.localStorage.getItem("dashboard.dismissedMatchIds");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

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

        const matchedAssignments = assignmentData.filter((item) => item.status !== "Draft");
        const resultSets = await Promise.allSettled(
          matchedAssignments.map((item) => matchingApi.getForAssignment(item.id)),
        );

        if (cancelled) return;

        const failedMatchLoads = resultSets.filter((result) => result.status === "rejected");
        if (failedMatchLoads.length > 0) {
          setError(t("dashboard_match_load_error"));
        }

        setMatches(
          resultSets
            .filter((result): result is PromiseFulfilledResult<MatchResultApi[]> => result.status === "fulfilled")
            .flatMap((result) => result.value)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
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

  const matchedAssignments = assignments.filter((item) => item.status !== "Draft").length;
  const processingUploads = uploads.filter((item) => item.status === "Extracting" || item.status === "Review").length;
  const recentUploads = uploads.slice(0, 5);
  const recentMatches = matches
    .filter((match) => !dismissedMatchIds.includes(match.id))
    .slice(0, 6);

  const clearRecentMatches = () => {
    const idsToDismiss = matches.map((match) => match.id);
    setDismissedMatchIds(idsToDismiss);
    window.localStorage.setItem("dashboard.dismissedMatchIds", JSON.stringify(idsToDismiss));
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t("dash_title")}
        description={t("dashboard_description")}
      />

      {error && (
        <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label={t("dashboard_consultants_label")} value={loading ? "—" : String(consultants.length)} sub={t("dashboard_consultants_sub")} icon={Users} accent />
        <StatCard label={t("dashboard_assignments_label")} value={loading ? "—" : String(assignments.length)} sub={t("dashboard_assignments_sub")} icon={Briefcase} />
        <StatCard label={t("dashboard_cv_uploads_label")} value={loading ? "—" : String(uploads.length)} sub={`${processingUploads} ${t("dashboard_cv_uploads_sub")}`} icon={FileText} />
        <StatCard label={t("dashboard_matched_label")} value={loading ? "—" : String(matchedAssignments)} sub={t("dashboard_matched_sub")} icon={GitMerge} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="xl:col-span-1 bg-app-surface border border-app rounded-lg overflow-hidden shadow-app-surface">
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <div>
              <p className="text-xs font-medium text-app-primary">{t("dashboard_recent_uploads")}</p>
              <p className="text-[10px] text-app-muted mt-0.5">{t("dashboard_upload_activity")}</p>
            </div>
            <Link to="/cv-upload" className="text-[10px] text-app-brand flex items-center gap-1">
              {t("dashboard_view_all")} <ArrowUpRight size={10} />
            </Link>
          </div>

          {recentUploads.length === 0 && !loading ? (
            <p className="px-4 py-6 text-xs text-app-faint text-center">{t("dashboard_no_uploads")}</p>
          ) : (
            recentUploads.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-app-subtle last:border-b-0">
                <FileText size={12} className="text-app-faint flex-none" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-app-primary truncate font-mono">{item.fileName}</p>
              <p className="text-[10px] text-app-faint">{formatDateTime(item.uploadedAt, locale)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-app-muted">
                  {uploadIcon(item.status)}
                  {item.status === "Review" ? t("dashboard_review") : item.status === "Indexed" ? t("dashboard_indexed") : item.status === "Extracting" ? t("status_extracting") : item.status === "Error" ? t("status_error") : item.status === "Queued" ? t("status_queued") : item.status}
                </span>
              </div>
            ))
          )}
        </section>

        <section className="xl:col-span-2 bg-app-surface border border-app rounded-lg overflow-hidden shadow-app-surface">
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <div>
            <p className="text-xs font-medium text-app-primary">{t("dashboard_recent_matches")}</p>
              <p className="text-[10px] text-app-muted mt-0.5">
                {t("dashboard_matches_sub")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {recentMatches.length > 0 && (
                <button
                  type="button"
                  onClick={clearRecentMatches}
                  className="text-[10px] text-app-muted hover:text-app-primary"
                  title={t("dashboard_clear_title")}
                >
                  {t("dashboard_clear")}
                </button>
              )}
              <Link to="/matching" className="text-[10px] text-app-brand flex items-center gap-1">
                {t("dashboard_open_matching")} <ArrowUpRight size={10} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_180px_90px] gap-3 px-4 py-2 border-b border-app text-[10px] uppercase tracking-wide text-app-faint">
            <span>{t("dashboard_consultant")}</span>
            <span>{t("dashboard_assignment")}</span>
            <span>{t("dashboard_score")}</span>
              <span className="text-right">{t("dashboard_result")}</span>
          </div>

          {recentMatches.length === 0 && !loading ? (
            <p className="px-4 py-8 text-xs text-app-faint text-center">
              {matches.length > 0 ? t("dashboard_recent_cleared") : t("dashboard_no_matches")}
            </p>
          ) : (
            <div>
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="grid grid-cols-[1fr_1fr_180px_90px] gap-3 items-center px-4 py-3 border-b border-app-subtle last:border-b-0"
                >
                  <p className="text-xs font-medium text-app-primary truncate">{match.consultantName}</p>

                  <p className="text-xs text-app-secondary truncate">
                    {assignmentById.get(match.assignmentId)?.title || `Assignment #${match.assignmentId}`}
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-app-raised overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: Math.max(0, Math.min(100, match.score)) + "%", backgroundColor: "var(--color-brand)" }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-mono font-semibold text-app-primary">
                      {match.score}%
                    </span>
                  </div>

                  <Link
                    to={"/matching?assignment=" + match.assignmentId}
                    className="text-[10px] text-app-brand text-right"
                  >
                    {t("dashboard_view_result")}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
