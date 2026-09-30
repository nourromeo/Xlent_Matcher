import type { Id } from "./common";

export type AssignmentStatus = "matching" | "done" | "draft";

export type Assignment = {
  id: Id;
  title: string;
  client: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  seniority: string;
  status: AssignmentStatus;
  created: string;
  availability: string;
};

export type RequirementTypeApi = "Mandatory" | "Desired";
export type RequirementCategoryApi = "Skill" | "HumanLanguage";
export type AssignmentStatusApi = "Draft" | "Matching" | "Done" | "Closed";

export type AssignmentRequirementApi = {
  id: number;
  assignmentId: number;
  skillId?: number;
  name: string;
  category: RequirementCategoryApi;
  type: RequirementTypeApi;
  minYears: number | null;
  minLevel: number | null;
  requiresFluency: boolean;
};

export type AssignmentApi = {
  id: number;
  customerName: string;
  title: string;
  description: string | null;
  seniority: string | null;
  minYearsExperience: number;
  availability: string | null;
  requiredStartDate: string | null;
  location: string | null;
  updatedAt: string | null;
  status: AssignmentStatusApi;
  createdAt: string;
  requirements: AssignmentRequirementApi[];
};
