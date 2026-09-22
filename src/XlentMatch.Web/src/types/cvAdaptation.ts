export type CvSeverity = "high" | "medium" | "low";
export type CvSuggestionCategory = "keyword" | "credential" | "clarity" | "structure" | "evidence";
export type CvSuggestion = { id: string; category: CvSuggestionCategory; severity: CvSeverity; title: string; detail: string; example?: string; scoreDelta: number };
export type CvAnalysisResult = { estimatedScore: number; projectedScore: number; summary: string; suggestions: CvSuggestion[] };
