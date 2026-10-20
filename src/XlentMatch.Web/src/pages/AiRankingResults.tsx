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

  return (
    <div className="h-full overflow-auto bg-app p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Link to={`/matching/${assignmentId}/ai-ranking`} className="text-xs text-app-muted hover:text-app-brand">← Tillbaka till val av konsulter</Link>
        <div>
          <h1 className="text-sm font-semibold text-app-primary">AI Ranking · Original CVs</h1>
          <p className="mt-1 text-xs text-app-muted">AI comparison based on the two selected original CV documents and the assignment. Match Score is unchanged.</p>
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
    </div>
  );
}
