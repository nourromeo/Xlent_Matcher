import type { Id } from "./common";
export type MatchBreakdown = { mustHave: number; semantic: number; experience: number; seniority: number; niceToHave: number; availability: number };
export type MatchEvidence = { skill: string; cite: string };
export type Match = {
  id: Id;
  assignmentId: Id;
  consultantId: Id;
  initials: string;
  name: string;
  headline: string;
  score: number;
  breakdown: MatchBreakdown;
  mustHaveCoverage: string[];
  gaps: string[];
  niceToHave: string[];
  evidence: MatchEvidence[];
  motivation: string;
};
