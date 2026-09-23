import { Save } from "../design-system/icons";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";

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
  return (
    <Modal
      open={open}
      title={mode === "add" ? "Add canonical skill" : "Edit canonical skill"}
      description={
        mode === "add"
          ? "Create a canonical skill and optional aliases in the central Skill Taxonomy."
          : "Changes are saved to the central Skill Taxonomy and used by consultants, assignments and matching."
      }
      onClose={onClose}
    >
      <div className="p-5 space-y-4">
        <label className="block">
          <span className="text-[11px] text-app-muted block mb-1">Canonical name</span>
          <Input value={canonical} onChange={(event) => onCanonicalChange(event.target.value)} disabled={saving} />
        </label>

        <label className="block">
          <span className="text-[11px] text-app-muted block mb-1">Category</span>
          <Input value={category} onChange={(event) => onCategoryChange(event.target.value)} disabled={saving} />
        </label>

        <label className="block">
          <span className="text-[11px] text-app-muted block mb-1">Aliases</span>
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
            Cancel
          </Button>
          <Button variant="primary" icon={<Save size={11} />} onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : mode === "add" ? "Add skill" : "Save changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
