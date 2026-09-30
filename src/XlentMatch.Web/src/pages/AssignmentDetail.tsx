import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Briefcase, ChevronLeft, Edit3, Eye, Plus, X } from "../design-system/icons";
import { useI18n } from "../i18n";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { SkillTag } from "../components/ui/SkillTag";
import { EditFormModal } from "../components/ui/EditFormModal";
import { FormSection } from "../components/ui/FormSection";
import { FormField } from "../components/ui/FormField";
import { assignmentsApi } from "../services/assignmentsApi";
import type { AssignmentApi, AssignmentRequirementApi } from "../types";

function SkillEditor({
  label,
  hint,
  skills,
  onChange,
  accent,
  category = "Skill",
}: {
  label: string;
  hint: string;
  skills: string[];
  onChange: (skills: string[]) => void;
  accent: "indigo" | "neutral";
  category?: "Skill" | "HumanLanguage";
}) {
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
          <span
            key={skill}
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded ${accent === "indigo" ? "text-app-brand bg-app-brand-soft" : "text-app-secondary"}`}
            style={accent === "neutral"
              ? { background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }
              : { border: "1px solid var(--color-brand-subtle)" }}
          >
            {skill}
            <button type="button" onClick={() => onChange(skills.filter((item) => item !== skill))} className="opacity-60 hover:opacity-100">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSkill();
            }
          }}
          placeholder={category === "HumanLanguage" ? "e.g. Swedish" : t("assignment_add_skill")}
          className="flex-1"
        />
        <button type="button" onClick={addSkill} className="inline-flex items-center gap-1 text-xs text-app-secondary border border-app rounded px-2.5 py-2">
          <Plus size={12} />{t("common_add")}
        </button>
      </div>
    </div>
  );
}

const requirementNames = (assignment: AssignmentApi, type: "Mandatory" | "Desired", category: "Skill" | "HumanLanguage" = "Skill") =>
  assignment.requirements.filter((requirement) => requirement.type === type && requirement.category === category).map((requirement) => requirement.name);

const makeRequirements = (
  assignmentId: number,
  required: string[],
  preferred: string[],
  requiredLanguages: string[],
  preferredLanguages: string[],
  existing: AssignmentRequirementApi[],
): AssignmentRequirementApi[] => {
  const make = (type: "Mandatory" | "Desired", names: string[], category: "Skill" | "HumanLanguage") => names.map((name) => {
    const previous = existing.find((item) => item.type === type && item.category === category && item.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
    return previous
      ? { ...previous, assignmentId, name, type, category }
      : { id: 0, assignmentId, name, category, type, minYears: null, minLevel: null };
  });
  return [
    ...make("Mandatory", required, "Skill"),
    ...make("Desired", preferred, "Skill"),
    ...make("Mandatory", requiredLanguages, "HumanLanguage"),
    ...make("Desired", preferredLanguages, "HumanLanguage"),
  ];
};

export default function AssignmentDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const assignmentId = Number(id);

  const [assignment, setAssignment] = useState<AssignmentApi | null>(null);
  const [draft, setDraft] = useState<AssignmentApi | null>(null);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [requiredLanguages, setRequiredLanguages] = useState<string[]>([]);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      setError("Invalid assignment id.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    assignmentsApi
      .getById(assignmentId)
      .then((data) => {
        if (!cancelled) setAssignment(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Could not load assignment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

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

  const openEdit = () => {
    if (!assignment) return;
    setDraft(structuredClone(assignment));
    setRequiredSkills(requirementNames(assignment, "Mandatory", "Skill"));
    setPreferredSkills(requirementNames(assignment, "Desired", "Skill"));
    setRequiredLanguages(requirementNames(assignment, "Mandatory", "HumanLanguage"));
    setPreferredLanguages(requirementNames(assignment, "Desired", "HumanLanguage"));
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!draft) return;

    setSaving(true);
    setError("");

    try {
      const payload: AssignmentApi = {
        ...draft,
        requirements: makeRequirements(draft.id, requiredSkills, preferredSkills, requiredLanguages, preferredLanguages, assignment.requirements),
      };

      const updated = await assignmentsApi.update(draft.id, payload);
      setAssignment(updated);
      setEditMode(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save assignment.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-app-muted">Loading assignment...</div>;
  }

  if (!assignment) {
    return (
      <div className="p-6 space-y-3">
        <Link to="/client-assignments" className="text-xs text-app-brand">← {t("assignments_title")}</Link>
        <p className="text-sm text-app-secondary">{error || "Assignment not found."}</p>
      </div>
    );
  }

  const required = requirementNames(assignment, "Mandatory");
  const preferred = requirementNames(assignment, "Desired");
  const statusTone = assignment.status === "Done" ? "success" : "neutral";
  const statusLabel = assignment.status;

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 border-b border-app bg-app-surface flex items-start gap-4 flex-none">
        <Link to="/client-assignments" aria-label={t("assignment_back")} className="text-app-faint hover:text-app-secondary transition-colors mt-1">
          <ChevronLeft size={16} />
        </Link>

        <div className="w-9 h-9 rounded-lg bg-app-brand-subtle flex items-center justify-center text-app-brand flex-none">
          <Briefcase size={15} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-sm font-semibold text-app-primary">{assignment.title}</h1>
            <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
            {assignment.availability && (
              <StatusBadge tone={assignment.availability === "Immediate" ? "success" : "neutral"}>
                {displayAvailability(assignment.availability)}
              </StatusBadge>
            )}
          </div>
          <p className="text-xs text-app-muted mt-1">
            {assignment.customerName || "—"} · {displaySeniority(assignment.seniority ?? "—")} · {t("common_created")} {new Date(assignment.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LinkButton
            to={"/matching?assignment=" + assignment.id}
            state={{ fromAssignment: true }}
            variant="secondary"
            icon={<Eye size={12} />}
          >
            {t("assignment_view_matches")}
          </LinkButton>
          <Button onClick={openEdit} variant="secondary" icon={<Edit3 size={12} />}>
            {t("assignment_edit")}
          </Button>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-app">
        <div className="p-6 space-y-5 max-w-6xl mx-auto">
          <section className="bg-app-surface border border-app rounded-xl p-5 shadow-app-surface">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-app-primary">{t("assignment_overview")}</h2>
              <span className="text-[10px] text-app-muted">{t("assignment_client_brief")}</span>
            </div>
            <p className="text-sm text-app-secondary leading-7 max-w-4xl">{assignment.description || "—"}</p>
          </section>

          <section className="grid md:grid-cols-2 gap-5">
            <div className="bg-app-surface border border-app rounded-xl p-5 shadow-app-surface">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-medium text-app-primary">{t("assignment_required_skills")}</h2>
                <span className="text-[10px] text-app-muted">{t("assignment_must_have")}</span>
              </div>
              <p className="text-[11px] text-app-muted mb-3">{t("assignment_required_help")}</p>
              <div className="flex flex-wrap gap-2">
                {required.map((skill) => <SkillTag key={skill} variant="required">{skill}</SkillTag>)}
              </div>
            </div>

            <div className="bg-app-surface border border-app rounded-xl p-5 shadow-app-surface">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-medium text-app-primary">{t("assignment_preferred_skills")}</h2>
                <span className="text-[10px] text-app-muted">{t("assignment_nice_have")}</span>
              </div>
              <p className="text-[11px] text-app-muted mb-3">{t("assignment_preferred_help")}</p>
              <div className="flex flex-wrap gap-2">
                {preferred.map((skill) => <SkillTag key={skill}>{skill}</SkillTag>)}
              </div>
            </div>
          </section>

          {assignment.requirements.some((requirement) => requirement.category === "HumanLanguage") && (
            <section className="bg-app-surface border border-app rounded-xl p-5 shadow-app-surface">
              <h2 className="text-sm font-medium text-app-primary mb-3">Human languages</h2>
              <div className="space-y-2">
                {assignment.requirements.filter((requirement) => requirement.category === "HumanLanguage").map((requirement) => (
                  <div key={requirement.id} className="flex items-center justify-between text-sm">
                    <span className="text-app-secondary">{requirement.name}</span>
                    <span className="text-app-muted text-xs">{requirement.type === "Mandatory" ? "Required" : "Preferred"}{requirement.minLevel ? ` · CEFR ${requirement.minLevel}` : ""}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {assignment.minYearsExperience > 0 && (
            <section className="bg-app-surface border border-app rounded-xl p-5 shadow-app-surface">
              <p className="text-xs font-medium text-app-primary">Minimum experience</p>
              <p className="text-sm text-app-secondary mt-1">{assignment.minYearsExperience} years</p>
            </section>
          )}
        </div>
      </div>

      {draft && (
        <EditFormModal
          open={editMode}
          title={t("assignment_edit_title")}
          description={t("assignment_edit_sub")}
          onClose={() => setEditMode(false)}
          onSubmit={saveEdit}
        >
          <FormSection title={t("assignment_basic_info")}>
            <div className="grid md:grid-cols-2 gap-4">
              <FormField label={t("assignment_title")}>
                <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </FormField>
              <FormField label={t("assignment_client")}>
                <Input value={draft.customerName} onChange={(event) => setDraft({ ...draft, customerName: event.target.value })} />
              </FormField>
              <FormField label={t("assignment_seniority")}>
                <Input value={draft.seniority ?? ""} onChange={(event) => setDraft({ ...draft, seniority: event.target.value || null })} />
              </FormField>
              <FormField label={t("assignment_availability")}>
                <Input value={draft.availability ?? ""} onChange={(event) => setDraft({ ...draft, availability: event.target.value || null })} />
              </FormField>
              <FormField label="Minimum years experience">
                <Input type="number" min={0} value={draft.minYearsExperience} onChange={(event) => setDraft({ ...draft, minYearsExperience: Number(event.target.value) || 0 })} />
              </FormField>
            </div>
          </FormSection>

          <FormSection title={t("assignment_description")}>
            <Textarea
              value={draft.description ?? ""}
              onChange={(event) => setDraft({ ...draft, description: event.target.value || null })}
              rows={6}
              placeholder={t("assignment_description_placeholder")}
            />
          </FormSection>

          <FormSection title={t("assignment_requirements")} description={t("assignment_requirements_help")}>
            <div className="grid md:grid-cols-2 gap-5">
              <SkillEditor
                label={t("assignment_required_skills")}
                hint={t("assignment_required_hint")}
                skills={requiredSkills}
                onChange={setRequiredSkills}
                accent="indigo"
              />
              <SkillEditor
                label={t("assignment_preferred_skills")}
                hint={t("assignment_preferred_hint")}
                skills={preferredSkills}
                onChange={setPreferredSkills}
                accent="neutral"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-5 mt-5">
              <SkillEditor
                label="Required human languages"
                hint="Add a language such as Swedish or English."
                skills={requiredLanguages}
                onChange={setRequiredLanguages}
                accent="indigo"
                category="HumanLanguage"
              />
              <SkillEditor
                label="Preferred human languages"
                hint="Add languages that are useful but not mandatory."
                skills={preferredLanguages}
                onChange={setPreferredLanguages}
                accent="neutral"
                category="HumanLanguage"
              />
            </div>
          </FormSection>

          {saving && <p className="text-xs text-app-muted">Saving...</p>}
        </EditFormModal>
      )}
    </div>
  );
}
