import type { ButtonHTMLAttributes } from "react";
import { X } from "../../design-system/icons";
import { useI18n } from "../../i18n";

type RemoveButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
  compact?: boolean;
};

export function RemoveButton({ label, compact = false, className = "", ...props }: RemoveButtonProps) {
  const { t } = useI18n();
  const accessibleLabel = label ?? t("common_remove");

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={`inline-flex items-center justify-center gap-1 rounded text-app-muted hover:bg-app-raised hover:text-app-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand disabled:opacity-50 ${compact ? "h-7 w-7" : "px-2 py-1.5 text-[11px]"} ${className}`}
      {...props}
    >
      <X size={compact ? 12 : 11} aria-hidden="true" />
      {!compact && <span>{accessibleLabel}</span>}
    </button>
  );
}
