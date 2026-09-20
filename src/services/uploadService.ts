import { apiClient } from "./apiClient";
export const uploadService = { createJob: (file: File) => { const body = new FormData(); body.append("file", file); return apiClient.post<{ jobId: string }>("/uploads", body); } };
