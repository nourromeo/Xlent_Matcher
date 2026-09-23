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

  remove: (id: number) =>
    apiRequest<void>(`/cv-uploads/${id}`, {
      method: "DELETE",
    }),
};
