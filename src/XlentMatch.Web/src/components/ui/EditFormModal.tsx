import type { ReactNode } from "react";
import { useI18n } from "../../i18n";
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
  stepIndex,
  stepCount,
  onStepChange,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onCancel?: () => void;
  onSubmit: () => void;
  children: ReactNode;
  stepIndex?: number;
  stepCount?: number;
  onStepChange?: (step: number) => void;
}) {
  const { t } = useI18n();
  const cancel = onCancel ?? onClose;

  return (
    <Modal open={open} title={title} description={description} onClose={onClose}>
      <div className="p-5 space-y-5">
        {children}
        <div className="flex justify-end gap-2 pt-4 border-t border-app">
          {stepCount && stepIndex !== undefined && onStepChange && stepIndex > 0 && <Button onClick={() => onStepChange(stepIndex - 1)} variant="ghost">Back</Button>}
          <Button onClick={cancel} variant="ghost">{t("common_cancel")}</Button>
          <Button onClick={onSubmit} variant="primary">{stepCount && stepIndex !== undefined && stepIndex < stepCount - 1 ? t("common_next") : t("common_save_changes")}</Button>
        </div>
      </div>
    </Modal>
  );
}
