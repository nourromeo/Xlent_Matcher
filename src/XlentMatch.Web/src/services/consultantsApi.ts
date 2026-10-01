import type { Consultant } from "../types";
import { apiRequest } from "./api";

export const consultantsApi = {
  getAll: () => apiRequest<Consultant[]>("/consultants"),

  getById: (id: number, signal?: AbortSignal) => apiRequest<Consultant>(`/consultants/${id}`, { signal }),

  create: (consultant: Consultant, cvUploadId?: number) =>
    apiRequest<Consultant>(
      `/consultants${cvUploadId ? `?cvUploadId=${cvUploadId}` : ""}`,
      {
        method: "POST",
        body: JSON.stringify(consultant),
      },
    ),

  update: (id: number, consultant: Consultant) =>
    apiRequest<Consultant>(`/consultants/${id}`, {
      method: "PUT",
      body: JSON.stringify(consultant),
    }),

  remove: (id: number) =>
    apiRequest<void>(`/consultants/${id}`, {
      method: "DELETE",
    }),
};
