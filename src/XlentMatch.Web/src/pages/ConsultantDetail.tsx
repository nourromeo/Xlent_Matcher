import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Code, Briefcase, GraduationCap, Globe, Edit3, Trash2 } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { EntitySummary } from "../components/ui/EntitySummary";
import { useI18n } from "../i18n";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { EditFormModal } from "../components/ui/EditFormModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Button } from "../components/ui/Button";
import { RemoveButton } from "../components/ui/RemoveButton";
import { StatusBadge } from "../components/ui/StatusBadge";
import { FormSection } from "../components/ui/FormSection";
import { FormField } from "../components/ui/FormField";
import { consultantsApi } from "../services/consultantsApi";
import { cvUploadsApi, type CvUploadRecord } from "../services/cvUploadsApi";
import { formatDate } from "../services/localeFormat";
import type { Consultant, ConsultantSkill } from "../types";

type Translate = ReturnType<typeof useI18n>["t"];

const levelLabel = (level: number, t: Translate) => {
  if (level === 0) return t("common_not_specified");
  if (level >= 5) return t("consultant_level_expert");
  if (level >= 3) return t("consultant_level_proficient");
  return t("consultant_level_familiar");
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

function availabilityLabel(consultant: Consultant, t: Translate, locale: Parameters<typeof formatDate>[1]) {
  if (consultant.availability === "Available") return t("availability_available");
  return consultant.availableAgainDate ? `${t("availability_unavailable_until")} ${formatDate(`${consultant.availableAgainDate.slice(0, 10)}T00:00:00`, locale)}` : t("availability_unavailable");
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
  const { t, locale } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const consultantId = Number(id);

  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [cvFiles, setCvFiles] = useState<CvUploadRecord[]>([]);
  const [draft, setDraft] = useState<Consultant | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryOverflow, setSummaryOverflow] = useState(false);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const [languagesExpanded, setLanguagesExpanded] = useState(false);
  const [educationExpanded, setEducationExpanded] = useState(false);
  const [industriesExpanded, setIndustriesExpanded] = useState(false);
  const [certificationsExpanded, setCertificationsExpanded] = useState(false);
  const [experienceExpanded, setExperienceExpanded] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [editStep, setEditStep] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(consultantId) || consultantId <= 0) {
      setError(t("consultant_invalid_id"));
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
          setError(requestError instanceof Error ? requestError.message : t("consultant_load_error"));
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

  useEffect(() => {
    if (!Number.isInteger(consultantId) || consultantId <= 0) return;
    cvUploadsApi.getAll().then((items) => setCvFiles(items.filter((item) => item.consultantId === consultantId && item.status === "Indexed"))).catch(() => {});
  }, [consultantId]);

  useEffect(() => {
    if (summaryExpanded || !consultant?.summary || !summaryRef.current) return;

    const element = summaryRef.current;
    const measure = () => setSummaryOverflow(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [consultant?.summary, summaryExpanded]);

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
      setError(requestError instanceof Error ? requestError.message : t("consultant_save_error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteConsultant = async () => {
    if (!consultant) return;
    setDeleting(true);
    setError("");
    try {
      await consultantsApi.remove(consultant.id);
      navigate("/consultants");
    } catch (requestError) {
      setError(t("consultant_delete_error"));
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-app-muted">{t("consultant_loading")}</div>;
  }

  if (!consultant) {
    return (
      <div className="p-6 space-y-3">
        <Link to="/consultants" className="text-xs text-app-brand">← {t("consultants_title")}</Link>
        <p className="text-sm text-app-secondary">{error || t("consultant_not_found")}</p>
      </div>
    );
  }

  const hasMoreSkills = consultant.skills.length > 6;
  const visibleSkills = showAllSkills ? consultant.skills : consultant.skills.slice(0, 6);
  const visibleLanguages = languagesExpanded ? consultant.languages : consultant.languages.slice(0, 3);
  const visibleEducation = educationExpanded ? consultant.education : consultant.education.slice(0, 3);
  const visibleIndustries = industriesExpanded ? consultant.industries : consultant.industries.slice(0, 6);
  const visibleCertifications = certificationsExpanded ? consultant.certifications : consultant.certifications.slice(0, 3);
  const visibleExperiences = experienceExpanded ? consultant.experiences : consultant.experiences.slice(0, 3);
  const visibleProjects = projectsExpanded ? consultant.projects : consultant.projects.slice(0, 3);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 bg-app-surface flex-none">
        <PageHeader
          title={t("consultant_details_title")}
          description={t("consultant_details_description")}
        />
      </div>
      <EntitySummary
        leading={<div className="w-9 h-9 rounded-full bg-app-brand-subtle flex items-center justify-center text-sm font-semibold text-app-brand">{initials(consultant)}</div>}
        title={fullName(consultant)}
        subtitle={consultant.title || t("consultant_role")}
        metadata={`${consultant.office || "—"} · ${consultant.yearsOfExperience == null ? t("consultant_needs_confirmation") : `${consultant.yearsOfExperience} ${t("consultant_years_experience")}`}`}
        badges={consultant.availability ? <StatusBadge tone={consultant.availability === "Available" ? "success" : "danger"}>{availabilityLabel(consultant, t, locale)}</StatusBadge> : undefined}
        actions={<div className="flex items-center gap-2"><Link to={`/consultants/${consultant.id}/edit`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-app-border text-app-secondary transition-colors hover:text-app-primary"><Edit3 size={12} /> {t("consultant_edit")}</Link><Button variant="danger" icon={<Trash2 size={12} />} onClick={() => setDeleteConfirmOpen(true)} disabled={deleting}>{deleting ? t("client_deleting") : t("common_delete")}</Button></div>}
      />

      <ConfirmDialog open={deleteConfirmOpen} title={t("common_delete")} message={t("consultant_delete_confirm").replace("{name}", fullName(consultant))} onClose={() => setDeleteConfirmOpen(false)} onConfirm={async () => { setDeleteConfirmOpen(false); await deleteConsultant(); }} />

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-secondary">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-app">
        <div className="p-6 space-y-5">
          <section className="bg-app-surface border border-app-border rounded-xl p-5 shadow-app-surface"><h2 className="text-sm font-medium text-app-primary mb-3">Curriculum Vitae</h2>{cvFiles.filter((file) => file.isActive).length === 0 ? <p className="text-xs text-app-muted">No stored CV available.</p> : cvFiles.filter((file) => file.isActive).map((file) => <div key={file.id} className="flex gap-3 items-center text-xs text-app-secondary"><span>{file.fileName}</span>{file.storageKey && <a className="text-app-brand" href={cvUploadsApi.fileUrl(file.id)}>Download CV</a>}<Link className="text-app-brand" to={`/cv-upload?replaceConsultantId=${consultant.id}`}>Replace CV</Link>{false && null}</div>)}</section>
          {consultant.summary && (
            <section className="bg-app-surface border border-app-border rounded-xl p-5 shadow-app-surface">
              <p className="text-sm font-medium text-app-primary mb-3">{t("consultant_summary")}</p>
              <p ref={summaryRef} className={`text-sm text-app-secondary leading-7 max-w-5xl ${!summaryExpanded ? "line-clamp-4" : ""}`}>{consultant.summary}</p>
              {(summaryOverflow || summaryExpanded) && <button type="button" onClick={() => setSummaryExpanded((current) => !current)} className="mt-3 text-xs text-app-brand hover:text-app-primary">{summaryExpanded ? `${t("consultant_show_less")} ↑` : `${t("consultant_show_more")} ↓`}</button>}
            </section>
          )}

          <section className="bg-app-surface border border-app-border rounded-xl overflow-hidden shadow-app-surface">
                <div className="px-4 py-3 border-b border-app-border flex items-center gap-2">
                  <Code size={12} className="text-app-faint" />
                  <span className="text-xs font-medium text-app-primary">{t("consultant_skills")}</span>
                </div>

                <div className="px-4 py-3 border-b border-app-border grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] uppercase tracking-wide text-app-faint">{t("consultant_seniority_label")}</p><p className="text-sm font-medium text-app-primary mt-1">{consultant.seniority || t("common_not_specified")}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-app-faint">{t("consultant_total_experience")}</p><p className="text-sm font-medium text-app-primary mt-1">{consultant.yearsOfExperience == null ? t("consultant_needs_confirmation") : `${consultant.yearsOfExperience} ${t("consultant_year_count")}`}</p></div>
                </div>
                <div className="px-4 py-2 border-b border-app-border"><span className="text-[10px] uppercase tracking-wide text-app-faint">{t("consultant_skill_experience")}</span></div>
                {consultant.skills.length === 0 ? (
                  <p className="px-4 py-3 text-[11px] text-app-faint">{t("consultant_no_skills")}</p>
                ) : visibleSkills.map((skill, index) => (
                  <div
                    key={skill.id || `${skill.name}-${index}`}
                    className="px-4 py-3"
                    style={{ borderBottom: index < consultant.skills.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-none w-28">
                        <p className="text-xs font-medium text-app-primary font-mono">{skill.name}</p>
                        <p className="text-[10px] text-app-faint mt-0.5">{skill.category || t("consultant_skill")}</p>
                      </div>
                      <div className="flex-none flex items-center gap-3">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={levelStyle(skill.level)}>
                          {levelLabel(skill.level, t)}
                        </span>
                        <span className="text-[10px] font-mono text-app-muted">{skill.years == null ? "Not specified" : `${skill.years}y`}</span>
                      </div>
                      <p className="flex-1 text-[11px] text-app-muted italic leading-relaxed">
                        {skill.evidence || t("consultant_no_evidence")}
                      </p>
                    </div>
                  </div>
                ))}
                {hasMoreSkills && <button type="button" onClick={() => setShowAllSkills((current) => !current)} className="px-4 py-3 text-xs text-app-brand hover:text-app-primary">{showAllSkills ? `${t("consultant_show_fewer_skills")} ↑` : `${t("consultant_show_all_skills").replace("{count}", String(consultant.skills.length))} ↓`}</button>}
          </section>

          <div className="grid md:grid-cols-2 gap-5 items-start">
            {consultant.languages.length > 0 && <section className="bg-app-surface border border-app-border rounded-xl p-5 shadow-app-surface md:min-h-[172px]">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={12} className="text-app-faint" />
                <span className="text-sm font-medium text-app-primary">{t("consultant_languages")}</span>
              </div>
              <div className="space-y-2">
                {visibleLanguages.map((language) => (
                  <div key={language.id || language.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-app-secondary">{language.name}</span>
                    <span className="text-xs text-app-muted">{language.proficiency === "Not specified" ? t("common_not_specified") : language.proficiency === "Low" ? t("proficiency_low") : language.proficiency === "Medium" ? t("proficiency_medium") : language.proficiency === "High" ? t("proficiency_high") : language.proficiency === "Native" ? t("proficiency_native") : language.proficiency}</span>
                  </div>
                ))}
              </div>
              {consultant.languages.length > 3 && <button type="button" onClick={() => setLanguagesExpanded((current) => !current)} className="mt-4 text-xs text-app-brand hover:text-app-primary">{languagesExpanded ? `${t("consultant_show_fewer")} ↑` : `${t("consultant_show_all_languages").replace("{count}", String(consultant.languages.length))} ↓`}</button>}
            </section>}

            {consultant.education.length > 0 && <section className="bg-app-surface border border-app-border rounded-xl p-5 space-y-3 shadow-app-surface md:min-h-[172px]">
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap size={12} className="text-app-faint" />
                  <span className="text-sm font-medium text-app-primary">{t("consultant_education")}</span>
                </div>
                {visibleEducation.map((education) => <div key={education.id || education.degree}><p className="text-xs text-app-primary">{education.degree}</p><p className="text-[11px] text-app-muted">{education.school || "—"} · {education.year || "—"}</p></div>)}
                {consultant.education.length > 3 && <button type="button" onClick={() => setEducationExpanded((current) => !current)} className="text-xs text-app-brand hover:text-app-primary">{educationExpanded ? `${t("consultant_show_fewer")} ↑` : `${t("consultant_show_all_education").replace("{count}", String(consultant.education.length))} ↓`}</button>}
            </section>}

            {consultant.certifications.length > 0 && <section className="bg-app-surface border border-app-border rounded-xl p-5 shadow-app-surface md:min-h-[172px]">
              <p className="text-sm font-medium text-app-primary mb-4">{t("consultant_certifications")}</p>
              <div className="space-y-2">{visibleCertifications.map((certification) => <p key={certification.id || certification.name} className="text-sm text-app-secondary">{certification.name}{certification.issuer ? ` — ${certification.issuer}` : ""}{certification.issuedYear || certification.issuedDate ? ` · ${certification.issuedYear || certification.issuedDate?.slice(0, 4)}` : ""}</p>)}</div>
              {consultant.certifications.length > 3 && <button type="button" onClick={() => setCertificationsExpanded((current) => !current)} className="mt-4 text-xs text-app-brand hover:text-app-primary">{certificationsExpanded ? `${t("consultant_show_fewer")} ↑` : `${t("consultant_show_all_certifications").replace("{count}", String(consultant.certifications.length))} ↓`}</button>}
            </section>}

            {consultant.industries.length > 0 && <section className="bg-app-surface border border-app-border rounded-xl p-5 shadow-app-surface md:min-h-[172px]">
            <p className="text-sm font-medium text-app-primary mb-4">{t("consultant_industries")}</p>
            <div className="flex flex-wrap gap-2">{visibleIndustries.map((industry) => <span key={industry.id || industry.name} className="text-[11px] text-app-secondary px-2 py-1 rounded" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>{industry.name}</span>)}</div>
            {consultant.industries.length > 6 && <button type="button" onClick={() => setIndustriesExpanded((current) => !current)} className="mt-4 text-xs text-app-brand hover:text-app-primary">{industriesExpanded ? `${t("consultant_show_fewer")} ↑` : `${t("consultant_show_all_industries").replace("{count}", String(consultant.industries.length))} ↓`}</button>}
            </section>}
          </div>

          <section className="bg-app-surface border border-app-border rounded-xl overflow-hidden shadow-app-surface">
            <div className="px-5 py-4 border-b border-app-border flex items-center gap-2"><Briefcase size={12} className="text-app-faint" /><span className="text-sm font-medium text-app-primary">{t("consultant_experience")}</span></div>
            {consultant.experiences.length === 0 ? <p className="px-5 py-4 text-[11px] text-app-faint">{t("consultant_no_experience")}</p> : visibleExperiences.map((experience, index) => <div key={experience.id || index} className="px-5 py-4 space-y-2" style={{ borderBottom: index < visibleExperiences.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-app-primary">{experience.role}</p><p className="text-xs text-app-muted">{experience.company}</p></div><span className="text-[10px] font-mono text-app-faint">{experience.startDate || "—"} – {experience.endDate || t("consultant_present")}</span></div>{experience.description && <p className="text-[11px] text-app-muted leading-relaxed line-clamp-3">{experience.description}</p>}</div>)}
            {consultant.experiences.length > 3 && <button type="button" onClick={() => setExperienceExpanded((current) => !current)} className="mx-5 mb-4 text-xs text-app-brand hover:text-app-primary">{experienceExpanded ? `${t("consultant_show_fewer")} ↑` : `${t("consultant_show_all_experience").replace("{count}", String(consultant.experiences.length))} ↓`}</button>}
          </section>

          <section className="bg-app-surface border border-app-border rounded-xl overflow-hidden shadow-app-surface">
            <div className="px-5 py-4 border-b border-app-border flex items-center gap-2"><Code size={12} className="text-app-faint" /><span className="text-sm font-medium text-app-primary">{t("consultant_projects")}</span></div>
            {consultant.projects.length === 0 ? <p className="px-5 py-4 text-[11px] text-app-faint">{t("consultant_no_projects")}</p> : visibleProjects.map((project, index) => <div key={project.id || index} className="px-5 py-4 space-y-1.5" style={{ borderBottom: index < visibleProjects.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}><p className="text-sm font-medium text-app-primary">{project.name}</p>{project.technologies && <p className="text-[10px] font-mono text-app-muted">{project.technologies}</p>}{project.description && <p className="text-[11px] text-app-muted leading-relaxed line-clamp-3">{project.description}</p>}</div>)}
            {consultant.projects.length > 3 && <button type="button" onClick={() => setProjectsExpanded((current) => !current)} className="mx-5 mb-4 text-xs text-app-brand hover:text-app-primary">{projectsExpanded ? `${t("consultant_show_fewer")} ↑` : `${t("consultant_show_all_projects").replace("{count}", String(consultant.projects.length))} ↓`}</button>}
          </section>
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
              <FormField label={t("consultant_first_name")}>
                <Input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} />
              </FormField>
              <FormField label={t("consultant_last_name")}>
                <Input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} />
              </FormField>
              <FormField label={t("consultant_role")}>
                <Input value={draft.title ?? ""} onChange={(event) => setDraft({ ...draft, title: event.target.value || null })} />
              </FormField>
              <FormField label={t("consultant_seniority")}>
                <select value={draft.seniority ?? ""} onChange={(event) => setDraft({ ...draft, seniority: event.target.value || null })} className="w-full bg-app border border-app-border rounded px-3 py-2 text-xs text-app-primary"><option value="">{t("common_not_specified")}</option><option value="Junior">{t("seniority_junior")}</option><option value="Mid">{t("seniority_mid")}</option><option value="Senior">{t("seniority_senior")}</option><option value="Staff">{t("seniority_staff")}</option></select>
              </FormField>
              <FormField label={t("consultant_availability")}>
                <select value={draft.availability} onChange={(event) => setDraft({ ...draft, availability: event.target.value as Consultant["availability"], availableAgainDate: event.target.value === "Available" ? null : draft.availableAgainDate })} className="w-full bg-app border border-app-border rounded px-3 py-2 text-xs text-app-primary"><option value="Available">{t("availability_available")}</option><option value="Unavailable">{t("availability_unavailable")}</option></select>
              </FormField>
              {draft.availability === "Unavailable" && <FormField label={t("consultant_available_again")}><Input type="date" value={draft.availableAgainDate?.slice(0, 10) ?? ""} onChange={(event) => setDraft({ ...draft, availableAgainDate: event.target.value || null })} /></FormField>}
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
              <FormField label={t("upload_email")}>
                <Input value={draft.email ?? ""} onChange={(event) => setDraft({ ...draft, email: event.target.value || null })} />
              </FormField>
            </div>

            <FormField label={t("consultant_summary")}>
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
                  <Input aria-label={t("consultant_skill")} placeholder={t("consultant_skill")} value={item.name} onChange={(event) => setDraft({ ...draft, skills: draft.skills.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <Input type="number" min={0} aria-label={t("upload_field_years")} placeholder={t("upload_field_years")} value={item.years ?? ""} onChange={(event) => setDraft({ ...draft, skills: draft.skills.map((row, i) => i === index ? { ...row, years: event.target.value === "" ? null : Number(event.target.value) } : row) })} />
                  <Input type="number" min={0} max={5} aria-label={t("upload_field_level")} placeholder={t("upload_field_level")} value={item.level} onChange={(event) => setDraft({ ...draft, skills: draft.skills.map((row, i) => i === index ? { ...row, level: Number(event.target.value) || 0 } : row) })} />
                  <Input placeholder={t("consultant_evidence")} value={item.evidence ?? ""} onChange={(event) => setDraft({ ...draft, skills: draft.skills.map((row, i) => i === index ? { ...row, evidence: event.target.value || null } : row) })} />
                  <RemoveButton onClick={() => setDraft({ ...draft, skills: draft.skills.filter((_, i) => i !== index) })} />
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, skills: [...draft.skills, { id: 0, consultantId: draft.id, name: "", category: null, years: null, level: 0, evidence: null }] })}>+ {t("consultant_add_skill")}</button>
            </div>
          </FormSection>

          <FormSection title={t("consultant_languages")}>
            <div className="space-y-2">
              {draft.languages.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input aria-label={t("consultant_language")} placeholder={t("consultant_language")} value={item.name} onChange={(event) => setDraft({ ...draft, languages: draft.languages.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <select aria-label={t("upload_language_proficiency")} value={item.proficiency} onChange={(event) => setDraft({ ...draft, languages: draft.languages.map((row, i) => i === index ? { ...row, proficiency: event.target.value as typeof row.proficiency } : row) })} className="w-full bg-app border border-app-border rounded px-3 py-2 text-xs text-app-primary"><option value="Not specified">{t("common_not_specified")}</option><option value="Low">{t("proficiency_low")}</option><option value="Medium">{t("proficiency_medium")}</option><option value="High">{t("proficiency_high")}</option><option value="Native">{t("proficiency_native")}</option></select>
                  <RemoveButton onClick={() => setDraft({ ...draft, languages: draft.languages.filter((_, i) => i !== index) })} />
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, languages: [...draft.languages, { id: 0, consultantId: draft.id, name: "", proficiency: "Not specified" }] })}>+ {t("consultant_add_language")}</button>
            </div>
          </FormSection>

          </div><div className={editStep === 2 ? "space-y-4" : "hidden"}><FormSection title={t("consultant_experience")}>
            <div className="space-y-3">
              {draft.experiences.map((item, index) => (
                <div key={index} className="rounded-lg border border-app-border p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input aria-label={t("upload_role")} placeholder={t("upload_role")} value={item.role} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, role: event.target.value } : row) })} />
                    <Input aria-label={t("consultant_company")} placeholder={t("consultant_company")} value={item.company} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, company: event.target.value } : row) })} />
                    <Input type="date" aria-label={t("upload_start_date")} value={item.startDate?.slice(0, 10) ?? ""} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, startDate: event.target.value || null } : row) })} />
                    <Input type="date" aria-label={t("upload_end_date")} value={item.endDate?.slice(0, 10) ?? ""} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, endDate: event.target.value || null } : row) })} />
                  </div>
                  <Textarea rows={2} placeholder={t("consultant_description")} value={item.description ?? ""} onChange={(event) => setDraft({ ...draft, experiences: draft.experiences.map((row, i) => i === index ? { ...row, description: event.target.value || null } : row) })} />
                  <RemoveButton label={t("consultant_remove_experience")} onClick={() => setDraft({ ...draft, experiences: draft.experiences.filter((_, i) => i !== index) })} />
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, experiences: [...draft.experiences, { id: 0, consultantId: draft.id, company: "", role: "", description: null, startDate: null, endDate: null }] })}>+ {t("upload_add_experience")}</button>
            </div>
          </FormSection>

          <FormSection title={t("consultant_projects")}>
            <div className="space-y-3">
              {draft.projects.map((item, index) => (
                <div key={index} className="rounded-lg border border-app-border p-3 space-y-2">
                  <Input aria-label={t("upload_project_name")} placeholder={t("upload_project_name")} value={item.name} onChange={(event) => setDraft({ ...draft, projects: draft.projects.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <Input aria-label={t("upload_technologies")} placeholder={t("upload_technologies")} value={item.technologies ?? ""} onChange={(event) => setDraft({ ...draft, projects: draft.projects.map((row, i) => i === index ? { ...row, technologies: event.target.value || null } : row) })} />
                  <Textarea rows={2} placeholder={t("consultant_description")} value={item.description ?? ""} onChange={(event) => setDraft({ ...draft, projects: draft.projects.map((row, i) => i === index ? { ...row, description: event.target.value || null } : row) })} />
                  <RemoveButton label={t("consultant_remove_project")} onClick={() => setDraft({ ...draft, projects: draft.projects.filter((_, i) => i !== index) })} />
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, projects: [...draft.projects, { id: 0, consultantId: draft.id, name: "", description: null, technologies: null }] })}>+ {t("upload_projects")}</button>
            </div>
          </FormSection>

          </div><div className={editStep === 3 ? "space-y-4" : "hidden"}><FormSection title={t("consultant_education_details")}>
            <div className="space-y-3">
              {draft.education.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 items-center">
                  <Input aria-label={t("upload_degree")} placeholder={t("upload_degree")} value={item.degree} onChange={(event) => setDraft({ ...draft, education: draft.education.map((row, i) => i === index ? { ...row, degree: event.target.value } : row) })} />
                  <Input aria-label={t("consultant_school")} placeholder={t("consultant_school")} value={item.school ?? ""} onChange={(event) => setDraft({ ...draft, education: draft.education.map((row, i) => i === index ? { ...row, school: event.target.value || null } : row) })} />
                  <Input aria-label={t("upload_year")} placeholder={t("upload_year")} value={item.year ?? ""} onChange={(event) => setDraft({ ...draft, education: draft.education.map((row, i) => i === index ? { ...row, year: event.target.value || null } : row) })} />
                  <RemoveButton onClick={() => setDraft({ ...draft, education: draft.education.filter((_, i) => i !== index) })} />
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, education: [...draft.education, { id: 0, consultantId: draft.id, degree: "", school: null, year: null }] })}>+ {t("upload_education")}</button>
              {draft.industries.map((item, index) => (
                <div key={"industry-" + index} className="flex gap-2">
                  <Input aria-label={t("upload_industry")} placeholder={t("upload_industry")} value={item.name} onChange={(event) => setDraft({ ...draft, industries: draft.industries.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <RemoveButton onClick={() => setDraft({ ...draft, industries: draft.industries.filter((_, i) => i !== index) })} />
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, industries: [...draft.industries, { id: 0, consultantId: draft.id, name: "" }] })}>+ {t("upload_industry")}</button>
              {draft.certifications.map((item, index) => (
                <div key={"cert-" + index} className="grid grid-cols-[1fr_1fr_120px_auto] gap-2 items-center">
                  <Input aria-label={t("upload_certification")} placeholder={t("upload_certification")} value={item.name} onChange={(event) => setDraft({ ...draft, certifications: draft.certifications.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} />
                  <Input aria-label={t("upload_issuer")} placeholder={t("upload_issuer")} value={item.issuer ?? ""} onChange={(event) => setDraft({ ...draft, certifications: draft.certifications.map((row, i) => i === index ? { ...row, issuer: event.target.value || null } : row) })} />
                  <Input placeholder={t("upload_issued_date")} value={item.issuedDate?.slice(0, 10) ?? ""} onChange={(event) => setDraft({ ...draft, certifications: draft.certifications.map((row, i) => i === index ? { ...row, issuedDate: event.target.value || null } : row) })} />
                  <RemoveButton onClick={() => setDraft({ ...draft, certifications: draft.certifications.filter((_, i) => i !== index) })} />
                </div>
              ))}
              <button type="button" className="text-xs text-app-brand" onClick={() => setDraft({ ...draft, certifications: [...draft.certifications, { id: 0, consultantId: draft.id, name: "", issuer: null, issuedDate: null }] })}>+ {t("upload_certification")}</button>
            </div>
          </FormSection>

          </div>{saving && <p className="text-xs text-app-muted">{t("common_saving")}</p>}
        </EditFormModal>
      )}
    </div>
  );
}
