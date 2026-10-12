import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Eye,
  Info,
  Loader,
  Zap,
} from "../design-system/icons";
import { useI18n } from "../i18n";
import { PageHeader } from "../components/ui/PageHeader";
import { LinkButton } from "../components/ui/LinkButton";
import { assignmentsApi } from "../services/assignmentsApi";
import { consultantsApi } from "../services/consultantsApi";
import { matchingApi, type AiRankingResult } from "../services/matchingApi";
import type { AssignmentApi, Consultant, MatchResultApi } from "../types";
import { matchCategory } from "../services/matchCategory";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

type MatchCategory = "All" | "Strong" | "Partial" | "Low";

function RequirementColumn({
  title,
  items,
  matched = false,
  categoryByName,
}: {
  title: string;
  items: MatchResultApi["details"];
  matched?: boolean;
  categoryByName: Map<string, string>;
}) {
  const { t } = useI18n();
  const categoryLabel = (category: string) =>
    category === "Skill"
      ? t("client_skill")
      : category === "HumanLanguage"
        ? t("assignment_human_languages")
        : category === "Seniority"
          ? t("assignment_seniority")
          : t("assignment_review_other_requirements");
  const grouped = items.reduce<Record<string, MatchResultApi["details"]>>(
    (groups, detail) => {
      const category =
        categoryByName.get(detail.requirementName.trim().toLowerCase()) ??
        "Other";
      (groups[category] ??= []).push(detail);
      return groups;
    },
    {},
  );
  return (
    <div className="bg-app-surface border border-app-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-app-primary">{title}</p>
        <span className="text-[10px] text-app-muted">
          {items.length}{" "}
          {matched ? t("matching_matched") : t("matching_missing_prefix")}
        </span>
      </div>
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category} className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-app-muted">
              {categoryLabel(category)}
            </p>
            {categoryItems.map((detail) => (
              <div
                key={detail.id || detail.requirementName}
                className="flex items-center justify-between gap-3 border-b border-app-border-subtle py-2 last:border-0"
              >
                <span
                  className={
                    matched ? "text-app-primary" : "text-app-secondary"
                  }
                >
                  {matched ? "✓" : "✕"} {detail.requirementName}
                </span>
                <span className="shrink-0 text-[10px] text-app-faint">
                  {detail.type === "Mandatory"
                    ? t("common_required")
                    : t("assignment_preferred")}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Matching() {
  const { t } = useI18n();
  const localizeEvidence = (value: string | null | undefined) =>
    value ===
    "No matching canonical skill, certification or project found in profile."
      ? t("matching_no_canonical_evidence")
      : value;
  const displayMatchCategory = (score: number) => {
    const category = matchCategory(score);
    return category === "Strong"
      ? t("matching_strong")
      : category === "Partial"
        ? t("matching_partial")
        : t("matching_low");
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [results, setResults] = useState<MatchResultApi[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Requirements" | "Experience"
  >("Overview");
  const [listFilter, setListFilter] = useState<MatchCategory>("All");
  const [query, setQuery] = useState("");
  const [rankingTab, setRankingTab] = useState<"match" | "ai">("match");
  const [aiRanking, setAiRanking] = useState<AiRankingResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const assignmentId = Number(searchParams.get("assignment"));
  const assignment = assignments.find((item) => item.id === assignmentId);
  const fromAssignment = Boolean(
    (location.state as { fromAssignment?: boolean } | null)?.fromAssignment,
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([assignmentsApi.getAll(), consultantsApi.getAll()])
      .then(([assignmentData, consultantData]) => {
        if (cancelled) return;
        setAssignments(assignmentData);
        setConsultants(consultantData);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(t("matching_load_data_error"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      setResults([]);
      setSelectedMatchId(null);
      return;
    }

    let cancelled = false;

    matchingApi
      .getForAssignment(assignmentId)
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setSelectedMatchId(data[0]?.id ?? null);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setResults([]);
          setSelectedMatchId(null);
          setError(t("matching_load_results_error"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  useEffect(() => {
    setAiRanking(null);
    setAiError("");
    setRankingTab("match");
  }, [assignmentId]);

  const newConsultants = useMemo(() => {
    if (results.length === 0 || loading) return 0;
    const matchedIds = new Set(results.map((result) => result.consultantId));
    return consultants.filter((consultant) => !matchedIds.has(consultant.id)).length;
  }, [consultants, results, loading]);

  const runAiRanking = async () => {
    if (!assignment || aiLoading || results.length === 0 || newConsultants > 0) return;
    setAiLoading(true);
    setAiError("");
    try {
      const ranking = await matchingApi.rankWithAi(assignment.id);
      setAiRanking(ranking);
      setRankingTab("ai");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI Ranking failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const allResults = useMemo(
    () => [...results].sort((a, b) => a.rank - b.rank || b.score - a.score),
    [results],
  );

  const visibleResults = useMemo(
    () =>
      allResults.filter((result) => {
        const matchesFilter =
          listFilter === "All" || matchCategory(result.score) === listFilter;
        return (
          matchesFilter &&
          result.consultantName
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        );
      }),
    [allResults, listFilter, query],
  );

  const selected =
    allResults.find((result) => result.id === selectedMatchId) ?? allResults[0];
  useEffect(() => {
    setSelectedMatchId((current) => {
      if (allResults.length === 0) return null;
      return allResults.some((result) => result.id === current)
        ? current
        : allResults[0].id;
    });
  }, [allResults]);

  const consultantById = useMemo(
    () => new Map(consultants.map((consultant) => [consultant.id, consultant])),
    [consultants],
  );

  const selectAssignment = (id: string) => {
    setSelectedMatchId(null);
    setExpanded(false);
    setRankingTab("match");
    setAiRanking(null);
    setAiError("");
    setResults([]);
    setError("");
    setSearchParams(id ? { assignment: id } : {});
  };

  const runMatching = async () => {
    if (!assignment || matching || consultants.length === 0) return;

    setMatching(true);
    setRankingTab("match");
    setAiRanking(null);
    setAiError("");
    setError("");
    setExpanded(false);

    try {
      const data = await matchingApi.run({
        assignmentId: assignment.id,
        consultantIds: consultants.map((consultant) => consultant.id),
      });

      setResults(data);
      setSelectedMatchId(data[0]?.id ?? null);
      setAssignments((current) =>
        current.map((item) =>
          item.id === assignment.id ? { ...item, status: "Done" } : item,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("matching_failed"),
      );
    } finally {
      setMatching(false);
    }
  };

  const required =
    assignment?.requirements.filter(
      (requirement) => requirement.type === "Mandatory",
    ) ?? [];
  const selectedConsultant = selected
    ? consultantById.get(selected.consultantId)
    : undefined;
  const requirementCategoryByName = new Map(
    (assignment?.requirements ?? []).map((requirement) => [
      requirement.name.trim().toLowerCase(),
      requirement.category,
    ]),
  );
  const matchedRequired =
    selected?.details.filter(
      (detail) => detail.type === "Mandatory" && detail.isMatched,
    ) ?? [];
  const missingRequired =
    selected?.details.filter(
      (detail) => detail.type === "Mandatory" && !detail.isMatched,
    ) ?? [];
  const matchedDesired =
    selected?.details.filter(
      (detail) => detail.type === "Desired" && detail.isMatched,
    ) ?? [];
  const matchedDetails =
    selected?.details.filter((detail) => detail.isMatched) ?? [];
  const missingDetails =
    selected?.details.filter((detail) => !detail.isMatched) ?? [];

  const breakdown = selected
    ? [
        {
          label: t("matching_mandatory_requirements"),
          value: selected.totalMandatory
            ? Math.round(
                (selected.matchedMandatory / selected.totalMandatory) * 100,
              )
            : 0,
          detail: `${selected.matchedMandatory} / ${selected.totalMandatory}`,
        },
        {
          label: t("matching_desired_requirements"),
          value: selected.totalDesired
            ? Math.round(
                (selected.matchedDesired / selected.totalDesired) * 100,
              )
            : 0,
          detail: `${selected.matchedDesired} / ${selected.totalDesired}`,
        },
        {
          label: t("matching_weighted"),
          value: selected.scoreAvailable ? selected.score : 0,
          detail: selected.scoreAvailable
            ? undefined
            : t("matching_no_scoreable"),
        },
      ]
    : [];

  const barColor = (value: number) =>
    value >= 85
      ? "var(--color-success)"
      : value >= 65
        ? "var(--color-brand)"
        : "var(--color-warning)";

  if (loading) {
    return (
      <div className="p-6 text-sm text-app-muted">{t("matching_loading")}</div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none px-6 py-4 bg-app-surface">
        <PageHeader
          title={t("matching_title")}
          description={
            assignment
              ? t("matching_review_selected")
              : t("matching_select_then_run")
          }
          backTo={
            fromAssignment && assignment
              ? "/client-assignments/" + assignment.id
              : undefined
          }
          backLabel={t("matching_back_assignment")}
        />

        {!fromAssignment ? (
          <div className="mt-4 rounded-lg border border-app-border bg-app px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <label className="text-[10px] uppercase tracking-wide text-app-muted block mb-1.5">
                  {t("matching_client_assignment")}
                </label>

                <select
                  value={assignment?.id ?? ""}
                  onChange={(event) => selectAssignment(event.target.value)}
                  className="w-full max-w-xl text-xs font-medium rounded px-3 py-2 focus:outline-none"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">{t("matching_select_assignment")}</option>
                  {assignments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.customerName}
                    </option>
                  ))}
                </select>

                {assignment && (
                  <div className="mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap text-[10px] text-app-muted">
                    <span>
                      {t("assignment_seniority")}:{" "}
                      <strong className="font-medium text-app-secondary">
                        {assignment.seniority || "—"}
                      </strong>
                    </span>
                    <span>
                      {t("assignment_availability")}:{" "}
                      <strong className="font-medium text-app-secondary">
                        {assignment.availability || "—"}
                      </strong>
                    </span>
                    <span>
                      {t("assignment_required_skills")}:{" "}
                      <strong className="font-medium text-app-secondary">
                        {required.length}
                      </strong>
                    </span>
                    <span className="truncate max-w-xl">
                      {required
                        .slice(0, 4)
                        .map((item) => item.name)
                        .join(" · ")}
                      {required.length > 4 ? " +" + (required.length - 4) : ""}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end">
                {assignment && (
                  <LinkButton
                    to={"/client-assignments/" + assignment.id}
                    variant="secondary"
                    icon={<Eye size={12} />}
                  >
                    {t("matching_view_assignment")}
                  </LinkButton>
                )}

                <button
                  onClick={runMatching}
                  disabled={!assignment || matching || consultants.length === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-app-on-brand px-3 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--color-brand)" }}
                >
                  {matching ? (
                    <Loader size={12} className="animate-spin" />
                  ) : (
                    <Zap size={12} />
                  )}
                  {matching
                    ? t("matching_running")
                    : results.length > 0
                      ? t("matching_rerun")
                      : t("matching_run")}
                </button>
              </div>
            </div>
          </div>
        ) : assignment ? (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-app-border bg-app px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-app-primary truncate">
                  {assignment.title}
                </p>
                <span className="text-[10px] text-app-faint">·</span>
                <p className="text-xs text-app-secondary truncate">
                  {assignment.customerName}
                </p>
              </div>
              <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[10px] text-app-muted">
                <span>
                  {t("assignment_seniority")}:{" "}
                  <strong className="font-medium text-app-secondary">
                    {assignment.seniority || "—"}
                  </strong>
                </span>
                <span>
                  {t("assignment_availability")}:{" "}
                  <strong className="font-medium text-app-secondary">
                    {assignment.availability || "—"}
                  </strong>
                </span>
                <span>
                  {t("assignment_required_skills")}:{" "}
                  <strong className="font-medium text-app-secondary">
                    {required.length}
                  </strong>
                </span>
              </div>
            </div>

            <button
              onClick={runMatching}
              disabled={matching || consultants.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-app-on-brand px-3 py-2 rounded-md shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--color-brand)" }}
            >
              {matching ? (
                <Loader size={12} className="animate-spin" />
              ) : (
                <Zap size={12} />
              )}
              {matching
                ? t("matching_running")
                : results.length > 0
                  ? t("matching_rerun")
                  : t("matching_run")}
            </button>
          </div>
        ) : null}

        {error && (
          <div className="mt-3 rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-secondary">
            {error}
          </div>
        )}
      </div>

      {!assignment ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div className="bg-app-surface border border-app-border rounded-xl p-8 text-center max-w-md shadow-app-surface">
            <h2 className="text-sm font-medium text-app-primary">
              {t("matching_choose_title")}
            </h2>
            <p className="text-xs text-app-muted mt-2 leading-relaxed">
              {t("matching_choose_help")}
            </p>
          </div>
        </div>
      ) : matching ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div className="text-center">
            <Loader
              size={26}
              className="animate-spin text-app-brand mx-auto mb-3"
            />
            <h2 className="text-sm font-medium text-app-primary">
              {t("matching_running_title")}
            </h2>
            <p className="text-xs text-app-muted mt-2">
              {t("matching_running_help")}
            </p>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div className="bg-app-surface border border-app-border rounded-xl p-8 text-center max-w-md shadow-app-surface">
            <Zap size={24} className="text-app-faint mx-auto mb-3" />
            <h2 className="text-sm font-medium text-app-primary">
              {t("matching_ready_title")}
            </h2>
            <p className="text-xs text-app-muted mt-2 leading-relaxed">
              {t("matching_ready_help")}
            </p>
          </div>
        </div>
      ) : selected ? (
        <div className="flex-1 flex flex-col min-h-0">
<div className="px-6 py-2 border-b border-app-border bg-app-surface flex flex-wrap items-center gap-3">
              <div className="inline-flex w-fit max-w-full gap-1 rounded-lg bg-app p-1" role="tablist" aria-label="Ranking method">
                <button type="button" role="tab" aria-selected={rankingTab === "match"} onClick={() => setRankingTab("match")} className={`rounded-md px-4 py-1.5 text-xs font-medium ${rankingTab === "match" ? "bg-app-brand-subtle text-app-brand" : "text-app-muted hover:text-app-primary"}`}>Match Score</button>
                <button type="button" role="tab" aria-selected={rankingTab === "ai"} onClick={() => setRankingTab("ai")} className={`rounded-md px-4 py-1.5 text-xs font-medium ${rankingTab === "ai" ? "bg-app-brand-subtle text-app-brand" : "text-app-muted hover:text-app-primary"}`}>AI Ranking</button>
              </div>
              {newConsultants > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-500" role="status" title="New consultants are not included in the saved Match Score results.">
                  <AlertTriangle size={12} />
                  {newConsultants} new consultant{newConsultants === 1 ? "" : "s"} not matched · Re-run Matching
                </span>
              )}
            </div>

          {rankingTab === "ai" ? (
            <main className="flex-1 min-h-0 overflow-auto bg-app">
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div>
                  <h2 className="text-sm font-semibold text-app-primary">AI Ranking · Original CVs</h2>
                  <p className="mt-1 text-xs text-app-muted">Compare the top two eligible consultants using their original CV documents and this assignment. Match Score is unchanged.</p></div>
                  {aiRanking && <button type="button" disabled={aiLoading} onClick={() => void runAiRanking()} className="rounded-md border border-app-border px-3 py-2 text-xs text-app-secondary disabled:opacity-50">{aiLoading ? "Analyzing..." : "Re-run AI Ranking"}</button>}
                </div>
                {!aiRanking && (
                  <div className="rounded-xl border border-app-border bg-app-surface p-6 text-center">
                    <p className="text-sm font-semibold text-app-primary">No AI ranking yet</p>
                    <p className="mt-2 text-xs text-app-muted">Run the analysis after Matching. Consultants without an active original CV are skipped.</p>
                    <button type="button" disabled={aiLoading} onClick={() => void runAiRanking()} className="mt-4 rounded-md bg-app-brand px-4 py-2 text-xs font-medium text-app-on-brand disabled:opacity-50">
                      {aiLoading ? "Analyzing original CVs..." : "Rank Top Matches with AI"}
                    </button>
                  </div>
                )}
                {aiError && <p role="alert" className="rounded-lg border border-app-border p-3 text-xs text-red-500">{aiError}</p>}
                {aiRanking && (
                  <>
                    {aiRanking.skippedWithoutCv > 0 && <p className="text-xs text-app-muted">{aiRanking.skippedWithoutCv} higher-ranked consultant(s) were skipped because an original CV was unavailable.</p>}
                    <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-2" aria-label="AI comparison summary">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">AI Comparison Summary</p>
                      {(() => {
                        const winner = aiRanking.rankings.find((item) => item.rank === 1);
                        const second = aiRanking.rankings.find((item) => item.rank === 2);
                        const winnerName = allResults.find((item) => item.consultantId === winner?.consultantId)?.consultantName ?? "Consultant";
                        const secondName = allResults.find((item) => item.consultantId === second?.consultantId)?.consultantName ?? "the other consultant";
                        return <>
                          <h3 className="text-base font-semibold text-app-primary">Recommended: {winnerName}</h3>
                          <p className="text-sm leading-relaxed text-app-secondary">{winner?.reason}</p>
                          <p className="text-xs text-app-muted">Compared with {secondName}: {second?.reason}</p>
                        </>;
                      })()}
                      <p className="border-t border-app-border pt-3 text-[11px] text-app-muted">AI assessment based on original CVs. No new numeric score. Final selection remains with the XLENT user.</p>
                    </section>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {[...aiRanking.rankings].sort((a, b) => a.rank - b.rank).map((item) => {
                        const original = allResults.find((r) => r.consultantId === item.consultantId);
                        return (
                          <article key={item.consultantId} className="rounded-xl border border-app-border bg-app-surface p-5 space-y-3">
                            <p className="text-xs font-semibold text-app-brand">AI Rank #{item.rank}</p>
                            <h3 className="text-sm font-semibold text-app-primary">{original?.consultantName ?? `Consultant #${item.consultantId}`}</h3>
                            <p className="text-xs text-app-muted">Original Match Score: {original?.score ?? "—"}%</p>
                            <p className="text-xs text-app-secondary leading-relaxed">{item.reason}</p>
                            <div><h4 className="text-xs font-semibold text-app-primary">Strengths</h4><ul className="mt-1 list-disc pl-4 text-xs text-app-secondary space-y-1">{item.strengths.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
                            <div><h4 className="text-xs font-semibold text-app-primary">Gaps</h4><ul className="mt-1 list-disc pl-4 text-xs text-app-secondary space-y-1">{item.gaps.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
                            <div><h4 className="text-xs font-semibold text-app-primary">CV Evidence</h4><ul className="mt-1 list-disc pl-4 text-xs text-app-secondary space-y-1">{item.evidence.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
                          </article>
                        );
                      })}
                    </div>

                  </>
                )}
              </div>
            
            </main>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto flex items-start">
              <aside className="w-80 flex-none border-r border-app-border bg-app-surface flex flex-col self-stretch">
            <div className="px-4 py-3 border-b border-app-border">
              <p className="text-sm font-semibold text-app-primary">
                {t("matching_consultants")}
              </p>
              <p className="text-[10px] text-app-muted mt-0.5">
                {t("matching_ranked")}
              </p>
              <div className="relative mt-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("matching_search_placeholder")}
                  aria-label={t("matching_search_label")}
                  className="w-full rounded-md border border-app-border bg-app px-3 py-2 pr-7 text-xs text-app-primary placeholder:text-app-faint focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label={t("matching_clear_search")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-app-muted hover:text-app-primary"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="mt-2 flex gap-1">
                <button
                  onClick={() => setListFilter("All")}
                  className={`rounded px-2 py-1 text-[10px] ${listFilter === "All" ? "bg-app-brand text-app-on-brand" : "text-app-muted"}`}
                >
                  {t("common_all")} ({results.length})
                </button>
                <button
                  onClick={() => setListFilter("Strong")}
                  className={`rounded px-2 py-1 text-[10px] ${listFilter === "Strong" ? "bg-app-brand text-app-on-brand" : "text-app-muted"}`}
                >
                  {t("matching_strong")} (
                  {
                    results.filter(
                      (result) => matchCategory(result.score) === "Strong",
                    ).length
                  }
                  )
                </button>
                <button
                  onClick={() => setListFilter("Partial")}
                  className={`rounded px-2 py-1 text-[10px] ${listFilter === "Partial" ? "bg-app-brand text-app-on-brand" : "text-app-muted"}`}
                >
                  {t("matching_partial")} (
                  {
                    results.filter(
                      (result) => matchCategory(result.score) === "Partial",
                    ).length
                  }
                  )
                </button>
                <button
                  onClick={() => setListFilter("Low")}
                  className={`rounded px-2 py-1 text-[10px] ${listFilter === "Low" ? "bg-app-brand text-app-on-brand" : "text-app-muted"}`}
                >
                  {t("matching_low")} (
                  {
                    results.filter(
                      (result) => matchCategory(result.score) === "Low",
                    ).length
                  }
                  )
                </button>
              </div>
            </div>

            <div className="flex-1">
              {visibleResults.length === 0 ? (
                <div className="flex h-full items-center justify-center p-5 text-center">
                  <div>
                    <p className="text-sm font-medium text-app-primary">
                      {t("consultants_empty")}
                    </p>
                    <p className="mt-2 text-xs text-app-muted">
                      {query.trim()
                        ? t("assignments_empty_search")
                        : t("matching_ready_help")}
                    </p>
                  </div>
                </div>
              ) : (
                visibleResults.map((result) => {
                  const missing = result.details.filter(
                    (detail) =>
                      detail.type === "Mandatory" && !detail.isMatched,
                  );
                  const isSelected = selected?.id === result.id;

                  return (
                    <button
                      key={result.id}
                      onClick={() => setSelectedMatchId(result.id)}
                      className="w-full text-left px-4 py-3.5 transition-colors border-b border-app-border-subtle"
                      style={
                        isSelected
                          ? {
                              background: "var(--color-brand-subtle)",
                              borderLeft: "3px solid var(--color-brand)",
                            }
                          : { borderLeft: "3px solid transparent" }
                      }
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-[10px] font-mono text-app-faint w-4 pt-1">
                          {result.rank}.
                        </span>
                        <div className="w-7 h-7 rounded-full bg-app-brand-subtle flex items-center justify-center text-[10px] font-semibold text-app-brand flex-none">
                          {initials(result.consultantName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-app-primary truncate">
                              {result.consultantName}
                            </p>
                            <span className="text-xs font-semibold font-mono text-app-primary flex-none">
                              {result.score}%
                            </span>
                          </div>
                          <p className="text-[10px] text-app-muted truncate mt-0.5">
                            {consultantById.get(result.consultantId)?.title ||
                              t("consultant_role")}
                          </p>
                          <div className="mt-2">
                            {missing.length === 0 ? (
                              <div
                                className="flex items-center gap-1 text-[10px]"
                                style={{ color: "var(--color-success)" }}
                              >
                                <CheckCircle size={9} />
                                {result.matchedMandatory}/
                                {result.totalMandatory} {t("matching_matched")}
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-1 text-[10px]"
                                style={{ color: "var(--color-warning)" }}
                              >
                                <AlertTriangle size={9} />
                                {t("matching_missing_prefix")}{" "}
                                {missing
                                  .slice(0, 2)
                                  .map((item) => item.requirementName)
                                  .join(", ")}
                                {missing.length > 2
                                  ? ` +${missing.length - 2}`
                                  : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          
              <main className="flex-1 min-w-0 bg-app">
                <div className="p-6 space-y-5">
              <section className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-app-brand-subtle flex items-center justify-center text-sm font-semibold text-app-brand flex-none">
                    {initials(selected.consultantName)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-app-primary">
                      {selected.consultantName}
                    </h2>
                    <p className="text-xs text-app-muted truncate">
                      {selectedConsultant?.title || t("consultant_role")} ·{" "}
                      {selectedConsultant?.yearsOfExperience ?? 0}{" "}
                      {t("consultant_year_count")}
                    </p>
                    <span className="inline-flex mt-2 rounded px-2 py-1 text-[10px] font-semibold bg-app-brand-soft text-app-brand">
                      {displayMatchCategory(selected.score)}{" "}
                      {t("match_matches")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-2xl font-semibold font-mono text-app-primary">
                        {selected.scoreAvailable ? `${selected.score}%` : "—"}
                      </span>
                      <span className="text-xs font-medium text-app-secondary">
                        {selected.scoreAvailable
                          ? t("match_matches")
                          : t("matching_no_scoreable")}
                      </span>
                    </div>
                    <p className="text-[10px] text-app-faint">
                      {t("matching_deterministic_score")}
                    </p>
                  </div>

                  <LinkButton
                    to={"/consultants/" + selected.consultantId}
                    variant="secondary"
                    icon={<Eye size={12} />}
                  >
                    {t("matching_view_consultant")}
                  </LinkButton>
                </div>
              </section>

              <nav
                className="flex gap-5 border-b border-app-border"
                aria-label={t("match_breakdown")}
              >
                {(["Overview", "Requirements", "Experience"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`border-b-2 px-1 py-2 text-xs ${activeTab === tab ? "border-app-brand text-app-brand" : "border-transparent text-app-muted hover:text-app-secondary"}`}
                    >
                      {tab === "Overview"
                        ? t("assignment_overview")
                        : tab === "Requirements"
                          ? t("matching_requirements")
                          : t("matching_total_experience")}
                    </button>
                  ),
                )}
              </nav>

              {activeTab === "Requirements" && (
                <section className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-app-primary">
                      {t("matching_requirements")}
                    </p>
                    <p className="text-[10px] text-app-muted mt-1">
                      {selected.matchedMandatory}/{selected.totalMandatory}{" "}
                      {t("matching_experience_context")}
                    </p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <RequirementColumn
                      title={t("matching_matched_requirements")}
                      items={matchedDetails}
                      matched
                      categoryByName={requirementCategoryByName}
                    />
                    <RequirementColumn
                      title={t("matching_missing_requirements")}
                      items={missingDetails}
                      categoryByName={requirementCategoryByName}
                    />
                  </div>
                </section>
              )}

              {activeTab === "Experience" && (
                <section className="space-y-4">
                  <div className="bg-app-surface border border-app-border rounded-lg p-4">
                    <p className="text-sm font-medium text-app-primary">
                      {t("matching_total_experience")}
                    </p>
                    <p className="mt-2 text-xs text-app-secondary">
                      {t("matching_consultant_label")}:{" "}
                      {selectedConsultant?.yearsOfExperience ??
                        t("common_not_specified")}{" "}
                      {t("consultant_year_count")}
                    </p>
                    <p className="text-xs text-app-muted">
                      {t("matching_assignment_requires")}:{" "}
                      {assignment.minYearsExperience > 0
                        ? assignment.minYearsExperience +
                          "+ " +
                          t("consultant_year_count")
                        : t("matching_no_minimum")}
                    </p>
                  </div>
                  <div className="bg-app-surface border border-app-border rounded-lg p-4">
                    <p className="text-sm font-medium text-app-primary mb-3">
                      {t("matching_skill_experience")}
                    </p>
                    {selectedConsultant?.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex justify-between border-b border-app-border-subtle py-2 text-xs"
                      >
                        <span>{skill.skill?.canonicalName ?? skill.name}</span>
                        <span className="text-app-muted">
                          {skill.years == null ? "Not specified" : `${skill.years} ${t("consultant_year_count")}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab !== "Overview" && <div className="hidden" />}

              {activeTab === "Overview" && (
                <>
                  <section className="grid grid-cols-2 gap-4">
                    <div className="min-h-40 bg-app-surface border border-app-border rounded-lg p-4 shadow-app-surface">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-app-primary">
                          {t("match_must")}
                        </p>
                        <span className="text-[10px] text-app-muted">
                          {selected.matchedMandatory}/{selected.totalMandatory}{" "}
                          {t("common_required")}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {matchedRequired.slice(0, 4).map((detail) => (
                          <div
                            key={detail.id || detail.requirementName}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle
                              size={11}
                              style={{ color: "var(--color-success)" }}
                            />
                            <span className="text-xs font-mono text-app-primary">
                              {detail.requirementName}
                            </span>
                          </div>
                        ))}
                        {matchedRequired.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("Requirements")}
                            className="mt-2 w-full border-t border-app-border-subtle pt-2 text-left text-[10px] text-app-brand hover:text-app-primary focus:outline-none focus:ring-1 focus:ring-app-brand"
                          >
                            ✓ +{matchedRequired.length - 4}{" "}
                            {t("matching_more_matched")} →
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="min-h-40 bg-app-surface border border-app-border rounded-lg p-4 shadow-app-surface">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-app-primary">
                          {t("match_missing")}
                        </p>
                        <span className="text-[10px] text-app-muted">
                          {missingRequired.length} {t("common_missing")}
                        </span>
                      </div>
                      {missingRequired.length > 0 ? (
                        <div className="space-y-2">
                          {missingRequired.slice(0, 4).map((detail) => (
                            <div
                              key={detail.id || detail.requirementName}
                              className="flex items-center gap-2"
                            >
                              <AlertTriangle
                                size={11}
                                style={{ color: "var(--color-warning)" }}
                              />
                              <span
                                className="text-xs font-mono"
                                style={{ color: "var(--color-warning)" }}
                              >
                                {detail.requirementName}
                              </span>
                            </div>
                          ))}
                          {missingRequired.length > 4 && (
                            <button
                              type="button"
                              onClick={() => setActiveTab("Requirements")}
                              className="mt-2 w-full border-t border-app-border-subtle pt-2 text-left text-[10px] text-app-brand hover:text-app-primary focus:outline-none focus:ring-1 focus:ring-app-brand"
                            >
                              ✕ +{missingRequired.length - 4}{" "}
                              {t("matching_more_missing")} →
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle
                            size={11}
                            style={{ color: "var(--color-success)" }}
                          />
                          <span className="text-xs text-app-secondary">
                            {t("match_none_missing")}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="bg-app-surface border border-app-border rounded-lg p-4 shadow-app-surface">
                    <p className="text-xs font-medium text-app-primary mb-4">
                      {t("match_breakdown")}
                    </p>
                    <div className="space-y-3">
                      {breakdown.map((item, index) => (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={`text-[11px] truncate ${index === 0 ? "font-medium text-app-primary" : "text-app-secondary"}`}
                              >
                                {item.label}
                              </span>
                              {item.detail && (
                                <span className="text-[11px] text-app-muted">
                                  {item.detail}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-app-primary">
                              {item.value}%
                            </span>
                          </div>
                          <div
                            className="h-1 rounded-full"
                            style={{ background: "var(--color-border)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: item.value + "%",
                                backgroundColor: barColor(item.value),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {!selected.scoreAvailable && (
                      <p className="text-[10px] text-app-muted mt-3">
                        {t("matching_no_scoreable")}
                      </p>
                    )}
                  </section>

                  <section className="grid grid-cols-2 gap-4">
                    <div className="bg-app-surface border border-app-border rounded-lg p-4 shadow-app-surface">
                      <p className="text-xs font-medium text-app-primary mb-3">
                        {t("matching_relevant_exp")}
                      </p>
                      <div className="space-y-3">
                        {selected.details
                          .filter((detail) => detail.isMatched)
                          .slice(0, 4)
                          .map((detail) => (
                            <div key={detail.id || detail.requirementName}>
                              <span className="text-[10px] font-medium text-app-brand">
                                {detail.requirementName}
                              </span>
                              <p className="text-[11px] text-app-secondary leading-relaxed mt-1">
                                {localizeEvidence(detail.evidence)}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="bg-app-surface border border-app-border rounded-lg p-4 shadow-app-surface">
                      <p className="text-xs font-medium text-app-primary mb-3">
                        {t("match_nice")}
                      </p>
                      {matchedDesired.length > 0 ? (
                        <div className="space-y-2">
                          {matchedDesired.map((detail) => (
                            <div
                              key={detail.id || detail.requirementName}
                              className="flex items-center gap-2"
                            >
                              <CheckCircle
                                size={11}
                                style={{ color: "var(--color-brand)" }}
                              />
                              <span className="text-xs font-mono text-app-secondary">
                                {detail.requirementName}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-app-faint">
                          {t("match_none_strengths")}
                        </p>
                      )}
                    </div>
                  </section>

                  {(selected.contextDetails ?? []).length > 0 && (
                    <section className="bg-app-surface border border-app-border rounded-lg p-4 shadow-app-surface">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-xs font-medium text-app-primary">
                          {t("matching_fit_checks")}
                        </p>
                        <span className="text-[10px] text-app-muted">
                          {t("matching_experience_context")}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {selected.contextDetails.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-start gap-2.5"
                          >
                            {item.isMatched === true ? (
                              <CheckCircle
                                size={11}
                                style={{ color: "var(--color-success)" }}
                                className="mt-0.5 flex-none"
                              />
                            ) : item.isMatched === false ? (
                              <AlertTriangle
                                size={11}
                                style={{ color: "var(--color-warning)" }}
                                className="mt-0.5 flex-none"
                              />
                            ) : (
                              <Info
                                size={11}
                                className="text-app-faint mt-0.5 flex-none"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-medium text-app-secondary">
                                  {item.name}
                                </span>
                                <span className="text-[9px] text-app-faint">
                                  {item.affectsScore
                                    ? t("matching_included_score")
                                    : t("matching_manual_review")}
                                </span>
                              </div>
                              <p className="text-[10px] text-app-muted mt-0.5">
                                {localizeEvidence(item.evidence)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section
                    className="rounded-lg p-4"
                    style={{
                      background: "var(--color-brand-soft)",
                      border: "1px solid var(--color-brand-subtle)",
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <Info
                        size={13}
                        className="text-app-brand flex-none mt-0.5"
                      />
                      <div>
                        <p className="text-[11px] text-app-faint mb-1 font-mono uppercase tracking-wider">
                          {t("match_judge")}
                        </p>
                        <p className="text-xs text-app-secondary leading-relaxed">
                          {selected.explanation}
                        </p>
                        <p className="text-[10px] text-app-faint leading-relaxed mt-2">
                          {t("match_decision")}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="bg-app-surface border border-app-border rounded-lg shadow-app-surface">
                    <button
                      onClick={() => setExpanded((current) => !current)}
                      className="w-full flex items-center justify-between px-4 py-3"
                    >
                      <span className="text-xs font-medium text-app-primary">
                        {t("match_evidence")}
                      </span>
                      <ChevronDown
                        size={13}
                        className="text-app-faint transition-transform"
                        style={{
                          transform: expanded ? "rotate(180deg)" : "none",
                        }}
                      />
                    </button>

                    {expanded && (
                      <div className="border-t border-app-border">
                        {selected.details.map((detail) => (
                          <div
                            key={detail.id || detail.requirementName}
                            className="px-4 py-3 border-b border-app-border-subtle"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {detail.isMatched ? (
                                <CheckCircle
                                  size={10}
                                  style={{ color: "var(--color-success)" }}
                                />
                              ) : (
                                <AlertTriangle
                                  size={10}
                                  style={{ color: "var(--color-warning)" }}
                                />
                              )}
                              <span className="text-[10px] font-mono font-medium text-app-brand">
                                {detail.requirementName}
                              </span>
                              <span className="text-[9px] text-app-faint">
                                {detail.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-app-muted italic leading-relaxed">
                              {localizeEvidence(detail.evidence)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

              </main>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
