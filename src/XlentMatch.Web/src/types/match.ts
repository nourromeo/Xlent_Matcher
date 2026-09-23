import type { Id } from "./common";

export type MatchBreakdown = {
  mustHave: number;
  semantic: number;
  experience: number;
  seniority: number;
  niceToHave: number;
  availability: number;
};

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

export type MatchRequirementResultApi = {
  id: number;
  matchResultId: number;
  requirementName: string;
  type: "Mandatory" | "Desired";
  isMatched: boolean;
  evidence: string;
};

export type MatchResultApi = {
  id: number;
  assignmentId: number;
  consultantId: number;
  consultantName: string;
  score: number;
  rank: number;
  matchedMandatory: number;
  totalMandatory: number;
  matchedDesired: number;
  totalDesired: number;
  experienceScore: number;
  explanation: string;
  createdAt: string;
  details: MatchRequirementResultApi[];
};

export type RunMatchingRequest = {
  assignmentId: number;
  consultantIds: number[];
};
