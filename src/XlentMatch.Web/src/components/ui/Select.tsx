import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", ...props }: SelectProps) {
  return (
    <select
      className={`ds-select w-full bg-app border border-app rounded-md px-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand ${className}`}
      {...props}
    />
  );
}
