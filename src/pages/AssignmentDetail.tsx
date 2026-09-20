import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Briefcase, ChevronLeft, Edit3, Eye, Plus, X } from "../design-system/icons";
import { ASSIGNMENTS } from "../features/assignments";
import { useI18n } from "../i18n";
import type { Assignment } from "../features/assignments";
import { ASSIGNMENT_STATUS_CONFIG } from "../features/assignments";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { SkillTag } from "../components/ui/SkillTag";
import { EditFormModal } from "../components/ui/EditFormModal";
import { FormSection } from "../components/ui/FormSection";
import { FormField } from "../components/ui/FormField";

type DraftAssignment = Omit<Assignment, "requiredSkills" | "preferredSkills"> & {
  requiredSkills: string[];
  preferredSkills: string[];
};

function toDraftAssignment(assignment: Assignment): DraftAssignment {
  return {
    ...assignment,
    requiredSkills: [...assignment.requiredSkills],
    preferredSkills: [...assignment.preferredSkills],
  };
}

function SkillEditor({ label, hint, skills, onChange, accent }: { label: string; hint: string; skills: string[]; onChange: (skills: string[]) => void; accent: "indigo" | "neutral" }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");

  const addSkill = () => {
    const skill = value.trim();
    if (!skill || skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    onChange([...skills, skill]);
    setValue("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-medium text-app-primary">{label}</label>
        <span className="text-[10px] text-app-muted">{skills.length} {t("common_skills")}</span>
      </div>
      <p className="text-[10px] text-app-muted mb-2">{hint}</p>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-7">
        {skills.map((skill) => (
          <span key={skill} className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded ${accent === "indigo" ? "text-app-brand bg-app-brand-soft" : "text-app-secondary"}`} style={accent === "neutral" ? { background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" } : { border: "1px solid var(--color-brand-subtle)" }}>
            {skill}
            <button type="button" onClick={() => onChange(skills.filter((item) => item !== skill))} className="opacity-60 hover:opacity-100" aria-label={`${t("common_remove")} ${skill}`}><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }} placeholder={t("assignment_add_skill")} className="flex-1" />
        <button type="button" onClick={addSkill} className="inline-flex items-center gap-1 text-xs text-app-secondary border border-app rounded px-2.5 py-2 hover:text-app-secondary"><Plus size={12} />{t("common_add")}</button>
      </div>
    </div>
  );
}

export default function AssignmentDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const displaySeniority = (value: string) =>
    value === "Junior" ? t("seniority_junior") :
    value === "Mid" ? t("seniority_mid") :
    value === "Senior" ? t("seniority_senior") :
    value === "Staff" ? t("seniority_staff") : value;
  const displayAvailability = (value: string) =>
    value === "Immediate" ? t("immediate") :
    value === "2 weeks" ? t("availability_2_weeks") :
    value === "1 month" ? t("availability_1_month") :
    value === "3 months" ? t("availability_3_months") : value;

  const selectedAssignment = ASSIGNMENTS.find((item) => item.id === id) ?? ASSIGNMENTS[0];
  const baseAssignment: Assignment = {
    ...selectedAssignment,
    requiredSkills: [...selectedAssignment.requiredSkills],
    preferredSkills: [...selectedAssignment.preferredSkills],
  };
  const [assignment, setAssignment] = useState<Assignment>(baseAssignment);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<DraftAssignment>(toDraftAssignment(baseAssignment));

  const openEdit = () => {
    setDraft(toDraftAssignment(assignment));
    setEditMode(true);
  };

  const saveEdit = () => {
    setAssignment(draft);
    setEditMode(false);
  };

  const statusLabel = assignment.status === "done" ? t("assignment_match_complete") : assignment.status === "matching" ? t("assignment_matching") : t("assignment_draft");
  const setDraftField = <K extends keyof DraftAssignment>(key: K, value: DraftAssignment[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 border-b border-app bg-app-surface flex items-start gap-4 flex-none">
        <Link
          to="/client-assignments"
          aria-label={t("assignment_back")}
          className="text-app-faint hover:text-app-secondary transition-colors mt-1"
        >
          <ChevronLeft size={16} />
        </Link>

        <div className="w-9 h-9 rounded-lg bg-app-brand-subtle flex items-center justify-center text-app-brand flex-none">
          <Briefcase size={15} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-sm font-semibold text-app-primary">{assignment.title}</h1>
            <StatusBadge tone={ASSIGNMENT_STATUS_CONFIG[assignment.status].tone}>{statusLabel}</StatusBadge>
            <StatusBadge tone={assignment.availability === "Immediate" ? "success" : "neutral"}>
              {displayAvailability(assignment.availability)}
            </StatusBadge>
          </div>
          <p className="text-xs text-app-muted mt-1">
            {assignment.client} · {displaySeniority(assignment.seniority)} · {t("common_created")} {assignment.created}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LinkButton
            to={"/matching?assignment=" + assignment.id}
            state={{ fromAssignment: true }}
            variant="secondary"
            icon={<Eye size={12} />}
          >
            View Matches
          </LinkButton>
          <Button onClick={openEdit} variant="secondary" icon={<Edit3 size={12} />}>
            Edit
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto bg-app">
        <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <section className="bg-app-surface border border-app rounded-xl p-5" style={{ boxShadow: "var(--shadow-surface)" }}>
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-medium text-app-primary">{t("assignment_overview")}</h2><span className="text-[10px] text-app-muted">{t("assignment_client_brief")}</span></div>
        <p className="text-sm text-app-secondary leading-7 max-w-4xl">{assignment.description}</p>
      </section>

      <section className="grid md:grid-cols-2 gap-5">
        <div className="bg-app-surface border border-app rounded-xl p-5" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-center justify-between mb-1"><h2 className="text-sm font-medium text-app-primary">{t("assignment_required_skills")}</h2><span className="text-[10px] text-app-muted">{t("assignment_must_have")}</span></div>
          <p className="text-[11px] text-app-muted mb-3">{t("assignment_required_help")}</p>
          <div className="flex flex-wrap gap-2">{assignment.requiredSkills.map((skill) => <SkillTag key={skill} variant="required">{skill}</SkillTag>)}</div>
        </div>
        <div className="bg-app-surface border border-app rounded-xl p-5" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-center justify-between mb-1"><h2 className="text-sm font-medium text-app-primary">{t("assignment_preferred_skills")}</h2><span className="text-[10px] text-app-muted">{t("assignment_nice_have")}</span></div>
          <p className="text-[11px] text-app-muted mb-3">{t("assignment_preferred_help")}</p>
          <div className="flex flex-wrap gap-2">{assignment.preferredSkills.map((skill) => <SkillTag key={skill}>{skill}</SkillTag>)}</div>
        </div>
      </section>

      <EditFormModal
        open={editMode}
        title={t("assignment_edit_title")}
        description={t("assignment_edit_sub")}
        onClose={() => setEditMode(false)}
        onSubmit={saveEdit}
      >
        <FormSection title={t("assignment_basic_info")}>
          <div className="grid md:grid-cols-2 gap-4">
            {[[t("assignment_title"), "title"], [t("assignment_client"), "client"], [t("assignment_seniority"), "seniority"], [t("assignment_availability"), "availability"]].map(([label, key]) => (
              <FormField key={key} label={label}><Input value={String(draft[key as keyof DraftAssignment])} onChange={(event) => setDraftField(key as keyof DraftAssignment, event.target.value as never)} /></FormField>
            ))}
          </div>
        </FormSection>
        <FormSection title={t("assignment_description")}>
          <Textarea value={draft.description} onChange={(event) => setDraftField("description", event.target.value)} rows={6} placeholder={t("assignment_description_placeholder")} />
        </FormSection>
        <FormSection title={t("assignment_requirements")} description={t("assignment_requirements_help")}>
          <div className="grid md:grid-cols-2 gap-5"><SkillEditor label={t("assignment_required_skills")} hint={t("assignment_required_hint")} skills={draft.requiredSkills} onChange={(skills) => setDraftField("requiredSkills", skills)} accent="indigo" /><SkillEditor label={t("assignment_preferred_skills")} hint={t("assignment_preferred_hint")} skills={draft.preferredSkills} onChange={(skills) => setDraftField("preferredSkills", skills)} accent="neutral" /></div>
        </FormSection>
      </EditFormModal>
        </div>
      </div>
    </div>
  );
}
