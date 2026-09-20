import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
};

export function IconButton({ icon, label, className = "", ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`ds-icon-button inline-flex items-center justify-center w-8 h-8 rounded-md border border-app text-app-muted hover:text-app-primary hover:bg-app-raised ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
