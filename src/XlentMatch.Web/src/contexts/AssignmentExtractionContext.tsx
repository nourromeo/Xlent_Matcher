import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { aiApi, type RequirementExtractionResult } from "../services/aiApi";

type ExtractionState = {
  phase: "idle" | "extracting" | "ready" | "error";
  fileName: string;
  result: RequirementExtractionResult | null;
  error: string | null;
};
type ExtractionContextValue = ExtractionState & {
  start: (file: File | null, text: string) => Promise<RequirementExtractionResult | null>;
  clear: () => void;
};
const Context = createContext<ExtractionContextValue | null>(null);
const storageKey = "xlent-assignment-extraction-v1";

function loadSaved(): ExtractionState {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw) as ExtractionState;
  } catch { /* Storage is optional. */ }
  return { phase: "idle", fileName: "", result: null, error: null };
}

export function AssignmentExtractionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExtractionState>(loadSaved);
  const running = useRef(false);
  const persist = (next: ExtractionState) => {
    setState(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Storage is optional. */ }
  };
  const start = async (file: File | null, text: string) => {
    if (running.current) return null;
    running.current = true;
    persist({ phase: "extracting", fileName: file?.name ?? "", result: null, error: null });
    try {
      const result = file
        ? await aiApi.extractRequirementsFromFile(file)
        : await aiApi.extractRequirementsFromText(text);
      persist({ phase: "ready", fileName: file?.name ?? "", result, error: null });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not extract assignment requirements.";
      persist({ phase: "error", fileName: file?.name ?? "", result: null, error: message });
      return null;
    } finally { running.current = false; }
  };
  const clear = () => {
    const next = { phase: "idle" as const, fileName: "", result: null, error: null };
    persist(next);
  };
  return <Context.Provider value={{ ...state, start, clear }}>{children}</Context.Provider>;
}

export function useAssignmentExtraction() {
  const context = useContext(Context);
  if (!context) throw new Error("AssignmentExtractionProvider is missing.");
  return context;
}
