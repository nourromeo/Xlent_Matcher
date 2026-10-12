export type ConsultantSkill = {
  id: number;
  consultantId: number;
  skillId?: number;
  name: string;
  category: string | null;
  years: number | null;
  level: number;
  evidence: string | null;
  skill?: { canonicalName: string } | null;
};

export type ConsultantExperience = {
  id: number;
  consultantId: number;
  company: string;
  role: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type ConsultantProject = {
  id: number;
  consultantId: number;
  name: string;
  description: string | null;
  technologies: string | null;
};

export type ConsultantEducation = {
  id: number;
  consultantId: number;
  degree: string;
  school: string | null;
  year: string | null;
};

export type ConsultantLanguage = {
  id: number;
  consultantId: number;
  name: string;
  proficiency: "Not specified" | "Low" | "Medium" | "High" | "Native";
};

export type ConsultantIndustry = {
  id: number;
  consultantId: number;
  name: string;
};

export type ConsultantCertification = {
  id: number;
  consultantId: number;
  name: string;
  issuer: string | null;
  issuedDate: string | null;
  issuedYear: string | null;
};

export type Consultant = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  title: string | null;
  summary: string | null;
  seniority: string | null;
  yearsOfExperience: number | null;
  yearsOfExperienceSource: string | null;
  availableAgainDate: string | null;
  availability: "Available" | "Unavailable";
  office: string | null;
  originalCvText: string | null;
  skills: ConsultantSkill[];
  experiences: ConsultantExperience[];
  projects: ConsultantProject[];
  education: ConsultantEducation[];
  languages: ConsultantLanguage[];
  industries: ConsultantIndustry[];
  certifications: ConsultantCertification[];
  fullName?: string;
};
