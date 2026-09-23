import type { AssignmentApi } from "../types";
import { apiRequest } from "./api";

export const assignmentsApi = {
  getAll: () => apiRequest<AssignmentApi[]>("/assignments"),

  getById: (id: number) => apiRequest<AssignmentApi>(`/assignments/${id}`),

  create: (assignment: AssignmentApi) =>
    apiRequest<AssignmentApi>("/assignments", {
      method: "POST",
      body: JSON.stringify(assignment),
    }),

  update: (id: number, assignment: AssignmentApi) =>
    apiRequest<AssignmentApi>(`/assignments/${id}`, {
      method: "PUT",
      body: JSON.stringify(assignment),
    }),

  remove: (id: number) =>
    apiRequest<void>(`/assignments/${id}`, {
      method: "DELETE",
    }),
};
