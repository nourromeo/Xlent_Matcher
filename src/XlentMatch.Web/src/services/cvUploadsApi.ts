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

export const cvUploadsApi = {
  getAll: () => apiRequest<CvUploadRecord[]>("/cv-uploads"),

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
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<CvUploadRecord>;
  },

  fileUrl: (id: number) => `${(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "")}/cv-uploads/${id}/file`,

  activate: (id: number) => apiRequest<CvUploadRecord>(`/cv-uploads/${id}/activate`, { method: "POST" }),

  remove: (id: number) =>
    apiRequest<void>(`/cv-uploads/${id}`, {
      method: "DELETE",
    }),
};
