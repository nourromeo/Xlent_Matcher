import type { MatchResultApi, RunMatchingRequest } from "../types";
import { apiRequest } from "./api";

export type AiRankedConsultant = { consultantId: number; rank: number; reason: string; strengths: string[]; gaps: string[]; evidence: string[] };
export type AiRankingResult = { rankings: AiRankedConsultant[]; skippedWithoutCv: number };

export type SavedAiRankingSummary = { id: number; createdAt: string; consultantCount: number; bestMatch: string };
export type SavedAiRankingDetail = { id: number; createdAt: string; snapshot: { rankings: AiRankedConsultant[]; matches: { consultantId: number; consultantName: string; score: number }[]; skippedWithoutCv: number } };

export const matchingApi = {
  saveAiRanking: (assignmentId: number, ranking: AiRankingResult) =>
    apiRequest<{ id: number; createdAt: string }>(`/matching/assignment/${assignmentId}/saved-ai-rankings`, { method: "POST", body: JSON.stringify({ rankings: ranking.rankings }) }),
  listSavedAiRankings: (assignmentId: number) =>
    apiRequest<SavedAiRankingSummary[]>(`/matching/assignment/${assignmentId}/saved-ai-rankings`),
  getSavedAiRanking: (assignmentId: number, savedId: number) =>
    apiRequest<SavedAiRankingDetail>(`/matching/assignment/${assignmentId}/saved-ai-rankings/${savedId}`),
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
