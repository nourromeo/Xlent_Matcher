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

export type AdminSuggestion = { id: number; name: string; category: string; occurrences: number; firstSeenAt: string };
export type PromptSummary = { promptKey: string; displayName: string; activeVersion: number | null; versionCount: number; updatedAt: string };
export type PromptVersion = { promptKey: string; displayName: string; version: number; content: string; isActive: boolean; changeNote: string | null; createdAt: string };

export type AdminOverview = {
  skills: AdminSkill[];
  suggestions: AdminSuggestion[];
  matchingFactors: AdminMatchingFactor[];
  capabilities: AdminCapability[];
};

export type UpdateAdminSkillRequest = {
  canonicalName: string;
  category: string;
  aliases: string[];
};

export type UpdateMatchingWeightsRequest = {
  mandatoryRequirementWeight: number;
  desiredRequirementWeight: number;
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

  approveSuggestion: (id: number, input: { canonicalName: string; category: string; aliases: string[] }) => apiRequest<void>(`/admin/suggestions/${id}/approve`, { method: "POST", body: JSON.stringify(input) }),

  dismissSuggestion: (id: number) => apiRequest<void>(`/admin/suggestions/${id}`, { method: "DELETE" }),

  deleteSkill: (id: string) => apiRequest<void>(`/admin/skills/${id}`, { method: "DELETE" }),

  updateMatchingWeights: (input: UpdateMatchingWeightsRequest) =>
    apiRequest<AdminOverview>("/admin/matching-weights", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  resetMatchingWeights: () =>
    apiRequest<AdminOverview>("/admin/matching-weights/reset", {
      method: "POST",
    }),

  getPrompts: () => apiRequest<PromptSummary[]>("/admin/prompts"),
  getPromptVersions: (promptKey: string) => apiRequest<PromptVersion[]>(`/admin/prompts/${promptKey}/versions`),
  createPromptVersion: (promptKey: string, input: { content: string; changeNote?: string }) =>
    apiRequest<PromptVersion>(`/admin/prompts/${promptKey}/versions`, { method: "POST", body: JSON.stringify(input) }),
  activatePromptVersion: (promptKey: string, version: number) =>
    apiRequest<PromptVersion>(`/admin/prompts/${promptKey}/versions/${version}/activate`, { method: "POST" }),
};
