import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type LinkButtonProps = Omit<LinkProps, "className"> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-app-brand text-white hover:opacity-90",
  secondary: "border border-app text-app-secondary hover:text-app-primary",
  ghost: "text-app-secondary hover:text-app-primary hover:bg-app-raised",
  danger: "bg-red-600 text-white hover:opacity-90",
};

export function LinkButton({ variant = "secondary", icon, children, className = "", ...props }: LinkButtonProps) {
  return (
    <Link
      className={`ds-button inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}
