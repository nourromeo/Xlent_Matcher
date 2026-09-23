import { apiRequest } from "./api";

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
  skills: Array<{ name: string; category: string | null; level: number; years: number; evidence: string | null }>;
  experiences: Array<{ company: string; role: string; description: string | null; startDate: string | null; endDate: string | null }>;
  projects: Array<{ name: string; description: string | null; technologies: string | null }>;
  education: Array<{ degree: string; school: string | null; year: string | null }>;
  languages: Array<{ name: string; level: string | null }>;
  industries: string[];
  certifications: Array<{ name: string; issuer: string | null; issuedDate: string | null }>;
  sourceText: string | null;
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

export const aiApi = {
  extractRequirementsFromText: (text: string) =>
    apiRequest<RequirementExtractionResult>("/extraction/requirements", {
      method: "POST",
      body: extractionForm(undefined, text),
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

  suggestCvAdaptation: (consultantId: number, assignmentId: number) =>
    apiRequest<CvAdaptationSuggestion>("/cv/suggest", {
      method: "POST",
      body: JSON.stringify({ consultantId, assignmentId }),
    }),

  saveAdaptedCv: (consultantId: number, assignmentId: number, content: string) =>
    apiRequest<{ id: number }>("/cv/adapted", {
      method: "POST",
      body: JSON.stringify({ consultantId, assignmentId, content }),
    }),
};
