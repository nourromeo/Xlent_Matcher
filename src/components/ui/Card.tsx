import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`bg-app-surface border border-app rounded-lg p-5 shadow-app-surface ${className}`} {...props}>
      {children}
    </div>
  );
}
