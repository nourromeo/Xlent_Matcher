import type { ReactNode } from "react";

type SkillTagProps = {
  children: ReactNode;
  variant?: "required" | "preferred";
};

export function SkillTag({ children, variant = "preferred" }: SkillTagProps) {
  const classes = variant === "required"
    ? "text-app-brand bg-app-brand-subtle border border-app-brand"
    : "text-app-secondary bg-app-raised border border-app";

  return <span className={`inline-flex items-center text-xs px-2.5 py-1.5 rounded-md ${classes}`}>{children}</span>;
}
