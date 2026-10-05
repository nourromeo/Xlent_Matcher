import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { useI18n } from "../i18n";
import { assignmentsApi } from "../services/assignmentsApi";
import type { AssignmentApi, AssignmentRequirementApi } from "../types";

const newRequirement = (assignmentId: number, category: "Skill" | "HumanLanguage", type: "Mandatory" | "Desired"): AssignmentRequirementApi => ({
  id: 0, assignmentId, name: "", category, type, minYears: null, minLevel: null,
  proficiency: category === "HumanLanguage" ? "Not specified" : null, matchMode: "Exact", maximumSeniority: null,
});

export default function EditAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [draft, setDraft] = useState<AssignmentApi | null>(null);
  const [step, setStep] = useState<"basic" | "requirements" | "review">("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId)) { setError(t("assignment_invalid_id")); setLoading(false); return; }
    assignmentsApi.getById(assignmentId).then(setDraft).catch(() => setError(t("assignment_load_error"))).finally(() => setLoading(false));
  }, [id, t]);

  const update = (patch: Partial<AssignmentApi>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const updateRequirement = (index: number, patch: Partial<AssignmentRequirementApi>) => update({ requirements: draft!.requirements.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  const removeRequirement = (index: number) => update({ requirements: draft!.requirements.filter((_, itemIndex) => itemIndex !== index) });
  const addRequirement = (category: "Skill" | "HumanLanguage", type: "Mandatory" | "Desired") => update({ requirements: [...draft!.requirements, newRequirement(draft!.id, category, type)] });

  const groups = useMemo(() => {
    if (!draft) return { skills: [] as Array<{ item: AssignmentRequirementApi; index: number }>, languages: [] as Array<{ item: AssignmentRequirementApi; index: number }>, other: [] as Array<{ item: AssignmentRequirementApi; index: number }> };
    return {
      skills: draft.requirements.map((item, index) => ({ item, index })).filter(({ item }) => item.category === "Skill"),
      languages: draft.requirements.map((item, index) => ({ item, index })).filter(({ item }) => item.category === "HumanLanguage"),
      other: draft.requirements.map((item, index) => ({ item, index })).filter(({ item }) => item.category !== "Skill" && item.category !== "HumanLanguage"),
    };
  }, [draft]);

  const save = async () => {
    if (!draft || !draft.title.trim() || !draft.customerName.trim()) { setError(t("assignment_required_fields")); return; }
    const requirements = draft.requirements.filter((item) => item.name.trim()).map((item) => ({
      ...item, name: item.name.trim(),
      minYears: item.category === "HumanLanguage" ? null : item.minYears,
      minLevel: item.category === "HumanLanguage" ? null : item.minLevel,
      proficiency: item.category === "HumanLanguage" ? item.proficiency : null,
    }));
    if (!requirements.length) { setError(t("assignment_requirements_required")); return; }
    setSaving(true); setError("");
    try { await assignmentsApi.update(draft.id, { ...draft, requirements }); navigate(`/client-assignments/${draft.id}`); }
    catch { setError(t("assignment_save_error")); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-app-muted">{t("assignment_loading")}</div>;
  if (!draft) return <div className="p-6 text-sm text-app-secondary">{error || t("assignment_not_found")}</div>;

  const seniority = draft.requirements.find((item) => item.category === "Seniority");
  const setSeniority = (value: string) => {
    const existing = draft.requirements.findIndex((item) => item.category === "Seniority");
    const requirements = value
      ? existing >= 0 ? draft.requirements.map((item, index) => index === existing ? { ...item, name: value } : item) : [...draft.requirements, { ...newRequirement(draft.id, "Skill", "Mandatory"), name: value, category: "Seniority" as const }]
      : draft.requirements.filter((item) => item.category !== "Seniority");
    update({ seniority: value || null, requirements });
  };

  const renderRows = (rows: Array<{ item: AssignmentRequirementApi; index: number }>, language: boolean) => rows.map(({ item, index }) => (
    <div key={`${item.id}-${index}`} className="grid gap-2 rounded-lg border border-app bg-app-raised p-2 md:grid-cols-[minmax(180px,1.6fr)_130px_130px_32px] md:items-center">
      <Input aria-label={t("client_requirement_name")} value={item.name} onChange={(event) => updateRequirement(index, { name: event.target.value })} placeholder={t("client_requirement_name")} />
      <select aria-label={t("client_requirement_priority")} value={item.type} onChange={(event) => updateRequirement(index, { type: event.target.value as "Mandatory" | "Desired" })} className="w-full rounded border border-app bg-app px-2 py-2 text-xs text-app-primary"><option value="Mandatory">{t("client_mandatory")}</option><option value="Desired">{t("client_desired")}</option></select>
      {language ? <select aria-label={t("assignment_language_proficiency")} value={item.proficiency ?? "Not specified"} onChange={(event) => updateRequirement(index, { proficiency: event.target.value as AssignmentRequirementApi["proficiency"] })} className="w-full rounded border border-app bg-app px-2 py-2 text-xs text-app-primary"><option value="Not specified">{t("common_not_specified")}</option><option value="Low">{t("proficiency_low")}</option><option value="Medium">{t("proficiency_medium")}</option><option value="High">{t("proficiency_high")}</option><option value="Native">{t("proficiency_native")}</option></select> : <Input type="number" min={0} aria-label={t("assignment_minimum_years")} value={item.minYears ?? ""} onChange={(event) => updateRequirement(index, { minYears: event.target.value ? Number(event.target.value) : null })} placeholder={t("matching_no_minimum")} />}
      <button type="button" aria-label={t("common_remove")} onClick={() => removeRequirement(index)} className="flex justify-center text-app-muted hover:text-app-danger"><X size={13} /></button>
    </div>
  ));

  return <div className="h-full overflow-auto"><div className="p-6 space-y-5 max-w-6xl mx-auto">
    <PageHeader title={t("assignment_edit_title")} description={t("assignment_edit_sub")} backTo={`/client-assignments/${draft.id}`} actions={<Button variant="ghost" onClick={() => navigate(`/client-assignments/${draft.id}`)}>{t("assignment_modal_cancel")}</Button>} />
    <div className="grid grid-cols-3 gap-2">{(["basic", "requirements", "review"] as const).map((key, index) => <div key={key} className={`rounded-lg border px-3 py-2 text-xs ${step === key ? "border-app-brand bg-app-brand-soft text-app-primary" : "border-app text-app-muted"}`}><span className="font-semibold">{index + 1}</span><span className="ml-2">{key === "basic" ? t("assignment_step_basic") : key === "requirements" ? t("assignment_step_requirements") : t("assignment_edit_step_review")}</span></div>)}</div>
    {error && <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">{error}</div>}
    <section className="bg-app-surface border border-app rounded-xl p-5 space-y-5 shadow-app-surface">
      {step === "basic" && <><h2 className="text-sm font-medium text-app-primary">{t("assignment_basic_info")}</h2><div className="grid md:grid-cols-2 gap-4">
        <label className="text-[11px] text-app-muted">{t("assignment_title")}<Input value={draft.title} onChange={(e) => update({ title: e.target.value })} /></label>
        <label className="text-[11px] text-app-muted">{t("assignment_client")}<Input value={draft.customerName} onChange={(e) => update({ customerName: e.target.value })} /></label>
        <label className="text-[11px] text-app-muted">{t("assignment_seniority")}<select value={draft.seniority ?? ""} onChange={(e) => setSeniority(e.target.value)} className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"><option value="">{t("common_not_specified")}</option><option value="Junior">{t("seniority_junior")}</option><option value="Mid">{t("seniority_mid")}</option><option value="Senior">{t("seniority_senior")}</option><option value="Staff">{t("seniority_staff")}</option></select></label>
        <label className="text-[11px] text-app-muted">{t("assignment_seniority_mode")}<select disabled={!seniority} value={seniority?.matchMode ?? "Exact"} onChange={(e) => updateRequirement(draft.requirements.indexOf(seniority!), { matchMode: e.target.value as "Exact" | "Minimum" | "Range", maximumSeniority: e.target.value === "Range" ? seniority?.maximumSeniority ?? null : null })} className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"><option value="Exact">{t("assignment_exact")}</option><option value="Minimum">{t("assignment_minimum")}</option><option value="Range">{t("assignment_range")}</option></select></label>
        <label className="text-[11px] text-app-muted">{t("assignment_availability")}<Input value={draft.availability ?? ""} onChange={(e) => update({ availability: e.target.value || null })} /></label>
        <label className="text-[11px] text-app-muted">{t("assignment_work_location")}<Input value={draft.location ?? ""} onChange={(e) => update({ location: e.target.value || null })} placeholder={t("assignment_work_location_placeholder")} /></label>
        <label className="text-[11px] text-app-muted">{t("client_required_start_date")}<Input type="date" value={draft.requiredStartDate ?? ""} onChange={(e) => update({ requiredStartDate: e.target.value || null })} /></label>
        <label className="text-[11px] text-app-muted">{t("assignment_minimum_years")}<Input type="number" min={0} value={draft.minYearsExperience} onChange={(e) => update({ minYearsExperience: e.target.value ? Number(e.target.value) : 0 })} /></label>
      </div><label className="block text-[11px] text-app-muted">{t("assignment_description")}<Textarea rows={6} value={draft.description ?? ""} onChange={(e) => update({ description: e.target.value || null })} placeholder={t("assignment_description_placeholder")} /></label><div className="flex justify-end"><Button variant="primary" onClick={() => setStep("requirements")}>{t("common_next")}</Button></div></>}
      {step === "requirements" && <><h2 className="text-sm font-medium text-app-primary">{t("assignment_requirements")}</h2><p className="text-xs text-app-muted">{t("assignment_requirements_help")}</p><div className="space-y-5"><section className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-xs font-medium text-app-primary">{t("client_skill")}</h3><div className="flex gap-2"><Button onClick={() => addRequirement("Skill", "Mandatory")}><Plus size={12} />{t("client_add_requirement")}</Button></div></div>{renderRows(groups.skills, false)}</section><section className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-xs font-medium text-app-primary">{t("client_language")}</h3><Button onClick={() => addRequirement("HumanLanguage", "Mandatory")}><Plus size={12} />{t("client_add_requirement")}</Button></div>{renderRows(groups.languages, true)}</section><section className="space-y-2"><h3 className="text-xs font-medium text-app-primary">{t("assignment_other_requirements")}</h3>{groups.other.filter(({ item }) => item.category !== "Seniority").map(({ item, index }) => <div key={`${item.id}-${index}`} className="flex gap-2"><Input value={item.name} onChange={(e) => updateRequirement(index, { name: e.target.value })} /><button type="button" onClick={() => removeRequirement(index)} className="text-app-muted"><X size={13} /></button></div>)}</section></div><div className="flex justify-between"><Button variant="ghost" onClick={() => setStep("basic")}>{t("assignment_modal_back")}</Button><Button variant="primary" onClick={() => setStep("review")}>{t("common_next")}</Button></div></>}
      {step === "review" && <><h2 className="text-sm font-medium text-app-primary">{t("assignment_edit_step_review")}</h2><p className="text-xs text-app-muted">{t("assignment_review_description")}</p><div className="grid md:grid-cols-2 gap-4 text-sm"><div><p className="text-[10px] text-app-muted">{t("assignment_title")}</p><p className="text-app-primary">{draft.title}</p></div><div><p className="text-[10px] text-app-muted">{t("assignment_client")}</p><p className="text-app-primary">{draft.customerName}</p></div><div><p className="text-[10px] text-app-muted">{t("assignment_seniority")}</p><p className="text-app-secondary">{draft.seniority || t("common_not_specified")}</p></div><div><p className="text-[10px] text-app-muted">{t("assignment_minimum_years")}</p><p className="text-app-secondary">{draft.minYearsExperience}</p></div></div><div className="rounded-lg border border-app bg-app-raised p-3"><p className="text-[10px] uppercase tracking-wide text-app-muted mb-2">{t("assignment_requirements")}</p><div className="flex flex-wrap gap-2">{draft.requirements.filter((item) => item.name.trim()).map((item, index) => <span key={`${item.id}-${index}`} className="rounded border border-app px-2 py-1 text-xs text-app-secondary">{item.name} · {item.type === "Mandatory" ? t("client_mandatory") : t("client_desired")}</span>)}</div></div><div className="flex justify-between"><Button variant="ghost" onClick={() => setStep("requirements")}>{t("assignment_modal_back")}</Button><Button variant="primary" disabled={saving} onClick={save}>{saving ? t("assignment_saving") : t("assignment_save_changes")}</Button></div></>}
    </section>
  </div></div>;
}
