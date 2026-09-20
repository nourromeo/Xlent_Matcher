import type { ReactNode } from "react";

type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "text-app-secondary bg-app-raised",
  brand: "text-app-brand bg-app-brand-subtle",
  success: "text-green-400 bg-green-500/10",
  warning: "text-amber-400 bg-amber-500/10",
  danger: "text-red-400 bg-red-500/10",
};

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full ${variantClasses[variant]}`}>{children}</span>;
}
