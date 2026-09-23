import { apiRequest } from "./api";
import type { AssignmentApi, Consultant } from "../types";

export type RequirementDraft = {
  name: string;
  type: "Mandatory" | "Desired";
  minYears: number | null;
  minLevel: number | null;
};

export type RequirementExtractionResult = {
  seniority: string | null;
  minYearsExperience: number | null;
  availability: string | null;
  requirements: RequirementDraft[];
  sourceText: string | null;
};

export type ConsultantDraft = {
  firstName: string;
  lastName: string;
  email: string | null;
  title: string | null;
  summary: string | null;
  seniority: string | null;
  yearsOfExperience: number;
  availability: string | null;
  office: string | null;
  skills: Array<{ name: string; level: number; years: number; evidence: string | null }>;
  experiences: Array<{ company: string; role: string; description: string | null; startDate: string | null; endDate: string | null }>;
  projects: Array<{ name: string; description: string | null; technologies: string | null }>;
  education: Array<{ degree: string; school: string | null; year: string | null }>;
  languages: Array<{ name: string; level: string | null }>;
  industries: string[];
  certifications: Array<{ name: string; issuer: string | null; issuedDate: string | null }>;
  sourceText: string | null;
};

export type TemporaryAssignmentDraft = {
  customerName: string;
  title: string;
  description: string | null;
  seniority: string | null;
  minYearsExperience: number;
  availability: string | null;
  requirements: RequirementDraft[];
};

export type CvAdaptationSuggestion = {
  summary: string;
  highlightedExperiences: string[];
  adaptedCvText: string;
  notes: string[];
};

function extractionForm(file?: File, text?: string) {
  const form = new FormData();
  if (file) form.append("File", file);
  if (text) form.append("Text", text);
  return form;
}

export function consultantToDraft(consultant: Consultant): ConsultantDraft {
  return {
    firstName: consultant.firstName,
    lastName: consultant.lastName,
    email: consultant.email,
    title: consultant.title,
    summary: consultant.summary,
    seniority: consultant.seniority,
    yearsOfExperience: consultant.yearsOfExperience,
    availability: consultant.availability,
    office: consultant.office,
    skills: consultant.skills.map((item) => ({
      name: item.name,
      level: item.level,
      years: item.years,
      evidence: item.evidence,
    })),
    experiences: consultant.experiences.map((item) => ({
      company: item.company,
      role: item.role,
      description: item.description,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
    projects: consultant.projects.map((item) => ({
      name: item.name,
      description: item.description,
      technologies: item.technologies,
    })),
    education: consultant.education.map((item) => ({
      degree: item.degree,
      school: item.school,
      year: item.year,
    })),
    languages: consultant.languages.map((item) => ({ name: item.name, level: item.level })),
    industries: consultant.industries.map((item) => item.name),
    certifications: consultant.certifications.map((item) => ({
      name: item.name,
      issuer: item.issuer,
      issuedDate: item.issuedDate,
    })),
    sourceText: null,
  };
}

export function assignmentToTemporary(assignment: AssignmentApi): TemporaryAssignmentDraft {
  return {
    customerName: assignment.customerName,
    title: assignment.title,
    description: assignment.description,
    seniority: assignment.seniority,
    minYearsExperience: assignment.minYearsExperience,
    availability: assignment.availability,
    requirements: assignment.requirements.map((item) => ({
      name: item.name,
      type: item.type,
      minYears: item.minYears,
      minLevel: item.minLevel,
    })),
  };
}

export const aiApi = {
  extractRequirementsFromText: (text: string) =>
    apiRequest<RequirementExtractionResult>("/extraction/requirements", {
      method: "POST",
      body: extractionForm(undefined, text),
    }),

  extractRequirementsFromFile: (file: File) =>
    apiRequest<RequirementExtractionResult>("/extraction/requirements", {
      method: "POST",
      body: extractionForm(file),
    }),

  extractConsultantFromFile: (file: File) =>
    apiRequest<ConsultantDraft>("/extraction/consultant", {
      method: "POST",
      body: extractionForm(file),
    }),

  extractConsultantFromText: (text: string) =>
    apiRequest<ConsultantDraft>("/extraction/consultant", {
      method: "POST",
      body: extractionForm(undefined, text),
    }),

  suggestTemporaryCvAdaptation: (consultant: ConsultantDraft, assignment: TemporaryAssignmentDraft) =>
    apiRequest<CvAdaptationSuggestion>("/cv/suggest-temporary", {
      method: "POST",
      body: JSON.stringify({ consultant, assignment }),
    }),
};
