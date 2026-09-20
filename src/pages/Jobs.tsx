import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, GitMerge, Clock, CheckCircle, Zap, Eye, Archive } from "../design-system/icons";
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
  const parsed = { title: title || "Design System Delivery", client: client || "Client to be confirmed", seniority: "Mid", availability: "Immediate", requiredSkills: ["React", "TypeScript", "CSS"], preferredSkills: ["Figma", "Storybook"] };

  return (
    <Modal open title={t("job_modal_title")} onClose={onClose}>
      {step === "input" ? (
        <div className="p-5 space-y-4">
          <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("job_modal_name")}</span><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Payments Platform Modernisation" /></label>
          <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("job_modal_client")}</span><Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Nordic Financial Services" /></label>
          <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("job_modal_brief")} <span className="text-app-brand ml-1">{t("job_modal_ai")}</span></span><Textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={6} placeholder="Paste the client assignment brief here. AI will extract the requirements for your review." /></label>
          <div className="flex justify-end gap-2"><Button onClick={onClose} variant="ghost">{t("job_modal_cancel")}</Button><Button onClick={() => setStep("review")} variant="primary" icon={<Zap size={11} />}>{t("job_modal_extract")}</Button></div>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="rounded px-3 py-2.5" style={{ background: "var(--color-success-soft)", border: "1px solid var(--color-success-border)" }}><p className="text-[11px]" style={{ color: "var(--color-success)" }}>{t("job_modal_review")}</p></div>
          <div className="grid grid-cols-2 gap-3">{[["Assignment Title", parsed.title], ["Client", parsed.client], ["Seniority", parsed.seniority], ["Availability", parsed.availability]].map(([label, value]) => <div key={label}><label className="text-[11px] text-app-muted block mb-1.5">{label}</label><p className="text-xs text-app-primary">{value}</p></div>)}</div>
          <div><label className="text-[11px] text-app-muted block mb-1.5">{t("job_modal_must")}</label><div className="flex flex-wrap gap-1.5">{parsed.requiredSkills.map((skill) => <SkillTag key={skill} variant="required">{skill}</SkillTag>)}</div></div>
          <div><label className="text-[11px] text-app-muted block mb-1.5">{t("job_modal_nice")}</label><div className="flex flex-wrap gap-1.5">{parsed.preferredSkills.map((skill) => <SkillTag key={skill}>{skill}</SkillTag>)}</div></div>
          <div className="flex justify-end gap-2"><Button onClick={() => setStep("input")} variant="ghost">{t("job_modal_back")}</Button><Button onClick={onClose} variant="primary">{t("job_modal_confirm")}</Button></div>
        </div>
      )}
    </Modal>
  );
}

export default function ClientAssignments() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [archived, setArchived] = useState<string[]>([]);
  const STATUS_CFG = {
    matching: { label: t("status_matching"), ...ASSIGNMENT_STATUS_CONFIG.matching, icon: <Zap size={9} /> },
    done: { label: t("status_match_complete"), ...ASSIGNMENT_STATUS_CONFIG.done, icon: <CheckCircle size={9} /> },
    draft: { label: "Draft", ...ASSIGNMENT_STATUS_CONFIG.draft, icon: <Clock size={9} /> },
  };
  const active = ASSIGNMENTS.filter((assignment) => !archived.includes(assignment.id));

  return (
    <div className="p-6 space-y-4">
      <PageHeader title={t("jobs_title")} meta={String(active.length) + " " + t("jobs_sub")} actions={<Button onClick={() => setShowModal(true)} variant="primary" icon={<Plus size={12} />}>{t("jobs_new")}</Button>} />
      <div className="space-y-2">
        {active.map((assignment) => {
          const status = STATUS_CFG[assignment.status as keyof typeof STATUS_CFG];
          return <div key={assignment.id} className="bg-app-surface border border-app rounded-lg px-5 py-4 shadow-app-surface">
            <div className="flex items-start gap-4"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h2 className="text-sm font-medium text-app-primary">{assignment.title}</h2><StatusBadge tone={status.tone} icon={status.icon}>{status.label}</StatusBadge></div><p className="text-xs text-app-muted">{assignment.client} · {assignment.seniority} · {assignment.created}</p><p className="text-[11px] text-app-secondary mt-1 mb-3 max-w-3xl">{assignment.description}</p><div className="flex flex-wrap gap-1.5">{assignment.requiredSkills.map((skill) => <SkillTag key={skill} variant="required">{skill}</SkillTag>)}{assignment.preferredSkills.map((skill) => <SkillTag key={skill}>{skill}</SkillTag>)}</div></div>
              <div className="flex items-center gap-2"><LinkButton to={"/jobs/" + assignment.id} variant="secondary" icon={<Eye size={12} />}>View Assignment</LinkButton><LinkButton to={"/matching?assignment=" + assignment.id} variant="primary" icon={<GitMerge size={12} />}>Match Consultants</LinkButton><IconButton label="Archive assignment" icon={<Archive size={13} />} onClick={() => setArchived((current) => [...current, assignment.id])} /></div>
            </div>
          </div>;
        })}
      </div>
      {active.length === 0 && <EmptyState title="No active client assignments." />}
      {showModal && <NewAssignmentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
