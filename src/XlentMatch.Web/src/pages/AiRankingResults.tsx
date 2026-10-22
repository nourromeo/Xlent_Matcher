import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { Link, useLocation, useParams } from "react-router-dom";
import { matchingApi, type AiRankingResult } from "../services/matchingApi";
import type { MatchResultApi } from "../types";

type ResultState = { ranking: AiRankingResult; matches: MatchResultApi[]; selected: number[] };

export default function AiRankingResults() {
  const { t } = useI18n();
  const { assignmentId, savedId } = useParams<{ assignmentId: string; savedId?: string }>();
  const location = useLocation();
  const state = location.state as ResultState | null;
  const [loaded, setLoaded] = useState<{ ranking: AiRankingResult; matches: MatchResultApi[] } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    if (!savedId) return;
    let cancelled = false;
    matchingApi.getSavedAiRanking(Number(assignmentId), Number(savedId))
      .then(data => {
        if (cancelled) return;
        setLoaded({
          ranking: { rankings: data.snapshot.rankings, skippedWithoutCv: data.snapshot.skippedWithoutCv },
          matches: data.snapshot.matches.map(m => ({ ...m, id: 0, assignmentId: Number(assignmentId), rank: 0 } as MatchResultApi))
        });
      })
      .catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load saved ranking."); });
    return () => { cancelled = true; };
  }, [assignmentId, savedId]);
  const aiRanking = savedId ? loaded?.ranking : state?.ranking;
  const allResults = savedId ? (loaded?.matches ?? []) : (state?.matches ?? []);
  const saveResult = async () => {
    if (!aiRanking || saving || savedRecordId !== null) return;
    setSaving(true);
    setSaveError("");
    try {
      const saved = await matchingApi.saveAiRanking(Number(assignmentId), aiRanking);
      setSavedRecordId(saved.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save ranking.");
    } finally {
      setSaving(false);
    }
  };
  const [activeIndex, setActiveIndex] = useState(0);
  const ranked = [...(aiRanking?.rankings ?? [])].sort((a, b) => a.rank - b.rank);
  const displayed = ranked.slice(activeIndex, activeIndex + 1);

  return (
    <div className="h-full overflow-auto bg-app p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Link to={`/matching/${assignmentId}/ai-ranking`} className="text-xs text-app-muted hover:text-app-brand">← {t("ai_back_selection")}</Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-sm font-semibold text-app-primary">{t("ai_results_title")}</h1>
          {aiRanking && (
            <div className="flex items-center gap-2" aria-label={t("ranking_result_actions")}>
              <button type="button" disabled={Boolean(savedId) || saving || savedRecordId !== null} onClick={() => void saveResult()} className="inline-flex items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-primary hover:bg-app-raised disabled:opacity-60 disabled:cursor-not-allowed">
                <span aria-hidden="true">▣</span> {savedId || savedRecordId !== null ? "Saved" : saving ? "Saving..." : "Save Result"}
              </button>
              <button type="button" disabled title={t("ranking_share_later")} className="inline-flex items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-primary opacity-60 cursor-not-allowed">
                <span aria-hidden="true">↗</span> Share
              </button>
            </div>
          )}
        </div>
        {saveError && <p role="alert" className="text-sm text-app-danger">{saveError}</p>}
        {savedRecordId !== null && <p role="status" className="text-sm text-app-success">{t("ranking_saved_success")}</p>}
        {loadError && <p role="alert" className="text-sm text-app-danger">{loadError}</p>}
        {!aiRanking ? (
          <div className="rounded-xl border border-app-border bg-app-surface p-6">
            <p className="text-sm text-app-primary">{t("ai_no_results")}</p>
            <p className="mt-2 text-xs text-app-muted">{t("ai_no_results_help")}</p>
            <Link to={`/matching/${assignmentId}/ai-ranking`} className="mt-3 inline-block text-xs text-app-brand hover:underline">{t("ai_choose")} →</Link>
          </div>
        ) : (
          <>
                    <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-2" aria-label={t("ranking_summary")}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">{t("ai_summary")}</p>
                      {(() => {
                        const winner = aiRanking.rankings.find((item) => item.rank === 1);
                        const winnerName = allResults.find((item) => item.consultantId === winner?.consultantId)?.consultantName ?? "Consultant";
                        return <>
                          <h3 className="text-base font-semibold text-app-primary">{t("ai_recommended")}: {winnerName}</h3>
                          <p className="text-sm leading-relaxed text-app-secondary">{winner?.reason}</p>
                        </>;
                      })()}
                    </section>
                    <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-3" aria-label={t("ai_overview")}>
                        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-app-primary">{t("ai_overview")}</h3><span className="text-xs text-app-muted">{ranked.length} {t("ai_compared")}</span></div>
                        <div className="space-y-2">
                          {ranked.map((item, index) => {
                            const original = allResults.find(r => r.consultantId === item.consultantId);
                            return <button key={item.consultantId} type="button" onClick={() => setActiveIndex(index)} aria-pressed={activeIndex === index} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${activeIndex === index ? "border-app-brand bg-app-raised" : "border-app-border hover:bg-app-raised"}`}>
                              <span className="w-9 shrink-0 text-sm font-semibold text-app-primary">#{item.rank}</span>
                              <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-app-primary">{original?.consultantName ?? `Consultant #${item.consultantId}`}</span><span className="block text-xs text-app-muted">{t("ai_original_score")}: {original?.score ?? "—"}%</span></span>
                              {index === 0 && <span className="text-xs text-app-brand">{t("ai_recommended")}</span>}
                              <span className="text-app-muted">›</span>
                            </button>;
                          })}
                        </div>
                      </section>
                    <div className="grid grid-cols-1 gap-4">
                      {displayed.map((item) => {
                        const original = allResults.find((r) => r.consultantId === item.consultantId);
                        return (
                          <article key={item.consultantId} className="rounded-xl border border-app-border bg-app-surface p-5 space-y-3">
                            <p className="text-xs font-semibold text-app-brand">AI Rank #{item.rank}</p>
                            <h3 className="text-sm font-semibold text-app-primary">{original?.consultantName ?? `Consultant #${item.consultantId}`}</h3>
                            <p className="text-xs text-app-secondary leading-relaxed">{item.reason}</p>
                            <div><h4 className="text-xs font-semibold text-app-primary">{t("ai_strengths")}</h4><ul className="mt-1 list-disc pl-4 text-xs text-app-secondary space-y-1">{item.strengths.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
                            <div><h4 className="text-xs font-semibold text-app-primary">{t("ai_gaps")}</h4><ul className="mt-1 list-disc pl-4 text-xs text-app-secondary space-y-1">{item.gaps.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
                            <div><h4 className="text-xs font-semibold text-app-primary">{t("ai_evidence")}</h4><ul className="mt-1 list-disc pl-4 text-xs text-app-secondary space-y-1">{item.evidence.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
                          </article>
                        );
                      })}
                    </div>
                    {ranked.length > 1 && <div className="flex items-center justify-between gap-3"><button type="button" disabled={activeIndex === 0} onClick={() => setActiveIndex(i => Math.max(0, i - 1))} className="rounded-md border border-app-border px-4 py-2 text-xs text-app-primary disabled:opacity-40">← {t("ai_previous")}</button><span className="text-xs text-app-muted">{activeIndex + 1} {t("ai_of")} {ranked.length}</span><button type="button" disabled={activeIndex === ranked.length - 1} onClick={() => setActiveIndex(i => Math.min(ranked.length - 1, i + 1))} className="rounded-md border border-app-border px-4 py-2 text-xs text-app-primary disabled:opacity-40">{t("ai_next")} →</button></div>}
          </>
        )}
      </div>
    </div>
  );
}
