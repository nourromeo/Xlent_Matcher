import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useI18n } from "../i18n";
import { aiApi } from "../services/aiApi";
import { cvUploadsApi } from "../services/cvUploadsApi";

type UploadState = {
  phase: "idle" | "uploading" | "extracting" | "ready" | "error";
  fileName: string;
  reviewUrl?: string;
  error?: string;
};
type UploadContext = {
  state: UploadState;
  start: (file: File, consultantId: number | null) => Promise<string | null>;
  dismiss: () => void;
};
const Context = createContext<UploadContext | null>(null);

export function CvUploadProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const location = useLocation();
  const [state, setState] = useState<UploadState>({ phase: "idle", fileName: "" });
  const running = useRef(false);
  const start = async (file: File, consultantId: number | null) => {
    if (running.current) return null;
    running.current = true;
    let uploadId: number | null = null;
    setState({ phase: "uploading", fileName: file.name });
    try {
      const record = await cvUploadsApi.create(file.name, file.size);
      uploadId = record.id;
      await cvUploadsApi.uploadFile(record.id, file);
      setState({ phase: "extracting", fileName: file.name });
      const extracted = await aiApi.extractConsultantFromFile(file);
      await cvUploadsApi.update(record.id, {
        status: "Review", consultantId,
        draftJson: JSON.stringify(extracted), errorMessage: null,
      });
      const reviewUrl = `/cv-upload/review?uploadId=${record.id}${consultantId ? `&replaceConsultantId=${consultantId}` : ""}`;
      setState({ phase: "ready", fileName: file.name, reviewUrl });
      return reviewUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not process the CV.";
      if (uploadId !== null) {
        try {
          if (message.includes("DUPLICATE_CV")) await cvUploadsApi.remove(uploadId);
          else await cvUploadsApi.update(uploadId, { status: "Error", errorMessage: message });
        } catch { /* Keep the original error visible. */ }
      }
      setState({ phase: "error", fileName: file.name, error: message });
      return null;
    } finally { running.current = false; }
  };
  const dismiss = () => {
    if (!running.current) setState({ phase: "idle", fileName: "" });
  };
  return <Context.Provider value={{ state, start, dismiss }}>
    {children}
    {state.phase === "ready" && state.reviewUrl && !location.pathname.startsWith("/cv-upload") && (
      <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-app-border bg-app-surface p-4 text-xs text-app-primary shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-app-primary">{t("cv_ready_for_review")}</p>
            <p className="mt-1 truncate text-app-secondary">{state.fileName}</p>
          </div>
          <button type="button" className="text-lg leading-none text-app-muted hover:text-app-primary" aria-label={t("common_close")} onClick={dismiss}>×</button>
        </div>
        <Link className="mt-3 inline-flex rounded-md bg-app-brand px-3 py-2 font-semibold text-white" to={state.reviewUrl}>{t("cv_review_now")}</Link>
      </div>
    )}
  </Context.Provider>;
}

export function useCvUpload() {
  const context = useContext(Context);
  if (!context) throw new Error("CvUploadProvider is missing.");
  return context;
}
