import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { Link, useNavigate, useParams } from "react-router-dom";
import { assignmentsApi } from "../services/assignmentsApi";
import { matchingApi, type SavedAiRankingSummary } from "../services/matchingApi";
import type { AssignmentApi, MatchResultApi } from "../types";

export default function AiRankingSelection() {
  const { t } = useI18n();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const id = Number(assignmentId);
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<AssignmentApi | null>(null);
  const [results, setResults] = useState<MatchResultApi[]>([]);
  const [eligible, setEligible] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedAiRankingSummary[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [activeTab, setActiveTab] = useState<"new" | "saved">("new");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([assignmentsApi.getAll(), matchingApi.getForAssignment(id), matchingApi.getAiEligibility(id)])
      .then(([assignments, matches, cv]) => {
        if (cancelled) return;
        setAssignment(assignments.find(a => a.id === id) ?? null);
        const ordered = [...matches].sort((a, b) => a.rank - b.rank || b.score - a.score);
        setResults(ordered);
        setEligible(cv.eligibleConsultantIds);
        setSelected(ordered.filter(r => cv.eligibleConsultantIds.includes(r.consultantId)).slice(0, 2).map(r => r.consultantId));
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load AI Ranking."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (activeTab !== "saved" || !Number.isInteger(id) || id <= 0) return;
    let cancelled = false;
    setSavedLoading(true);
    setSavedError("");
    matchingApi.listSavedAiRankings(id)
      .then(data => { if (!cancelled) setSaved(data); })
      .catch(e => { if (!cancelled) setSavedError(e instanceof Error ? e.message : "Could not load saved rankings."); })
      .finally(() => { if (!cancelled) setSavedLoading(false); });
    return () => { cancelled = true; };
  }, [id, activeTab]);

  const options = useMemo(() => results.filter(r =>
    eligible.includes(r.consultantId) && !selected.includes(r.consultantId) &&
    (r.consultantName + " " + r.consultantId).toLocaleLowerCase().includes(search.toLocaleLowerCase())
  ), [results, selected, search, eligible]);

  const run = async () => {
    if (selected.length < 2 || selected.length > 5 || running) return;
    setRunning(true);
    setError("");
    try {
      const ranking = await matchingApi.rankWithAi(id, selected);
      navigate(`/matching/${id}/ai-ranking/results`, { state: { ranking, matches: results, selected } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI comparison failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-app p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link to={`/matching/${id}`} className="text-xs text-app-muted hover:text-app-brand">← {t("ai_back")}</Link>
        <div>
          <h1 className="text-xl font-semibold text-app-primary">{t("ai_select_title")}</h1>
          <p className="mt-1 text-xs text-app-muted">{assignment ? `${assignment.title} · ${assignment.referenceNumber}` : t("ai_select_hint")}</p>
        </div>
        <div className="flex gap-1 border-b border-app-border" role="tablist" aria-label={t("ranking_views")}>
          <button type="button" role="tab" aria-selected={activeTab === "new"} onClick={() => setActiveTab("new")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "new" ? "border-app-brand text-app-primary" : "border-transparent text-app-muted hover:text-app-primary"}`}>{t("ranking_new")}</button>
          <button type="button" role="tab" aria-selected={activeTab === "saved"} onClick={() => setActiveTab("saved")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "saved" ? "border-app-brand text-app-primary" : "border-transparent text-app-muted hover:text-app-primary"}`}>{t("ranking_saved")}</button>
        </div>
        {activeTab === "saved" ? (
          <section role="tabpanel" className="rounded-xl border border-app-border bg-app-surface p-6 space-y-2">
            <h2 className="text-sm font-semibold text-app-primary">{t("ranking_saved_title")}</h2>
            {savedLoading ? <p className="text-sm text-app-muted">{t("ranking_saved_loading")}</p> : savedError ? <p role="alert" className="text-sm text-app-danger">{savedError}</p> : saved.length === 0 ? <p className="text-sm text-app-muted">{t("ranking_saved_empty")}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-app-border text-xs text-app-muted"><th className="py-3 pr-4">{t("ranking_saved_date")}</th><th className="py-3 pr-4">{t("ranking_best_match")}</th><th className="py-3 pr-4">{t("ranking_consultants")}</th><th className="py-3">{t("ranking_action")}</th></tr></thead>
                  <tbody>{saved.map(item => <tr key={item.id} className="border-b border-app-border-subtle last:border-0"><td className="py-3 pr-4">{new Date(item.createdAt).toLocaleString()}</td><td className="py-3 pr-4">{item.bestMatch}</td><td className="py-3 pr-4">{item.consultantCount}</td><td className="py-3"><Link className="text-app-brand hover:underline" to={`/matching/${id}/ai-ranking/saved/${item.id}`}>{t("ranking_view")} →</Link></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        ) : loading ? <p className="text-sm text-app-muted">{t("ai_loading")}</p> : (
          <>
            <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-app-primary">{t("ai_selected")}</h2>
                <span className="text-xs text-app-muted">{selected.length} {t("ai_of_five")}</span>
              </div>
              <p className="text-xs text-app-muted">{t("ai_selected_help")}</p>
              {selected.length === 5 && <p className="text-xs text-app-muted">{t("ai_full")}</p>}
              {selected.map(consultantId => {
                const person = results.find(r => r.consultantId === consultantId);
                return (
                  <div key={consultantId} className="flex items-center gap-3 rounded-lg border border-app-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-app-primary">{person?.consultantName ?? consultantId}</p>
                      <p className="text-xs text-app-muted">Match Score {person?.score ?? "—"}%</p>
                    </div>
                    <button type="button" onClick={() => { setSelected(v => v.filter(x => x !== consultantId)); }} className="text-xs text-app-muted hover:text-app-primary" aria-label={`Ta bort ${person?.consultantName}`}>{t("ai_remove")} ×</button>
                  </div>
                );
              })}
              <button type="button" onClick={() => setOpen(v => !v)} className="w-full rounded-md border border-app-border bg-app px-4 py-2.5 text-left text-sm text-app-secondary hover:bg-app-raised">
                {t("ai_search_toggle")} {open ? "⌃" : "⌄"}
              </button>
              {open && (
                <div className="rounded-lg border border-app-border p-2 space-y-2">
                  <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("ai_search_placeholder")} aria-label={t("ai_search_label")} className="w-full rounded-md border border-app-border bg-app px-3 py-2 text-sm text-app-primary outline-none focus:border-app-brand" />
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {options.map(person => {
                      return (
                        <button key={person.consultantId} type="button" disabled={selected.length >= 5} onClick={() => { setSelected(v => v.length >= 5 ? v : [...v, person.consultantId]); setSearch(""); setOpen(false); }} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-app-raised disabled:opacity-50 disabled:cursor-not-allowed">
                          <span className="min-w-0"><span className="block text-sm text-app-primary">{person.consultantName}</span><span className="text-xs text-app-muted">Match Score {person.score}%</span></span>
                        </button>
                      );
                    })}
                    {options.length === 0 && <p className="p-3 text-xs text-app-muted">{t("ranking_no_consultants")}</p>}
                  </div>
                </div>
              )}
              <p className="text-xs text-app-muted">{t("ranking_eligible_only")}</p>
              <button type="button" onClick={() => { setSelected(results.filter(r => eligible.includes(r.consultantId)).slice(0, 2).map(r => r.consultantId)); }} className="text-xs text-app-brand hover:underline">{t("ranking_auto_reset")}</button>
            </section>
            {eligible.length < 2 && <p className="rounded-lg border border-app-border p-3 text-xs text-app-warning">{t("ai_min_two")}</p>}
            {error && <p role="alert" className="rounded-lg border border-app-border p-3 text-xs text-app-danger">{error}</p>}
            <div className="flex justify-end">
              <button type="button" disabled={selected.length < 2 || selected.length > 5 || running} onClick={() => void run()} className="rounded-md bg-app-brand px-5 py-2.5 text-sm font-medium text-app-on-brand disabled:opacity-50">{running ? t("ranking_running") : t("ranking_compare")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
