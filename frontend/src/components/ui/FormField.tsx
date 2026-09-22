import type { ReactNode } from "react";

export function FormField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-[10px] text-app-muted">{label}{required && <span className="text-app-brand ml-1">*</span>}</span>{hint && <span className="block text-[10px] text-app-faint">{hint}</span>}{children}</label>;
}
