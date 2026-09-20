import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-app-brand text-white hover:opacity-90",
  secondary: "border border-app text-app-secondary hover:text-app-primary",
  ghost: "text-app-secondary hover:text-app-primary hover:bg-app-raised",
  danger: "bg-red-600 text-white hover:opacity-90",
};

export function Button({ variant = "secondary", icon, children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`ds-button inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
