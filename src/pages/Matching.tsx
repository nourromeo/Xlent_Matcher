import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, AlertTriangle, ChevronDown, Send, Info } from "../design-system/icons";
import { useI18n } from "../i18n";
import { PageHeader } from "../components/ui/PageHeader";
import { MATCHES, MATCH_WEIGHTS } from "../features/matching";
import { ASSIGNMENTS } from "../features/assignments";

export default function Matching() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [expanded, setExpanded] = useState(false);

  const assignmentId = searchParams.get("assignment");
  const assignment = ASSIGNMENTS.find((item) => item.id === assignmentId);

  const assignmentMatches = assignment
    ? MATCHES
        .filter((match) => match.assignmentId === assignment.id)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    : [];

  const selected = assignmentMatches.find((match) => match.id === selectedMatchId) ?? assignmentMatches[0];

  const selectAssignment = (id: string) => {
    setSelectedMatchId("");
    setExpanded(false);

    if (id) {
      setSearchParams({ assignment: id });
    } else {
      setSearchParams({});
    }
  };

  const SCORE_LABELS: Record<string, string> = {
    mustHave: t("score_mustHave"),
    semantic: t("score_semantic"),
    experience: t("score_experience"),
    seniority: t("score_seniority"),
    niceToHave: t("score_niceToHave"),
    availability: t("score_availability"),
  };

  const WEIGHTS: Record<string, number> = MATCH_WEIGHTS;
  const barColor = (value: number) =>
    value >= 85 ? "var(--color-success)" : value >= 65 ? "var(--color-brand)" : "var(--color-warning)";

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none px-6 py-4 bg-app-surface border-b border-app">
        <PageHeader
          title="Match Consultants"
          description={
            assignment
              ? assignment.title + " · " + assignment.client
              : "Select a client assignment to view its top consultant matches."
          }
          meta={assignment ? assignmentMatches.length + " top matches" : undefined}
          backTo="/jobs"
          backLabel="Back to Client Assignments"
        />

        <div className="mt-4 max-w-sm">
          <label className="text-[10px] uppercase tracking-wide text-app-muted block mb-1.5">
            Client Assignment
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
            <option value="">Select an assignment...</option>
            {ASSIGNMENTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {item.client}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!assignment ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div className="bg-app-surface border border-app rounded-xl p-8 text-center max-w-md" style={{ boxShadow: "var(--shadow-surface)" }}>
            <h2 className="text-sm font-medium text-app-primary">Choose a client assignment</h2>
            <p className="text-xs text-app-muted mt-2 leading-relaxed">
              Select an assignment above to view the five highest-ranked consultant matches and their match details.
            </p>
          </div>
        </div>
      ) : assignmentMatches.length === 0 || !selected ? (
        <div className="flex-1 flex items-center justify-center bg-app p-6">
          <div className="bg-app-surface border border-app rounded-xl p-8 text-center max-w-md" style={{ boxShadow: "var(--shadow-surface)" }}>
            <h2 className="text-sm font-medium text-app-primary">No match results yet</h2>
            <p className="text-xs text-app-muted mt-2">
              There are currently no consultant match results for this assignment.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <div className="w-72 flex-none border-r border-app bg-app-surface flex flex-col">
            <div className="px-4 py-3 border-b border-app">
              <p className="text-xs font-medium text-app-primary">{assignment.title}</p>
              <p className="text-[10px] text-app-muted mt-0.5">
                {assignment.client} · Top {assignmentMatches.length} {t("match_matches")}
              </p>
            </div>

            <div className="flex-1 overflow-auto">
              {assignmentMatches.map((match, index) => (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatchId(match.id)}
                  className="w-full text-left px-4 py-3 transition-colors border-b border-app-subtle"
                  style={
                    selected.id === match.id
                      ? { background: "var(--color-brand-subtle)", borderLeft: "2px solid var(--color-brand)" }
                      : { borderLeft: "2px solid transparent" }
                  }
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-[10px] font-mono text-app-faint w-4">{index + 1}.</span>
                    <div className="w-7 h-7 rounded-full bg-app-brand-subtle flex items-center justify-center text-[10px] font-semibold text-app-brand">
                      {match.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-app-primary">{match.name}</p>
                      <p className="text-[10px] text-app-muted truncate">{match.headline}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-6">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: match.score + "%", backgroundColor: "var(--color-brand)" }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-app-primary w-6 text-right">{match.score}</span>
                  </div>

                  {match.gaps.length > 0 && (
                    <div className="ml-6 mt-1.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--color-warning)" }}>
                      <AlertTriangle size={9} />
                      {match.gaps.join(", ")} {t("match_gap")}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-app">
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-app-brand-subtle flex items-center justify-center text-sm font-semibold text-app-brand">
                    {selected.initials}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-app-primary">{selected.name}</h2>
                    <p className="text-xs text-app-muted">{selected.headline}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-semibold font-mono text-app-primary">{selected.score}%</p>
                    <p className="text-[10px] text-app-faint">{t("match_composite")}</p>
                  </div>
                  <button
                    className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
                    style={{ background: "var(--color-brand)" }}
                  >
                    <Send size={11} />
                    {t("match_propose")}
                  </button>
                </div>
              </div>

              <div className="bg-app-surface border border-app rounded-lg p-4 space-y-3" style={{ boxShadow: "var(--shadow-surface)" }}>
                <p className="text-xs font-medium text-app-primary mb-4">{t("match_breakdown")}</p>
                {Object.entries(selected.breakdown).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-app-secondary">{SCORE_LABELS[key] ?? key}</span>
                        <span className="text-[10px] text-app-faint font-mono">×{WEIGHTS[key] ?? 0}%</span>
                      </div>
                      <span className="text-[11px] font-mono text-app-primary">{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: value + "%", backgroundColor: barColor(value) }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-app-surface border border-app rounded-lg p-4" style={{ boxShadow: "var(--shadow-surface)" }}>
                  <p className="text-xs font-medium text-app-primary mb-3">{t("match_must")}</p>
                  <div className="space-y-2">
                    {selected.mustHaveCoverage.map((skill) => (
                      <div key={skill} className="flex items-center gap-2">
                        <CheckCircle size={11} style={{ color: "var(--color-success)" }} />
                        <span className="text-xs font-mono text-app-primary">{skill}</span>
                      </div>
                    ))}

                    <p className="text-[10px] text-app-faint uppercase tracking-wider pt-2">{t("match_missing")}</p>
                    {selected.gaps.length > 0 ? (
                      selected.gaps.map((skill) => (
                        <div key={skill} className="flex items-center gap-2">
                          <AlertTriangle size={11} style={{ color: "var(--color-warning)" }} />
                          <span className="text-xs font-mono" style={{ color: "var(--color-warning)" }}>{skill}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-app-faint">{t("match_none_missing")}</p>
                    )}
                  </div>
                </div>

                <div className="bg-app-surface border border-app rounded-lg p-4" style={{ boxShadow: "var(--shadow-surface)" }}>
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
              </div>

              <div className="rounded-lg p-4" style={{ background: "var(--color-brand-soft)", border: "1px solid var(--color-brand-subtle)" }}>
                <div className="flex items-start gap-2.5">
                  <Info size={13} className="text-app-brand flex-none mt-0.5" />
                  <div>
                    <p className="text-[11px] text-app-faint mb-1 font-mono uppercase tracking-wider">{t("match_judge")}</p>
                    <p className="text-xs text-app-secondary leading-relaxed">{selected.llmVerdict}</p>
                    <p className="text-[10px] text-app-faint leading-relaxed mt-2">{t("match_decision")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
