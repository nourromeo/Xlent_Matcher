import type { Match } from "../types";
import { apiClient } from "./apiClient";
export const matchingService = { run: (assignmentId: string) => apiClient.post<Match[]>(`/assignments/${assignmentId}/matches`, {}) };
