import { apiRequest } from "./api";
import type { ConsultantDraft } from "./aiApi";

export type CvUploadStatus = "Extracting" | "Review" | "Indexed" | "Error";

export type CvUploadRecord = {
  id: number;
  fileName: string;
  fileSize: number;
  status: CvUploadStatus;
  uploadedAt: string;
  errorMessage: string | null;
  consultantId: number | null;
  draftJson: string | null;
  storageKey: string | null;
  contentType: string | null;
  isActive: boolean;
};

export type CvUploadView = CvUploadRecord & {
  draft?: ConsultantDraft;
};

export type ConsultantDetectionMatch = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  title: string | null;
  matchReason: "Email" | "Name";
};

export const cvUploadsApi = {
  detectConsultant: (draft: Pick<ConsultantDraft, "firstName" | "lastName" | "email">) =>
    apiRequest<{ matches: ConsultantDetectionMatch[] }>("/cv-uploads/detect-consultant", {
      method: "POST",
      body: JSON.stringify(draft),
    }),

  getAll: () => apiRequest<CvUploadRecord[]>("/cv-uploads"),

  cleanupAbandoned: () => apiRequest<{ removed: number }>("/cv-uploads/cleanup-abandoned", { method: "POST" }),

  create: (fileName: string, fileSize: number, status: CvUploadStatus = "Extracting", errorMessage: string | null = null) =>
    apiRequest<CvUploadRecord>("/cv-uploads", {
      method: "POST",
      body: JSON.stringify({ fileName, fileSize, status, errorMessage }),
    }),

  update: (
    id: number,
    payload: {
      status: CvUploadStatus;
      errorMessage?: string | null;
      consultantId?: number | null;
      draftJson?: string | null;
    },
  ) =>
    apiRequest<CvUploadRecord>(`/cv-uploads/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  uploadFile: async (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
    const response = await fetch(`${base}/cv-uploads/${id}/file`, { method: "POST", body: form });
    if (!response.ok) {
      const raw = await response.text();
      let code: string | undefined;
      try { code = (JSON.parse(raw) as { code?: string }).code; } catch { /* Plain text error. */ }
      if (response.status === 409 && code === "DUPLICATE_CV") {
        throw new Error("DUPLICATE_CV");
      }
      throw new Error(response.status === 413
        ? "The CV file is too large (maximum 10 MB)."
        : "Could not upload the CV. Please try again.");
    }
    return response.json() as Promise<CvUploadRecord>;
  },

  fileUrl: (id: number) => `${(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "")}/cv-uploads/${id}/file`,

  activate: (id: number) => apiRequest<CvUploadRecord>(`/cv-uploads/${id}/activate`, { method: "POST" }),

  remove: (id: number) =>
    apiRequest<void>(`/cv-uploads/${id}`, {
      method: "DELETE",
    }),
};
