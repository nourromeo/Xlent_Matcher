import type { ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export function EditFormModal({
  open,
  title,
  description,
  onClose,
  onCancel,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onCancel?: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const cancel = onCancel ?? onClose;

  return (
    <Modal open={open} title={title} description={description} onClose={onClose}>
      <div className="p-5 space-y-5">
        {children}
        <div className="flex justify-end gap-2 pt-4 border-t border-app">
          <Button onClick={cancel} variant="ghost">Cancel</Button>
          <Button onClick={onSubmit} variant="primary">Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}
