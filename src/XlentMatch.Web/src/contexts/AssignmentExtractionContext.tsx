import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../i18n";
import { aiApi, type RequirementExtractionResult } from "../services/aiApi";

type ExtractionState = {
  phase: "idle" | "extracting" | "ready" | "error";
  fileName: string;
  result: RequirementExtractionResult | null;
  error: string | null;
};
type ExtractionContextValue = ExtractionState & {
  start: (file: File | null, text: string, metadata?: { title: string; client: string }) => Promise<RequirementExtractionResult | null>;
  clear: () => void;
  drafts: AssignmentReviewDraft[];
  acknowledgeDraft: (id: string) => void;
  removeDraft: (id: string) => void;
};
export type AssignmentReviewDraft = {
  id: string;
  title: string;
  client: string;
  fileName: string;
  result: RequirementExtractionResult;
  createdAt: string;
  isNew: boolean;
};
const Context = createContext<ExtractionContextValue | null>(null);
const storageKey = "xlent-assignment-extraction-v1";
const draftsKey = "xlent-assignment-review-queue-v1";

function loadSaved(): ExtractionState {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw) as ExtractionState;
  } catch { /* Storage is optional. */ }
  return { phase: "idle", fileName: "", result: null, error: null };
}

export function AssignmentExtractionProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const [state, setState] = useState<ExtractionState>(loadSaved);
  const [drafts, setDrafts] = useState<AssignmentReviewDraft[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(draftsKey) || "[]") as AssignmentReviewDraft[]; } catch { return []; }
  });
  const running = useRef(false);
  const leftDuringRun = useRef(false);
  useEffect(() => {
    if (running.current && !location.pathname.startsWith("/client-assignments")) leftDuringRun.current = true;
    locationRef.current = location.pathname;
  }, [location.pathname]);
  const persistDrafts = (next: AssignmentReviewDraft[]) => {
    setDrafts(next);
    try { sessionStorage.setItem(draftsKey, JSON.stringify(next)); } catch { /* optional */ }
  };
  const persist = (next: ExtractionState) => {
    setState(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Storage is optional. */ }
  };
  const start = async (file: File | null, text: string, metadata = { title: "", client: "" }) => {
    if (running.current) return null;
    running.current = true;
    leftDuringRun.current = false;
    persist({ phase: "extracting", fileName: file?.name ?? "", result: null, error: null });
    try {
      const result = file
        ? await aiApi.extractRequirementsFromFile(file)
        : await aiApi.extractRequirementsFromText(text);
      persist({ phase: "ready", fileName: file?.name ?? "", result, error: null });
      if (leftDuringRun.current || !locationRef.current.startsWith("/client-assignments")) {
        const draft: AssignmentReviewDraft = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: metadata.title, client: metadata.client, fileName: file?.name ?? "", result, createdAt: new Date().toISOString(), isNew: true };
        persistDrafts([...drafts, draft]);
      }
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
  const acknowledgeDraft = (id: string) => persistDrafts(drafts.map((draft) => draft.id === id ? { ...draft, isNew: false } : draft));
  const removeDraft = (id: string) => persistDrafts(drafts.filter((draft) => draft.id !== id));
  const [toastDraftId, setToastDraftId] = useState<string | null>(null);
  const toastDraft = drafts.find((draft) => draft.id === toastDraftId && draft.isNew) ?? drafts.find((draft) => draft.isNew) ?? null;
  useEffect(() => {
    if (!toastDraft) { setToastDraftId(null); return; }
    if (toastDraftId !== toastDraft.id) setToastDraftId(toastDraft.id);
    const timer = window.setTimeout(() => {
      const next = drafts.find((draft) => draft.isNew && draft.id !== toastDraft.id);
      setToastDraftId(next?.id ?? null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [drafts, toastDraftId, toastDraft?.id]);
  return <Context.Provider value={{ ...state, start, clear, drafts, acknowledgeDraft, removeDraft }}>
    {children}
    {toastDraft && toastDraftId === toastDraft.id && !location.pathname.startsWith("/client-assignments") && (
      <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-app-border bg-app-surface p-4 text-xs text-app-primary shadow-lg">
        <p className="font-semibold">{t("assignment_toast_title")}</p>
        <p className="mt-1 truncate text-app-secondary">{t("assignment_toast_ready")}</p>
        <Link className="mt-2 inline-flex text-app-brand hover:underline" to={`/client-assignments/new?draftId=${toastDraft.id}`} onClick={() => acknowledgeDraft(toastDraft.id)}>{t("cv_review_now")}</Link>
      </div>
    )}
  </Context.Provider>;
}

export function useAssignmentExtraction() {
  const context = useContext(Context);
  if (!context) throw new Error("AssignmentExtractionProvider is missing.");
  return context;
}
