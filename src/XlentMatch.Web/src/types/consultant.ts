import type { Id } from "./common";
export type Consultant = { id: Id; initials: string; name: string; headline: string; seniority: string; experience: string; skills: string[]; availability: string };
export type ConsultantSkill = { name: string; category: string; yearsUsed: number; level: string; evidence: string };
