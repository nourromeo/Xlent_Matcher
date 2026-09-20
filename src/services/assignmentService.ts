import type { Assignment } from "../types";
import { apiClient } from "./apiClient";
export const assignmentService = { list: () => apiClient.get<Assignment[]>("/assignments"), get: (id: string) => apiClient.get<Assignment>(`/assignments/${id}`), create: (assignment: Omit<Assignment, "id">) => apiClient.post<Assignment>("/assignments", assignment), update: (id: string, assignment: Partial<Assignment>) => apiClient.put<Assignment>(`/assignments/${id}`, assignment) };
