import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-app-brand text-app-on-brand hover:opacity-90",
  secondary: "border border-app text-app-secondary hover:text-app-primary",
  ghost: "text-app-secondary hover:text-app-primary hover:bg-app-raised",
  danger: "bg-app-danger-soft text-app-danger border border-app-danger hover-bg-app-danger-subtle",
};

export function Button({ variant = "secondary", icon, children, className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`ds-button inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
