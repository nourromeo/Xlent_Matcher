import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { FormActions } from "./FormActions";

export function EditFormModal({ open, title, description, onClose, onCancel, onSubmit, children }: { open: boolean; title: string; description?: string; onClose: () => void; onCancel?: () => void; onSubmit: () => void; children: ReactNode }) {
  const cancel = onCancel ?? onClose;
  return <Modal open={open} title={title} description={description} onClose={onClose}><div className="p-5 space-y-5">{children}<FormActions onCancel={cancel} onSubmit={onSubmit} /></div></Modal>;
}
