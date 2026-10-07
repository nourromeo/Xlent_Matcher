import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, X } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { RemoveButton } from "../components/ui/RemoveButton";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { FormField } from "../components/ui/FormField";
import { consultantsApi } from "../services/consultantsApi";
import { useI18n } from "../i18n";
import type { Consultant } from "../types";

type Step = "basic" | "competencies" | "experience" | "review";
type Collection =
  | "skills"
  | "languages"
  | "industries"
  | "experiences"
  | "projects"
  | "education"
  | "certifications";
const steps: Step[] = ["basic", "competencies", "experience", "review"];
const dateValue = (value: string | null) => value?.slice(0, 10) ?? "";

function payload(draft: Consultant): Consultant {
  const compact = <T extends { id: number; consultantId: number }>(
    items: T[],
    keep: (item: T) => boolean,
  ) => items.filter(keep).map((item) => ({ ...item, id: 0, consultantId: 0 }));
  return {
    ...draft,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    skills: compact(draft.skills, (x) => !!x.name.trim()).map((x) => ({
      ...x,
      skillId: 0,
    })),
    languages: compact(draft.languages, (x) => !!x.name.trim()),
    experiences: compact(
      draft.experiences,
      (x) => !!x.company.trim() || !!x.role.trim(),
    ),
    projects: compact(draft.projects, (x) => !!x.name.trim()),
    education: compact(draft.education, (x) => !!x.degree.trim()),
    industries: compact(draft.industries, (x) => !!x.name.trim()),
    certifications: compact(draft.certifications, (x) => !!x.name.trim()),
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
  const [editingSkill, setEditingSkill] = useState<number | null>(null);
  const [editingLanguage, setEditingLanguage] = useState<number | null>(null);
  const [editingIndustry, setEditingIndustry] = useState<number | null>(null);
  const [skillSearch, setSkillSearch] = useState("");
  const [open, setOpen] = useState<{
    collection: Collection;
    index: number;
  } | null>(null);

  useEffect(() => {
    const consultantId = Number(id);
    if (!Number.isInteger(consultantId) || consultantId <= 0) {
      setError(t("consultant_invalid_id"));
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    consultantsApi
      .getById(consultantId, controller.signal)
      .then((data) => {
        setDraft(data);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (!(
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ))
          setError(
            requestError instanceof Error
              ? requestError.message
              : t("consultant_load_error"),
          );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id, t]);

  const update = (patch: Partial<Consultant>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));
  const updateRow = (
    collection: Collection,
    index: number,
    patch: Record<string, unknown>,
  ) =>
    setDraft((current) => {
      if (!current) return current;
      const rows = [...current[collection]] as Array<Record<string, unknown>>;
      rows[index] = { ...rows[index], ...patch };
      return { ...current, [collection]: rows } as Consultant;
    });
  const remove = (collection: Collection, index: number) =>
    setDraft((current) =>
      current
        ? ({
            ...current,
            [collection]: current[collection].filter((_, i) => i !== index),
          } as Consultant)
        : current,
    );
  const levelLabel = (level: number) =>
    level >= 5
      ? t("consultant_level_expert")
      : level >= 3
        ? t("consultant_level_proficient")
        : level > 0
          ? t("consultant_level_familiar")
          : t("common_not_specified");
  const emptyText = (collection: Collection) =>
    collection === "industries"
      ? t("consultant_no_industries")
      : collection === "education"
        ? t("consultant_no_education")
        : collection === "certifications"
          ? t("consultant_no_certifications")
          : collection === "experiences"
            ? t("consultant_no_experience")
            : collection === "projects"
              ? t("consultant_no_projects")
              : t("consultant_no_skills");

  const save = async () => {
    if (!draft) return;
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setError(t("upload_required_names"));
      setStep("basic");
      return;
    }
    if (
      (draft.yearsOfExperience !== null && draft.yearsOfExperience < 0) ||
      draft.skills.some((x) => x.years < 0 || x.level < 0 || x.level > 5)
    ) {
      setError(t("upload_invalid_experience"));
      setStep("competencies");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await consultantsApi.update(draft.id, payload(draft));
      navigate(`/consultants/${draft.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("consultant_save_error"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-6 text-sm text-app-muted">
        {t("consultant_loading")}
      </div>
    );
  if (!draft)
    return (
      <div className="p-6 space-y-3">
        <Link to="/consultants" className="text-xs text-app-brand">
          ← {t("consultants_title")}
        </Link>
        <p className="text-sm text-app-secondary">
          {error || t("consultant_not_found")}
        </p>
      </div>
    );

  const panel = (title: string, children: ReactNode) => (
    <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-4">
      <h2 className="text-sm font-medium text-app-primary">{title}</h2>
      {children}
    </section>
  );
  const add = (label: string, action: () => void) => (
    <button
      type="button"
      onClick={action}
      className="inline-flex items-center gap-1 text-xs text-app-brand"
    >
      <Plus size={13} />
      {label}
    </button>
  );
  const skillRows = draft.skills
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      item.name.toLocaleLowerCase().includes(skillSearch.toLocaleLowerCase()),
    );
  const labeled = (label: string, child: ReactNode, hint?: string) => (
    <div className="space-y-1">
      <span className="block text-[10px] text-app-muted">{label}</span>
      {hint && <span className="block text-[10px] text-app-faint">{hint}</span>}
      {child}
    </div>
  );

  const collapsible = (
    collection: Collection,
    index: number,
    title: string,
    subtitle: string,
    children: ReactNode,
  ) => {
    const isOpen = open?.collection === collection && open.index === index;
    const isNew = (draft[collection][index] as { id: number }).id === 0;
    return (
      <div
        key={`${collection}-${index}`}
        className="rounded-lg border border-app-border bg-app-raised"
      >
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setOpen(isOpen ? null : { collection, index })}
          className="flex w-full items-start justify-between gap-3 p-3 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-app-primary">
              {title || t("common_not_specified")}
            </span>
            <span className="block truncate text-xs text-app-muted">
              {subtitle || t("common_not_specified")}
            </span>
          </span>
          <span className="text-xs text-app-muted">{isOpen ? "−" : "+"}</span>
        </button>
        {isOpen && (
          <div className="border-t border-app-border p-3 space-y-3">
            {children}
            <div className="flex gap-2">
              <Button onClick={() => setOpen(null)}>
                {isNew ? t("common_add") : t("consultant_save_changes")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (isNew) remove(collection, index);
                  setOpen(null);
                }}
              >
                {t("common_cancel")}
              </Button>
              {!isNew && (
                <RemoveButton className="ml-auto" onClick={() => { remove(collection, index); setOpen(null); }} />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <PageHeader
          title={t("consultant_edit_title")}
          description={t("consultant_edit_sub")}
          backTo={`/consultants/${draft.id}`}
          actions={
            <Button
              variant="ghost"
              onClick={() => navigate(`/consultants/${draft.id}`)}
            >
              {t("common_cancel")}
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((item, index) => (
            <button
              type="button"
              key={item}
              onClick={() => setStep(item)}
              className={`rounded-lg border px-3 py-2 text-left text-xs ${step === item ? "border-app-brand bg-app-brand-soft text-app-primary" : "border-app-border text-app-muted"}`}
            >
              <span className="font-semibold">{index + 1}</span>
              <span className="ml-2">
                {item === "basic"
                  ? t("consultant_basic_info")
                  : item === "competencies"
                    ? t("consultant_skills")
                    : item === "experience"
                      ? t("consultant_experience")
                      : t("assignment_edit_step_review")}
              </span>
            </button>
          ))}
        </div>
        {error && (
          <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-secondary">
            {error}
          </div>
        )}

        {step === "basic" && (
          <div className="space-y-5">
            {panel(
              t("consultant_basic_info"),
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label={t("consultant_first_name")} required>
                    <Input
                      value={draft.firstName}
                      onChange={(e) => update({ firstName: e.target.value })}
                    />
                  </FormField>
                  <FormField label={t("consultant_last_name")} required>
                    <Input
                      value={draft.lastName}
                      onChange={(e) => update({ lastName: e.target.value })}
                    />
                  </FormField>
                  <FormField label={t("consultant_role")}>
                    <Input
                      value={draft.title ?? ""}
                      onChange={(e) =>
                        update({ title: e.target.value || null })
                      }
                    />
                  </FormField>
                  <FormField label={t("consultant_seniority")}>
                    <select
                      value={draft.seniority ?? ""}
                      onChange={(e) =>
                        update({ seniority: e.target.value || null })
                      }
                      className="w-full rounded border border-app-border bg-app px-3 py-2 text-xs text-app-primary"
                    >
                      <option value="">{t("common_not_specified")}</option>
                      <option value="Junior">{t("seniority_junior")}</option>
                      <option value="Mid">{t("seniority_mid")}</option>
                      <option value="Senior">{t("seniority_senior")}</option>
                      <option value="Staff">{t("seniority_staff")}</option>
                    </select>
                  </FormField>
                  <FormField label={t("consultant_availability")}>
                    <select
                      value={draft.availability}
                      onChange={(e) =>
                        update({
                          availability: e.target
                            .value as Consultant["availability"],
                          availableAgainDate:
                            e.target.value === "Available"
                              ? null
                              : draft.availableAgainDate,
                        })
                      }
                      className="w-full rounded border border-app-border bg-app px-3 py-2 text-xs text-app-primary"
                    >
                      <option value="Available">
                        {t("availability_available")}
                      </option>
                      <option value="Unavailable">
                        {t("availability_unavailable")}
                      </option>
                    </select>
                  </FormField>
                  {draft.availability === "Unavailable" && (
                    <FormField label={t("consultant_available_again")}>
                      <Input
                        type="date"
                        value={dateValue(draft.availableAgainDate)}
                        onChange={(e) =>
                          update({ availableAgainDate: e.target.value || null })
                        }
                      />
                    </FormField>
                  )}
                  <FormField label={t("consultant_office")}>
                    <Input
                      value={draft.office ?? ""}
                      onChange={(e) =>
                        update({ office: e.target.value || null })
                      }
                    />
                  </FormField>
                  <FormField label={t("consultant_years")}>
                    <Input
                      type="number"
                      min={0}
                      value={draft.yearsOfExperience ?? ""}
                      onChange={(e) =>
                        update({
                          yearsOfExperience: e.target.value
                            ? Number(e.target.value)
                            : null,
                          yearsOfExperienceSource: "ManuallyConfirmed",
                        })
                      }
                    />
                  </FormField>
                  <FormField label={t("upload_email")}>
                    <Input
                      type="email"
                      value={draft.email ?? ""}
                      onChange={(e) =>
                        update({ email: e.target.value || null })
                      }
                    />
                  </FormField>
                </div>
                <FormField label={t("consultant_summary")}>
                  <Textarea
                    rows={5}
                    value={draft.summary ?? ""}
                    onChange={(e) =>
                      update({ summary: e.target.value || null })
                    }
                  />
                </FormField>
              </>,
            )}
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setStep("competencies")}>
                {t("common_next")}
              </Button>
            </div>
          </div>
        )}

        {step === "competencies" && (
          <div className="space-y-5">
            {panel(
              t("consultant_skills"),
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-[10px] text-app-muted">
                    {t("consultant_search_skills")}
                  </span>
                  <Input
                    aria-label={t("consultant_search_skills")}
                    placeholder={t("consultant_search_skills_placeholder")}
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                  />
                </label>
                <div className="hidden grid-cols-[1fr_100px_120px_auto] gap-3 px-3 text-[10px] text-app-muted md:grid">
                  <span>{t("consultant_skill")}</span>
                  <span>{t("upload_field_years")}</span>
                  <span>{t("upload_field_level")}</span>
                  <span>{t("common_actions")}</span>
                </div>
                {skillRows.map(({ item, index }) =>
                  editingSkill === index ? (
                    <div
                      key={`${item.id}-${index}`}
                      className="space-y-3 rounded-lg border border-app-brand bg-app-raised p-4"
                    >
                      <h3 className="text-xs font-medium text-app-primary">
                        {t("consultant_edit_skill")}
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {labeled(
                          t("consultant_skill"),
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              updateRow("skills", index, {
                                name: e.target.value,
                              })
                            }
                          />,
                        )}
                        {labeled(
                          t("consultant_skill_experience"),
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={item.years}
                              onChange={(e) =>
                                updateRow("skills", index, {
                                  years: Number(e.target.value) || 0,
                                })
                              }
                            />
                            <span className="text-xs text-app-muted">
                              {t("consultant_year_count")}
                            </span>
                          </div>,
                        )}
                        {labeled(
                          t("consultant_skill_level"),
                          <select
                            value={item.level}
                            onChange={(e) =>
                              updateRow("skills", index, {
                                level: Number(e.target.value),
                              })
                            }
                            className="w-full rounded border border-app-border bg-app px-3 py-2 text-xs text-app-primary"
                          >
                            {[0, 1, 2, 3, 4, 5].map((level) => (
                              <option key={level} value={level}>
                                {level === 0
                                  ? t("common_not_specified")
                                  : `${levelLabel(level)} (${level}/5)`}
                              </option>
                            ))}
                          </select>,
                        )}
                        {labeled(
                          t("consultant_evidence_label"),
                          <Textarea
                            rows={3}
                            value={item.evidence ?? ""}
                            onChange={(e) =>
                              updateRow("skills", index, {
                                evidence: e.target.value || null,
                              })
                            }
                          />,
                          t("consultant_evidence_hint"),
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setEditingSkill(null)}>
                          {t("consultant_save_changes")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditingSkill(null)}
                        >
                          {t("common_cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-app-border bg-app-raised p-3"
                    >
                      <span className="min-w-[150px] flex-1 text-sm font-medium text-app-primary">
                        {item.name || t("common_not_specified")}
                      </span>
                      <span className="text-xs text-app-muted">
                        {item.years} {t("consultant_year_count")}
                      </span>
                      <span className="text-xs text-app-muted">
                        {levelLabel(item.level)} ({item.level}/5)
                      </span>
                      <button
                        type="button"
                        className="text-xs text-app-brand"
                        onClick={() => setEditingSkill(index)}
                      >
                        {t("consultant_edit")}
                      </button>
                      <RemoveButton onClick={() => remove("skills", index)} />
                    </div>
                  ),
                )}
                {add(t("consultant_add_skill"), () => {
                  update({
                    skills: [
                      ...draft.skills,
                      {
                        id: 0,
                        consultantId: draft.id,
                        name: "",
                        category: null,
                        years: 0,
                        level: 0,
                        evidence: null,
                      },
                    ],
                  });
                  setEditingSkill(draft.skills.length);
                })}
              </div>,
            )}
            {panel(
              t("consultant_languages"),
              <div className="space-y-2">
                {draft.languages.length === 0 && (
                  <p className="text-xs text-app-muted">
                    {emptyText("languages")}
                  </p>
                )}
                {draft.languages.map((item, index) =>
                  editingLanguage === index ? (
                    <div
                      key={`${item.id}-${index}`}
                      className="grid gap-3 rounded-lg border border-app-brand bg-app-raised p-4 md:grid-cols-2"
                    >
                      <h3 className="md:col-span-2 text-xs font-medium text-app-primary">
                        {t("consultant_edit_language")}
                      </h3>
                      {labeled(
                        t("consultant_language"),
                        <Input
                          value={item.name}
                          onChange={(e) =>
                            updateRow("languages", index, {
                              name: e.target.value,
                            })
                          }
                        />,
                      )}
                      {labeled(
                        t("upload_language_proficiency"),
                        <select
                          value={item.proficiency}
                          onChange={(e) =>
                            updateRow("languages", index, {
                              proficiency: e.target.value,
                            })
                          }
                          className="w-full rounded border border-app-border bg-app px-3 py-2 text-xs text-app-primary"
                        >
                          <option value="Not specified">
                            {t("common_not_specified")}
                          </option>
                          <option value="Low">{t("proficiency_low")}</option>
                          <option value="Medium">
                            {t("proficiency_medium")}
                          </option>
                          <option value="High">{t("proficiency_high")}</option>
                          <option value="Native">
                            {t("proficiency_native")}
                          </option>
                        </select>,
                      )}
                      <div className="md:col-span-2 flex gap-2">
                        <Button onClick={() => setEditingLanguage(null)}>
                          {t("consultant_save_changes")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditingLanguage(null)}
                        >
                          {t("common_cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-app-border bg-app-raised p-3"
                    >
                      <span className="flex-1 text-sm text-app-primary">
                        {item.name}
                      </span>
                      <span className="text-xs text-app-muted">
                        {item.proficiency === "Not specified"
                          ? t("common_not_specified")
                          : item.proficiency}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-app-brand"
                        onClick={() => setEditingLanguage(index)}
                      >
                        {t("consultant_edit")}
                      </button>
                      <RemoveButton onClick={() => remove("languages", index)} />
                    </div>
                  ),
                )}
                {add(t("consultant_add_language"), () => {
                  update({
                    languages: [
                      ...draft.languages,
                      {
                        id: 0,
                        consultantId: draft.id,
                        name: "",
                        proficiency: "Not specified",
                      },
                    ],
                  });
                  setEditingLanguage(draft.languages.length);
                })}
              </div>,
            )}
            {panel(
              t("upload_industries"),
              <div className="space-y-2">
                {draft.industries.length === 0 && (
                  <p className="text-xs text-app-muted">
                    {emptyText("industries")}
                  </p>
                )}
                {draft.industries.map((item, index) =>
                  editingIndustry === index ? (
                    <div
                      key={`${item.id}-${index}`}
                      className="space-y-3 rounded-lg border border-app-brand bg-app-raised p-4"
                    >
                      <h3 className="text-xs font-medium text-app-primary">
                        {t("consultant_edit_industry")}
                      </h3>
                      {labeled(
                        t("consultant_industry_label"),
                        <Input
                          value={item.name}
                          onChange={(e) =>
                            updateRow("industries", index, {
                              name: e.target.value,
                            })
                          }
                        />,
                      )}
                      <div className="flex gap-2">
                        <Button onClick={() => setEditingIndustry(null)}>
                          {t("consultant_save_changes")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditingIndustry(null)}
                        >
                          {t("common_cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex gap-2 rounded-lg border border-app-border bg-app-raised p-3"
                    >
                      <span className="flex-1 text-sm text-app-primary">
                        {item.name || t("common_not_specified")}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-app-brand"
                        onClick={() => setEditingIndustry(index)}
                      >
                        {t("consultant_edit")}
                      </button>
                      <RemoveButton onClick={() => remove("industries", index)} />
                    </div>
                  ),
                )}
                {add(t("consultant_add_industry"), () => {
                  update({
                    industries: [
                      ...draft.industries,
                      { id: 0, consultantId: draft.id, name: "" },
                    ],
                  });
                  setEditingIndustry(draft.industries.length);
                })}
              </div>,
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("basic")}>
                {t("common_previous")}
              </Button>
              <Button variant="primary" onClick={() => setStep("experience")}>
                {t("common_next")}
              </Button>
            </div>
          </div>
        )}

        {step === "experience" && (
          <div className="space-y-5">
            {(
              [
                "experiences",
                "projects",
                "education",
                "certifications",
              ] as const
            ).map((collection) =>
              panel(
                collection === "experiences"
                  ? t("consultant_experience")
                  : collection === "projects"
                    ? t("consultant_projects")
                    : collection === "education"
                      ? t("upload_education")
                      : t("upload_certifications"),
                <div className="space-y-2" key={collection}>
                  {draft[collection].length === 0 && (
                    <p className="text-xs text-app-muted">
                      {emptyText(collection)}
                    </p>
                  )}
                  {draft[collection].map((item, index) => {
                    const row = item as typeof item & { id: number };
                    const title =
                      "company" in row
                        ? row.company
                        : "name" in row
                          ? row.name
                          : "degree" in row
                            ? row.degree
                            : "";
                    const subtitle =
                      "role" in row
                        ? row.role
                        : "technologies" in row
                          ? (row.technologies ?? "")
                          : "school" in row
                            ? (row.school ?? "")
                            : "issuer" in row
                              ? (row.issuer ?? "")
                              : "";
                    return collapsible(
                      collection,
                      index,
                      title,
                      subtitle,
                      <div className="grid gap-3 md:grid-cols-2">
                        {"company" in row &&
                          labeled(
                            t("consultant_company"),
                            <Input
                              value={row.company}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  company: e.target.value,
                                })
                              }
                            />,
                          )}
                        {"role" in row &&
                          labeled(
                            t("upload_role"),
                            <Input
                              value={row.role}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  role: e.target.value,
                                })
                              }
                            />,
                          )}
                        {"startDate" in row &&
                          labeled(
                            t("upload_start_date"),
                            <Input
                              type="date"
                              value={dateValue(row.startDate)}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  startDate: e.target.value || null,
                                })
                              }
                            />,
                          )}
                        {"endDate" in row &&
                          labeled(
                            t("upload_end_date"),
                            <Input
                              type="date"
                              value={dateValue(row.endDate)}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  endDate: e.target.value || null,
                                })
                              }
                            />,
                          )}
                        {"name" in row &&
                          labeled(
                            collection === "projects"
                              ? t("upload_project_name")
                              : t("upload_certification"),
                            <Input
                              value={row.name}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  name: e.target.value,
                                })
                              }
                            />,
                          )}
                        {"technologies" in row &&
                          labeled(
                            t("upload_technologies"),
                            <Input
                              value={row.technologies ?? ""}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  technologies: e.target.value || null,
                                })
                              }
                            />,
                          )}
                        {"degree" in row &&
                          labeled(
                            t("upload_degree"),
                            <Input
                              value={row.degree}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  degree: e.target.value,
                                })
                              }
                            />,
                          )}
                        {"school" in row &&
                          labeled(
                            t("consultant_school"),
                            <Input
                              value={row.school ?? ""}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  school: e.target.value || null,
                                })
                              }
                            />,
                          )}
                        {"year" in row &&
                          labeled(
                            t("upload_year"),
                            <Input
                              value={row.year ?? ""}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  year: e.target.value || null,
                                })
                              }
                            />,
                          )}
                        {"issuer" in row &&
                          labeled(
                            t("upload_issuer"),
                            <Input
                              value={row.issuer ?? ""}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  issuer: e.target.value || null,
                                })
                              }
                            />,
                          )}
                        {"issuedDate" in row &&
                          labeled(
                            t("upload_issued_date"),
                            <Input
                              type="date"
                              value={dateValue(row.issuedDate)}
                              onChange={(e) =>
                                updateRow(collection, index, {
                                  issuedDate: e.target.value || null,
                                })
                              }
                            />,
                          )}
                        {"description" in row && (
                          <div className="md:col-span-2">
                            {labeled(
                              t("consultant_description"),
                              <Textarea
                                rows={3}
                                value={row.description ?? ""}
                                onChange={(e) =>
                                  updateRow(collection, index, {
                                    description: e.target.value || null,
                                  })
                                }
                              />,
                            )}
                          </div>
                        )}
                      </div>,
                    );
                  })}
                  {add(
                    collection === "experiences"
                      ? t("upload_add_experience")
                      : collection === "projects"
                        ? t("upload_projects")
                        : collection === "education"
                          ? t("upload_education")
                          : t("upload_certification"),
                    () => {
                      const empty =
                        collection === "experiences"
                          ? {
                              id: 0,
                              consultantId: draft.id,
                              company: "",
                              role: "",
                              description: null,
                              startDate: null,
                              endDate: null,
                            }
                          : collection === "projects"
                            ? {
                                id: 0,
                                consultantId: draft.id,
                                name: "",
                                description: null,
                                technologies: null,
                              }
                            : collection === "education"
                              ? {
                                  id: 0,
                                  consultantId: draft.id,
                                  degree: "",
                                  school: null,
                                  year: null,
                                }
                              : {
                                  id: 0,
                                  consultantId: draft.id,
                                  name: "",
                                  issuer: null,
                                  issuedDate: null,
                                };
                      update({
                        [collection]: [...draft[collection], empty],
                      } as Partial<Consultant>);
                      setOpen({ collection, index: draft[collection].length });
                    },
                  )}
                </div>,
              ),
            )}
            <div className="flex justify-start">
              <Button variant="ghost" onClick={() => setStep("competencies")}>
                {t("common_previous")}
              </Button>
              <Button
                variant="primary"
                className="ml-auto"
                onClick={() => setStep("review")}
              >
                {t("common_next")}
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-5">
            <h2 className="text-sm font-medium text-app-primary">
              {t("assignment_edit_step_review")}
            </h2>
            <p className="text-xs text-app-muted">
              {t("consultant_review_description")}
            </p>
            <section className="space-y-3 border-b border-app-border pb-4">
              <h3 className="text-xs font-medium text-app-primary">
                {t("consultant_review_basic")}
              </h3>
              <div className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                {[
                  [
                    t("consultant_full_name"),
                    `${draft.firstName} ${draft.lastName}`,
                  ],
                  [
                    t("consultant_role"),
                    draft.title || t("common_not_specified"),
                  ],
                  [
                    t("consultant_seniority"),
                    draft.seniority || t("common_not_specified"),
                  ],
                  [t("consultant_availability"), draft.availability],
                  [
                    t("consultant_office"),
                    draft.office || t("common_not_specified"),
                  ],
                  [
                    t("consultant_years"),
                    draft.yearsOfExperience == null
                      ? t("common_not_specified")
                      : `${draft.yearsOfExperience} ${t("consultant_year_count")}`,
                  ],
                  [t("upload_email"), draft.email || t("common_not_specified")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] text-app-muted">{label}</p>
                    <p className="text-app-primary">{value}</p>
                  </div>
                ))}
              </div>
            </section>
            {draft.summary?.trim() && (
              <section className="space-y-2 border-b border-app-border pb-4">
                <h3 className="text-xs font-medium text-app-primary">
                  {t("consultant_review_summary")}
                </h3>
                <p className="whitespace-pre-wrap text-sm text-app-secondary">
                  {draft.summary}
                </p>
              </section>
            )}
            {draft.skills.length > 0 && (
              <section className="space-y-3 border-b border-app-border pb-4">
                <h3 className="text-xs font-medium text-app-primary">
                  {t("consultant_skills")}
                </h3>
                <div className="hidden grid-cols-[minmax(0,1fr)_130px_170px] gap-2 border-b border-app-border pb-1 text-[10px] text-app-muted md:grid">
                  <span>{t("consultant_skill")}</span>
                  <span>{t("consultant_skill_experience")}</span>
                  <span>{t("consultant_skill_level")}</span>
                </div>
                {draft.skills
                  .filter((x) => x.name.trim())
                  .map((x, index) => (
                    <div
                      key={`${x.id}-${index}`}
                      className="grid gap-1 border-b border-app-border py-2 text-xs last:border-0 md:grid-cols-[minmax(0,1fr)_130px_170px]"
                    >
                      <span className="text-app-primary">{x.name}</span>
                      <span className="text-app-muted">
                        {x.years} {t("consultant_year_count")}
                      </span>
                      <span className="text-app-muted">
                        {levelLabel(x.level)} ({x.level}/5)
                      </span>
                      {x.evidence?.trim() && (
                        <p className="md:col-span-3 text-[11px] text-app-faint">
                          {x.evidence}
                        </p>
                      )}
                    </div>
                  ))}
              </section>
            )}
            {(draft.languages.length > 0 || draft.industries.length > 0) && (
              <section className="space-y-4 border-b border-app-border pb-4">
                <h3 className="text-xs font-medium text-app-primary">
                  {t("consultant_review_languages_industries")}
                </h3>
                {draft.languages.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-[10px] uppercase tracking-wide text-app-muted">
                      {t("consultant_languages")}
                    </h4>
                    {draft.languages
                      .filter((x) => x.name.trim())
                      .map((x, index) => (
                        <div
                          key={`${x.id}-${index}`}
                          className="flex justify-between border-b border-app-border py-2 text-xs last:border-0"
                        >
                          <span className="text-app-primary">{x.name}</span>
                          <span className="text-app-muted">
                            {x.proficiency === "Not specified"
                              ? t("common_not_specified")
                              : x.proficiency}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                {draft.industries.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-[10px] uppercase tracking-wide text-app-muted">
                      {t("upload_industries")}
                    </h4>
                    <p className="text-xs text-app-secondary">
                      {draft.industries
                        .filter((x) => x.name.trim())
                        .map((x) => x.name)
                        .join(" · ")}
                    </p>
                  </div>
                )}
              </section>
            )}
            {(
              [
                "experiences",
                "projects",
                "education",
                "certifications",
              ] as const
            ).map((collection) => {
              const items = draft[collection].filter((item) =>
                Object.values(item).some(
                  (value) => typeof value === "string" && value.trim(),
                ),
              );
              if (!items.length) return null;
              const title =
                collection === "experiences"
                  ? t("consultant_experience")
                  : collection === "projects"
                    ? t("consultant_projects")
                    : collection === "education"
                      ? t("upload_education")
                      : t("upload_certifications");
              return (
                <section
                  key={collection}
                  className="space-y-2 border-b border-app-border pb-4"
                >
                  <h3 className="text-xs font-medium text-app-primary">
                    {title}
                  </h3>
                  {items.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="border-b border-app-border py-2 text-xs last:border-0"
                    >
                      <p className="font-medium text-app-primary">
                        {"company" in item
                          ? `${item.role} · ${item.company}`
                          : "degree" in item
                            ? `${item.degree}${item.school ? ` · ${item.school}` : ""}`
                            : item.name}
                      </p>
                      {"description" in item && item.description && (
                        <p className="mt-1 text-app-secondary">
                          {item.description}
                        </p>
                      )}
                      {"technologies" in item && item.technologies && (
                        <p className="mt-1 text-app-muted">
                          {item.technologies}
                        </p>
                      )}
                    </div>
                  ))}
                </section>
              );
            })}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("experience")}>
                {t("common_previous")}
              </Button>
              <Button
                variant="primary"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? t("consultant_saving") : t("common_save")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
