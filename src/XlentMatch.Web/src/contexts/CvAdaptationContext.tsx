import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { aiApi, type ConsultantDraft, type CvAdaptationSuggestion, type TemporaryAssignmentDraft } from "../services/aiApi";
import { useI18n, type Locale } from "../i18n";

type AdaptationState = {
  phase: "idle" | "preparing" | "analysing" | "ready" | "error";
  result: CvAdaptationSuggestion | null;
  consultant: ConsultantDraft | null;
  assignment: TemporaryAssignmentDraft | null;
  error: string | null;
};
type AdaptationContextValue = AdaptationState & {
  start: (consultant: () => Promise<ConsultantDraft>, assignment: () => Promise<TemporaryAssignmentDraft>, locale: Locale) => Promise<AdaptationState | null>;
  clear: () => void;
};
const Context = createContext<AdaptationContextValue | null>(null);

export function CvAdaptationProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const running = useRef(false);
  const leftDuringRun = useRef(false);
  const [toastVisible, setToastVisible] = useState(false);
  useEffect(() => {
    if (running.current && !location.pathname.startsWith("/cv-adaptation")) leftDuringRun.current = true;
    locationRef.current = location.pathname;
  }, [location.pathname]);
  const [state, setState] = useState<AdaptationState>({ phase: "idle", result: null, consultant: null, assignment: null, error: null });
  const start = async (resolveConsultant: () => Promise<ConsultantDraft>, resolveAssignment: () => Promise<TemporaryAssignmentDraft>, locale: Locale) => {
    if (running.current) return null;
    running.current = true;
    leftDuringRun.current = false;
    setState((current) => ({ ...current, phase: "preparing", error: null }));
    try {
      const [consultant, assignment] = await Promise.all([resolveConsultant(), resolveAssignment()]);
      if ((!consultant.firstName && !consultant.lastName && !consultant.skills?.length && !consultant.experiences?.length) || (!assignment.description?.trim() && !assignment.requirements?.length))
        throw new Error("The extracted CV or assignment has insufficient information.");
      setState({ phase: "analysing", result: null, consultant, assignment, error: null });
      const result = await aiApi.suggestTemporaryCvAdaptation(consultant, assignment, locale);
      const completed = { phase: "ready" as const, result, consultant, assignment, error: null };
      setState(completed);
      if (leftDuringRun.current || !locationRef.current.startsWith("/cv-adaptation")) setToastVisible(true);
      return completed;
    } catch (error) {
      const failed = { phase: "error" as const, result: null, consultant: null, assignment: null, error: error instanceof Error ? error.message : "Could not prepare or analyze the CV." };
      setState(failed);
      return failed;
    } finally { running.current = false; }
  };
  const clear = () => {
    setToastVisible(false);
    setState({ phase: "idle", result: null, consultant: null, assignment: null, error: null });
  };
  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [toastVisible]);
  return <Context.Provider value={{ ...state, start, clear }}>
    {children}
    {toastVisible && state.phase === "ready" && !location.pathname.startsWith("/cv-adaptation") && (
      <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-app-border bg-app-surface p-4 text-xs text-app-primary shadow-lg">
        <p className="font-semibold">{t("adaptation_title")}</p>
        <p className="mt-1 text-app-secondary">{t("cv_ready_for_review")}</p>
        <Link className="mt-2 inline-flex text-app-brand hover:underline" to="/cv-adaptation" onClick={() => setToastVisible(false)}>{t("cv_review_now")}</Link>
      </div>
    )}
  </Context.Provider>;
}

export function useCvAdaptation() {
  const context = useContext(Context);
  if (!context) throw new Error("CvAdaptationProvider is missing.");
  return context;
}
