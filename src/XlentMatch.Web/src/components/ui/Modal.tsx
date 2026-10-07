import type { ReactNode } from "react";
import { X } from "../../design-system/icons";
import { useI18n } from "../../i18n";
import { IconButton } from "./IconButton";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, title, description, onClose, children }: ModalProps) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--color-overlay)", backdropFilter: "blur(4px)" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="w-full max-w-2xl max-h-[92vh] overflow-auto bg-app-surface border border-app-border rounded-lg shadow-app-modal">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4 bg-app-surface border-b border-app-border">
          <div>
            <h2 id="modal-title" className="text-sm font-semibold text-app-primary">{title}</h2>
            {description && <p className="text-xs text-app-muted mt-1">{description}</p>}
          </div>
          <IconButton icon={<X size={14} />} label={t("common_close")} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
