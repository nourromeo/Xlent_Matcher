import { useState } from "react";
import { Plus, Search, Clock, CheckCircle, Zap, Eye, Archive } from "../design-system/icons";
import { useI18n } from "../i18n";
import { ASSIGNMENTS, ASSIGNMENT_STATUS_CONFIG } from "../features/assignments";
export { ASSIGNMENTS };
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";
import { IconButton } from "../components/ui/IconButton";
import { SkillTag } from "../components/ui/SkillTag";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

function NewAssignmentModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState<"input" | "review">("input");
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [brief, setBrief] = useState("");
  const parsed = { title: title || "Design System Delivery", client: client || t("client_tbd"), seniority: "Mid", availability: "Immediate", requiredSkills: ["React", "TypeScript", "CSS"], preferredSkills: ["Figma", "Storybook"] };

  return (
    <Modal open title={t("assignment_modal_title")} onClose={onClose}>
      {step === "input" ? (
        <div className="p-5 space-y-4">
          <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("assignment_modal_name")}</span><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Payments Platform Modernisation" /></label>
          <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("assignment_modal_client")}</span><Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Nordic Financial Services" /></label>
          <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("assignment_modal_brief")} <span className="text-app-brand ml-1">{t("assignment_modal_ai")}</span></span><Textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={6} placeholder={t("assignment_modal_brief_placeholder")} /></label>
          <div className="flex justify-end gap-2"><Button onClick={onClose} variant="ghost">{t("assignment_modal_cancel")}</Button><Button onClick={() => setStep("review")} variant="primary" icon={<Zap size={11} />}>{t("assignment_modal_extract")}</Button></div>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="rounded px-3 py-2.5" style={{ background: "var(--color-success-soft)", border: "1px solid var(--color-success-border)" }}><p className="text-[11px]" style={{ color: "var(--color-success)" }}>{t("assignment_modal_review")}</p></div>
          <div className="grid grid-cols-2 gap-3">{[[t("assignment_title"), parsed.title], [t("assignment_client"), parsed.client], [t("assignment_seniority"), t("seniority_mid")], [t("assignment_availability"), t("immediate")]].map(([label, value]) => <div key={label}><label className="text-[11px] text-app-muted block mb-1.5">{label}</label><p className="text-xs text-app-primary">{value}</p></div>)}</div>
          <div><label className="text-[11px] text-app-muted block mb-1.5">{t("assignment_modal_required")}</label><div className="flex flex-wrap gap-1.5">{parsed.requiredSkills.map((skill) => <SkillTag key={skill} variant="required">{skill}</SkillTag>)}</div></div>
          <div><label className="text-[11px] text-app-muted block mb-1.5">{t("assignment_modal_preferred")}</label><div className="flex flex-wrap gap-1.5">{parsed.preferredSkills.map((skill) => <SkillTag key={skill}>{skill}</SkillTag>)}</div></div>
          <div className="flex justify-end gap-2"><Button onClick={() => setStep("input")} variant="ghost">{t("assignment_modal_back")}</Button><Button onClick={onClose} variant="primary">{t("assignment_modal_confirm")}</Button></div>
        </div>
      )}
    </Modal>
  );
}

export default function ClientAssignments() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState<string[]>([]);
  const STATUS_CFG = {
    matching: { label: t("status_matching"), ...ASSIGNMENT_STATUS_CONFIG.matching, icon: <Zap size={9} /> },
    done: { label: t("status_match_complete"), ...ASSIGNMENT_STATUS_CONFIG.done, icon: <CheckCircle size={9} /> },
    draft: { label: t("assignment_draft"), ...ASSIGNMENT_STATUS_CONFIG.draft, icon: <Clock size={9} /> },
  };
  const displaySeniority = (value: string) =>
    value === "Junior" ? t("seniority_junior") :
    value === "Mid" ? t("seniority_mid") :
    value === "Senior" ? t("seniority_senior") :
    value === "Staff" ? t("seniority_staff") : value;

  const active = ASSIGNMENTS.filter((assignment) => !archived.includes(assignment.id));
  const filtered = active.filter((assignment) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;
    return (
      assignment.title.toLowerCase().includes(search) ||
      assignment.client.toLowerCase().includes(search) ||
      assignment.description.toLowerCase().includes(search) ||
      assignment.seniority.toLowerCase().includes(search) ||
      assignment.requiredSkills.some((skill) => skill.toLowerCase().includes(search)) ||
      assignment.preferredSkills.some((skill) => skill.toLowerCase().includes(search))
    );
  });

  return (
    <div className="p-6 space-y-4">
      <PageHeader title={t("assignments_title")} meta={String(active.length) + " " + t("assignments_sub")} actions={<Button onClick={() => setShowModal(true)} variant="primary" icon={<Plus size={12} />}>{t("assignments_new")}</Button>} />
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 relative max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
          <Input
            type="search"
            placeholder={t("assignments_search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8 py-1.5"
          />
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map((assignment) => {
          const status = STATUS_CFG[assignment.status as keyof typeof STATUS_CFG];
          return <div key={assignment.id} className="bg-app-surface border border-app rounded-lg px-5 py-4 shadow-app-surface">
            <div className="flex items-start gap-4"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h2 className="text-sm font-medium text-app-primary">{assignment.title}</h2><StatusBadge tone={status.tone} icon={status.icon}>{status.label}</StatusBadge></div><p className="text-xs text-app-muted">{assignment.client} · {displaySeniority(assignment.seniority)} · {assignment.created}</p><p className="text-[11px] text-app-secondary mt-1 mb-3 max-w-3xl">{assignment.description}</p><div className="flex flex-wrap gap-1.5">{assignment.requiredSkills.map((skill) => <SkillTag key={skill} variant="required">{skill}</SkillTag>)}{assignment.preferredSkills.map((skill) => <SkillTag key={skill}>{skill}</SkillTag>)}</div></div>
              <div className="flex items-center gap-2"><LinkButton to={"/client-assignments/" + assignment.id} variant="secondary" icon={<Eye size={12} />}>{t("assignment_view")}</LinkButton><IconButton label={t("assignments_archive")} icon={<Archive size={13} />} onClick={() => setArchived((current) => [...current, assignment.id])} /></div>
            </div>
          </div>;
        })}
      </div>
      {filtered.length === 0 && <EmptyState title={query ? t("assignments_empty_search") : t("assignments_empty")} />}
      {showModal && <NewAssignmentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
