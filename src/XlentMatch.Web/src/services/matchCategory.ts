export type MatchCategory = "Strong" | "Partial" | "Low";

export const matchCategory = (score: number): MatchCategory =>
  score >= 70 ? "Strong" : score >= 40 ? "Partial" : "Low";
