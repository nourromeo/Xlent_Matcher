import type { ReactNode } from "react";

export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-center text-app-muted">{icon && <div className="mb-3 text-app-faint">{icon}</div>}<p className="text-sm text-app-secondary">{title}</p>{description && <p className="text-xs text-app-muted mt-1">{description}</p>}</div>;
}
