import { Save } from "../design-system/icons";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { useI18n } from "../i18n";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  canonical: string;
  category: string;
  aliases: string;
  saving: boolean;
  onCanonicalChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAliasesChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function SkillEditModal({
  open,
  mode,
  canonical,
  category,
  aliases,
  saving,
  onCanonicalChange,
  onCategoryChange,
  onAliasesChange,
  onClose,
  onSave,
}: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={mode === "add" ? t("admin_add_skill_title") : t("common_edit")}
      description={
        mode === "add"
          ? t("admin_add_skill")
          : t("admin_edit_skill")
      }
      onClose={onClose}
    >
      <div className="p-5 space-y-4">
        <label className="block">
          <span className="text-[11px] text-app-muted block mb-1">{t("admin_canonical")}</span>
          <Input value={canonical} onChange={(event) => onCanonicalChange(event.target.value)} disabled={saving} />
        </label>

        <label className="block">
          <span className="text-[11px] text-app-muted block mb-1">{t("admin_category")}</span>
          <Input value={category} onChange={(event) => onCategoryChange(event.target.value)} disabled={saving} />
        </label>

        <label className="block">
          <span className="text-[11px] text-app-muted block mb-1">{t("admin_aliases")}</span>
          <Input
            value={aliases}
            onChange={(event) => onAliasesChange(event.target.value)}
            disabled={saving}
            placeholder="dotnet, .NET Core"
          />
          <span className="text-[10px] text-app-faint mt-1 block">
            Separate aliases with commas. Renaming keeps the previous canonical name as an alias.
          </span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-app">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("common_cancel")}
          </Button>
          <Button variant="primary" icon={<Save size={11} />} onClick={onSave} disabled={saving}>
            {saving ? t("common_saving") : mode === "add" ? t("common_add") : t("common_save_changes")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
