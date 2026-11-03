import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { matchingApi, type AiRankingResult } from "../services/matchingApi";
import type { MatchResultApi } from "../types";
import { useI18n, type Locale } from "../i18n";

export type PendingAiRanking = {
  id: string;
  assignmentId: number;
  ranking: AiRankingResult;
  matches: MatchResultApi[];
  selected: number[];
  createdAt: string;
};

type AiRankingContextValue = {
  pending: PendingAiRanking[];
  start: (assignmentId: number, consultantIds: number[], locale: Locale, matches: MatchResultApi[]) => Promise<{ ranking: AiRankingResult; completedAway: boolean } | null>;
  removePending: (id: string) => void;
  getPending: (id: string) => PendingAiRanking | null;
};

const Context = createContext<AiRankingContextValue | null>(null);
const storageKey = "xlent-ai-ranking-pending-v1";

function loadPending(): PendingAiRanking[] {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey) || "[]") as PendingAiRanking[];
  } catch {
    return [];
  }
}

export function AiRankingProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const running = useRef(false);
  const leftDuringRun = useRef(false);
  const [pending, setPending] = useState<PendingAiRanking[]>(loadPending);
  const [toastId, setToastId] = useState<string | null>(null);

  useEffect(() => {
    if (running.current && !location.pathname.startsWith("/matching/")) leftDuringRun.current = true;
    if (running.current && locationRef.current.startsWith("/matching/") && !location.pathname.includes("/ai-ranking")) leftDuringRun.current = true;
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const persist = (next: PendingAiRanking[]) => {
    setPending(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Storage is optional. */ }
  };

  const start = async (assignmentId: number, consultantIds: number[], locale: Locale, matches: MatchResultApi[]) => {
    if (running.current) return null;
    running.current = true;
    leftDuringRun.current = false;
    try {
      const ranking = await matchingApi.rankWithAi(assignmentId, consultantIds, locale);
      const completedAway = leftDuringRun.current || !locationRef.current.includes(`/matching/${assignmentId}/ai-ranking`);
      if (completedAway) {
        const item: PendingAiRanking = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          assignmentId,
          ranking,
          matches,
          selected: consultantIds,
          createdAt: new Date().toISOString(),
        };
        persist([...pending, item]);
        setToastId(item.id);
      }
      return { ranking, completedAway };
    } catch (error) {
      throw error instanceof Error ? error : new Error(t("ranking_compare_error"));
    } finally {
      running.current = false;
    }
  };

  const removePending = (id: string) => {
    persist(pending.filter(item => item.id !== id));
    if (toastId === id) setToastId(null);
  };
  const getPending = (id: string) => pending.find(item => item.id === id) ?? null;
  const toast = pending.find(item => item.id === toastId) ?? null;

  useEffect(() => {
    if (!toastId) return;
    const timer = window.setTimeout(() => setToastId(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toastId]);

  return <Context.Provider value={{ pending, start, removePending, getPending }}>
    {children}
    {toast && !location.pathname.includes("/ai-ranking") && (
      <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-app-border bg-app-surface p-4 text-xs text-app-primary shadow-lg">
        <p className="font-semibold">{t("ai_ranking_toast_title")}</p>
        <p className="mt-1 text-app-secondary">{t("ai_ranking_toast_ready")}</p>
        <Link className="mt-2 inline-flex text-app-brand hover:underline" to={`/matching/${toast.assignmentId}/ai-ranking/results?pendingId=${toast.id}`} onClick={() => setToastId(null)}>{t("ranking_view")}</Link>
      </div>
    )}
  </Context.Provider>;
}

export function useAiRanking() {
  const context = useContext(Context);
  if (!context) throw new Error("AiRankingProvider is missing.");
  return context;
}
