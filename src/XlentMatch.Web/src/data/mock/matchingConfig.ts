export const MATCHING_FACTORS = [
  { key: "mustHave", value: 40, descriptionKey: "admin_factor_must_have_desc" },
  { key: "semantic", value: 20, descriptionKey: "admin_factor_semantic_desc" },
  { key: "experience", value: 15, descriptionKey: "admin_factor_experience_desc" },
  { key: "seniority", value: 10, descriptionKey: "admin_factor_seniority_desc" },
  { key: "niceToHave", value: 5, descriptionKey: "admin_factor_nice_to_have_desc" },
  { key: "availability", value: 10, descriptionKey: "admin_factor_availability_desc" },
] as const;

export type MatchingFactorKey = (typeof MATCHING_FACTORS)[number]["key"];

export const MATCH_WEIGHTS = Object.fromEntries(
  MATCHING_FACTORS.map(({ key, value }) => [key, value]),
) as Record<MatchingFactorKey, number>;
