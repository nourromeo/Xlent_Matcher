import { Loader } from "../../design-system/icons";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-10 text-xs text-app-muted"><Loader size={14} className="animate-spin" />{label}</div>;
}
