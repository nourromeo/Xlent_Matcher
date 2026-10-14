import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { useI18n } from "../../i18n";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({ open, title, message, confirmLabel, confirmVariant = "danger", onConfirm, onClose }: ConfirmDialogProps) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={pending ? () => undefined : onClose}>
      <div className="space-y-5 p-5">
        <p className="text-sm text-app-secondary">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>{t("common_cancel")}</Button>
          <Button variant={confirmVariant} onClick={() => void confirm()} disabled={pending}>{pending ? t("common_saving") : confirmLabel ?? t("common_delete")}</Button>
        </div>
      </div>
    </Modal>
  );
}
