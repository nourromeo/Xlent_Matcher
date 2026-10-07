import type { HTMLAttributes, ReactNode } from "react";

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: "div" | "section";
};

export function Surface({ children, as = "section", className = "", ...props }: SurfaceProps) {
  const Component = as;
  return (
    <Component
      className={`ds-surface bg-app-surface border border-app rounded-xl shadow-app-surface ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
