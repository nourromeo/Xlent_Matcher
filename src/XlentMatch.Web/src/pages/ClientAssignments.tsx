import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Clock,
  CheckCircle,
  ChevronRight,
  Sparkles,
} from "../design-system/icons";
import { useI18n } from "../i18n";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/ui/PageHeader";
import { assignmentsApi } from "../services/assignmentsApi";
import { validateDocumentFile } from "../services/fileValidation";
import { aiApi } from "../services/aiApi";
import { formatDate } from "../services/localeFormat";
import { DataTable } from "../components/ui/DataTable";
import type {
  AssignmentApi,
  AssignmentRequirementApi,
  AssignmentStatusApi,
} from "../types";

const emptyRequirement = (
  name: string,
  type: "Mandatory" | "Desired",
  minYears: number | null = null,
  minLevel: number | null = null,
  category: "Skill" | "HumanLanguage" | "Seniority" = "Skill",
  proficiency:
    "Not specified" | "Low" | "Medium" | "High" | "Native" | null = null,
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

export function NewAssignmentPage() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [step, setStep] = useState<
    "input" | "basic" | "requirements" | "review"
  >("input");
  const stepOrder = ["input", "basic", "requirements", "review"] as const;
  const [highestReachedStep, setHighestReachedStep] = useState(0);
  const [aiExtracted, setAiExtracted] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [brief, setBrief] = useState("");
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [sourceMode, setSourceMode] = useState<"paste" | "upload">("paste");
  const [seniority, setSeniority] = useState("");
  const [seniorityMatchMode, setSeniorityMatchMode] = useState<
    "Exact" | "Minimum" | "Range"
  >("Exact");
  const [maximumSeniority, setMaximumSeniority] = useState("");
  const [availability, setAvailability] = useState("");
  const [requiredStartDate, setRequiredStartDate] = useState("");
  const [location, setLocation] = useState("");
  const [minYears, setMinYears] = useState<number | null>(null);
  const [requirements, setRequirements] = useState<AssignmentRequirementApi[]>(
    [],
  );
  const [editingRequirement, setEditingRequirement] = useState<number | null>(
    null,
  );
  const [editingRequirementSnapshot, setEditingRequirementSnapshot] =
    useState<AssignmentRequirementApi | null>(null);
  const beginRequirementEdit = (index: number) => {
    setEditingRequirement(index);
    setEditingRequirementSnapshot(requirements[index] ?? null);
  };
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canExtract =
    title.trim().length > 0 &&
    client.trim().length > 0 &&
    (brief.trim().length > 0 || briefFile !== null);

  useEffect(() => {
    setHighestReachedStep((current) =>
      Math.max(current, stepOrder.indexOf(step)),
    );
  }, [step]);

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
          emptyRequirement(
            item.name,
            item.type,
            item.minYears,
            item.minLevel,
            item.category,
            item.proficiency,
            item.matchMode ?? "Exact",
            item.maximumSeniority ?? null,
          ),
        ),
      );

      setBrief(extracted.sourceText ?? brief);
      if (extracted.minimumSeniority || extracted.seniority)
        setSeniority(extracted.minimumSeniority ?? extracted.seniority ?? "");
      if (extracted.seniorityMatchMode)
        setSeniorityMatchMode(extracted.seniorityMatchMode);
      if (extracted.maximumSeniority)
        setMaximumSeniority(extracted.maximumSeniority);
      if (extracted.availability) setAvailability(extracted.availability);
      if (extracted.requiredStartDate)
        setRequiredStartDate(extracted.requiredStartDate);
      if (extracted.location) setLocation(extracted.location);
      setMinYears(extracted.minYearsExperience);

      setAiExtracted(true);
      setStep("basic");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("client_extract_error"),
      );
    } finally {
      setExtracting(false);
    }
  };

  const updateRequirement = (
    index: number,
    patch: Partial<AssignmentRequirementApi>,
  ) => {
    setRequirements((current) =>
      current.map((requirement, currentIndex) =>
        currentIndex === index ? { ...requirement, ...patch } : requirement,
      ),
    );
  };

  const removeRequirement = (index: number) => {
    setRequirements((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
    setEditingRequirement(null);
    setEditingRequirementSnapshot(null);
  };

  const requirementEditor = (index: number, language: boolean) => {
    const requirement = requirements[index];
    if (!requirement) return null;
    const update = (patch: Partial<AssignmentRequirementApi>) =>
      updateRequirement(index, patch);
    return (
      <div className="space-y-3 rounded-lg border border-app-brand bg-app-raised p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[11px] text-app-muted">
              {language ? t("client_language") : t("client_skill")}
            </span>
            <Input
              autoFocus
              value={requirement.name}
              onChange={(event) => update({ name: event.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-app-muted">
              {t("client_requirement_priority")}
            </span>
            <select
              value={requirement.type}
              onChange={(event) =>
                update({ type: event.target.value as "Mandatory" | "Desired" })
              }
              className="w-full rounded border border-app bg-app-surface px-3 py-2 text-xs text-app-primary"
            >
              <option value="Mandatory">{t("client_mandatory")}</option>
              <option value="Desired">{t("client_desired")}</option>
            </select>
          </label>
          {language ? (
            <label className="space-y-1">
              <span className="text-[11px] text-app-muted">
                {t("client_requirement_level")}
              </span>
              <select
                value={requirement.proficiency ?? "Not specified"}
                onChange={(event) =>
                  update({
                    proficiency: event.target
                      .value as AssignmentRequirementApi["proficiency"],
                    minLevel: null,
                    minYears: null,
                  })
                }
                className="w-full rounded border border-app bg-app-surface px-3 py-2 text-xs text-app-primary"
              >
                <option value="Not specified">
                  {t("common_not_specified")}
                </option>
                <option value="Low">{t("proficiency_low")}</option>
                <option value="Medium">{t("proficiency_medium")}</option>
                <option value="High">{t("proficiency_high")}</option>
                <option value="Native">{t("proficiency_native")}</option>
              </select>
            </label>
          ) : (
            <label className="space-y-1">
              <span className="text-[11px] text-app-muted">
                {t("client_minimum_skill_years")} ({t("assignment_years")})
              </span>
              <Input
                type="number"
                min={0}
                value={requirement.minYears ?? ""}
                onChange={(event) =>
                  update({
                    minYears: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditingRequirement(null)}>
            {t("assignment_save_local")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (editingRequirementSnapshot) {
                updateRequirement(index, editingRequirementSnapshot);
                setEditingRequirement(null);
                setEditingRequirementSnapshot(null);
              } else if (!requirement.name.trim()) removeRequirement(index);
              else setEditingRequirement(null);
            }}
          >
            {t("assignment_cancel_edit")}
          </Button>
        </div>
      </div>
    );
  };

  const requirementReadRow = (
    requirement: AssignmentRequirementApi,
    index: number,
    language: boolean,
  ) => (
    <div className="grid gap-2 rounded-lg border border-app bg-app-raised p-3 md:grid-cols-[minmax(0,1.6fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] md:items-center">
      <span className="text-sm text-app-primary">{requirement.name}</span>
      <span className="text-xs text-app-secondary">
        {requirement.type === "Mandatory"
          ? t("client_mandatory")
          : t("client_desired")}
      </span>
      <span className="text-xs text-app-muted">
        {language
          ? !requirement.proficiency ||
            requirement.proficiency === "Not specified"
            ? t("common_not_specified")
            : t(`proficiency_${requirement.proficiency.toLowerCase()}` as never)
          : requirement.minYears == null
            ? t("common_not_specified")
            : `${requirement.minYears} ${t("assignment_years_unit")}`}
      </span>
      <div className="flex gap-3">
        <button
          type="button"
          className="text-xs text-app-brand"
          onClick={() => beginRequirementEdit(index)}
        >
          {t("assignment_edit")}
        </button>
        <button
          type="button"
          className="text-xs text-app-danger"
          onClick={() => removeRequirement(index)}
        >
          {t("client_delete")}
        </button>
      </div>
    </div>
  );

  const skillRequirements = requirements
    .map((requirement, index) => ({ requirement, index }))
    .filter(({ requirement }) => requirement.category === "Skill");
  const languageRequirements = requirements
    .map((requirement, index) => ({ requirement, index }))
    .filter(({ requirement }) => requirement.category === "HumanLanguage");
  const otherRequirements = requirements
    .map((requirement, index) => ({ requirement, index }))
    .filter(
      ({ requirement }) =>
        requirement.category !== "Skill" &&
        requirement.category !== "HumanLanguage",
    );

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
        minYears:
          requirement.category === "HumanLanguage"
            ? null
            : requirement.minYears,
        minLevel:
          requirement.category === "HumanLanguage"
            ? null
            : requirement.minLevel,
        proficiency:
          requirement.category === "HumanLanguage"
            ? requirement.proficiency
            : null,
      }));

    const seniorityRequirement = seniority.trim()
      ? emptyRequirement(
          seniority.trim(),
          "Mandatory",
          null,
          null,
          "Seniority",
          null,
          seniorityMatchMode,
          seniorityMatchMode === "Range" ? maximumSeniority || null : null,
        )
      : null;
    const finalRequirements = seniorityRequirement
      ? [...cleanedRequirements, seniorityRequirement]
      : cleanedRequirements;

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
      description:
        brief.trim() || (briefFile ? `Source file: ${briefFile.name}` : null),
      seniority: seniority.trim() || null,
      minYearsExperience: minYears ?? 0,
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
      navigate(`/client-assignments/${created.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("client_create_error"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-5">
        <PageHeader
          title={t("assignment_create_title")}
          description={t("assignment_create_description")}
          actions={
            <Button
              onClick={() => navigate("/client-assignments")}
              variant="ghost"
            >
              {t("assignment_modal_cancel")}
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stepOrder.map((stepKey, index) => {
            const active = step === stepKey;
            const available = index <= highestReachedStep;
            const label =
              stepKey === "input"
                ? t("assignment_step_source")
                : stepKey === "basic"
                  ? t("assignment_step_basic")
                  : stepKey === "requirements"
                    ? t("assignment_step_requirements")
                    : t("assignment_step_review");
            return (
              <button
                type="button"
                key={stepKey}
                disabled={!available}
                aria-current={active ? "step" : undefined}
                onClick={() => available && setStep(stepKey)}
                className={`rounded-lg border px-3 py-2 text-left text-xs focus:outline-none focus:ring-2 focus:ring-app-brand ${active ? "border-app-brand bg-app-brand-soft text-app-primary" : available ? "border-app text-app-secondary hover:border-app-brand" : "border-app text-app-muted"}`}
              >
                <span className="font-semibold">{index + 1}</span>
                <span className="ml-2">{label}</span>
              </button>
            );
          })}
        </div>
        {step === "input" ? (
          <div className="bg-app-surface border border-app rounded-xl p-5 space-y-4 shadow-app-surface">
            <label className="block">
              <span className="text-[11px] text-app-muted mb-1.5 block">
                {t("assignment_modal_name")}{" "}
                <span className="text-app-brand">*</span>
              </span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("client_assignment_title_placeholder")}
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-app-muted mb-1.5 block">
                {t("assignment_modal_client")}{" "}
                <span className="text-app-brand">*</span>
              </span>
              <Input
                value={client}
                onChange={(event) => setClient(event.target.value)}
                placeholder={t("client_assignment_client_placeholder")}
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-app-muted mb-1.5 block">
                {t("assignment_modal_brief")}{" "}
                <span className="text-app-brand">*</span>{" "}
                <span className="text-app-brand ml-1">
                  {t("client_ai_extraction")}
                </span>
              </span>
              <div className="flex gap-1 rounded-lg border border-app bg-app p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setSourceMode("paste")}
                  className={`rounded px-3 py-1.5 text-xs ${sourceMode === "paste" ? "bg-app-surface text-app-primary" : "text-app-muted"}`}
                >
                  {t("assignment_paste_mode")}
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode("upload")}
                  className={`rounded px-3 py-1.5 text-xs ${sourceMode === "upload" ? "bg-app-surface text-app-primary" : "text-app-muted"}`}
                >
                  {t("assignment_upload_mode")}
                </button>
              </div>
              {sourceMode === "paste" ? (
                <Textarea
                  value={brief}
                  onChange={(event) => {
                    setBrief(event.target.value);
                    setBriefFile(null);
                  }}
                  rows={10}
                  placeholder={t("assignment_modal_brief_placeholder")}
                />
              ) : (
                <>
                  <span className="text-[10px] text-app-muted block">
                    {t("client_upload_brief")}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    className="block w-full text-xs text-app-secondary file:mr-3 file:rounded file:border file:border-app file:bg-app-surface file:px-3 file:py-2"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setError("");
                      const validationError = file
                        ? validateDocumentFile(file)
                        : null;
                      if (validationError) {
                        setError(validationError);
                        event.target.value = "";
                        setBriefFile(null);
                        return;
                      }
                      setBriefFile(file);
                      if (file) setBrief("");
                    }}
                  />
                  {briefFile && (
                    <p className="text-[11px] text-app-secondary">
                      {t("client_selected")}: {briefFile.name}
                    </p>
                  )}
                </>
              )}
            </label>

            {!canExtract && !error && (
              <p className="text-[10px] text-app-faint">
                {t("client_fill_before_extract")}
              </p>
            )}

            {error && <p className="text-xs text-app-secondary">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => navigate("/client-assignments")}
                variant="ghost"
              >
                {t("assignment_modal_cancel")}
              </Button>
              <Button
                onClick={() => {
                  setRequirements([]);
                  setAiExtracted(false);
                  setStep("basic");
                  setError("");
                }}
                variant="secondary"
                disabled={!title.trim() || !client.trim() || extracting}
              >
                {t("client_manual_requirements")}
              </Button>
              <Button
                onClick={extractRequirements}
                variant="primary"
                disabled={extracting || !canExtract}
                icon={<Sparkles size={12} />}
              >
                {extracting
                  ? t("client_extracting")
                  : t("client_extract_requirements")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-app-surface border border-app rounded-xl p-5 space-y-4 shadow-app-surface">
            {step === "basic" && (
              <>
                {aiExtracted && (
                  <div className="rounded-lg border border-app bg-app-raised px-3 py-2 text-xs text-app-secondary">
                    {t("assignment_ai_review_indicator")}
                  </div>
                )}
                <h2 className="text-sm font-medium text-app-primary">
                  {t("assignment_step_basic")}
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[11px] text-app-muted mb-1.5 block">
                      {t("assignment_seniority")}
                    </span>
                    <select
                      value={seniority}
                      onChange={(event) => setSeniority(event.target.value)}
                      className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"
                    >
                      <option value="">{t("common_not_specified")}</option>
                      <option value="Junior">{t("seniority_junior")}</option>
                      <option value="Mid">{t("seniority_mid")}</option>
                      <option value="Senior">{t("seniority_senior")}</option>
                      <option value="Staff">{t("seniority_staff")}</option>
                    </select>
                  </label>
                  {seniority && (
                    <label className="block">
                      <span className="text-[11px] text-app-muted mb-1.5 block">
                        {t("client_seniority_matching")}
                      </span>
                      <select
                        value={seniorityMatchMode}
                        onChange={(event) =>
                          setSeniorityMatchMode(
                            event.target.value as typeof seniorityMatchMode,
                          )
                        }
                        className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"
                      >
                        <option value="Exact">{t("assignment_exact")}</option>
                        <option value="Minimum">
                          {t("assignment_minimum")}
                        </option>
                        <option value="Range">{t("assignment_range")}</option>
                      </select>
                    </label>
                  )}
                  {seniority && seniorityMatchMode === "Range" && (
                    <label className="block">
                      <span className="text-[11px] text-app-muted mb-1.5 block">
                        {t("client_maximum_seniority")}
                      </span>
                      <select
                        value={maximumSeniority}
                        onChange={(event) =>
                          setMaximumSeniority(event.target.value)
                        }
                        className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"
                      >
                        <option value="">{t("client_select_maximum")}</option>
                        <option value="Junior">{t("seniority_junior")}</option>
                        <option value="Mid">{t("seniority_mid")}</option>
                        <option value="Senior">{t("seniority_senior")}</option>
                        <option value="Staff">{t("seniority_staff")}</option>
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className="text-[11px] text-app-muted mb-1.5 block">
                      {t("assignment_availability")}
                    </span>
                    <Input
                      value={availability}
                      onChange={(event) => setAvailability(event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-app-muted mb-1.5 block">
                      {t("client_work_location")}
                    </span>
                    <Input
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder={t("client_location_placeholder")}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-app-muted mb-1.5 block">
                      {t("client_required_start_date")}
                    </span>
                    <Input
                      type="date"
                      value={requiredStartDate}
                      onChange={(event) =>
                        setRequiredStartDate(event.target.value)
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-app-muted mb-1.5 block">
                      {t("client_minimum_experience")}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={minYears ?? ""}
                      onChange={(event) =>
                        setMinYears(
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                    />
                  </label>
                </div>
                <div className="flex justify-between gap-2">
                  <Button onClick={() => setStep("input")} variant="ghost">
                    {t("assignment_modal_back")}
                  </Button>
                  <Button
                    onClick={() => setStep("requirements")}
                    variant="primary"
                  >
                    {t("common_next")}
                  </Button>
                </div>
              </>
            )}

            {step === "requirements" && (
              <>
                <h2 className="text-sm font-medium text-app-primary">
                  {t("assignment_step_requirements")}
                </h2>
                <p className="text-xs text-app-muted">
                  {t("assignment_requirements_review_help")}
                </p>
                {aiExtracted && (
                  <div className="rounded-lg border border-app bg-app-raised px-3 py-2 text-xs text-app-secondary">
                    {t("assignment_ai_review_indicator")}
                  </div>
                )}
                {brief.trim() && (
                  <details className="rounded-lg border border-app bg-app-surface px-3 py-2">
                    <summary className="cursor-pointer text-xs text-app-secondary">
                      {t("client_view_source")}
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] text-app-muted">
                      {brief}
                    </pre>
                  </details>
                )}
                <div className="space-y-5">
                  <section className="space-y-2">
                    <h3 className="text-xs font-medium text-app-primary">
                      {t("client_skill")}
                    </h3>
                    <div className="hidden md:grid grid-cols-[minmax(180px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_32px] gap-2 text-[10px] uppercase tracking-wide text-app-faint">
                      <span>{t("client_requirement_name")}</span>
                      <span>{t("client_requirement_priority")}</span>
                      <span>{t("client_minimum_skill_years")}</span>
                      <span />
                    </div>
                    <div className="space-y-2">
                      {skillRequirements.map(({ requirement, index }) =>
                        editingRequirement === index ? (
                          <div key={index}>
                            {requirementEditor(index, false)}
                          </div>
                        ) : (
                          <>
                            {requirementReadRow(requirement, index, false)}
                            <div key={index} className="hidden">
                              <label className="space-y-1">
                                <span className="md:hidden text-[10px] text-app-muted">
                                  {t("client_requirement_name")}
                                </span>
                                <Input
                                  aria-label={t("client_requirement_name")}
                                  value={requirement.name}
                                  onChange={(event) =>
                                    updateRequirement(index, {
                                      name: event.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="md:hidden text-[10px] text-app-muted">
                                  {t("client_requirement_priority")}
                                </span>
                                <select
                                  aria-label={t("client_requirement_priority")}
                                  value={requirement.type}
                                  onChange={(event) =>
                                    updateRequirement(index, {
                                      type: event.target.value as
                                        "Mandatory" | "Desired",
                                    })
                                  }
                                  className="w-full text-xs rounded px-2 py-2 bg-app-surface border border-app text-app-primary"
                                >
                                  <option value="Mandatory">
                                    {t("client_mandatory")}
                                  </option>
                                  <option value="Desired">
                                    {t("client_desired")}
                                  </option>
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="md:hidden text-[10px] text-app-muted">
                                  {t("client_minimum_skill_years")}
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={requirement.minYears ?? ""}
                                  placeholder={t("common_not_specified")}
                                  aria-label={t("client_minimum_skill_years")}
                                  onChange={(event) =>
                                    updateRequirement(index, {
                                      minYears: event.target.value
                                        ? Number(event.target.value)
                                        : null,
                                    })
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                aria-label={t("client_delete")}
                                onClick={() => removeRequirement(index)}
                                className="text-app-faint hover:text-app-secondary"
                              >
                                ×
                              </button>
                              <button
                                type="button"
                                className="text-xs text-app-brand"
                                onClick={() => beginRequirementEdit(index)}
                              >
                                {t("assignment_edit")}
                              </button>
                            </div>
                          </>
                        ),
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      className="text-app-brand hover:text-app-brand"
                      onClick={() => {
                        setRequirements((current) => [
                          ...current,
                          emptyRequirement(
                            "",
                            "Mandatory",
                            null,
                            null,
                            "Skill",
                          ),
                        ]);
                        setEditingRequirement(requirements.length);
                        setEditingRequirementSnapshot(null);
                      }}
                      icon={<Plus size={11} />}
                    >
                      {t("client_add_competence")}
                    </Button>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-xs font-medium text-app-primary">
                      {t("client_language")}
                    </h3>
                    <div className="hidden md:grid grid-cols-[minmax(180px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)_32px] gap-2 text-[10px] uppercase tracking-wide text-app-faint">
                      <span>{t("client_requirement_name")}</span>
                      <span>{t("client_requirement_priority")}</span>
                      <span>{t("client_requirement_level")}</span>
                      <span />
                    </div>
                    <div className="space-y-2">
                      {languageRequirements.map(({ requirement, index }) =>
                        editingRequirement === index ? (
                          <div key={index}>
                            {requirementEditor(index, true)}
                          </div>
                        ) : (
                          <>
                            {requirementReadRow(requirement, index, true)}
                            <div key={index} className="hidden">
                              <label className="space-y-1">
                                <span className="md:hidden text-[10px] text-app-muted">
                                  {t("client_requirement_name")}
                                </span>
                                <Input
                                  aria-label={t("client_requirement_name")}
                                  value={requirement.name}
                                  onChange={(event) =>
                                    updateRequirement(index, {
                                      name: event.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="md:hidden text-[10px] text-app-muted">
                                  {t("client_requirement_priority")}
                                </span>
                                <select
                                  aria-label={t("client_requirement_priority")}
                                  value={requirement.type}
                                  onChange={(event) =>
                                    updateRequirement(index, {
                                      type: event.target.value as
                                        "Mandatory" | "Desired",
                                    })
                                  }
                                  className="w-full text-xs rounded px-2 py-2 bg-app-surface border border-app text-app-primary"
                                >
                                  <option value="Mandatory">
                                    {t("client_mandatory")}
                                  </option>
                                  <option value="Desired">
                                    {t("client_desired")}
                                  </option>
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="md:hidden text-[10px] text-app-muted">
                                  {t("client_requirement_level")}
                                </span>
                                <select
                                  aria-label={t(
                                    "assignment_language_proficiency",
                                  )}
                                  value={
                                    requirement.proficiency ?? "Not specified"
                                  }
                                  onChange={(event) =>
                                    updateRequirement(index, {
                                      proficiency: event.target
                                        .value as AssignmentRequirementApi["proficiency"],
                                      minLevel: null,
                                      minYears: null,
                                    })
                                  }
                                  className="w-full text-xs rounded px-2 py-2 bg-app-surface border border-app text-app-primary"
                                >
                                  <option value="Not specified">
                                    {t("common_not_specified")}
                                  </option>
                                  <option value="Low">
                                    {t("proficiency_low")}
                                  </option>
                                  <option value="Medium">
                                    {t("proficiency_medium")}
                                  </option>
                                  <option value="High">
                                    {t("proficiency_high")}
                                  </option>
                                  <option value="Native">
                                    {t("proficiency_native")}
                                  </option>
                                </select>
                              </label>
                              <button
                                type="button"
                                aria-label={t("client_delete")}
                                onClick={() => removeRequirement(index)}
                                className="text-app-faint hover:text-app-secondary"
                              >
                                ×
                              </button>
                              <button
                                type="button"
                                className="text-xs text-app-brand"
                                onClick={() => beginRequirementEdit(index)}
                              >
                                {t("assignment_edit")}
                              </button>
                            </div>
                          </>
                        ),
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      className="text-app-brand hover:text-app-brand"
                      onClick={() => {
                        setRequirements((current) => [
                          ...current,
                          emptyRequirement(
                            "",
                            "Mandatory",
                            null,
                            null,
                            "HumanLanguage",
                          ),
                        ]);
                        setEditingRequirement(requirements.length);
                        setEditingRequirementSnapshot(null);
                      }}
                      icon={<Plus size={11} />}
                    >
                      {t("client_add_language_requirement")}
                    </Button>
                  </section>
                  {otherRequirements.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="text-xs font-medium text-app-primary">
                        {t("client_other_requirements")}
                      </h3>
                      {otherRequirements.map(({ requirement, index }) => (
                        <div
                          key={index}
                          className="grid gap-2 rounded-lg border border-app bg-app-raised p-2 md:grid-cols-[minmax(180px,1fr)_minmax(150px,1fr)_32px] md:items-center"
                        >
                          <Input
                            aria-label={t("client_requirement_name")}
                            value={requirement.name}
                            onChange={(event) =>
                              updateRequirement(index, {
                                name: event.target.value,
                              })
                            }
                          />
                          <select
                            aria-label={t("client_requirement_priority")}
                            value={requirement.type}
                            onChange={(event) =>
                              updateRequirement(index, {
                                type: event.target.value as
                                  "Mandatory" | "Desired",
                              })
                            }
                            className="w-full text-xs rounded px-2 py-2 bg-app-surface border border-app text-app-primary"
                          >
                            <option value="Mandatory">
                              {t("client_mandatory")}
                            </option>
                            <option value="Desired">
                              {t("client_desired")}
                            </option>
                          </select>
                          <button
                            type="button"
                            aria-label={t("client_delete")}
                            onClick={() => removeRequirement(index)}
                            className="text-app-faint hover:text-app-secondary"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </section>
                  )}
                </div>
                <div className="flex justify-between gap-2">
                  <Button onClick={() => setStep("basic")} variant="ghost">
                    {t("assignment_modal_back")}
                  </Button>
                  <Button onClick={() => setStep("review")} variant="primary">
                    {t("assignment_step_review")}
                  </Button>
                </div>
              </>
            )}

            {step === "review" && (
              <>
                <h2 className="text-sm font-medium text-app-primary">
                  {t("assignment_step_review")}
                </h2>
                <p className="text-xs text-app-muted">
                  {t("assignment_review_description")}
                </p>
                <section className="space-y-3 border-b border-app pb-4">
                  <h3 className="text-xs font-medium text-app-primary">
                    {t("assignment_review_basic")}
                  </h3>
                  <div className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                    {[
                      [t("assignment_title"), title],
                      [t("assignment_client"), client],
                      [
                        t("assignment_seniority"),
                        seniority || t("common_not_specified"),
                      ],
                      [
                        t("client_seniority_matching"),
                        seniority
                          ? seniorityMatchMode
                          : t("common_not_specified"),
                      ],
                      [
                        t("assignment_availability"),
                        availability || t("common_not_specified"),
                      ],
                      [
                        t("client_work_location"),
                        location || t("common_not_specified"),
                      ],
                      [
                        t("client_required_start_date"),
                        requiredStartDate || t("common_not_specified"),
                      ],
                      [
                        t("client_minimum_experience"),
                        minYears === null
                          ? t("common_not_specified")
                          : `${minYears} ${t("assignment_years")}`,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[10px] text-app-muted">{label}</p>
                        <p className="text-app-primary">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
                {(() => {
                  const skills = requirements.filter(
                    (item) => item.category === "Skill" && item.name.trim(),
                  );
                  const languages = requirements.filter(
                    (item) =>
                      item.category === "HumanLanguage" && item.name.trim(),
                  );
                  const other = requirements.filter(
                    (item) =>
                      item.category !== "Skill" &&
                      item.category !== "HumanLanguage" &&
                      item.category !== "Seniority" &&
                      item.name.trim(),
                  );
                  const rows = (items: typeof skills) =>
                    items.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="grid gap-1 border-b border-app py-2 text-xs last:border-0 md:grid-cols-[minmax(0,1fr)_180px]"
                      >
                        <span className="text-app-primary">{item.name}</span>
                        <span className="text-app-muted">
                          {item.minYears == null
                            ? t("common_not_specified")
                            : `${item.minYears} ${t("assignment_years")}`}
                        </span>
                      </div>
                    ));
                  return (
                    <div className="space-y-5">
                      {skills.length > 0 && (
                        <section className="space-y-3">
                          <h3 className="text-xs font-medium text-app-primary">
                            {t("assignment_review_skill_requirements")}
                          </h3>
                          {["Mandatory", "Desired"].map((type) => {
                            const group = skills.filter(
                              (item) => item.type === type,
                            );
                            return group.length ? (
                              <div key={type}>
                                <h4 className="mb-1 text-[10px] uppercase tracking-wide text-app-muted">
                                  {type === "Mandatory"
                                    ? t("client_mandatory")
                                    : t("client_desired")}
                                </h4>
                                {rows(group)}
                              </div>
                            ) : null;
                          })}
                        </section>
                      )}
                      {languages.length > 0 && (
                        <section className="space-y-3">
                          <h3 className="text-xs font-medium text-app-primary">
                            {t("assignment_review_language_requirements")}
                          </h3>
                          {languages.map((item, index) => (
                            <div
                              key={`${item.id}-${index}`}
                              className="grid gap-1 border-b border-app py-2 text-xs last:border-0 md:grid-cols-[minmax(0,1fr)_150px_150px]"
                            >
                              <span className="text-app-primary">
                                {item.name}
                              </span>
                              <span className="text-app-muted">
                                {item.type === "Mandatory"
                                  ? t("client_mandatory")
                                  : t("client_desired")}
                              </span>
                              <span className="text-app-muted">
                                {item.proficiency === "Not specified" ||
                                !item.proficiency
                                  ? t("common_not_specified")
                                  : t(
                                      `proficiency_${item.proficiency.toLowerCase()}` as never,
                                    )}
                              </span>
                            </div>
                          ))}
                        </section>
                      )}
                      {other.length > 0 && (
                        <section className="space-y-3">
                          <h3 className="text-xs font-medium text-app-primary">
                            {t("assignment_review_other_requirements")}
                          </h3>
                          {other.map((item, index) => (
                            <div
                              key={`${item.id}-${index}`}
                              className="flex justify-between border-b border-app py-2 text-xs last:border-0"
                            >
                              <span className="text-app-primary">
                                {item.name}
                              </span>
                              <span className="text-app-muted">
                                {item.type === "Mandatory"
                                  ? t("client_mandatory")
                                  : t("client_desired")}
                              </span>
                            </div>
                          ))}
                        </section>
                      )}
                    </div>
                  );
                })()}
                <div className="flex justify-between gap-2">
                  <Button
                    onClick={() => setStep("requirements")}
                    variant="ghost"
                  >
                    {t("assignment_modal_back")}
                  </Button>
                  <Button
                    onClick={createAssignment}
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? t("client_saving") : t("client_create")}
                  </Button>
                </div>
              </>
            )}
            {error && <p className="text-xs text-app-secondary">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientAssignments() {
  const { t, locale } = useI18n();
  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    assignmentsApi
      .getAll()
      .then((data) => {
        if (!cancelled) setAssignments(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled)
          setError(
            requestError instanceof Error
              ? requestError.message
              : t("client_load_error"),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statusConfig = (status: AssignmentStatusApi) => {
    switch (status) {
      case "Draft":
        return { label: t("assignment_draft"), tone: "neutral" as const, icon: <Clock size={9} /> };
      case "Matching":
        return { label: t("assignment_matching"), tone: "neutral" as const, icon: <Clock size={9} /> };
      case "Closed":
        return { label: t("assignment_closed"), tone: "neutral" as const, icon: <Clock size={9} /> };
      default:
        return { label: t("assignment_done"), tone: "success" as const, icon: <CheckCircle size={9} /> };
    }
  };

  const displaySeniority = (value: string) =>
    value === "Junior"
      ? t("seniority_junior")
      : value === "Mid"
        ? t("seniority_mid")
        : value === "Senior"
          ? t("seniority_senior")
          : value === "Staff"
            ? t("seniority_staff")
            : value;

  const seniorityRank: Record<string, number> = { Junior: 1, Mid: 2, Senior: 3, Staff: 4 };

  const filtered = assignments.filter((assignment) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;

    return (
      assignment.title.toLowerCase().includes(search) ||
      assignment.customerName.toLowerCase().includes(search) ||
      (assignment.description ?? "").toLowerCase().includes(search) ||
      (assignment.seniority ?? "").toLowerCase().includes(search) ||
      (assignment.location ?? "").toLowerCase().includes(search) ||
      assignment.requirements.some((requirement) =>
        requirement.name.toLowerCase().includes(search),
      )
    );
  });

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={t("assignments_title")}
        meta={String(assignments.length) + " " + t("assignments_sub")}
        actions={
          <Button
            onClick={() => navigate("/client-assignments/new")}
            variant="primary"
            icon={<Plus size={12} />}
          >
            {t("assignments_new")}
          </Button>
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 relative max-w-xs">
          <Search
            size={12}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-app-faint"
          />
          <Input
            type="search"
            placeholder={t("assignments_search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8 py-1.5"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
          {t("client_backend_error")}: {error}
        </div>
      )}

      <div className="bg-app-surface border border-app rounded-lg overflow-hidden shadow-app-surface">
        <DataTable
          columns={[
            {
              key: "assignment",
              width: "30%",
              header: t("assignment_title"),
              sortable: true,
              sortValue: (assignment) => assignment.title,
              render: (assignment) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-app-primary">{assignment.title}</p>
                  <p className="truncate text-[10px] text-app-muted">
                    {assignment.location || t("assignment_location_unspecified")}
                  </p>
                </div>
              ),
            },
            {
              key: "client",
              width: "20%",
              header: t("assignment_client"),
              sortable: true,
              sortValue: (assignment) => assignment.customerName,
              render: (assignment) => <span className="truncate">{assignment.customerName || "—"}</span>,
            },
            {
              key: "seniority",
              width: "12%",
              header: t("assignment_seniority"),
              sortable: true,
              sortValue: (assignment) => seniorityRank[assignment.seniority ?? ""] ?? 99,
              render: (assignment) => assignment.seniority ? displaySeniority(assignment.seniority) : "—",
            },
            {
              key: "requirements",
              width: "12%",
              header: t("client_requirements"),
              sortable: true,
              sortValue: (assignment) => assignment.requirements.length,
              render: (assignment) => <span className="font-mono">{assignment.requirements.length}</span>,
            },
            {
              key: "updated",
              width: "16%",
              header: t("common_updated"),
              sortable: true,
              sortValue: (assignment) => new Date(assignment.updatedAt || assignment.createdAt),
              render: (assignment) => formatDate(assignment.updatedAt || assignment.createdAt, locale),
            },
            {
              key: "status",
              width: "8%",
              header: "Status",
              sortable: true,
              sortValue: (assignment) => assignment.status,
              render: (assignment) => {
                const status = statusConfig(assignment.status);
                return (
                  <StatusBadge tone={status.tone} icon={status.icon}>
                    {status.label}
                  </StatusBadge>
                );
              },
            },
            {
              key: "navigation",
              width: "2%",
              header: "",
              render: () => <ChevronRight size={15} className="text-app-faint" aria-hidden="true" />,
            },
          ]}
          rows={filtered}
          rowKey={(assignment) => String(assignment.id)}
          onRowClick={(assignment) => navigate(`/client-assignments/${assignment.id}`)}
          rowAriaLabel={(assignment) => `${t("assignment_view")} ${assignment.title}`}
          emptyMessage={
            loading
              ? t("assignments_loading")
              : query
                ? t("assignments_empty_search")
                : t("assignments_empty")
          }
        />

        <div className="border-t border-app px-4 py-2.5 bg-app-surface">
          <span className="text-[10px] text-app-faint">
            {loading
              ? t("assignments_loading")
              : `${filtered.length} / ${assignments.length} ${t("assignments_sub")}`}
          </span>
        </div>
      </div>
    </div>
  );
}
