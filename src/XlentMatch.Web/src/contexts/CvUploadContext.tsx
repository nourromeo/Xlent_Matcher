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
      <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg border border-app-border bg-app-surface p-4 text-xs text-app-primary shadow-lg">
        <span>{state.fileName} · {t("cv_review")}</span>
        <Link className="ml-3 text-app-brand" to={state.reviewUrl}>{t("cv_review")}</Link>
        <button type="button" className="ml-3 text-app-muted" aria-label={t("common_close")} onClick={dismiss}>×</button>
      </div>
    )}
  </Context.Provider>;
}

export function useCvUpload() {
  const context = useContext(Context);
  if (!context) throw new Error("CvUploadProvider is missing.");
  return context;
}
