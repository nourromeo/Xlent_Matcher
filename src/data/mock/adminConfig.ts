export const ADMIN_TABS = ["taxonomy", "weights", "prompts", "flags"] as const;
export type AdminTab = typeof ADMIN_TABS[number];

export const WEIGHTS_CONFIG = [
  { key: "mustHaveCoverage", value: 40, desc: "Strong penalty if a required skill is missing" },
  { key: "semanticSimilarity", value: 20, desc: "Post-rerank cosine similarity score" },
  { key: "experienceRecency", value: 15, desc: "Weighted by 0.85^(yearNow - lastUsedYear)" },
  { key: "seniority", value: 10, desc: "How well consultant seniority matches the assignment level" },
  { key: "niceToHave", value: 5, desc: "Optional skills coverage" },
  { key: "availability", value: 10, desc: "Practical fit factors" },
] as const;
