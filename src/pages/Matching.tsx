import { useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle, ChevronDown, Eye, Info, Loader, Zap } from "../design-system/icons";
import { useI18n } from "../i18n";
import { PageHeader } from "../components/ui/PageHeader";
import { LinkButton } from "../components/ui/LinkButton";
import { ASSIGNMENTS } from "../features/assignments";
import { MATCHES, MATCH_WEIGHTS } from "../features/matching";

export default function Matching() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [matchingStarted, setMatchingStarted] = useState(false);
  const [matching, setMatching] = useState(false);

  const assignmentId = searchParams.get("assignment");
  const assignment = ASSIGNMENTS.find((item) => item.id === assignmentId);
  const fromAssignment = Boolean((location.state as { fromAssignment?: boolean } | null)?.fromAssignment);

  const assignmentMatches = assignment
    ? MATCHES
        .filter((match) => match.assignmentId === assignment.id)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    : [];

  const selected = matchingStarted
    ? assignmentMatches.find((match) => match.id === selectedMatchId) ?? assignmentMatches[0]
    : undefined;

  const selectAssignment = (id: string) => {
    setSelectedMatchId("");
    setExpanded(false);
    setMatchingStarted(false);
    setMatching(false);
    setSearchParams(id ? { assignment: id } : {});
  };

  const runMatching = () => {
    if (!assignment || matching) return;

    setMatching(true);
    setMatchingStarted(false);
    setSelectedMatchId("");
    setExpanded(false);

    window.setTimeout(() => {
      setMatching(false);
      setMatchingStarted(true);
    }, 900);
  };

  const SCORE_LABELS: Record<string, string> = {
    mustHave: t("score_mustHave"),
    semantic: t("score_semantic"),
    experience: t("score_experience"),
    seniority: t("score_seniority"),
    niceToHave: t("score_niceToHave"),
    availability: t("score_availability"),
  };

  const barColor = (value: number) =>
    value >= 85 ? "var(--color-success)" : value >= 65 ? "var(--color-brand)" : "var(--color-warning)";

  const totalRequired = selected ? selected.mustHaveCoverage.length + selected.gaps.length : 0;

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
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="flex items-end gap-2">
              <div className="w-96">
                <label className="text-[10px] uppercase tracking-wide text-app-muted block mb-1.5">
                  {t("matching_client_assignment")}
                </label>
                <select
                  value={assignment?.id ?? ""}
                  onChange={(event) => selectAssignment(event.target.value)}
                  className="w-full text-xs rounded px-3 py-2 focus:outline-none"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">{t("matching_select_assignment")}</option>
                  {ASSIGNMENTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.client}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={runMatching}
                disabled={!assignment || matching}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white px-3 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--color-brand)" }}
              >
                {matching ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                {matching ? t("matching_running") : matchingStarted ? t("matching_rerun") : t("matching_run")}
              </button>
            </div>

            {assignment && (
              <LinkButton to={"/client-assignments/" + assignment.id} variant="secondary" icon={<Eye size={12} />}>
                {t("matching_view_assignment")}
              </LinkButton>
            )}
          </div>
        ) : assignment ? (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-app bg-app px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-app-primary truncate">{assignment.title}</p>
                <span className="text-[10px] text-app-faint">·</span>
                <p className="text-xs text-app-secondary truncate">{assignment.client}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[10px] text-app-muted">
                <span>{t("assignment_seniority")}: <strong className="font-medium text-app-secondary">{assignment.seniority}</strong></span>
                <span>{t("assignment_availability")}: <strong className="font-medium text-app-secondary">{assignment.availability}</strong></span>
                <span>{t("assignment_required_skills")}: <strong className="font-medium text-app-secondary">{assignment.requiredSkills.length}</strong></span>
                <span className="truncate max-w-xl">{assignment.requiredSkills.slice(0, 4).join(" · ")}{assignment.requiredSkills.length > 4 ? " +" + (assignment.requiredSkills.length - 4) : ""}</span>
              </div>
            </div>

            <button
              onClick={runMatching}
              disabled={matching}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white px-3 py-2 rounded-md shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--color-brand)" }}
            >
              {matching ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
              {matching ? t("matching_running") : matchingStarted ? t("matching_rerun") : t("matching_run")}
            </button>
          </div>
        ) : null}
      </div>

      {!assignment ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div
            className="bg-app-surface border border-app rounded-xl p-8 text-center max-w-md"
            style={{ boxShadow: "var(--shadow-surface)" }}
          >
            <h2 className="text-sm font-medium text-app-primary">{t("matching_choose_title")}</h2>
            <p className="text-xs text-app-muted mt-2 leading-relaxed">
              {t("matching_choose_help")}
            </p>
          </div>
        </div>
      ) : matching ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div className="text-center">
            <Loader size={26} className="animate-spin text-app-brand mx-auto mb-3" />
            <h2 className="text-sm font-medium text-app-primary">{t("matching_running_title")}</h2>
            <p className="text-xs text-app-muted mt-2">
              {t("matching_running_help")}
            </p>
          </div>
        </div>
      ) : !matchingStarted ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div
            className="bg-app-surface border border-app rounded-xl p-8 text-center max-w-md"
            style={{ boxShadow: "var(--shadow-surface)" }}
          >
            <Zap size={24} className="text-app-faint mx-auto mb-3" />
            <h2 className="text-sm font-medium text-app-primary">{t("matching_ready_title")}</h2>
            <p className="text-xs text-app-muted mt-2 leading-relaxed">
              {t("matching_ready_help")}
            </p>
          </div>
        </div>
      ) : assignmentMatches.length === 0 || !selected ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div
            className="bg-app-surface border border-app rounded-xl p-8 text-center max-w-md"
            style={{ boxShadow: "var(--shadow-surface)" }}
          >
            <h2 className="text-sm font-medium text-app-primary">{t("matching_no_results")}</h2>
            <p className="text-xs text-app-muted mt-2">
              {t("matching_no_results_help")}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <aside className="w-80 flex-none border-r border-app bg-app-surface flex flex-col">
            <div className="px-4 py-3 border-b border-app">
              <p className="text-xs font-semibold text-app-primary">{t("matching_top")} {assignmentMatches.length} {t("match_matches")}</p>
              <p className="text-[10px] text-app-muted mt-0.5">
                {t("matching_ranked")}
              </p>
            </div>

            <div className="flex-1 overflow-auto">
              {assignmentMatches.map((match, index) => {
                const requiredTotal = match.mustHaveCoverage.length + match.gaps.length;
                const isSelected = selected.id === match.id;

                return (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatchId(match.id)}
                    className="w-full text-left px-4 py-3.5 transition-colors border-b border-app-subtle"
                    style={
                      isSelected
                        ? {
                            background: "var(--color-brand-subtle)",
                            borderLeft: "3px solid var(--color-brand)",
                            boxShadow: "inset 0 0 0 1px var(--color-brand-subtle)",
                          }
                        : { borderLeft: "3px solid transparent" }
                    }
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-[10px] font-mono text-app-faint w-4 pt-1">{index + 1}.</span>
                      <div className="w-7 h-7 rounded-full bg-app-brand-subtle flex items-center justify-center text-[10px] font-semibold text-app-brand flex-none">
                        {match.initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-app-primary truncate">{match.name}</p>
                          <span className="text-xs font-semibold font-mono text-app-primary flex-none">{match.score}%</span>
                        </div>
                        <p className="text-[10px] text-app-muted truncate mt-0.5">{match.headline}</p>

                        <div className="mt-2">
                          {match.gaps.length === 0 ? (
                            <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-success)" }}>
                              <CheckCircle size={9} />
                              {match.mustHaveCoverage.length}/{requiredTotal} {t("matching_matched")}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-warning)" }}>
                              <AlertTriangle size={9} />
                              {t("matching_missing_prefix")} {match.gaps.join(", ")}
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
                    {selected.initials}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-app-primary">{selected.name}</h2>
                    <p className="text-xs text-app-muted truncate">{selected.headline}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-2xl font-semibold font-mono text-app-primary">{selected.score}%</span>
                      <span className="text-xs font-medium text-app-secondary">{t("common_match")}</span>
                    </div>
                    <p className="text-[10px] text-app-faint">{t("match_composite")}</p>
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

              <section className="grid grid-cols-2 gap-4">
                <div
                  className="h-40 bg-app-surface border border-app rounded-lg p-4 overflow-hidden"
                  style={{ boxShadow: "var(--shadow-surface)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-app-primary">{t("match_must")}</p>
                    <span className="text-[10px] text-app-muted">
                      {selected.mustHaveCoverage.length}/{totalRequired} {t("common_required")}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selected.mustHaveCoverage.slice(0, 4).map((skill) => (
                      <div key={skill} className="flex items-center gap-2">
                        <CheckCircle size={11} style={{ color: "var(--color-success)" }} />
                        <span className="text-xs font-mono text-app-primary">{skill}</span>
                      </div>
                    ))}
                    {selected.mustHaveCoverage.length > 4 && (
                      <p
                        className="text-[10px] text-app-muted pl-5"
                        title={selected.mustHaveCoverage.slice(4).join(", ")}
                      >
                        +{selected.mustHaveCoverage.length - 4} {t("common_more")}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className="h-40 bg-app-surface border border-app rounded-lg p-4 overflow-hidden"
                  style={{ boxShadow: "var(--shadow-surface)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-app-primary">{t("match_missing")}</p>
                    <span className="text-[10px] text-app-muted">{selected.gaps.length} {t("common_missing")}</span>
                  </div>
                  {selected.gaps.length > 0 ? (
                    <div className="space-y-2">
                      {selected.gaps.slice(0, 4).map((skill) => (
                        <div key={skill} className="flex items-center gap-2">
                          <AlertTriangle size={11} style={{ color: "var(--color-warning)" }} />
                          <span className="text-xs font-mono" style={{ color: "var(--color-warning)" }}>
                            {skill}
                          </span>
                        </div>
                      ))}
                      {selected.gaps.length > 4 && (
                        <p
                          className="text-[10px] text-app-muted pl-5"
                          title={selected.gaps.slice(4).join(", ")}
                        >
                          +{selected.gaps.length - 4} {t("common_more")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={11} style={{ color: "var(--color-success)" }} />
                      <span className="text-xs text-app-secondary">{t("match_none_missing")}</span>
                    </div>
                  )}
                </div>
              </section>

              <section
                className="bg-app-surface border border-app rounded-lg p-4"
                style={{ boxShadow: "var(--shadow-surface)" }}
              >
                <p className="text-xs font-medium text-app-primary mb-4">{t("match_breakdown")}</p>
                <div className="space-y-3">
                  {Object.entries(selected.breakdown).map(([key, value]) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-app-secondary truncate">{SCORE_LABELS[key] ?? key}</span>
                          <span className="text-[10px] text-app-faint">
                            {MATCH_WEIGHTS[key as keyof typeof MATCH_WEIGHTS] ?? 0}% {t("common_weight")}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-app-primary">{value}</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: "var(--color-border)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: value + "%", backgroundColor: barColor(value) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div
                  className="bg-app-surface border border-app rounded-lg p-4"
                  style={{ boxShadow: "var(--shadow-surface)" }}
                >
                  <p className="text-xs font-medium text-app-primary mb-3">{t("matching_relevant_exp")}</p>
                  {selected.evidence.length > 0 ? (
                    <div className="space-y-3">
                      {selected.evidence.slice(0, 3).map((item) => (
                        <div key={item.skill}>
                          <span className="text-[10px] font-medium text-app-brand">{item.skill}</span>
                          <p className="text-[11px] text-app-secondary leading-relaxed mt-1">{item.cite}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-app-faint">{t("matching_no_exp")}</p>
                  )}
                </div>

                <div
                  className="bg-app-surface border border-app rounded-lg p-4"
                  style={{ boxShadow: "var(--shadow-surface)" }}
                >
                  <p className="text-xs font-medium text-app-primary mb-3">{t("match_nice")}</p>
                  {selected.niceToHave.length > 0 ? (
                    <div className="space-y-2">
                      {selected.niceToHave.map((skill) => (
                        <div key={skill} className="flex items-center gap-2">
                          <CheckCircle size={11} style={{ color: "var(--color-brand)" }} />
                          <span className="text-xs font-mono text-app-secondary">{skill}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-app-faint">{t("match_none_strengths")}</p>
                  )}
                </div>
              </section>

              <section
                className="rounded-lg p-4"
                style={{ background: "var(--color-brand-soft)", border: "1px solid var(--color-brand-subtle)" }}
              >
                <div className="flex items-start gap-2.5">
                  <Info size={13} className="text-app-brand flex-none mt-0.5" />
                  <div>
                    <p className="text-[11px] text-app-faint mb-1 font-mono uppercase tracking-wider">
                      {t("match_judge")}
                    </p>
                    <p className="text-xs text-app-secondary leading-relaxed">{selected.motivation}</p>
                    <p className="text-[10px] text-app-faint leading-relaxed mt-2">{t("match_decision")}</p>
                  </div>
                </div>
              </section>

              <section
                className="bg-app-surface border border-app rounded-lg"
                style={{ boxShadow: "var(--shadow-surface)" }}
              >
                <button
                  onClick={() => setExpanded((current) => !current)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <span className="text-xs font-medium text-app-primary">{t("match_evidence")}</span>
                  <ChevronDown
                    size={13}
                    className="text-app-faint transition-transform"
                    style={{ transform: expanded ? "rotate(180deg)" : "none" }}
                  />
                </button>

                {expanded && (
                  <div className="border-t border-app">
                    {selected.evidence.map((item) => (
                      <div key={item.skill} className="px-4 py-3 border-b border-app-subtle">
                        <span className="text-[10px] font-mono font-medium text-app-brand bg-app-brand-subtle px-1.5 py-0.5 rounded mb-2 inline-block">
                          {item.skill}
                        </span>
                        <p className="text-[11px] text-app-muted italic leading-relaxed">"{item.cite}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
