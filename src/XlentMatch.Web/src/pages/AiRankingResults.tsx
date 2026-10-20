import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { AiRankingResult } from "../services/matchingApi";
import type { MatchResultApi } from "../types";

type ResultState = { ranking: AiRankingResult; matches: MatchResultApi[]; selected: number[] };

export default function AiRankingResults() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const location = useLocation();
  const state = location.state as ResultState | null;
  const aiRanking = state?.ranking;
  const allResults = state?.matches ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const ranked = [...(aiRanking?.rankings ?? [])].sort((a, b) => a.rank - b.rank);
  const displayed = ranked.slice(activeIndex, activeIndex + 1);

  return (
    <div className="h-full overflow-auto bg-app p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Link to={`/matching/${assignmentId}/ai-ranking`} className="text-xs text-app-muted hover:text-app-brand">← Tillbaka till val av konsulter</Link>
        <div>
          <h1 className="text-sm font-semibold text-app-primary">AI Ranking · Original CVs</h1>
        </div>
        {!aiRanking ? (
          <div className="rounded-xl border border-app-border bg-app-surface p-6">
            <p className="text-sm text-app-primary">Ingen AI-jämförelse tillgänglig.</p>
            <p className="mt-2 text-xs text-app-muted">Välj konsulter och kör analysen igen. Resultatet lagras inte när sidan uppdateras.</p>
            <Link to={`/matching/${assignmentId}/ai-ranking`} className="mt-3 inline-block text-xs text-app-brand hover:underline">Välj konsulter →</Link>
          </div>
        ) : (
          <>
                    <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-2" aria-label="AI comparison summary">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">AI Comparison Summary</p>
                      {(() => {
                        const winner = aiRanking.rankings.find((item) => item.rank === 1);
                        const winnerName = allResults.find((item) => item.consultantId === winner?.consultantId)?.consultantName ?? "Consultant";
                        return <>
                          <h3 className="text-base font-semibold text-app-primary">Recommended: {winnerName}</h3>
                          <p className="text-sm leading-relaxed text-app-secondary">{winner?.reason}</p>
                        </>;
                      })()}
                    </section>
                    {(
                      <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-3" aria-label="AI Ranking Overview">
                        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-app-primary">AI Ranking Overview</h3><span className="text-xs text-app-muted">{ranked.length} jämförda</span></div>
                        <div className="space-y-2">
                          {ranked.map((item, index) => {
                            const original = allResults.find(r => r.consultantId === item.consultantId);
                            return <button key={item.consultantId} type="button" onClick={() => setActiveIndex(index)} aria-pressed={activeIndex === index} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${activeIndex === index ? "border-app-brand bg-app-raised" : "border-app-border hover:bg-app-raised"}`}>
                              <span className="w-9 shrink-0 text-sm font-semibold text-app-primary">#{item.rank}</span>
                              <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-app-primary">{original?.consultantName ?? `Consultant #${item.consultantId}`}</span><span className="block text-xs text-app-muted">Original Match Score: {original?.score ?? "—"}%</span></span>
                              {index === 0 && <span className="text-xs text-app-brand">Recommended</span>}
                              <span className="text-app-muted">›</span>
                            </button>;
                          })}
                        </div>
                      </section>
                    )}
                    <div className="grid grid-cols-1 gap-4">
                      {displayed.map((item) => {
                        const original = allResults.find((r) => r.consultantId === item.consultantId);
                        return (
                          <article key={item.consultantId} className="rounded-xl border border-app-border bg-app-surface p-5 space-y-3">
                            <p className="text-xs font-semibold text-app-brand">AI Rank #{item.rank}</p>
                            <h3 className="text-sm font-semibold text-app-primary">{original?.consultantName ?? `Consultant #${item.consultantId}`}</h3>
                            <p className="text-xs text-app-secondary leading-relaxed">{item.reason}</p>
                            <div><h4 className="text-xs font-semibold text-app-primary">Strengths</h4><ul className="mt-1 list-disc pl-4 text-xs text-app-secondary space-y-1">{item.strengths.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
                            <div><h4 className="text-xs font-semibold text-app-primary">Gaps</h4><ul className="mt-1 list-disc pl-4 text-xs text-app-secondary space-y-1">{item.gaps.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
                            <div><h4 className="text-xs font-semibold text-app-primary">CV Evidence</h4><ul className="mt-1 list-disc pl-4 text-xs text-app-secondary space-y-1">{item.evidence.map((v, i) => <li key={i}>{v}</li>)}</ul></div>
                          </article>
                        );
                      })}
                    </div>
                    {ranked.length > 1 && <div className="flex items-center justify-between gap-3"><button type="button" disabled={activeIndex === 0} onClick={() => setActiveIndex(i => Math.max(0, i - 1))} className="rounded-md border border-app-border px-4 py-2 text-xs text-app-primary disabled:opacity-40">← Föregående</button><span className="text-xs text-app-muted">{activeIndex + 1} av {ranked.length}</span><button type="button" disabled={activeIndex === ranked.length - 1} onClick={() => setActiveIndex(i => Math.min(ranked.length - 1, i + 1))} className="rounded-md border border-app-border px-4 py-2 text-xs text-app-primary disabled:opacity-40">Nästa konsult →</button></div>}
          </>
        )}
      </div>
    </div>
  );
}
