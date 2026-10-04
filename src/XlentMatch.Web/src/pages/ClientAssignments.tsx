import { useEffect, useState } from "react";
import { Plus, Search, Clock, CheckCircle, Eye, Sparkles } from "../design-system/icons";
import { useI18n } from "../i18n";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";
import { SkillTag } from "../components/ui/SkillTag";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { assignmentsApi } from "../services/assignmentsApi";
import { validateDocumentFile } from "../services/fileValidation";
import { aiApi } from "../services/aiApi";
import { formatDate } from "../services/localeFormat";
import type { AssignmentApi, AssignmentRequirementApi, AssignmentStatusApi } from "../types";

const emptyRequirement = (
  name: string,
  type: "Mandatory" | "Desired",
  minYears: number | null = null,
  minLevel: number | null = null,
  category: "Skill" | "HumanLanguage" | "Seniority" = "Skill",
  proficiency: "Not specified" | "Low" | "Medium" | "High" | "Native" | null = null,
  matchMode: "Exact" | "Minimum" | "Range" = "Exact",
  maximumSeniority: string | null = null,
): AssignmentRequirementApi => ({
  id: 0,
  assignmentId: 0,
  name,
  category,
  type,
  minYears,
  minLevel,
  proficiency,
  matchMode,
  maximumSeniority,
});

function NewAssignmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (assignment: AssignmentApi) => void;
}) {
  const { t, locale } = useI18n();
  const [step, setStep] = useState<"input" | "review">("input");
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [brief, setBrief] = useState("");
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [seniority, setSeniority] = useState("Mid");
  const [seniorityMatchMode, setSeniorityMatchMode] = useState<"Exact" | "Minimum" | "Range">("Exact");
  const [maximumSeniority, setMaximumSeniority] = useState("");
  const [availability, setAvailability] = useState("Available now");
  const [requiredStartDate, setRequiredStartDate] = useState("");
  const [location, setLocation] = useState("");
  const [minYears, setMinYears] = useState(0);
  const [requirements, setRequirements] = useState<AssignmentRequirementApi[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canExtract =
    title.trim().length > 0 &&
    client.trim().length > 0 &&
    (brief.trim().length > 0 || briefFile !== null);

  const extractRequirements = async () => {
    if (!canExtract) {
      setError(t("client_fill_before_extract"));
      return;
    }

    setExtracting(true);
    setError("");

    try {
      const extracted = briefFile
        ? await aiApi.extractRequirementsFromFile(briefFile)
        : await aiApi.extractRequirementsFromText(brief);

      setRequirements(
        extracted.requirements.map((item) =>
          emptyRequirement(item.name, item.type, item.minYears, item.minLevel, item.category, item.proficiency),
        ),
      );

      setBrief(extracted.sourceText ?? brief);
      if (extracted.minimumSeniority || extracted.seniority) setSeniority(extracted.minimumSeniority ?? extracted.seniority ?? "");
      if (extracted.seniorityMatchMode) setSeniorityMatchMode(extracted.seniorityMatchMode);
      if (extracted.maximumSeniority) setMaximumSeniority(extracted.maximumSeniority);
      if (extracted.availability) setAvailability(extracted.availability);
      if (extracted.requiredStartDate) setRequiredStartDate(extracted.requiredStartDate);
      if (extracted.location) setLocation(extracted.location);
      if (extracted.minYearsExperience !== null) setMinYears(extracted.minYearsExperience);

      setStep("review");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("client_extract_error"));
    } finally {
      setExtracting(false);
    }
  };

  const updateRequirement = (index: number, patch: Partial<AssignmentRequirementApi>) => {
    setRequirements((current) =>
      current.map((requirement, currentIndex) =>
        currentIndex === index ? { ...requirement, ...patch } : requirement,
      ),
    );
  };

  const removeRequirement = (index: number) => {
    setRequirements((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const createAssignment = async () => {
    if (!title.trim() || !client.trim()) {
      setError(t("assignment_required_fields"));
      return;
    }

    const cleanedRequirements = requirements
      .filter((requirement) => requirement.name.trim())
      .map((requirement) => ({
        ...requirement,
        name: requirement.name.trim(),
        minYears: requirement.category === "HumanLanguage" ? null : requirement.minYears,
        minLevel: requirement.category === "HumanLanguage" ? null : requirement.minLevel,
        proficiency: requirement.category === "HumanLanguage" ? requirement.proficiency : null,
      }));

    const seniorityRequirement = seniority.trim()
      ? emptyRequirement(seniority.trim(), "Mandatory", null, null, "Seniority", null, seniorityMatchMode, seniorityMatchMode === "Range" ? maximumSeniority || null : null)
      : null;
    const finalRequirements = seniorityRequirement ? [...cleanedRequirements, seniorityRequirement] : cleanedRequirements;

    if (finalRequirements.length === 0) {
      setError(t("assignment_requirements_required"));
      return;
    }

    setSaving(true);
    setError("");

    const payload: AssignmentApi = {
      id: 0,
      customerName: client.trim(),
      title: title.trim(),
      description: brief.trim() || (briefFile ? `Source file: ${briefFile.name}` : null),
      seniority: seniority.trim() || null,
      minYearsExperience: minYears,
      availability: availability.trim() || null,
      requiredStartDate: requiredStartDate || null,
      location: location.trim() || null,
      status: "Draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requirements: finalRequirements,
    };

    try {
      const created = await assignmentsApi.create(payload);
      onCreated(created);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("client_create_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={t("assignment_modal_title")} onClose={onClose}>
      {step === "input" ? (
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[11px] text-app-muted mb-1.5 block">{t("assignment_modal_name")} <span className="text-app-brand">*</span></span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("client_assignment_title_placeholder")} />
          </label>
          <label className="block">
            <span className="text-[11px] text-app-muted mb-1.5 block">{t("assignment_modal_client")} <span className="text-app-brand">*</span></span>
            <Input value={client} onChange={(event) => setClient(event.target.value)} placeholder={t("client_assignment_client_placeholder")} />
          </label>
          <label className="block">
            <span className="text-[11px] text-app-muted mb-1.5 block">
              {t("assignment_modal_brief")} <span className="text-app-brand">*</span> <span className="text-app-brand ml-1">{t("client_ai_extraction")}</span>
            </span>
            <Textarea value={brief} onChange={(event) => { setBrief(event.target.value); setBriefFile(null); }} rows={6} placeholder={t("assignment_modal_brief_placeholder")} />
            <span className="text-[10px] text-app-muted block mt-2">{t("client_upload_brief")}</span>
            <input
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="mt-2 block w-full text-xs text-app-secondary file:mr-3 file:rounded file:border file:border-app file:bg-app-surface file:px-3 file:py-2"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setError("");
                const validationError = file ? validateDocumentFile(file) : null;
                if (validationError) { setError(validationError); event.target.value = ""; setBriefFile(null); return; }
                setBriefFile(file);
                if (file) setBrief("");
              }}
            />
            {briefFile && <p className="text-[11px] text-app-secondary">{t("client_selected")}: {briefFile.name}</p>}
          </label>

          {!canExtract && !error && (
            <p className="text-[10px] text-app-faint">
              {t("client_fill_before_extract")}
            </p>
          )}

          {error && <p className="text-xs text-app-secondary">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button onClick={onClose} variant="ghost">{t("assignment_modal_cancel")}</Button>
            <Button
              onClick={() => { setRequirements([]); setStep("review"); setError(""); }}
              variant="secondary"
              disabled={!title.trim() || !client.trim() || extracting}
            >
              {t("client_manual_requirements")}
            </Button>
            <Button onClick={extractRequirements} variant="primary" disabled={extracting || !canExtract} icon={<Sparkles size={12} />}>
              {extracting ? t("client_extracting") : t("client_extract_requirements")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-app bg-app-raised px-3 py-2">
            <p className="text-xs text-app-secondary">
              {t("client_review_requirements")}
            </p>
          </div>
          {brief.trim() && (
            <details className="rounded-lg border border-app bg-app-surface px-3 py-2">
              <summary className="cursor-pointer text-xs text-app-secondary">{t("client_view_source")}</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] text-app-muted">{brief}</pre>
            </details>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] text-app-muted mb-1.5 block">{t("assignment_seniority")}</span>
              <select value={seniority} onChange={(event) => setSeniority(event.target.value)} className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"><option value="">{t("common_not_specified")}</option><option value="Junior">{t("seniority_junior")}</option><option value="Mid">{t("seniority_mid")}</option><option value="Senior">{t("seniority_senior")}</option><option value="Staff">{t("seniority_staff")}</option></select>
            </label>
            {seniority && <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("client_seniority_matching")}</span><select value={seniorityMatchMode} onChange={(event) => setSeniorityMatchMode(event.target.value as typeof seniorityMatchMode)} className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"><option value="Exact">{t("assignment_exact")}</option><option value="Minimum">{t("assignment_minimum")}</option><option value="Range">{t("assignment_range")}</option></select></label>}
            {seniority && seniorityMatchMode === "Range" && <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("client_maximum_seniority")}</span><select value={maximumSeniority} onChange={(event) => setMaximumSeniority(event.target.value)} className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"><option value="">{t("client_select_maximum")}</option><option value="Junior">{t("seniority_junior")}</option><option value="Mid">{t("seniority_mid")}</option><option value="Senior">{t("seniority_senior")}</option><option value="Staff">{t("seniority_staff")}</option></select></label>}
            <label className="block">
              <span className="text-[11px] text-app-muted mb-1.5 block">{t("assignment_availability")}</span>
              <Input value={availability} onChange={(event) => setAvailability(event.target.value)} />
            </label>
            <label className="block">
              <span className="text-[11px] text-app-muted mb-1.5 block">{t("client_work_location")}</span>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={t("client_location_placeholder")} />
            </label>
            <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("client_required_start_date")}</span><Input type="date" value={requiredStartDate} onChange={(event) => setRequiredStartDate(event.target.value)} /></label>
            <label className="block">
              <span className="text-[11px] text-app-muted mb-1.5 block">{t("client_minimum_experience")}</span>
              <Input type="number" min={0} value={minYears} onChange={(event) => setMinYears(Number(event.target.value) || 0)} />
            </label>
          </div>

          <div className="space-y-2 max-h-72 overflow-auto">
            {requirements.map((requirement, index) => (
              <div key={index} className="grid grid-cols-[minmax(130px,1fr)_100px_110px_minmax(100px,auto)_30px] gap-2 items-center">
                <Input
                  aria-label={t("client_requirement_name")}
                  value={requirement.name}
                  onChange={(event) => updateRequirement(index, { name: event.target.value })}
                />
                <select
                  aria-label={t("client_requirement_category")}
                  value={requirement.category}
                  onChange={(event) => updateRequirement(index, { category: event.target.value as "Skill" | "HumanLanguage", minYears: event.target.value === "HumanLanguage" ? null : requirement.minYears })}
                  className="text-xs rounded px-2 py-2 bg-app-surface border border-app text-app-primary"
                >
                  <option value="Skill">{t("client_skill")}</option>
                  <option value="HumanLanguage">{t("client_language")}</option>
                </select>
                <select
                  aria-label={t("client_requirement_priority")}
                  value={requirement.type}
                  onChange={(event) => updateRequirement(index, { type: event.target.value as "Mandatory" | "Desired" })}
                  className="text-xs rounded px-2 py-2 bg-app-surface border border-app text-app-primary"
                >
                  <option value="Mandatory">{t("client_mandatory")}</option>
                  <option value="Desired">{t("client_desired")}</option>
                </select>
                {requirement.category === "HumanLanguage" ? (
                  <label className="flex items-center gap-1.5 text-[10px] text-app-muted">
                    <select aria-label={t("assignment_language_proficiency")} value={requirement.proficiency ?? "Not specified"} onChange={(event) => updateRequirement(index, { proficiency: event.target.value as AssignmentRequirementApi["proficiency"], minLevel: null, minYears: null })} className="text-xs rounded px-2 py-2 bg-app-surface border border-app text-app-primary"><option value="Not specified">{t("common_not_specified")}</option><option value="Low">{t("proficiency_low")}</option><option value="Medium">{t("proficiency_medium")}</option><option value="High">{t("proficiency_high")}</option><option value="Native">{t("proficiency_native")}</option></select>
                  </label>
                ) : (
                  <Input type="number" min={0} value={requirement.minYears ?? ""} placeholder={t("assignment_years")} aria-label={t("client_minimum_skill_years")}
                    onChange={(event) => updateRequirement(index, { minYears: event.target.value ? Number(event.target.value) : null })} />
                )}
                <button type="button" onClick={() => removeRequirement(index)} className="text-app-faint hover:text-app-secondary">×</button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={() => setRequirements((current) => [...current, emptyRequirement("", "Mandatory")])}
            icon={<Plus size={11} />}
          >
            {t("client_add_requirement")}
          </Button>

          {error && <p className="text-xs text-app-secondary">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button onClick={() => setStep("input")} variant="ghost">{t("assignment_modal_back")}</Button>
            <Button onClick={createAssignment} variant="primary" disabled={saving}>
              {saving ? t("client_saving") : t("client_create")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ClientAssignments() {
  const { t, locale } = useI18n();
  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    assignmentsApi
      .getAll()
      .then((data) => {
        if (!cancelled) setAssignments(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : t("client_load_error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const deleteAssignment = async (assignment: AssignmentApi) => {
    if (!window.confirm(t("client_delete_confirm").replace("{title}", assignment.title))) return;

    setDeletingId(assignment.id);
    setError("");

    try {
      await assignmentsApi.remove(assignment.id);
      setAssignments((current) => current.filter((item) => item.id !== assignment.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("client_delete_error"));
    } finally {
      setDeletingId(null);
    }
  };

  const statusConfig = (status: AssignmentStatusApi) => {
    switch (status) {
      case "Draft": return { label: t("assignment_draft"), tone: "neutral" as const, icon: <Clock size={9} /> };
      case "Matching": return { label: t("assignment_matching"), tone: "neutral" as const, icon: <Clock size={9} /> };
      case "Closed": return { label: t("assignment_closed"), tone: "neutral" as const, icon: <Clock size={9} /> };
      default: return { label: t("assignment_done"), tone: "success" as const, icon: <CheckCircle size={9} /> };
    }
  };

  const displaySeniority = (value: string) =>
    value === "Junior" ? t("seniority_junior") :
    value === "Mid" ? t("seniority_mid") :
    value === "Senior" ? t("seniority_senior") :
    value === "Staff" ? t("seniority_staff") : value;

  const filtered = assignments.filter((assignment) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;

    return (
      assignment.title.toLowerCase().includes(search) ||
      assignment.customerName.toLowerCase().includes(search) ||
      (assignment.description ?? "").toLowerCase().includes(search) ||
      (assignment.seniority ?? "").toLowerCase().includes(search) ||
      (assignment.location ?? "").toLowerCase().includes(search) ||
      assignment.requirements.some((requirement) => requirement.name.toLowerCase().includes(search))
    );
  });

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={t("assignments_title")}
        meta={String(assignments.length) + " " + t("assignments_sub")}
        actions={<Button onClick={() => setShowModal(true)} variant="primary" icon={<Plus size={12} />}>{t("assignments_new")}</Button>}
      />

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

      {error && <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">{t("client_backend_error")}: {error}</div>}

      <div className="space-y-2">
        {filtered.map((assignment) => {
          const status = statusConfig(assignment.status);
          const required = assignment.requirements.filter((requirement) => requirement.type === "Mandatory");
          const preferred = assignment.requirements.filter((requirement) => requirement.type === "Desired");

          return (
            <div key={assignment.id} className="bg-app-surface border border-app rounded-lg px-5 py-4 shadow-app-surface">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-sm font-medium text-app-primary">{assignment.title}</h2>
                    <StatusBadge tone={status.tone} icon={status.icon}>{status.label}</StatusBadge>
                  </div>
                  <p className="text-xs text-app-muted">
                    {assignment.customerName || "—"} · {displaySeniority(assignment.seniority ?? "—")} · {assignment.location || t("assignment_location_unspecified")} · {t("common_updated")} {formatDate(assignment.updatedAt || assignment.createdAt, locale)}
                  </p>
                  <p className="text-[11px] text-app-secondary mt-1 mb-2 max-w-3xl line-clamp-2">{assignment.description || "—"}</p>
                  <p className="text-[10px] text-app-muted mb-2">{assignment.requirements.length} {t("client_requirements")}{assignment.minYearsExperience > 0 ? ` · ${assignment.minYearsExperience}+ ${t("client_years_experience")}` : ""}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {required.map((requirement) => <SkillTag key={requirement.id || requirement.name} variant="required">{requirement.category === "HumanLanguage" ? `${t("client_language_prefix")}${requirement.name}` : requirement.name}</SkillTag>)}
                    {preferred.map((requirement) => <SkillTag key={requirement.id || requirement.name}>{requirement.category === "HumanLanguage" ? `${t("client_language_prefix")}${requirement.name}` : requirement.name}</SkillTag>)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LinkButton to={"/client-assignments/" + assignment.id} variant="secondary" icon={<Eye size={12} />}>
                    {t("assignment_view")}
                  </LinkButton>
                  <button
                    type="button"
                    onClick={() => void deleteAssignment(assignment)}
                    disabled={deletingId === assignment.id}
                    className="text-[11px] px-2.5 py-1.5 rounded border disabled:opacity-50"
                    style={{ color: "var(--color-danger)", borderColor: "var(--color-danger)", background: "transparent" }}
                  >
                    {deletingId === assignment.id ? t("client_deleting") : t("client_delete")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <EmptyState title={loading ? t("assignments_loading") : query ? t("assignments_empty_search") : t("assignments_empty")} />}

      {showModal && (
        <NewAssignmentModal
          onClose={() => setShowModal(false)}
          onCreated={(created) => setAssignments((current) => [created, ...current])}
        />
      )}
    </div>
  );
}
