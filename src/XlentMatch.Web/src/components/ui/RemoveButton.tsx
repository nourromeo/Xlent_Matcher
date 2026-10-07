import type { ButtonHTMLAttributes } from "react";
import { useI18n } from "../../i18n";

type RemoveButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
  compact?: boolean;
};

export function RemoveButton({ label, compact = false, className = "", ...props }: RemoveButtonProps) {
  const { t } = useI18n();
  const accessibleLabel = label ?? t("common_remove");

  if (compact) {
    return (
      <button
        type="button"
        aria-label={accessibleLabel}
        title={accessibleLabel}
        className={`text-app-faint hover:text-app-secondary ${className}`}
        {...props}
      >
        ×
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      className={`text-xs text-app-danger ${className}`}
      {...props}
    >
      {label ?? t("common_remove")}
    </button>
  );
}
