import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle, ChevronDown, Eye, Info, Loader, Zap } from "../design-system/icons";
import { useI18n } from "../i18n";
import { PageHeader } from "../components/ui/PageHeader";
import { LinkButton } from "../components/ui/LinkButton";
import { assignmentsApi } from "../services/assignmentsApi";
import { consultantsApi } from "../services/consultantsApi";
import { matchingApi } from "../services/matchingApi";
import { adminApi, type AdminMatchingFactor } from "../services/adminApi";
import type { AssignmentApi, Consultant, MatchResultApi } from "../types";

const ratio = (matched: number, total: number) =>
  total === 0 ? 100 : Math.round((matched / total) * 100);

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

export default function Matching() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [results, setResults] = useState<MatchResultApi[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [matchingFactors, setMatchingFactors] = useState<AdminMatchingFactor[]>([]);
  const [missingMandatoryPenalty, setMissingMandatoryPenalty] = useState(10);

  const assignmentId = Number(searchParams.get("assignment"));
  const assignment = assignments.find((item) => item.id === assignmentId);
  const fromAssignment = Boolean((location.state as { fromAssignment?: boolean } | null)?.fromAssignment);

  useEffect(() => {
    let cancelled = false;

    Promise.all([assignmentsApi.getAll(), consultantsApi.getAll(), adminApi.getOverview()])
      .then(([assignmentData, consultantData, adminOverview]) => {
        if (cancelled) return;
        setAssignments(assignmentData);
        setConsultants(consultantData);
        setMatchingFactors(adminOverview.matchingFactors);
        setMissingMandatoryPenalty(adminOverview.missingMandatoryPenalty);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Could not load matching data.");
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
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setSelectedMatchId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => a.rank - b.rank || b.score - a.score),
    [results],
  );

  const selected = sortedResults.find((result) => result.id === selectedMatchId) ?? sortedResults[0];

  const consultantById = useMemo(
    () => new Map(consultants.map((consultant) => [consultant.id, consultant])),
    [consultants],
  );

  const selectAssignment = (id: string) => {
    setSelectedMatchId(null);
    setExpanded(false);
    setResults([]);
    setError("");
    setSearchParams(id ? { assignment: id } : {});
  };

  const runMatching = async () => {
    if (!assignment || matching || consultants.length === 0) return;

    setMatching(true);
    setError("");
    setSuccess("");
    setExpanded(false);

    try {
      const data = await matchingApi.run({
        assignmentId: assignment.id,
        consultantIds: consultants.map((consultant) => consultant.id),
      });

      setResults(data);
      setSelectedMatchId(data[0]?.id ?? null);
      setAssignments((current) =>
        current.map((item) => item.id === assignment.id ? { ...item, status: "Done" } : item),
      );
      setSuccess("Matching completed. This assignment is now marked as Matched.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Matching failed.");
    } finally {
      setMatching(false);
    }
  };

  const required = assignment?.requirements.filter((requirement) => requirement.type === "Mandatory") ?? [];
  const selectedConsultant = selected ? consultantById.get(selected.consultantId) : undefined;
  const matchedRequired = selected?.details.filter((detail) => detail.type === "Mandatory" && detail.isMatched) ?? [];
  const missingRequired = selected?.details.filter((detail) => detail.type === "Mandatory" && !detail.isMatched) ?? [];
  const matchedDesired = selected?.details.filter((detail) => detail.type === "Desired" && detail.isMatched) ?? [];

  const weightByKey = Object.fromEntries(matchingFactors.map((factor) => [factor.key, factor.value]));

  const breakdown = selected
    ? [
        {
          label: "Mandatory requirements",
          value: ratio(selected.matchedMandatory, selected.totalMandatory),
          weight: `${weightByKey.mandatory ?? 60}%`,
        },
        {
          label: "Desired requirements",
          value: ratio(selected.matchedDesired, selected.totalDesired),
          weight: `${weightByKey.desired ?? 25}%`,
        },
        {
          label: "Experience",
          value: selected.experienceScore,
          weight: `${weightByKey.experience ?? 15}%`,
        },
      ]
    : [];

  const barColor = (value: number) =>
    value >= 85 ? "var(--color-success)" : value >= 65 ? "var(--color-brand)" : "var(--color-warning)";

  if (loading) {
    return <div className="p-6 text-sm text-app-muted">Loading matching data...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none px-6 py-4 bg-app-surface border-b border-app">
        <PageHeader
          title={t("matching_title")}
          description={assignment ? t("matching_review_selected") : t("matching_select_then_run")}
          backTo={fromAssignment && assignment ? "/client-assignments/" + assignment.id : undefined}
          backLabel={t("matching_back_assignment")}
        />

        {!fromAssignment ? (
          <div className="mt-4 rounded-lg border border-app bg-app px-4 py-3">
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
                    <span>{t("assignment_seniority")}: <strong className="font-medium text-app-secondary">{assignment.seniority || "—"}</strong></span>
                    <span>{t("assignment_availability")}: <strong className="font-medium text-app-secondary">{assignment.availability || "—"}</strong></span>
                    <span>{t("assignment_required_skills")}: <strong className="font-medium text-app-secondary">{required.length}</strong></span>
                    <span className="truncate max-w-xl">{required.slice(0, 4).map((item) => item.name).join(" · ")}{required.length > 4 ? " +" + (required.length - 4) : ""}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end">
                {assignment && (
                  <LinkButton to={"/client-assignments/" + assignment.id} variant="secondary" icon={<Eye size={12} />}>
                    {t("matching_view_assignment")}
                  </LinkButton>
                )}

                <button
                  onClick={runMatching}
                  disabled={!assignment || matching || consultants.length === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white px-3 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--color-brand)" }}
                >
                  {matching ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                  {matching ? t("matching_running") : results.length > 0 ? t("matching_rerun") : t("matching_run")}
                </button>
              </div>
            </div>
          </div>
        ) : assignment ? (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-app bg-app px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-app-primary truncate">{assignment.title}</p>
                <span className="text-[10px] text-app-faint">·</span>
                <p className="text-xs text-app-secondary truncate">{assignment.customerName}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[10px] text-app-muted">
                <span>{t("assignment_seniority")}: <strong className="font-medium text-app-secondary">{assignment.seniority || "—"}</strong></span>
                <span>{t("assignment_availability")}: <strong className="font-medium text-app-secondary">{assignment.availability || "—"}</strong></span>
                <span>{t("assignment_required_skills")}: <strong className="font-medium text-app-secondary">{required.length}</strong></span>
              </div>
            </div>

            <button
              onClick={runMatching}
              disabled={matching || consultants.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white px-3 py-2 rounded-md shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--color-brand)" }}
            >
              {matching ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
              {matching ? t("matching_running") : results.length > 0 ? t("matching_rerun") : t("matching_run")}
            </button>
          </div>
        ) : null}

        {success && (
          <div className="mt-3 rounded-lg px-4 py-3 text-xs text-app-secondary" style={{ background: "var(--color-success-soft)", border: "1px solid var(--color-success-border)" }}>
            <CheckCircle size={11} className="inline mr-1.5" style={{ color: "var(--color-success)" }} />
            {success}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
            {error}
          </div>
        )}
      </div>

      {!assignment ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div className="bg-app-surface border border-app rounded-xl p-8 text-center max-w-md shadow-app-surface">
            <h2 className="text-sm font-medium text-app-primary">{t("matching_choose_title")}</h2>
            <p className="text-xs text-app-muted mt-2 leading-relaxed">{t("matching_choose_help")}</p>
          </div>
        </div>
      ) : matching ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div className="text-center">
            <Loader size={26} className="animate-spin text-app-brand mx-auto mb-3" />
            <h2 className="text-sm font-medium text-app-primary">{t("matching_running_title")}</h2>
            <p className="text-xs text-app-muted mt-2">{t("matching_running_help")}</p>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div className="bg-app-surface border border-app rounded-xl p-8 text-center max-w-md shadow-app-surface">
            <Zap size={24} className="text-app-faint mx-auto mb-3" />
            <h2 className="text-sm font-medium text-app-primary">{t("matching_ready_title")}</h2>
            <p className="text-xs text-app-muted mt-2 leading-relaxed">{t("matching_ready_help")}</p>
          </div>
        </div>
      ) : selected ? (
        <div className="flex-1 flex min-h-0">
          <aside className="w-80 flex-none border-r border-app bg-app-surface flex flex-col">
            <div className="px-4 py-3 border-b border-app">
              <p className="text-xs font-semibold text-app-primary">{t("matching_top")} {sortedResults.length} {t("match_matches")}</p>
              <p className="text-[10px] text-app-muted mt-0.5">{t("matching_ranked")}</p>
            </div>

            <div className="flex-1 overflow-auto">
              {sortedResults.map((result) => {
                const missing = result.details.filter((detail) => detail.type === "Mandatory" && !detail.isMatched);
                const isSelected = selected.id === result.id;

                return (
                  <button
                    key={result.id}
                    onClick={() => setSelectedMatchId(result.id)}
                    className="w-full text-left px-4 py-3.5 transition-colors border-b border-app-subtle"
                    style={isSelected
                      ? { background: "var(--color-brand-subtle)", borderLeft: "3px solid var(--color-brand)" }
                      : { borderLeft: "3px solid transparent" }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-[10px] font-mono text-app-faint w-4 pt-1">{result.rank}.</span>
                      <div className="w-7 h-7 rounded-full bg-app-brand-subtle flex items-center justify-center text-[10px] font-semibold text-app-brand flex-none">
                        {initials(result.consultantName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-app-primary truncate">{result.consultantName}</p>
                          <span className="text-xs font-semibold font-mono text-app-primary flex-none">{result.score}%</span>
                        </div>
                        <p className="text-[10px] text-app-muted truncate mt-0.5">
                          {consultantById.get(result.consultantId)?.title || "Consultant"}
                        </p>
                        <div className="mt-2">
                          {missing.length === 0 ? (
                            <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-success)" }}>
                              <CheckCircle size={9} />
                              {result.matchedMandatory}/{result.totalMandatory} {t("matching_matched")}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-warning)" }}>
                              <AlertTriangle size={9} />
                              {t("matching_missing_prefix")} {missing.map((item) => item.requirementName).join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex-1 overflow-auto bg-app">
            <div className="p-6 space-y-5">
              <section className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-app-brand-subtle flex items-center justify-center text-sm font-semibold text-app-brand flex-none">
                    {initials(selected.consultantName)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-app-primary">{selected.consultantName}</h2>
                    <p className="text-xs text-app-muted truncate">
                      {selectedConsultant?.title || "Consultant"} · {selectedConsultant?.yearsOfExperience ?? 0} yrs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-2xl font-semibold font-mono text-app-primary">{selected.score}%</span>
                      <span className="text-xs font-medium text-app-secondary">{t("common_match")}</span>
                    </div>
                    <p className="text-[10px] text-app-faint">Deterministic Match Score</p>
                  </div>

                  <LinkButton to={"/consultants/" + selected.consultantId} variant="secondary" icon={<Eye size={12} />}>
                    {t("matching_view_consultant")}
                  </LinkButton>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div className="min-h-40 bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-app-primary">{t("match_must")}</p>
                    <span className="text-[10px] text-app-muted">{selected.matchedMandatory}/{selected.totalMandatory} {t("common_required")}</span>
                  </div>
                  <div className="space-y-2">
                    {matchedRequired.map((detail) => (
                      <div key={detail.id || detail.requirementName} className="flex items-center gap-2">
                        <CheckCircle size={11} style={{ color: "var(--color-success)" }} />
                        <span className="text-xs font-mono text-app-primary">{detail.requirementName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-h-40 bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-app-primary">{t("match_missing")}</p>
                    <span className="text-[10px] text-app-muted">{missingRequired.length} {t("common_missing")}</span>
                  </div>
                  {missingRequired.length > 0 ? (
                    <div className="space-y-2">
                      {missingRequired.map((detail) => (
                        <div key={detail.id || detail.requirementName} className="flex items-center gap-2">
                          <AlertTriangle size={11} style={{ color: "var(--color-warning)" }} />
                          <span className="text-xs font-mono" style={{ color: "var(--color-warning)" }}>{detail.requirementName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={11} style={{ color: "var(--color-success)" }} />
                      <span className="text-xs text-app-secondary">{t("match_none_missing")}</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                <p className="text-xs font-medium text-app-primary mb-4">{t("match_breakdown")}</p>
                <div className="space-y-3">
                  {breakdown.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-app-secondary truncate">{item.label}</span>
                          <span className="text-[10px] text-app-faint">{item.weight} {t("common_weight")}</span>
                        </div>
                        <span className="text-[11px] font-mono text-app-primary">{item.value}%</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: "var(--color-border)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: item.value + "%", backgroundColor: barColor(item.value) }} />
                      </div>
                    </div>
                  ))}
                </div>
                {missingRequired.length > 0 && (
                  <p className="text-[10px] text-app-muted mt-3">
                    Missing mandatory penalty: -{missingMandatoryPenalty} points per missing mandatory requirement.
                  </p>
                )}
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                  <p className="text-xs font-medium text-app-primary mb-3">{t("matching_relevant_exp")}</p>
                  <div className="space-y-3">
                    {selected.details.filter((detail) => detail.isMatched).slice(0, 4).map((detail) => (
                      <div key={detail.id || detail.requirementName}>
                        <span className="text-[10px] font-medium text-app-brand">{detail.requirementName}</span>
                        <p className="text-[11px] text-app-secondary leading-relaxed mt-1">{detail.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                  <p className="text-xs font-medium text-app-primary mb-3">{t("match_nice")}</p>
                  {matchedDesired.length > 0 ? (
                    <div className="space-y-2">
                      {matchedDesired.map((detail) => (
                        <div key={detail.id || detail.requirementName} className="flex items-center gap-2">
                          <CheckCircle size={11} style={{ color: "var(--color-brand)" }} />
                          <span className="text-xs font-mono text-app-secondary">{detail.requirementName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-app-faint">{t("match_none_strengths")}</p>
                  )}
                </div>
              </section>

              {(selected.contextDetails ?? []).length > 0 && (
                <section className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-xs font-medium text-app-primary">Assignment fit checks</p>
                    <span className="text-[10px] text-app-muted">Experience affects score; other checks are context only.</span>
                  </div>
                  <div className="space-y-3">
                    {selected.contextDetails.map((item) => (
                      <div key={item.name} className="flex items-start gap-2.5">
                        {item.isMatched === true
                          ? <CheckCircle size={11} style={{ color: "var(--color-success)" }} className="mt-0.5 flex-none" />
                          : item.isMatched === false
                            ? <AlertTriangle size={11} style={{ color: "var(--color-warning)" }} className="mt-0.5 flex-none" />
                            : <Info size={11} className="text-app-faint mt-0.5 flex-none" />}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-medium text-app-secondary">{item.name}</span>
                            <span className="text-[9px] text-app-faint">{item.affectsScore ? "Included in score" : "Manual review"}</span>
                          </div>
                          <p className="text-[10px] text-app-muted mt-0.5">{item.evidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-lg p-4" style={{ background: "var(--color-brand-soft)", border: "1px solid var(--color-brand-subtle)" }}>
                <div className="flex items-start gap-2.5">
                  <Info size={13} className="text-app-brand flex-none mt-0.5" />
                  <div>
                    <p className="text-[11px] text-app-faint mb-1 font-mono uppercase tracking-wider">{t("match_judge")}</p>
                    <p className="text-xs text-app-secondary leading-relaxed">{selected.explanation}</p>
                    <p className="text-[10px] text-app-faint leading-relaxed mt-2">{t("match_decision")}</p>
                  </div>
                </div>
              </section>

              <section className="bg-app-surface border border-app rounded-lg shadow-app-surface">
                <button onClick={() => setExpanded((current) => !current)} className="w-full flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-medium text-app-primary">{t("match_evidence")}</span>
                  <ChevronDown
                    size={13}
                    className="text-app-faint transition-transform"
                    style={{ transform: expanded ? "rotate(180deg)" : "none" }}
                  />
                </button>

                {expanded && (
                  <div className="border-t border-app">
                    {selected.details.map((detail) => (
                      <div key={detail.id || detail.requirementName} className="px-4 py-3 border-b border-app-subtle">
                        <div className="flex items-center gap-2 mb-2">
                          {detail.isMatched
                            ? <CheckCircle size={10} style={{ color: "var(--color-success)" }} />
                            : <AlertTriangle size={10} style={{ color: "var(--color-warning)" }} />}
                          <span className="text-[10px] font-mono font-medium text-app-brand">{detail.requirementName}</span>
                          <span className="text-[9px] text-app-faint">{detail.type}</span>
                        </div>
                        <p className="text-[11px] text-app-muted italic leading-relaxed">{detail.evidence}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      ) : null}
    </div>
  );
}
