import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { aiApi, type ConsultantDraft, type CvAdaptationSuggestion, type TemporaryAssignmentDraft } from "../services/aiApi";
import type { Locale } from "../i18n";

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
  const [state, setState] = useState<AdaptationState>({ phase: "idle", result: null, consultant: null, assignment: null, error: null });
  const running = useRef(false);
  const start = async (resolveConsultant: () => Promise<ConsultantDraft>, resolveAssignment: () => Promise<TemporaryAssignmentDraft>, locale: Locale) => {
    if (running.current) return null;
    running.current = true;
    setState((current) => ({ ...current, phase: "preparing", error: null }));
    try {
      const [consultant, assignment] = await Promise.all([resolveConsultant(), resolveAssignment()]);
      if ((!consultant.firstName && !consultant.lastName && !consultant.skills?.length && !consultant.experiences?.length) || (!assignment.description?.trim() && !assignment.requirements?.length))
        throw new Error("The extracted CV or assignment has insufficient information.");
      setState({ phase: "analysing", result: null, consultant, assignment, error: null });
      const result = await aiApi.suggestTemporaryCvAdaptation(consultant, assignment, locale);
      const completed = { phase: "ready" as const, result, consultant, assignment, error: null };
      setState(completed);
      return completed;
    } catch (error) {
      const failed = { phase: "error" as const, result: null, consultant: null, assignment: null, error: error instanceof Error ? error.message : "Could not prepare or analyze the CV." };
      setState(failed);
      return failed;
    } finally { running.current = false; }
  };
  const clear = () => setState({ phase: "idle", result: null, consultant: null, assignment: null, error: null });
  return <Context.Provider value={{ ...state, start, clear }}>{children}</Context.Provider>;
}

export function useCvAdaptation() {
  const context = useContext(Context);
  if (!context) throw new Error("CvAdaptationProvider is missing.");
  return context;
}
