import type { MatchResultApi, RunMatchingRequest } from "../types";
import { apiRequest } from "./api";

export const matchingApi = {
  run: (request: RunMatchingRequest) =>
    apiRequest<MatchResultApi[]>("/matching/run", {
      method: "POST",
      body: JSON.stringify(request),
    }),

  getForAssignment: (assignmentId: number) =>
    apiRequest<MatchResultApi[]>(`/matching/assignment/${assignmentId}`),
};
