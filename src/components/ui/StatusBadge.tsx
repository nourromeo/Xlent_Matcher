import type { ReactNode } from "react";

type StatusBadgeProps = { children: ReactNode; tone?: "brand" | "success" | "warning" | "danger" | "neutral"; icon?: ReactNode };

const tones = {
  brand: { color: "var(--color-brand)", background: "var(--color-brand-subtle)" },
  success: { color: "var(--color-success)", background: "var(--color-success-subtle)" },
  warning: { color: "var(--color-warning)", background: "var(--color-warning-subtle)" },
  danger: { color: "var(--color-danger)", background: "var(--color-danger-subtle)" },
  neutral: { color: "var(--color-text-muted)", background: "var(--color-surface-raised)" },
};

export function StatusBadge({ children, tone = "neutral", icon }: StatusBadgeProps) {
  return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={tones[tone]}>{icon}{children}</span>;
}
