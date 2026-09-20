import type { ReactNode } from "react";

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="space-y-3"><div><h3 className="text-xs font-medium text-app-primary">{title}</h3>{description && <p className="text-[10px] text-app-muted mt-1">{description}</p>}</div>{children}</section>;
}
