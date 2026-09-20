import type { Id } from "./common";
export type Skill = { id: Id; canonical: string; aliases: string[]; category: string };
export type PromptConfig = { id: Id; name: string; model: string; version: string; tokens: string; cost: string; active: boolean };
export type FeatureFlag = { key: string; desc: string; enabled: boolean };
