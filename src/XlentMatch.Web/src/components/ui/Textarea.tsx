import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...props }: TextareaProps) {
  return <textarea className={`ds-textarea w-full bg-app border border-app-border rounded-md px-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand resize-none ${className}`} {...props} />;
}
