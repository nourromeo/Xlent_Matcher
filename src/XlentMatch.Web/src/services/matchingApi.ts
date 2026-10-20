import type { MatchResultApi, RunMatchingRequest } from "../types";
import { apiRequest } from "./api";

export type AiRankedConsultant = { consultantId: number; rank: number; reason: string; strengths: string[]; gaps: string[]; evidence: string[] };
export type AiRankingResult = { rankings: AiRankedConsultant[]; skippedWithoutCv: number };

export const matchingApi = {
  getFreshness: (assignmentId: number) => apiRequest<{ isOutdated: boolean; newConsultants: number }>(`/matching/assignment/${assignmentId}/freshness`),
  getAiEligibility: (assignmentId: number) =>
    apiRequest<{ eligibleConsultantIds: number[] }>(`/matching/assignment/${assignmentId}/ai-eligibility`),
  rankWithAi: (assignmentId: number, consultantIds: number[]) =>
    apiRequest<AiRankingResult>(`/matching/assignment/${assignmentId}/ai-ranking`, { method: "POST", body: JSON.stringify({ consultantIds }) }),

  run: (request: RunMatchingRequest) =>
    apiRequest<MatchResultApi[]>("/matching/run", {
      method: "POST",
      body: JSON.stringify(request),
    }),

  getForAssignment: (assignmentId: number) =>
    apiRequest<MatchResultApi[]>(`/matching/assignment/${assignmentId}`),
};
