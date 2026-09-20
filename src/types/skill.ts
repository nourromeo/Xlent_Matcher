import type { Id } from "./common";
export type Skill = { id: Id; canonical: string; aliases: string[]; category: string };
export type FeatureFlag = { key: string; desc: string; enabled: boolean };
