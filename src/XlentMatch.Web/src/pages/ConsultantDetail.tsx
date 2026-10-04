import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Code, Briefcase, GraduationCap, Globe, Edit3 } from "../design-system/icons";
import { useI18n } from "../i18n";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { EditFormModal } from "../components/ui/EditFormModal";
import { FormSection } from "../components/ui/FormSection";
import { FormField } from "../components/ui/FormField";
import { consultantsApi } from "../services/consultantsApi";
import type { Consultant, ConsultantSkill } from "../types";

const levelLabel = (level: number) => {
  if (level >= 5) return "Expert";
  if (level >= 3) return "Proficient";
  return "Familiar";
};

const levelStyle = (level: number): React.CSSProperties => {
  if (level >= 5) {
    return { color: "var(--color-success)", background: "var(--color-success-subtle)" };
  }

  if (level >= 3) {
    return { color: "var(--color-brand)", background: "var(--color-brand-subtle)" };
  }

  return { color: "var(--color-text-muted)", background: "var(--color-surface-raised)" };
};

function availabilityLabel(consultant: Consultant) {
  if (consultant.availability === "Available") return "Available";
  return consultant.availableAgainDate ? `Unavailable until ${new Date(`${consultant.availableAgainDate.slice(0, 10)}T00:00:00`).toLocaleDateString()}` : "Unavailable";
}

const fullName = (consultant: Consultant) =>
  consultant.fullName?.trim() || `${consultant.firstName} ${consultant.lastName}`.trim();

const initials = (consultant: Consultant) =>
  [consultant.firstName, consultant.lastName]
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

export default function ConsultantDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const consultantId = Number(id);

  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [draft, setDraft] = useState<Consultant | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editStep, setEditStep] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(consultantId) || consultantId <= 0) {
      setError("Invalid consultant id.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    consultantsApi
      .getById(consultantId, controller.signal)
      .then((data) => {
        if (!cancelled) setConsultant(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled && requestError instanceof DOMException && requestError.name === "AbortError") return;
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Could not load consultant.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [consultantId]);

  const openEdit = () => {
    if (!consultant) return;
    setDraft(structuredClone(consultant));
    setEditStep(0);
    setEditMode(true);
  };

  const save = async () => {
    if (!draft) return;

    setSaving(true);
    setError("");

    try {
      const payload: Consultant = {
        ...draft,
        skills: draft.skills.filter((skill) => skill.name.trim()).map((skill) => ({ ...skill, id: 0, consultantId: 0, skillId: 0 })),
        languages: draft.languages.filter((item) => item.name.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
        experiences: draft.experiences.filter((item) => item.company.trim() || item.role.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
        projects: draft.projects.filter((item) => item.name.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
        education: draft.education.filter((item) => item.degree.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
        industries: draft.industries.filter((item) => item.name.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
        certifications: draft.certifications.filter((item) => item.name.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
      };

      const updated = await consultantsApi.update(draft.id, payload);
      setConsultant(updated);
      setEditMode(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save consultant.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-app-muted">{t("consultant_loading")}</div>;
  }

  if (!consultant) {
    return (
      <div className="p-6 space-y-3">
        <Link to="/consultants" className="text-xs text-app-brand">← {t("consultants_title")}</Link>
        <p className="text-sm text-app-secondary">{error || "Consultant not found."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-app bg-app-surface flex items-start gap-4 flex-none">
        <Link to="/consultants" className="text-app-faint hover:text-app-secondary transition-colors mt-0.5">
          <ChevronLeft size={16} />
        </Link>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-app-brand-subtle flex items-center justify-center text-sm font-semibold text-app-brand">
              {initials(consultant)}
            </div>

            <div>
              <h1 className="text-sm font-semibold text-app-primary">
                {fullName(consultant)} — {t("consultant_profile")}
              </h1>
              <p className="text-xs text-app-muted">
                {consultant.title || "Consultant"} · {consultant.office || "—"} · {consultant.yearsOfExperience == null ? "Experience needs confirmation" : `${consultant.yearsOfExperience} ${t("consultant_years_experience")}`}
              </p>
            </div>

            {consultant.availability && (
              <span
                className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ color: "var(--color-success)", background: "var(--color-success-subtle)" }}
              >
                {availabilityLabel(consultant)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={openEdit}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          <Edit3 size={12} /> {t("consultant_edit")}
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-app">
        <div className="p-6 grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-4">
              {consultant.summary && (
                <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                  <p className="text-xs font-medium text-app-primary mb-2">Summary</p>
                  <p className="text-[11px] text-app-secondary leading-relaxed">{consultant.summary}</p>
                </div>
              )}

              <div className="bg-app-surface border border-app rounded-lg overflow-hidden shadow-app-surface">
                <div className="px-4 py-3 border-b border-app flex items-center gap-2">
                  <Code size={12} className="text-app-faint" />
                  <span className="text-xs font-medium text-app-primary">{t("consultant_skills")}</span>
                </div>

                <div className="px-4 py-3 border-b border-app grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] uppercase tracking-wide text-app-faint">Seniority</p><p className="text-sm font-medium text-app-primary mt-1">{consultant.seniority || "Not specified"}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-app-faint">Total Experience</p><p className="text-sm font-medium text-app-primary mt-1">{consultant.yearsOfExperience == null ? "Needs confirmation" : `${consultant.yearsOfExperience} years`}</p></div>
                </div>
                <div className="px-4 py-2 border-b border-app"><span className="text-[10px] uppercase tracking-wide text-app-faint">Skill Experience</span></div>
                {consultant.skills.length === 0 ? (
                  <p className="px-4 py-3 text-[11px] text-app-faint">No skills saved.</p>
                ) : consultant.skills.map((skill, index) => (
                  <div
                    key={skill.id || `${skill.name}-${index}`}
                    className="px-4 py-3"
                    style={{ borderBottom: index < consultant.skills.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-none w-28">
                        <p className="text-xs font-medium text-app-primary font-mono">{skill.name}</p>
                        <p className="text-[10px] text-app-faint mt-0.5">{skill.category || "Skill"}</p>
                      </div>
                      <div className="flex-none flex items-center gap-3">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={levelStyle(skill.level)}>
                          {levelLabel(skill.level)}
                        </span>
                        <span className="text-[10px] font-mono text-app-muted">{skill.years}y</span>
                      </div>
                      <p className="flex-1 text-[11px] text-app-muted italic leading-relaxed">
                        {skill.evidence || "No evidence saved."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-app-surface border border-app rounded-lg overflow-hidden shadow-app-surface">
                <div className="px-4 py-3 border-b border-app flex items-center gap-2">
                  <Briefcase size={12} className="text-app-faint" />
                  <span className="text-xs font-medium text-app-primary">Experience</span>
                </div>

                {consultant.experiences.length === 0 ? (
                  <p className="px-4 py-3 text-[11px] text-app-faint">No experience saved.</p>
                ) : consultant.experiences.map((experience, index) => (
                  <div
                    key={experience.id || index}
                    className="px-4 py-3 space-y-2"
                    style={{ borderBottom: index < consultant.experiences.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-app-primary">{experience.role}</p>
                        <p className="text-[11px] text-app-muted">{experience.company}</p>
                      </div>
                      <span className="text-[10px] font-mono text-app-faint">
                        {experience.startDate || "—"} – {experience.endDate || "Present"}
                      </span>
                    </div>

                    {experience.description && (
                      <p className="text-[11px] text-app-muted leading-relaxed">{experience.description}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-app-surface border border-app rounded-lg overflow-hidden shadow-app-surface">
                <div className="px-4 py-3 border-b border-app flex items-center gap-2">
                  <Code size={12} className="text-app-faint" />
                  <span className="text-xs font-medium text-app-primary">Projects</span>
                </div>
                {consultant.projects.length === 0 ? (
                  <p className="px-4 py-3 text-[11px] text-app-faint">No projects saved.</p>
                ) : consultant.projects.map((project, index) => (
                  <div key={project.id || index} className="px-4 py-3 space-y-1.5" style={{ borderBottom: index < consultant.projects.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}>
                    <p className="text-xs font-medium text-app-primary">{project.name}</p>
                    {project.technologies && <p className="text-[10px] font-mono text-app-muted">{project.technologies}</p>}
                    {project.description && <p className="text-[11px] text-app-muted leading-relaxed">{project.description}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-app-surface border border-app rounded-lg p-4 space-y-3 shadow-app-surface">
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap size={12} className="text-app-faint" />
                  <span className="text-xs font-medium text-app-primary">{t("consultant_education")}</span>
                </div>
                {consultant.education.length === 0
                  ? <p className="text-[11px] text-app-faint">—</p>
                  : consultant.education.map((education) => (
                    <div key={education.id || education.degree}>
                      <p className="text-xs text-app-primary">{education.degree}</p>
                      <p className="text-[11px] text-app-muted">{education.school || "—"} · {education.year || "—"}</p>
                    </div>
                  ))}
              </div>

              <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={12} className="text-app-faint" />
                  <span className="text-xs font-medium text-app-primary">{t("consultant_languages")}</span>
                </div>
                <div className="space-y-1.5">
                  {consultant.languages.length === 0
                    ? <p className="text-[11px] text-app-faint">—</p>
                    : consultant.languages.map((language) => (
                      <p key={language.id || language.name} className="text-[11px] text-app-secondary">
                        {language.name} {language.proficiency === "Not specified" ? "—" : language.proficiency}
                      </p>
                    ))}
                </div>
              </div>

              <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                <p className="text-xs font-medium text-app-primary mb-3">{t("consultant_industries")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {consultant.industries.length === 0
                    ? <p className="text-[11px] text-app-faint">—</p>
                    : consultant.industries.map((industry) => (
                      <span
                        key={industry.id || industry.name}
                        className="text-[10px] text-app-secondary px-1.5 py-0.5 rounded"
                        style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                      >
                        {industry.name}
                      </span>
                    ))}
                </div>
              </div>

              <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                <p className="text-xs font-medium text-app-primary mb-3">{t("consultant_certifications")}</p>
                <div className="space-y-1.5">
                  {consultant.certifications.length === 0
                    ? <p className="text-[11px] text-app-faint">—</p>
                    : consultant.certifications.map((certification) => (
                      <p key={certification.id || certification.name} className="text-[11px] text-app-secondary">
                        {certification.name}{certification.issuer ? ` — ${certification.issuer}` : ""}
                      </p>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      {draft && (
        <EditFormModal
          open={editMode}
          stepIndex={editStep}
          stepCount={4}
          onStepChange={setEditStep}
          title={t("consultant_edit_title")}
          description={t("consultant_edit_sub")}
          onClose={() => setEditMode(false)}
          onSubmit={() => editStep < 3 ? setEditStep(editStep + 1) : void save()}
        >
          <div className={editStep === 0 ? "space-y-4" : "hidden"}><FormSection title={t("consultant_basic_info")}>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First name">
                <Input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} />
              </FormField>
              <FormField label="Last name">
                <Input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} />
              </FormField>
              <FormField label={t("consultant_role")}>
                <Input value={draft.title ?? ""} onChange={(event) => setDraft({ ...draft, title: event.target.value || null })} />
              </FormField>
              <FormField label={t("consultant_seniority")}>
                <select value={draft.seniority ?? ""} onChange={(event) => setDraft({ ...draft, seniority: event.target.value || null })} className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"><option value="">Not specified</option><option value="Junior">Junior</option><option value="Mid">Mid</option><option value="Senior">Senior</option><option value="Staff">Staff</option></select>
              </FormField>
              <FormField label={t("consultant_availability")}>
                <select value={draft.availability} onChange={(event) => setDraft({ ...draft, availability: event.target.value as Consultant["availability"], availableAgainDate: event.target.value === "Available" ? null : draft.availableAgainDate })} className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"><option value="Available">Available</option><option value="Unavailable">Unavailable</option></select>
              </FormField>
              {draft.availability === "Unavailable" && <FormField label="Available again"><Input type="date" value={draft.availableAgainDate?.slice(0, 10) ?? ""} onChange={(event) => setDraft({ ...draft, availableAgainDate: event.target.value || null })} /></FormField>}
              <FormField label={t("consultant_office")}>
                <Input value={draft.office ?? ""} onChange={(event) => setDraft({ ...draft, office: event.target.value || null })} />
              </FormField>
              <FormField label={t("consultant_years")}>
                <Input
                  type="number"
                  value={draft.yearsOfExperience ?? ""}
                  onChange={(event) => setDraft({ ...draft, yearsOfExperience: event.target.value ? Number(event.target.value) : null, yearsOfExperienceSource: "ManuallyConfirmed" })}
                />
              </FormField>
              <FormField label="Email">
                <Input value={draft.email ?? ""} onChange={(event) => setDraft({ ...draft, email: event.target.value || null })} />
              </FormField>
            </div>

            <FormField label="Summary">
              <Textarea
                value={draft.summary ?? ""}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value || null })}
                rows={4}
              />
            </FormField>
          </FormSection>

          </div><div className={editStep === 1 ? "space-y-4" : "hidden"}><FormSection title={t("consultant_skills")}>
            <div className="space-y-2">
              {draft.skills.map((item, index) => (
                <div key={index} className="grid grid-cols-[minmax(140px,1fr)_90px_90px_minmax(140px,1fr)_auto] gap-2 items-center">
                  <Input aria-label="Skill name" placeholder="Skill" value={item.name} onChange={(event) => setDraft({ ...draft, skills: draft.skills.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <Input type="number" min={0} aria-label="Years" placeholder="Years" value={item.years} onChange={(event) => setDraft({ ...draft, skills: draft.skills.map((row, i) => i === index ? { ...row, years: Number(event.target.value) || 0 } : row) })} />
                  <Input type="number" min={0} max={5} aria-label="Skill level from 0 to 5" placeholder="Level" value={item.level} onChange={(event) => setDraft({ ...draft, skills: draft.skills.map((row, i) => i === index ? { ...row, level: Number(event.target.value) || 0 } : row) })} />
                  <Input placeholder="Evidence from CV" value={item.evidence ?? ""} onChange={(event) => setDraft({ ...draft, skills: draft.skills.map((row, i) => i === index ? { ...row, evidence: event.target.value || null } : row) })} />
                  <button type="button" className="text-[11px] text-app-muted" onClick={() => setDraft({ ...draft, skills: draft.skills.filter((_, i) => i !== index) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, skills: [...draft.skills, { id: 0, consultantId: draft.id, name: "", category: null, years: 0, level: 0, evidence: null }] })}>+ Add skill</button>
            </div>
          </FormSection>

          <FormSection title="Languages">
            <div className="space-y-2">
              {draft.languages.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input aria-label="Language name" placeholder="Language" value={item.name} onChange={(event) => setDraft({ ...draft, languages: draft.languages.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <select aria-label="Language proficiency" value={item.proficiency} onChange={(event) => setDraft({ ...draft, languages: draft.languages.map((row, i) => i === index ? { ...row, proficiency: event.target.value as typeof row.proficiency } : row) })} className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"><option>Not specified</option><option>Low</option><option>Medium</option><option>High</option><option>Native</option></select>
                  <button type="button" className="text-[11px] text-app-muted" onClick={() => setDraft({ ...draft, languages: draft.languages.filter((_, i) => i !== index) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, languages: [...draft.languages, { id: 0, consultantId: draft.id, name: "", proficiency: "Not specified" }] })}>+ Add language</button>
            </div>
          </FormSection>

          </div><div className={editStep === 2 ? "space-y-4" : "hidden"}><FormSection title="Experience">
            <div className="space-y-3">
              {draft.experiences.map((item, index) => (
                <div key={index} className="rounded-lg border border-app p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input aria-label="Role or title" placeholder="Role" value={item.role} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, role: event.target.value } : row) })} />
                    <Input aria-label="Company" placeholder="Company" value={item.company} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, company: event.target.value } : row) })} />
                    <Input type="date" aria-label="Start date" value={item.startDate?.slice(0, 10) ?? ""} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, startDate: event.target.value || null } : row) })} />
                    <Input type="date" aria-label="End date" value={item.endDate?.slice(0, 10) ?? ""} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, endDate: event.target.value || null } : row) })} />
                  </div>
                  <Textarea rows={2} placeholder="Description" value={item.description ?? ""} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, description: event.target.value || null } : row) })} />
                  <button type="button" className="text-[11px] text-app-muted" onClick={() => setDraft({ ...draft, experiences: draft.experiences.filter((_, i) => i !== index) })}>Remove experience</button>
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, experiences: [...draft.experiences, { id: 0, consultantId: draft.id, company: "", role: "", description: null, startDate: null, endDate: null }] })}>+ Add experience</button>
            </div>
          </FormSection>

          <FormSection title="Projects">
            <div className="space-y-3">
              {draft.projects.map((item, index) => (
                <div key={index} className="rounded-lg border border-app p-3 space-y-2">
                  <Input aria-label="Project name" placeholder="Project name" value={item.name} onChange={(event) => setDraft({ ...draft, projects: draft.projects.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <Input aria-label="Project technologies" placeholder="Technologies (comma-separated)" value={item.technologies ?? ""} onChange={(event) => setDraft({ ...draft, projects: draft.projects.map((row, i) => i === index ? { ...row, technologies: event.target.value || null } : row) })} />
                  <Textarea rows={2} placeholder="Description" value={item.description ?? ""} onChange={(event) => setDraft({ ...draft, projects: draft.projects.map((row, i) => i === index ? { ...row, description: event.target.value || null } : row) })} />
                  <button type="button" className="text-[11px] text-app-muted" onClick={() => setDraft({ ...draft, projects: draft.projects.filter((_, i) => i !== index) })}>Remove project</button>
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, projects: [...draft.projects, { id: 0, consultantId: draft.id, name: "", description: null, technologies: null }] })}>+ Add project</button>
            </div>
          </FormSection>

          </div><div className={editStep === 3 ? "space-y-4" : "hidden"}><FormSection title="Education, industries and certifications">
            <div className="space-y-3">
              {draft.education.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 items-center">
                  <Input aria-label="Degree" placeholder="Degree" value={item.degree} onChange={(event) => setDraft({ ...draft, education: draft.education.map((row, i) => i === index ? { ...row, degree: event.target.value } : row) })} />
                  <Input aria-label="School" placeholder="School" value={item.school ?? ""} onChange={(event) => setDraft({ ...draft, education: draft.education.map((row, i) => i === index ? { ...row, school: event.target.value || null } : row) })} />
                  <Input aria-label="Graduation year" placeholder="Year" value={item.year ?? ""} onChange={(event) => setDraft({ ...draft, education: draft.education.map((row, i) => i === index ? { ...row, year: event.target.value || null } : row) })} />
                  <button type="button" className="text-[11px] text-app-muted" onClick={() => setDraft({ ...draft, education: draft.education.filter((_, i) => i !== index) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, education: [...draft.education, { id: 0, consultantId: draft.id, degree: "", school: null, year: null }] })}>+ Add education</button>
              {draft.industries.map((item, index) => (
                <div key={"industry-" + index} className="flex gap-2">
                  <Input aria-label="Industry" placeholder="Industry" value={item.name} onChange={(event) => setDraft({ ...draft, industries: draft.industries.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <button type="button" className="text-[11px] text-app-muted" onClick={() => setDraft({ ...draft, industries: draft.industries.filter((_, i) => i !== index) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, industries: [...draft.industries, { id: 0, consultantId: draft.id, name: "" }] })}>+ Add industry</button>
              {draft.certifications.map((item, index) => (
                <div key={"cert-" + index} className="grid grid-cols-[1fr_1fr_120px_auto] gap-2 items-center">
                  <Input aria-label="Certification name" placeholder="Certification" value={item.name} onChange={(event) => setDraft({ ...draft, certifications: draft.certifications.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <Input aria-label="Certification issuer" placeholder="Issuer" value={item.issuer ?? ""} onChange={(event) => setDraft({ ...draft, certifications: draft.certifications.map((row, i) => i === index ? { ...row, issuer: event.target.value || null } : row) })} />
                  <Input placeholder="Issued date" value={item.issuedDate?.slice(0, 10) ?? ""} onChange={(event) => setDraft({ ...draft, certifications: draft.certifications.map((row, i) => i === index ? { ...row, issuedDate: event.target.value || null } : row) })} />
                  <button type="button" className="text-[11px] text-app-muted" onClick={() => setDraft({ ...draft, certifications: draft.certifications.filter((_, i) => i !== index) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, certifications: [...draft.certifications, { id: 0, consultantId: draft.id, name: "", issuer: null, issuedDate: null }] })}>+ Add certification</button>
            </div>
          </FormSection>

          </div>{saving && <p className="text-xs text-app-muted">Saving...</p>}
        </EditFormModal>
      )}
    </div>
  );
}
