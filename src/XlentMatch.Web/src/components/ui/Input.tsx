import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return <input className={`ds-input w-full bg-app border border-app-border rounded-md px-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand ${className}`} {...props} />;
}
