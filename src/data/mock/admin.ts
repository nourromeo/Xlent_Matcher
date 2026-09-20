import type { FeatureFlag, PromptConfig, Skill } from "../../types";

export const SKILLS: Skill[] = [
  { id: "s1", canonical: "Go", aliases: ["Golang", "Go lang"], category: "Language" },
  { id: "s2", canonical: "TypeScript", aliases: ["TS", "TSX"], category: "Language" },
  { id: "s3", canonical: "PostgreSQL", aliases: ["Postgres", "pg"], category: "Database" },
  { id: "s4", canonical: "Kubernetes", aliases: ["k8s", "K8S"], category: "Infrastructure" },
  { id: "s5", canonical: "PyTorch", aliases: ["torch", "pytorch"], category: "ML Framework" },
];

export const PROMPTS: PromptConfig[] = [
  { id: "p1", name: "CV Parser", model: "gpt-4o", version: "v2.3", tokens: "~4.8k", cost: "$0.032", active: true },
  { id: "p2", name: "Assignment Requirements Extractor", model: "gpt-4o", version: "v1.1", tokens: "~1.2k", cost: "$0.008", active: true },
  { id: "p3", name: "Match Explanation", model: "gpt-4o", version: "v1.4", tokens: "~2.1k", cost: "$0.014", active: true },
  { id: "p4", name: "CV Parser", model: "gpt-4o-mini", version: "v2.2", tokens: "~4.6k", cost: "$0.006", active: false },
];

export const FLAGS_DATA: FeatureFlag[] = [
  { key: "SkillsFirstAnalysis", desc: "Base matching on assignment evidence and exclude personal attributes from scoring", enabled: true },
  { key: "UseReranker", desc: "Enable Cohere reranking pass before hybrid scoring", enabled: true },
  { key: "UseCloudOcr", desc: "Use Azure Document Intelligence for scanned PDFs", enabled: false },
  { key: "UseStubAi", desc: "Use fake AI responses (no API keys required)", enabled: false },
];
