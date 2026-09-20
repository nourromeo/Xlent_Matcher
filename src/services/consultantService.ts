import type { Consultant } from "../types";
import { apiClient } from "./apiClient";
export const consultantService = { list: () => apiClient.get<Consultant[]>("/consultants"), get: (id: string) => apiClient.get<Consultant>(`/consultants/${id}`) };
