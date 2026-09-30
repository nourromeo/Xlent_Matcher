import { apiRequest } from "./api";

export type AdminSkill = {
  id: string;
  canonical: string;
  category: string;
  aliases: string[];
  consultantCount: number;
};

export type AdminMatchingFactor = {
  key: string;
  label: string;
  value: number;
  description: string;
};

export type AdminCapability = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type PendingLanguage = { id: number; name: string; occurrences: number; firstSeenAt: string };

export type AdminOverview = {
  skills: AdminSkill[];
  pendingLanguages: PendingLanguage[];
  matchingFactors: AdminMatchingFactor[];
  missingMandatoryPenalty: number;
  capabilities: AdminCapability[];
};

export type UpdateAdminSkillRequest = {
  canonicalName: string;
  category: string;
  aliases: string[];
};

export type UpdateMatchingWeightsRequest = {
  mandatoryWeight: number;
  desiredWeight: number;
  experienceWeight: number;
  missingMandatoryPenalty: number;
};

export const adminApi = {
  getOverview: () => apiRequest<AdminOverview>("/admin/overview"),

  createSkill: (input: UpdateAdminSkillRequest) =>
    apiRequest<AdminSkill>("/admin/skills", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateSkill: (id: string, input: UpdateAdminSkillRequest) =>
    apiRequest<AdminSkill>(`/admin/skills/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  approveLanguage: (id: number) => apiRequest<void>(`/admin/languages/${id}/approve`, { method: "POST" }),

  dismissLanguage: (id: number) => apiRequest<void>(`/admin/languages/${id}`, { method: "DELETE" }),

  updateMatchingWeights: (input: UpdateMatchingWeightsRequest) =>
    apiRequest<AdminOverview>("/admin/matching-weights", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  resetMatchingWeights: () =>
    apiRequest<AdminOverview>("/admin/matching-weights/reset", {
      method: "POST",
    }),
};
