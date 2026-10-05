import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, X } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { FormField } from "../components/ui/FormField";
import { consultantsApi } from "../services/consultantsApi";
import { useI18n } from "../i18n";
import type { Consultant, ConsultantSkill } from "../types";

type Step = "basic" | "profile" | "review";
const steps: Step[] = ["basic", "profile", "review"];

const trimDate = (value: string | null) => value?.slice(0, 10) ?? "";

function cleanPayload(draft: Consultant): Consultant {
  return {
    ...draft,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    skills: draft.skills.filter((item) => item.name.trim()).map((item) => ({ ...item, id: 0, consultantId: 0, skillId: 0 })),
    languages: draft.languages.filter((item) => item.name.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
    experiences: draft.experiences.filter((item) => item.company.trim() || item.role.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
    projects: draft.projects.filter((item) => item.name.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
    education: draft.education.filter((item) => item.degree.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
    industries: draft.industries.filter((item) => item.name.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
    certifications: draft.certifications.filter((item) => item.name.trim()).map((item) => ({ ...item, id: 0, consultantId: 0 })),
  };
}

export default function EditConsultant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [draft, setDraft] = useState<Consultant | null>(null);
  const [step, setStep] = useState<Step>("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const consultantId = Number(id);
    if (!Number.isInteger(consultantId) || consultantId <= 0) {
      setError(t("consultant_invalid_id"));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    consultantsApi.getById(consultantId, controller.signal)
      .then(setDraft)
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError"))
          setError(requestError instanceof Error ? requestError.message : t("consultant_load_error"));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id, t]);

  const update = (patch: Partial<Consultant>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const updateItem = <K extends keyof Consultant>(key: K, index: number, patch: Partial<Consultant[K] extends Array<infer T> ? T : never>) => {
    setDraft((current) => {
      if (!current) return current;
      const items = [...(current[key] as unknown as Array<Record<string, unknown>>)] as Array<Record<string, unknown>>;
      items[index] = { ...items[index], ...patch };
      return { ...current, [key]: items } as Consultant;
    });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setError(t("upload_required_names"));
      setStep("basic");
      return;
    }
    if (draft.yearsOfExperience !== null && draft.yearsOfExperience < 0 || draft.skills.some((item) => item.years < 0 || item.level < 0 || item.level > 5)) {
      setError(t("upload_invalid_experience"));
      setStep("profile");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await consultantsApi.update(draft.id, cleanPayload(draft));
      navigate(`/consultants/${draft.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("consultant_save_error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-app-muted">{t("consultant_loading")}</div>;
  if (!draft) return <div className="p-6 space-y-3"><Link to="/consultants" className="text-xs text-app-brand">← {t("consultants_title")}</Link><p className="text-sm text-app-secondary">{error || t("consultant_not_found")}</p></div>;

  const section = (title: string, children: React.ReactNode) => <section className="rounded-xl border border-app bg-app-surface p-5 space-y-4"><h2 className="text-sm font-medium text-app-primary">{title}</h2>{children}</section>;
  const remove = <K extends keyof Consultant>(key: K, index: number) => setDraft((current) => current ? { ...current, [key]: (current[key] as unknown[]).filter((_, itemIndex) => itemIndex !== index) } as Consultant : current);

  return <div className="h-full overflow-auto"><div className="mx-auto max-w-6xl space-y-5 p-6">
    <PageHeader title={t("consultant_edit_title")} description={t("consultant_edit_sub")} backTo={`/consultants/${draft.id}`} actions={<Button variant="ghost" onClick={() => navigate(`/consultants/${draft.id}`)}>{t("common_cancel")}</Button>} />
    <div className="grid grid-cols-3 gap-2">{steps.map((item, index) => <button type="button" key={item} onClick={() => setStep(item)} className={`rounded-lg border px-3 py-2 text-left text-xs ${step === item ? "border-app-brand bg-app-brand-soft text-app-primary" : "border-app text-app-muted"}`}><span className="font-semibold">{index + 1}</span><span className="ml-2">{item === "basic" ? t("consultant_basic_info") : item === "profile" ? t("consultant_profile") : t("assignment_edit_step_review")}</span></button>)}</div>
    {error && <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">{error}</div>}

    {step === "basic" && <div className="space-y-5">{section(t("consultant_basic_info"), <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t("consultant_first_name")} required><Input value={draft.firstName} onChange={(e) => update({ firstName: e.target.value })} /></FormField>
        <FormField label={t("consultant_last_name")} required><Input value={draft.lastName} onChange={(e) => update({ lastName: e.target.value })} /></FormField>
        <FormField label={t("consultant_role")}><Input value={draft.title ?? ""} onChange={(e) => update({ title: e.target.value || null })} /></FormField>
        <FormField label={t("consultant_seniority")}><select value={draft.seniority ?? ""} onChange={(e) => update({ seniority: e.target.value || null })} className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"><option value="">{t("common_not_specified")}</option><option value="Junior">{t("seniority_junior")}</option><option value="Mid">{t("seniority_mid")}</option><option value="Senior">{t("seniority_senior")}</option><option value="Staff">{t("seniority_staff")}</option></select></FormField>
        <FormField label={t("consultant_availability")}><select value={draft.availability} onChange={(e) => update({ availability: e.target.value as Consultant["availability"], availableAgainDate: e.target.value === "Available" ? null : draft.availableAgainDate })} className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"><option value="Available">{t("availability_available")}</option><option value="Unavailable">{t("availability_unavailable")}</option></select></FormField>
        {draft.availability === "Unavailable" && <FormField label={t("consultant_available_again")}><Input type="date" value={trimDate(draft.availableAgainDate)} onChange={(e) => update({ availableAgainDate: e.target.value || null })} /></FormField>}
        <FormField label={t("consultant_office")}><Input value={draft.office ?? ""} onChange={(e) => update({ office: e.target.value || null })} /></FormField>
        <FormField label={t("consultant_years")}><Input type="number" min={0} value={draft.yearsOfExperience ?? ""} onChange={(e) => update({ yearsOfExperience: e.target.value ? Number(e.target.value) : null, yearsOfExperienceSource: "ManuallyConfirmed" })} /></FormField>
        <FormField label={t("upload_email")}><Input type="email" value={draft.email ?? ""} onChange={(e) => update({ email: e.target.value || null })} /></FormField>
      </div>
      <FormField label={t("consultant_summary")}><Textarea rows={5} value={draft.summary ?? ""} onChange={(e) => update({ summary: e.target.value || null })} /></FormField>
    </>)}<div className="flex justify-end"><Button variant="primary" onClick={() => setStep("profile")}>{t("common_next")}</Button></div></div>}

    {step === "profile" && <div className="space-y-5">
      {section(t("consultant_skills"), <div className="space-y-2">{draft.skills.map((item, index) => <div key={`${item.id}-${index}`} className="grid gap-2 md:grid-cols-[minmax(150px,1fr)_90px_90px_minmax(150px,1fr)_auto] md:items-center"><Input aria-label={t("consultant_skill")} placeholder={t("consultant_skill")} value={item.name} onChange={(e) => updateItem("skills", index, { name: e.target.value })} /><Input type="number" min={0} aria-label={t("upload_field_years")} value={item.years} onChange={(e) => updateItem("skills", index, { years: Number(e.target.value) || 0 })} /><Input type="number" min={0} max={5} aria-label={t("upload_field_level")} value={item.level} onChange={(e) => updateItem("skills", index, { level: Number(e.target.value) || 0 })} /><Input aria-label={t("consultant_evidence")} placeholder={t("consultant_evidence")} value={item.evidence ?? ""} onChange={(e) => updateItem("skills", index, { evidence: e.target.value || null })} /><button type="button" aria-label={t("common_remove")} className="text-app-muted hover:text-app-danger" onClick={() => remove("skills", index)}><X size={13} /></button></div>)}<button type="button" className="inline-flex items-center gap-1 text-xs text-app-brand" onClick={() => update({ skills: [...draft.skills, { id: 0, consultantId: draft.id, name: "", category: null, years: 0, level: 0, evidence: null }] })}><Plus size={13} />{t("consultant_add_skill")}</button></div>)}
      {section(t("consultant_languages"), <div className="space-y-2">{draft.languages.map((item, index) => <div key={`${item.id}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-center"><Input aria-label={t("consultant_language")} value={item.name} onChange={(e) => updateItem("languages", index, { name: e.target.value })} /><select aria-label={t("upload_language_proficiency")} value={item.proficiency} onChange={(e) => updateItem("languages", index, { proficiency: e.target.value as typeof item.proficiency })} className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"><option value="Not specified">{t("common_not_specified")}</option><option value="Low">{t("proficiency_low")}</option><option value="Medium">{t("proficiency_medium")}</option><option value="High">{t("proficiency_high")}</option><option value="Native">{t("proficiency_native")}</option></select><button type="button" aria-label={t("common_remove")} className="text-app-muted hover:text-app-danger" onClick={() => remove("languages", index)}><X size={13} /></button></div>)}<button type="button" className="inline-flex items-center gap-1 text-xs text-app-brand" onClick={() => update({ languages: [...draft.languages, { id: 0, consultantId: draft.id, name: "", proficiency: "Not specified" }] })}><Plus size={13} />{t("consultant_add_language")}</button></div>)}
      {section(t("consultant_experience"), <div className="space-y-3">{draft.experiences.map((item, index) => <div key={`${item.id}-${index}`} className="rounded-lg border border-app p-3 space-y-2"><div className="grid gap-2 md:grid-cols-2"><Input aria-label={t("consultant_company")} placeholder={t("consultant_company")} value={item.company} onChange={(e) => updateItem("experiences", index, { company: e.target.value })} /><Input aria-label={t("upload_role")} placeholder={t("upload_role")} value={item.role} onChange={(e) => updateItem("experiences", index, { role: e.target.value })} /><Input type="date" aria-label={t("upload_start_date")} value={trimDate(item.startDate)} onChange={(e) => updateItem("experiences", index, { startDate: e.target.value || null })} /><Input type="date" aria-label={t("upload_end_date")} value={trimDate(item.endDate)} onChange={(e) => updateItem("experiences", index, { endDate: e.target.value || null })} /></div><Textarea rows={2} aria-label={t("consultant_description")} value={item.description ?? ""} onChange={(e) => updateItem("experiences", index, { description: e.target.value || null })} /><button type="button" className="text-[11px] text-app-muted" onClick={() => remove("experiences", index)}>{t("consultant_remove_experience")}</button></div>)}<button type="button" className="inline-flex items-center gap-1 text-xs text-app-brand" onClick={() => update({ experiences: [...draft.experiences, { id: 0, consultantId: draft.id, company: "", role: "", description: null, startDate: null, endDate: null }] })}><Plus size={13} />{t("upload_add_experience")}</button></div>)}
      {section(t("consultant_projects"), <div className="space-y-3">{draft.projects.map((item, index) => <div key={`${item.id}-${index}`} className="rounded-lg border border-app p-3 space-y-2"><Input aria-label={t("upload_project_name")} value={item.name} onChange={(e) => updateItem("projects", index, { name: e.target.value })} /><Input aria-label={t("upload_technologies")} value={item.technologies ?? ""} onChange={(e) => updateItem("projects", index, { technologies: e.target.value || null })} /><Textarea rows={2} aria-label={t("consultant_description")} value={item.description ?? ""} onChange={(e) => updateItem("projects", index, { description: e.target.value || null })} /><button type="button" className="text-[11px] text-app-muted" onClick={() => remove("projects", index)}>{t("consultant_remove_project")}</button></div>)}<button type="button" className="inline-flex items-center gap-1 text-xs text-app-brand" onClick={() => update({ projects: [...draft.projects, { id: 0, consultantId: draft.id, name: "", description: null, technologies: null }] })}><Plus size={13} />{t("upload_projects")}</button></div>)}
      {section(t("consultant_education_details"), <div className="space-y-2">{draft.education.map((item, index) => <div key={`${item.id}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_100px_auto] md:items-center"><Input aria-label={t("upload_degree")} value={item.degree} onChange={(e) => updateItem("education", index, { degree: e.target.value })} /><Input aria-label={t("consultant_school")} value={item.school ?? ""} onChange={(e) => updateItem("education", index, { school: e.target.value || null })} /><Input aria-label={t("upload_year")} value={item.year ?? ""} onChange={(e) => updateItem("education", index, { year: e.target.value || null })} /><button type="button" aria-label={t("common_remove")} className="text-app-muted" onClick={() => remove("education", index)}><X size={13} /></button></div>)}<button type="button" className="inline-flex items-center gap-1 text-xs text-app-brand" onClick={() => update({ education: [...draft.education, { id: 0, consultantId: draft.id, degree: "", school: null, year: null }] })}><Plus size={13} />{t("upload_education")}</button></div>)}
      {section(t("upload_industries"), <div className="space-y-2">{draft.industries.map((item, index) => <div key={`${item.id}-${index}`} className="flex gap-2"><Input aria-label={t("upload_industry")} value={item.name} onChange={(e) => updateItem("industries", index, { name: e.target.value })} /><button type="button" aria-label={t("common_remove")} className="text-app-muted" onClick={() => remove("industries", index)}><X size={13} /></button></div>)}<button type="button" className="inline-flex items-center gap-1 text-xs text-app-brand" onClick={() => update({ industries: [...draft.industries, { id: 0, consultantId: draft.id, name: "" }] })}><Plus size={13} />{t("upload_industry")}</button></div>)}
      {section(t("upload_certifications"), <div className="space-y-2">{draft.certifications.map((item, index) => <div key={`${item.id}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_140px_auto] md:items-center"><Input aria-label={t("upload_certification")} value={item.name} onChange={(e) => updateItem("certifications", index, { name: e.target.value })} /><Input aria-label={t("upload_issuer")} value={item.issuer ?? ""} onChange={(e) => updateItem("certifications", index, { issuer: e.target.value || null })} /><Input aria-label={t("upload_issued_date")} value={trimDate(item.issuedDate)} onChange={(e) => updateItem("certifications", index, { issuedDate: e.target.value || null })} /><button type="button" aria-label={t("common_remove")} className="text-app-muted" onClick={() => remove("certifications", index)}><X size={13} /></button></div>)}<button type="button" className="inline-flex items-center gap-1 text-xs text-app-brand" onClick={() => update({ certifications: [...draft.certifications, { id: 0, consultantId: draft.id, name: "", issuer: null, issuedDate: null }] })}><Plus size={13} />{t("upload_certification")}</button></div>)}
      <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep("basic")}>{t("common_previous")}</Button><Button variant="primary" onClick={() => setStep("review")}>{t("common_next")}</Button></div>
    </div>}

    {step === "review" && <div className="space-y-5">{section(t("assignment_edit_step_review"), <>
      <div className="grid gap-4 text-sm md:grid-cols-2"><div><p className="text-[10px] text-app-muted">{t("consultant_full_name")}</p><p className="text-app-primary">{draft.firstName} {draft.lastName}</p></div><div><p className="text-[10px] text-app-muted">{t("consultant_role")}</p><p className="text-app-secondary">{draft.title || t("common_not_specified")}</p></div><div><p className="text-[10px] text-app-muted">{t("consultant_seniority")}</p><p className="text-app-secondary">{draft.seniority || t("common_not_specified")}</p></div><div><p className="text-[10px] text-app-muted">{t("consultant_years")}</p><p className="text-app-secondary">{draft.yearsOfExperience ?? t("common_not_specified")}</p></div><div><p className="text-[10px] text-app-muted">{t("consultant_availability")}</p><p className="text-app-secondary">{draft.availability === "Available" ? t("availability_available") : t("availability_unavailable")}</p></div><div><p className="text-[10px] text-app-muted">{t("consultant_office")}</p><p className="text-app-secondary">{draft.office || t("common_not_specified")}</p></div></div>
      {draft.summary && <div><p className="text-[10px] text-app-muted">{t("consultant_summary")}</p><p className="whitespace-pre-wrap text-sm text-app-secondary">{draft.summary}</p></div>}
      {draft.skills.length > 0 && <div><p className="mb-2 text-[10px] uppercase tracking-wide text-app-muted">{t("consultant_skills")}</p><div className="flex flex-wrap gap-2">{draft.skills.filter((item) => item.name.trim()).map((item, index) => <span key={`${item.id}-${index}`} className="rounded border border-app px-2 py-1 text-xs text-app-secondary">{item.name} · {item.years} {t("consultant_year_count")}</span>)}</div></div>}
      {draft.languages.length > 0 && <div><p className="mb-2 text-[10px] uppercase tracking-wide text-app-muted">{t("consultant_languages")}</p><div className="flex flex-wrap gap-2">{draft.languages.filter((item) => item.name.trim()).map((item, index) => <span key={`${item.id}-${index}`} className="rounded border border-app px-2 py-1 text-xs text-app-secondary">{item.name} · {item.proficiency === "Not specified" ? t("common_not_specified") : item.proficiency}</span>)}</div></div>}
      {draft.experiences.length > 0 && <p className="text-xs text-app-secondary">{draft.experiences.filter((item) => item.company.trim() || item.role.trim()).length} {t("consultant_experience").toLowerCase()}</p>}
      {draft.projects.length > 0 && <p className="text-xs text-app-secondary">{draft.projects.filter((item) => item.name.trim()).length} {t("consultant_projects").toLowerCase()}</p>}
      {draft.education.length > 0 && <p className="text-xs text-app-secondary">{draft.education.filter((item) => item.degree.trim()).length} {t("upload_education").toLowerCase()}</p>}
      {draft.industries.length > 0 && <p className="text-xs text-app-secondary">{draft.industries.filter((item) => item.name.trim()).length} {t("upload_industries").toLowerCase()}</p>}
      {draft.certifications.length > 0 && <p className="text-xs text-app-secondary">{draft.certifications.filter((item) => item.name.trim()).length} {t("upload_certifications").toLowerCase()}</p>}
    </>) }<div className="flex justify-between"><Button variant="ghost" onClick={() => setStep("profile")}>{t("common_previous")}</Button><Button variant="primary" disabled={saving} onClick={() => void save()}>{saving ? t("consultant_saving") : t("common_save")}</Button></div></div>}
  </div></div>;
}
