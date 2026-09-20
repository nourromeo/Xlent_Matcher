import { Button } from "./Button";

export function FormActions({ onCancel, onSubmit, submitLabel = "Save Changes", cancelLabel = "Cancel" }: { onCancel: () => void; onSubmit: () => void; submitLabel?: string; cancelLabel?: string }) {
  return <div className="flex justify-end gap-2 pt-4 border-t border-app"><Button onClick={onCancel} variant="ghost">{cancelLabel}</Button><Button onClick={onSubmit} variant="primary">{submitLabel}</Button></div>;
}
