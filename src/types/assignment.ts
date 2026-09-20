import type { Id } from "./common";
export type AssignmentStatus = "matching" | "done" | "draft";
export type Assignment = { id: Id; title: string; client: string; description: string; requiredSkills: string[]; preferredSkills: string[]; seniority: string; status: AssignmentStatus; created: string; availability: string };
