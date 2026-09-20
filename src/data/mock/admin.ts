import type { FeatureFlag, Skill } from "../../types";

export const SKILLS: Skill[] = [
  { id: "s1", canonical: "Go", aliases: ["Golang", "Go lang"], category: "Language" },
  { id: "s2", canonical: "TypeScript", aliases: ["TS", "TSX"], category: "Language" },
  { id: "s3", canonical: "PostgreSQL", aliases: ["Postgres", "pg"], category: "Database" },
  { id: "s4", canonical: "Kubernetes", aliases: ["k8s", "K8S"], category: "Infrastructure" },
  { id: "s5", canonical: "PyTorch", aliases: ["torch", "pytorch"], category: "ML Framework" },
];

export const FLAGS_DATA: FeatureFlag[] = [
  {
    key: "SkillsFirstAnalysis",
    labelKey: "flag_skills_first",
    descriptionKey: "flag_skills_first_desc",
    enabled: true,
  },
  {
    key: "UseReranker",
    labelKey: "flag_reranker",
    descriptionKey: "flag_reranker_desc",
    enabled: false,
  },
  {
    key: "UseCloudOcr",
    labelKey: "flag_cloud_ocr",
    descriptionKey: "flag_cloud_ocr_desc",
    enabled: false,
  },
  {
    key: "UseStubAi",
    labelKey: "flag_stub_ai",
    descriptionKey: "flag_stub_ai_desc",
    enabled: true,
  },
];
