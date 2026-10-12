import type { MatchResultApi, RunMatchingRequest } from "../types";
import { apiRequest } from "./api";

export type AiRankedConsultant = { consultantId: number; rank: number; reason: string; strengths: string[]; gaps: string[]; evidence: string[] };
export type AiRankingResult = { rankings: AiRankedConsultant[]; skippedWithoutCv: number };

export const matchingApi = {
  rankWithAi: (assignmentId: number) =>
    apiRequest<AiRankingResult>(`/matching/assignment/${assignmentId}/ai-ranking`, { method: "POST" }),

  run: (request: RunMatchingRequest) =>
    apiRequest<MatchResultApi[]>("/matching/run", {
      method: "POST",
      body: JSON.stringify(request),
    }),

  getForAssignment: (assignmentId: number) =>
    apiRequest<MatchResultApi[]>(`/matching/assignment/${assignmentId}`),
};
