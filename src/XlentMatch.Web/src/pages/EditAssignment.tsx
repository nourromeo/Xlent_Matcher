import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { RemoveButton } from "../components/ui/RemoveButton";
import { useI18n } from "../i18n";
import { assignmentsApi } from "../services/assignmentsApi";
import type { AssignmentApi, AssignmentRequirementApi } from "../types";

type RequirementCategory = "Skill" | "HumanLanguage";
type RequirementType = "Mandatory" | "Desired";
const newRequirement = (
  assignmentId: number,
  category: RequirementCategory,
  type: RequirementType,
): AssignmentRequirementApi => ({
  id: 0,
  assignmentId,
  name: "",
  category,
  type,
  minYears: null,
  minLevel: null,
  proficiency: category === "HumanLanguage" ? "Not specified" : null,
  matchMode: "Exact",
  maximumSeniority: null,
});

export default function EditAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [draft, setDraft] = useState<AssignmentApi | null>(null);
  const [step, setStep] = useState<"basic" | "requirements" | "review">(
    "basic",
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId)) {
      setError(t("assignment_invalid_id"));
      setLoading(false);
      return;
    }
    assignmentsApi
      .getById(assignmentId)
      .then(setDraft)
      .catch(() => setError(t("assignment_load_error")))
      .finally(() => setLoading(false));
  }, [id, t]);
  const update = (patch: Partial<AssignmentApi>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));
  const updateRequirement = (
    index: number,
    patch: Partial<AssignmentRequirementApi>,
  ) =>
    update({
      requirements: draft!.requirements.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  const removeRequirement = (index: number) => {
    update({
      requirements: draft!.requirements.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    });
    setEditing(null);
  };
  const addRequirement = (
    category: RequirementCategory,
    type: RequirementType,
  ) => {
    if (!draft) return;
    const next = [
      ...draft.requirements,
      newRequirement(draft.id, category, type),
    ];
    update({ requirements: next });
    setEditing(`${category}-${next.length - 1}`);
  };
  const groups = useMemo(() => {
    if (!draft)
      return { skills: [], languages: [], other: [] } as Record<
        string,
        Array<{ item: AssignmentRequirementApi; index: number }>
      >;
    return {
      skills: draft.requirements
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.category === "Skill"),
      languages: draft.requirements
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.category === "HumanLanguage"),
      other: draft.requirements
        .map((item, index) => ({ item, index }))
        .filter(
          ({ item }) =>
            item.category !== "Skill" && item.category !== "HumanLanguage",
        ),
    };
  }, [draft]);
  const save = async () => {
    if (!draft || !draft.title.trim() || !draft.customerName.trim()) {
      setError(t("assignment_required_fields"));
      return;
    }
    const requirements = draft.requirements
      .filter((item) => item.name.trim())
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        minYears: item.category === "HumanLanguage" ? null : item.minYears,
        minLevel: item.category === "HumanLanguage" ? null : item.minLevel,
        proficiency:
          item.category === "HumanLanguage" ? item.proficiency : null,
      }));
    if (!requirements.length) {
      setError(t("assignment_requirements_required"));
      return;
    }
    if (
      requirements.some(
        (item) =>
          item.minYears !== null &&
          (item.minYears < 0 || !Number.isInteger(item.minYears)),
      )
    ) {
      setError(t("assignment_minimum_years_invalid"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await assignmentsApi.update(draft.id, { ...draft, requirements });
      navigate(`/client-assignments/${draft.id}`);
    } catch {
      setError(t("assignment_save_error"));
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <div className="p-6 text-sm text-app-muted">
        {t("assignment_loading")}
      </div>
    );
  if (!draft)
    return (
      <div className="p-6 text-sm text-app-secondary">
        {error || t("assignment_not_found")}
      </div>
    );
  const seniority = draft.requirements.find(
    (item) => item.category === "Seniority",
  );
  const setSeniority = (value: string) => {
    const existing = draft.requirements.findIndex(
      (item) => item.category === "Seniority",
    );
    const requirements = value
      ? existing >= 0
        ? draft.requirements.map((item, index) =>
            index === existing ? { ...item, name: value } : item,
          )
        : [
            ...draft.requirements,
            {
              ...newRequirement(draft.id, "Skill", "Mandatory"),
              name: value,
              category: "Seniority" as const,
            },
          ]
      : draft.requirements.filter((item) => item.category !== "Seniority");
    update({ seniority: value || null, requirements });
  };
  const field = (label: string, control: React.ReactNode, hint?: string) => (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-app-muted">
        {label}
      </label>
      {control}
      {hint && <p className="text-[10px] text-app-muted">{hint}</p>}
    </div>
  );
  const priority = (item: AssignmentRequirementApi, index: number) => (
    <select
      aria-label={t("assignment_requirement_priority")}
      value={item.type}
      onChange={(e) =>
        updateRequirement(index, { type: e.target.value as RequirementType })
      }
      className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"
    >
      <option value="Mandatory">{t("client_mandatory")}</option>
      <option value="Desired">{t("client_desired")}</option>
    </select>
  );
  const editor = (
    item: AssignmentRequirementApi,
    index: number,
    language: boolean,
    isNew: boolean,
  ) => (
    <div className="space-y-3 rounded-lg border border-app-brand bg-app-raised p-4">
      <h4 className="text-xs font-medium text-app-primary">
        {isNew
          ? language
            ? t("assignment_add_language_requirement")
            : t("assignment_add_skill_requirement")
          : language
            ? t("assignment_edit_language_requirement")
            : t("assignment_edit_skill_requirement")}
      </h4>
      <div className="grid gap-3 md:grid-cols-2">
        {field(
          language ? t("assignment_language") : t("assignment_skill"),
          <Input
            autoFocus
            value={item.name}
            onChange={(e) => updateRequirement(index, { name: e.target.value })}
          />,
        )}
        {field(t("assignment_requirement_priority"), priority(item, index))}
        {language
          ? field(
              t("assignment_language_proficiency"),
              <select
                value={item.proficiency ?? "Not specified"}
                onChange={(e) =>
                  updateRequirement(index, {
                    proficiency: e.target
                      .value as AssignmentRequirementApi["proficiency"],
                  })
                }
                className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"
              >
                <option value="Not specified">
                  {t("common_not_specified")}
                </option>
                <option value="Low">{t("proficiency_low")}</option>
                <option value="Medium">{t("proficiency_medium")}</option>
                <option value="High">{t("proficiency_high")}</option>
                <option value="Native">{t("proficiency_native")}</option>
              </select>,
            )
          : field(
              t("assignment_minimum_skill_years"),
              <Input
                type="number"
                min={0}
                value={item.minYears ?? ""}
                onChange={(e) =>
                  updateRequirement(index, {
                    minYears:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />,
              t("assignment_years_unit"),
            )}
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => setEditing(null)}>
          {isNew ? t("assignment_add") : t("assignment_save_local")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (isNew) removeRequirement(index);
            else setEditing(null);
          }}
        >
          {t("assignment_cancel_edit")}
        </Button>
      </div>
    </div>
  );
  const rows = (
    items: Array<{ item: AssignmentRequirementApi; index: number }>,
    language: boolean,
  ) =>
    items.map(({ item, index }) => {
      const key = `${item.category}-${index}`;
      if (editing === key)
        return (
          <div key={`${item.id}-${index}`}>
            {editor(item, index, language, item.id === 0)}
          </div>
        );
      return (
        <div
          key={`${item.id}-${index}`}
          className="grid gap-2 rounded-lg border border-app bg-app-raised p-3 md:grid-cols-[minmax(180px,1fr)_150px_170px_auto] md:items-center"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-app-primary">
              {item.name || t("common_not_specified")}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-app-muted md:hidden">
              <span>
                {item.type === "Mandatory"
                  ? t("client_mandatory")
                  : t("client_desired")}
              </span>
              {language ? (
                <span>
                  {t("assignment_language_proficiency")}:{" "}
                  {item.proficiency === "Not specified" || !item.proficiency
                    ? t("common_not_specified")
                    : item.proficiency}
                </span>
              ) : (
                <span>
                  {t("assignment_minimum_skill_years")}:{" "}
                  {item.minYears == null
                    ? t("common_not_specified")
                    : `${item.minYears} ${t("assignment_years_unit")}`}
                </span>
              )}
            </div>
          </div>
          <span className="hidden text-xs text-app-muted md:block">
            {item.type === "Mandatory"
              ? t("client_mandatory")
              : t("client_desired")}
          </span>
          <span className="hidden text-xs text-app-muted md:block">
            {language
              ? item.proficiency === "Not specified" || !item.proficiency
                ? t("common_not_specified")
                : item.proficiency
              : item.minYears == null
                ? t("common_not_specified")
                : `${item.minYears} ${t("assignment_years_unit")}`}
          </span>
          <div className="flex gap-2 md:justify-end">
            <button
              type="button"
              className="text-xs text-app-brand"
              onClick={() => setEditing(key)}
            >
              {t("common_edit")}
            </button>
            <RemoveButton label={`${t("common_remove")} ${item.name}`} onClick={() => removeRequirement(index)} />
          </div>
        </div>
      );
    });
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <PageHeader
          title={t("assignment_edit_title")}
          description={t("assignment_edit_sub")}
          backTo={`/client-assignments/${draft.id}`}
          actions={
            <Button
              variant="ghost"
              onClick={() => navigate(`/client-assignments/${draft.id}`)}
            >
              {t("assignment_modal_cancel")}
            </Button>
          }
        />
        <div className="grid grid-cols-3 gap-2">
          {(["basic", "requirements", "review"] as const).map((key, index) => (
            <button
              type="button"
              key={key}
              onClick={() => setStep(key)}
              className={`rounded-lg border px-3 py-2 text-left text-xs ${step === key ? "border-app-brand bg-app-brand-soft text-app-primary" : "border-app text-app-muted"}`}
            >
              <span className="font-semibold">{index + 1}</span>
              <span className="ml-2">
                {key === "basic"
                  ? t("assignment_step_basic")
                  : key === "requirements"
                    ? t("assignment_step_requirements")
                    : t("assignment_edit_step_review")}
              </span>
            </button>
          ))}
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary"
          >
            {error}
          </div>
        )}
        <section className="space-y-5 rounded-xl border border-app bg-app-surface p-5 shadow-app-surface">
          {step === "basic" && (
            <>
              <h2 className="text-sm font-medium text-app-primary">
                {t("assignment_basic_info")}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {field(
                  t("assignment_title"),
                  <Input
                    value={draft.title}
                    onChange={(e) => update({ title: e.target.value })}
                  />,
                )}
                {field(
                  t("assignment_client"),
                  <Input
                    value={draft.customerName}
                    onChange={(e) => update({ customerName: e.target.value })}
                  />,
                )}
                {field(
                  t("assignment_seniority"),
                  <select
                    value={draft.seniority ?? ""}
                    onChange={(e) => setSeniority(e.target.value)}
                    className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"
                  >
                    <option value="">{t("common_not_specified")}</option>
                    <option value="Junior">{t("seniority_junior")}</option>
                    <option value="Mid">{t("seniority_mid")}</option>
                    <option value="Senior">{t("seniority_senior")}</option>
                    <option value="Staff">{t("seniority_staff")}</option>
                  </select>,
                )}
                {field(
                  t("assignment_seniority_mode"),
                  <select
                    disabled={!seniority}
                    value={seniority?.matchMode ?? "Exact"}
                    onChange={(e) =>
                      updateRequirement(
                        draft.requirements.indexOf(seniority!),
                        {
                          matchMode: e.target.value as
                            "Exact" | "Minimum" | "Range",
                          maximumSeniority:
                            e.target.value === "Range"
                              ? (seniority?.maximumSeniority ?? null)
                              : null,
                        },
                      )
                    }
                    className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"
                  >
                    <option value="Exact">{t("assignment_exact")}</option>
                    <option value="Minimum">{t("assignment_minimum")}</option>
                    <option value="Range">{t("assignment_range")}</option>
                  </select>,
                )}
                {field(
                  t("assignment_availability"),
                  <Input
                    value={draft.availability ?? ""}
                    onChange={(e) =>
                      update({ availability: e.target.value || null })
                    }
                  />,
                )}
                {field(
                  t("assignment_work_location"),
                  <Input
                    value={draft.location ?? ""}
                    onChange={(e) =>
                      update({ location: e.target.value || null })
                    }
                    placeholder={t("assignment_work_location_placeholder")}
                  />,
                )}
                {field(
                  t("client_required_start_date"),
                  <Input
                    type="date"
                    value={draft.requiredStartDate ?? ""}
                    onChange={(e) =>
                      update({ requiredStartDate: e.target.value || null })
                    }
                  />,
                )}
                {field(
                  t("assignment_minimum_years"),
                  <Input
                    type="number"
                    min={0}
                    value={draft.minYearsExperience}
                    onChange={(e) =>
                      update({
                        minYearsExperience:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                  />,
                  t("assignment_years_unit"),
                )}
              </div>
              {field(
                t("assignment_description"),
                <Textarea
                  rows={6}
                  value={draft.description ?? ""}
                  onChange={(e) =>
                    update({ description: e.target.value || null })
                  }
                  placeholder={t("assignment_description_placeholder")}
                />,
              )}
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => setStep("requirements")}
                >
                  {t("common_next")}
                </Button>
              </div>
            </>
          )}
          {step === "requirements" && (
            <>
              <h2 className="text-sm font-medium text-app-primary">
                {t("assignment_requirements")}
              </h2>
              <p className="text-xs text-app-muted">
                {t("assignment_requirements_help")}
              </p>
              <div className="space-y-5">
                <section className="space-y-2">
                  <h3 className="text-xs font-medium text-app-primary">
                    {t("client_skill")}
                  </h3>
                  <div className="hidden grid-cols-[minmax(180px,1fr)_150px_170px_auto] gap-2 px-3 text-[10px] text-app-muted md:grid">
                    <span>{t("assignment_skill")}</span>
                    <span>{t("assignment_requirement_priority")}</span>
                    <span>{t("assignment_minimum_skill_years")}</span>
                    <span>{t("common_actions")}</span>
                  </div>
                  {rows(groups.skills, false)}
                  <button
                    type="button"
                    onClick={() => addRequirement("Skill", "Mandatory")}
                    className="inline-flex items-center gap-1 text-xs text-app-brand"
                  >
                    <Plus size={13} />
                    {t("assignment_add_skill_requirement")}
                  </button>
                </section>
                <section className="space-y-2">
                  <h3 className="text-xs font-medium text-app-primary">
                    {t("client_language")}
                  </h3>
                  <div className="hidden grid-cols-[minmax(180px,1fr)_150px_170px_auto] gap-2 px-3 text-[10px] text-app-muted md:grid">
                    <span>{t("assignment_language")}</span>
                    <span>{t("assignment_requirement_priority")}</span>
                    <span>{t("assignment_language_proficiency")}</span>
                    <span>{t("common_actions")}</span>
                  </div>
                  {rows(groups.languages, true)}
                  <button
                    type="button"
                    onClick={() => addRequirement("HumanLanguage", "Mandatory")}
                    className="inline-flex items-center gap-1 text-xs text-app-brand"
                  >
                    <Plus size={13} />
                    {t("assignment_add_language_requirement")}
                  </button>
                </section>
                <section className="space-y-2">
                  <h3 className="text-xs font-medium text-app-primary">
                    {t("assignment_other_requirements")}
                  </h3>
                  {groups.other
                    .filter(({ item }) => item.category !== "Seniority")
                    .map(({ item, index }) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="flex items-end gap-2"
                      >
                        {field(
                          t("assignment_requirement_name"),
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              updateRequirement(index, { name: e.target.value })
                            }
                          />,
                        )}
                        <RemoveButton compact label={`${t("common_remove")} ${item.name}`} onClick={() => removeRequirement(index)} />
                      </div>
                    ))}
                </section>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep("basic")}>
                  {t("assignment_modal_back")}
                </Button>
                <Button variant="primary" onClick={() => setStep("review")}>
                  {t("common_next")}
                </Button>
              </div>
            </>
          )}
          {step === "review" && (
            <>
              <h2 className="text-sm font-medium text-app-primary">
                {t("assignment_edit_step_review")}
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
                    [t("assignment_title"), draft.title],
                    [t("assignment_client"), draft.customerName],
                    [
                      t("assignment_seniority"),
                      draft.seniority || t("common_not_specified"),
                    ],
                    [
                      t("assignment_minimum_years"),
                      `${draft.minYearsExperience} ${t("assignment_years_unit")}`,
                    ],
                    [
                      t("assignment_work_location"),
                      draft.location || t("common_not_specified"),
                    ],
                    [
                      t("assignment_availability"),
                      draft.availability || t("common_not_specified"),
                    ],
                    [
                      t("client_required_start_date"),
                      draft.requiredStartDate || t("common_not_specified"),
                    ],
                    [
                      t("assignment_seniority_mode"),
                      seniority?.matchMode
                        ? t(
                            `assignment_${seniority.matchMode.toLowerCase()}` as never,
                          )
                        : t("common_not_specified"),
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] text-app-muted">{label}</p>
                      <p className="text-sm text-app-primary">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
              {(() => {
                const skills = draft.requirements.filter(
                  (item) => item.category === "Skill" && item.name.trim(),
                );
                const mandatory = skills.filter(
                  (item) => item.type === "Mandatory",
                );
                const preferred = skills.filter(
                  (item) => item.type === "Desired",
                );
                const languages = draft.requirements.filter(
                  (item) =>
                    item.category === "HumanLanguage" && item.name.trim(),
                );
                const other = draft.requirements.filter(
                  (item) =>
                    item.category !== "Skill" &&
                    item.category !== "HumanLanguage" &&
                    item.category !== "Seniority" &&
                    item.name.trim(),
                );
                const skillRows = (items: typeof skills) =>
                  items.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="grid gap-1 border-b border-app py-2 text-xs last:border-0 md:grid-cols-[minmax(0,1fr)_180px]"
                    >
                      <span className="text-app-primary">{item.name}</span>
                      <span className="text-app-muted">
                        {item.minYears == null
                          ? t("common_not_specified")
                          : `${item.minYears} ${t("assignment_years_unit")}`}
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
                        {mandatory.length > 0 && (
                          <div>
                            <h4 className="mb-1 text-[10px] uppercase tracking-wide text-app-muted">
                              {t("client_mandatory")}
                            </h4>
                            <div>{skillRows(mandatory)}</div>
                          </div>
                        )}
                        {preferred.length > 0 && (
                          <div>
                            <h4 className="mb-1 text-[10px] uppercase tracking-wide text-app-muted">
                              {t("client_desired")}
                            </h4>
                            <div>{skillRows(preferred)}</div>
                          </div>
                        )}
                      </section>
                    )}
                    {languages.length > 0 && (
                      <section className="space-y-3">
                        <h3 className="text-xs font-medium text-app-primary">
                          {t("assignment_review_language_requirements")}
                        </h3>
                        <div className="hidden grid-cols-[minmax(0,1fr)_150px_150px] gap-2 border-b border-app px-0 pb-1 text-[10px] text-app-muted md:grid">
                          <span>{t("assignment_language")}</span>
                          <span>{t("assignment_requirement_priority")}</span>
                          <span>{t("assignment_language_proficiency")}</span>
                        </div>
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
                            className="flex flex-wrap justify-between gap-2 border-b border-app py-2 text-xs last:border-0"
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
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep("requirements")}>
                  {t("assignment_modal_back")}
                </Button>
                <Button variant="primary" disabled={saving} onClick={save}>
                  {saving
                    ? t("assignment_saving")
                    : t("assignment_save_changes")}
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
