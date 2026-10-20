import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { assignmentsApi } from "../services/assignmentsApi";
import { matchingApi } from "../services/matchingApi";
import type { AssignmentApi, MatchResultApi } from "../types";

export default function AiRankingSelection() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const id = Number(assignmentId);
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<AssignmentApi | null>(null);
  const [results, setResults] = useState<MatchResultApi[]>([]);
  const [eligible, setEligible] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [replaceId, setReplaceId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

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

  const options = useMemo(() => results.filter(r =>
    !selected.includes(r.consultantId) &&
    (r.consultantName + " " + r.consultantId).toLocaleLowerCase().includes(search.toLocaleLowerCase())
  ), [results, selected, search]);

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
        <Link to={`/matching/${id}`} className="text-xs text-app-muted hover:text-app-brand">← Tillbaka till matchningsresultat</Link>
        <div>
          <h1 className="text-xl font-semibold text-app-primary">AI Ranking · Välj konsulter</h1>
          <p className="mt-1 text-xs text-app-muted">{assignment ? `${assignment.title} · ${assignment.referenceNumber}` : "Välj 2–5 konsulter med original-CV för jämförelse."}</p>
        </div>
        {loading ? <p className="text-sm text-app-muted">Laddar konsulter och CV-status...</p> : (
          <>
            <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-app-primary">Valda för AI-jämförelse</h2>
                <span className="text-xs text-app-muted">{selected.length} av 5</span>
              </div>
              <p className="text-xs text-app-muted">De två högst rankade konsulterna med tillgängligt CV är förvalda. Du kan byta ut dem.</p>
              {selected.length === 5 && <p className="text-xs text-app-muted">Fem platser är fyllda. Klicka på Byt vid en konsult för att välja en ersättare.</p>}
              {selected.map(consultantId => {
                const person = results.find(r => r.consultantId === consultantId);
                return (
                  <div key={consultantId} className="flex items-center gap-3 rounded-lg border border-app-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-app-primary">{person?.consultantName ?? consultantId}</p>
                      <p className="text-xs text-app-muted">Match Score {person?.score ?? "—"}% · CV finns</p>
                    </div>
                    <button type="button" onClick={() => { setReplaceId(consultantId); setOpen(true); }} className="text-xs text-app-brand hover:underline">Byt</button>
                    <button type="button" onClick={() => { setSelected(v => v.filter(x => x !== consultantId)); setReplaceId(null); }} className="text-xs text-app-muted hover:text-app-primary" aria-label={`Ta bort ${person?.consultantName}`}>Ta bort ×</button>
                  </div>
                );
              })}
              <button type="button" onClick={() => setOpen(v => !v)} className="w-full rounded-md border border-app-border bg-app px-4 py-2.5 text-left text-sm text-app-secondary hover:bg-app-raised">
                {replaceId !== null ? "Välj ersättare" : "Sök och välj konsult"} {open ? "⌃" : "⌄"}
              </button>
              {open && (
                <div className="rounded-lg border border-app-border p-2 space-y-2">
                  <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök namn..." aria-label="Sök konsult" className="w-full rounded-md border border-app-border bg-app px-3 py-2 text-sm text-app-primary outline-none focus:border-app-brand" />
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {options.map(person => {
                      const hasCv = eligible.includes(person.consultantId);
                      return (
                        <button key={person.consultantId} type="button" disabled={!hasCv || (replaceId === null && selected.length >= 5)} onClick={() => { setSelected(v => replaceId !== null ? v.map(id => id === replaceId ? person.consultantId : id) : v.length >= 5 ? v : [...v, person.consultantId]); setReplaceId(null); setSearch(""); setOpen(false); }} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-app-raised disabled:opacity-50 disabled:cursor-not-allowed">
                          <span className="min-w-0"><span className="block text-sm text-app-primary">{person.consultantName}</span><span className="text-xs text-app-muted">Match Score {person.score}%</span></span>
                          <span className={`shrink-0 text-xs ${hasCv ? "text-app-success" : "text-app-warning"}`}>{hasCv ? "CV finns" : "CV saknas"}</span>
                        </button>
                      );
                    })}
                    {options.length === 0 && <p className="p-3 text-xs text-app-muted">Inga konsulter hittades.</p>}
                  </div>
                </div>
              )}
              <button type="button" onClick={() => { setSelected(results.filter(r => eligible.includes(r.consultantId)).slice(0, 2).map(r => r.consultantId)); setReplaceId(null); }} className="text-xs text-app-brand hover:underline">Återställ automatiskt val</button>
            </section>
            {eligible.length < 2 && <p className="rounded-lg border border-app-border p-3 text-xs text-app-warning">Minst två konsulter med tillgängliga original-CV:n krävs för AI Ranking.</p>}
            {error && <p role="alert" className="rounded-lg border border-app-border p-3 text-xs text-app-danger">{error}</p>}
            <div className="flex justify-end">
              <button type="button" disabled={selected.length < 2 || selected.length > 5 || running} onClick={() => void run()} className="rounded-md bg-app-brand px-5 py-2.5 text-sm font-medium text-app-on-brand disabled:opacity-50">{running ? "Analyserar original-CV:n..." : "Jämför med AI →"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
