import { AlertCircle } from "../../design-system/icons";

export function ErrorState({ title = "Something went wrong.", description }: { title?: string; description?: string }) {
  return <div className="flex flex-col items-center justify-center py-10 text-center"><AlertCircle size={18} className="text-red-400 mb-2" /><p className="text-sm text-app-secondary">{title}</p>{description && <p className="text-xs text-app-muted mt-1">{description}</p>}</div>;
}
