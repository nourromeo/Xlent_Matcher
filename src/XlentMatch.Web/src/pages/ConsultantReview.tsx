import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { useI18n } from "../i18n";
import { consultantsApi } from "../services/consultantsApi";
import { cvUploadsApi } from "../services/cvUploadsApi";
import type { ConsultantDraft } from "../services/aiApi";
import type { Consultant } from "../types";

const storageKey = (id: string | null) => `xlent-cv-review-${id ?? "unknown"}`;
const dateOnly = (value: string | null) => {
  const normalized = value?.trim() || null;
  if (!normalized) return null;
  if (/^\d{4}-\d{2}$/.test(normalized)) return `${normalized}-01`;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
};

function toConsultant(draft: ConsultantDraft): Consultant {
  return {
    id: 0,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email?.trim() || null,
    title: draft.title?.trim() || null,
    summary: draft.summary?.trim() || null,
    seniority: draft.seniority?.trim() || null,
    yearsOfExperience: draft.yearsOfExperience,
    yearsOfExperienceSource: draft.yearsOfExperienceSource,
    availableAgainDate: null,
    availability: "Available",
    office: draft.office?.trim() || null,
    originalCvText: null,
    skills: draft.skills
      .filter((x) => x.name.trim())
      .map((x) => ({
        id: 0,
        consultantId: 0,
        name: x.name.trim(),
        category: null,
        years: x.years,
        level: x.level,
        evidence: x.evidence?.trim() || null,
      })),
    languages: draft.languages
      .filter((x) => x.name.trim())
      .map((x) => ({
        id: 0,
        consultantId: 0,
        name: x.name.trim(),
        proficiency: x.proficiency,
      })),
    industries: draft.industries
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ id: 0, consultantId: 0, name })),
    experiences: draft.experiences
      .filter((x) => x.company.trim() || x.role.trim())
      .map((x) => ({
        id: 0,
        consultantId: 0,
        company: x.company.trim(),
        role: x.role.trim(),
        description: x.description?.trim() || null,
        startDate: dateOnly(x.startDate),
        endDate: dateOnly(x.endDate),
      })),
    projects: draft.projects
      .filter((x) => x.name.trim())
      .map((x) => ({
        id: 0,
        consultantId: 0,
        name: x.name.trim(),
        description: x.description?.trim() || null,
        technologies: x.technologies?.trim() || null,
      })),
    education: draft.education
      .filter((x) => x.degree.trim())
      .map((x) => ({
        id: 0,
        consultantId: 0,
        degree: x.degree.trim(),
        school: x.school?.trim() || null,
        year: x.year?.trim() || null,
      })),
    certifications: draft.certifications
      .filter((x) => x.name.trim())
      .map((x) => ({
        id: 0,
        consultantId: 0,
        name: x.name.trim(),
        issuer: x.issuer?.trim() || null,
        issuedDate: dateOnly(x.issuedDate),
      })),
  };
}

export default function ConsultantReview() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uploadId = params.get("uploadId");
  const [draft, setDraft] = useState<ConsultantDraft | null>(null);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(uploadId));
      if (stored) setDraft(JSON.parse(stored) as ConsultantDraft);
    } catch {
      setError(t("upload_load_error"));
    }
  }, [uploadId, t]);
  useEffect(() => {
    if (draft)
      localStorage.setItem(storageKey(uploadId), JSON.stringify(draft));
  }, [draft, uploadId]);
  const update = (patch: Partial<ConsultantDraft>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));
  const level = (value: number) =>
    value >= 5
      ? t("consultant_level_expert")
      : value >= 3
        ? t("consultant_level_proficient")
        : value > 0
          ? t("consultant_level_familiar")
          : t("common_not_specified");
  const field = (label: string, control: React.ReactNode) => (
    <div className="space-y-1">
      <label className="block text-[11px] text-app-muted">{label}</label>
      {control}
    </div>
  );
  const empty = !draft;
  const save = async () => {
    if (!draft || !draft.firstName.trim() || !draft.lastName.trim()) {
      setError(t("upload_required_names"));
      setStep(0);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await consultantsApi.create(
        toConsultant(draft),
        uploadId ? Number(uploadId) : undefined,
      );
      if (uploadId)
        await cvUploadsApi.update(Number(uploadId), {
          status: "Indexed",
          consultantId: saved.id,
          errorMessage: null,
          draftJson: JSON.stringify(draft),
        });
      localStorage.removeItem(storageKey(uploadId));
      navigate(`/consultants/${saved.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("upload_save_error"),
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = <K extends keyof ConsultantDraft>(key: K, index: number) => {
    if (!draft) return;
    update({
      [key]: (draft[key] as unknown[]).filter((_, i) => i !== index),
    } as Partial<ConsultantDraft>);
    setEditing(null);
  };
  const profileEditor = (
    collection: "experiences" | "projects" | "education" | "certifications",
    index: number,
  ) => {
    if (!draft) return null;
    const item = draft[collection][index] as Record<string, string | null>;
    const setField = (name: string, value: string) =>
      update({
        [collection]: draft[collection].map((row, i) =>
          i === index ? { ...row, [name]: value || null } : row,
        ),
      } as Partial<ConsultantDraft>);
    const title =
      collection === "experiences"
        ? t("upload_add_experience")
        : collection === "projects"
          ? t("upload_projects")
          : collection === "education"
            ? t("upload_education")
            : t("upload_certification");
    const input = (label: string, name: string, type = "text") =>
      field(
        label,
        <Input
          type={type}
          value={item[name] ?? ""}
          onChange={(e) => setField(name, e.target.value)}
        />,
      );
    return (
      <div className="space-y-3 rounded-lg border border-app-brand bg-app-raised p-4">
        <h4 className="text-xs font-medium text-app-primary">{title}</h4>
        <div className="grid gap-3 md:grid-cols-2">
          {collection === "experiences" && (
            <>
              {input(t("upload_role"), "role")}
              {input(t("consultant_company"), "company")}
              {input(t("upload_start_date"), "startDate", "month")}
              {input(t("upload_end_date"), "endDate", "month")}
              {field(
                t("consultant_description"),
                <Textarea
                  rows={3}
                  value={item.description ?? ""}
                  onChange={(e) => setField("description", e.target.value)}
                />,
              )}
            </>
          )}
          {collection === "projects" && (
            <>
              {input(t("upload_project_name"), "name")}
              {input(t("upload_technologies"), "technologies")}
              {field(
                t("consultant_description"),
                <Textarea
                  rows={3}
                  value={item.description ?? ""}
                  onChange={(e) => setField("description", e.target.value)}
                />,
              )}
            </>
          )}
          {collection === "education" && (
            <>
              {input(t("upload_degree"), "degree")}
              {input(t("consultant_school"), "school")}
              {input(t("upload_year"), "year")}
            </>
          )}
          {collection === "certifications" && (
            <>
              {input(t("upload_certification"), "name")}
              {input(t("upload_issuer"), "issuer")}
              {input(t("upload_issued_date"), "issuedDate", "month")}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditing(null)}>
            {t("consultant_save_changes")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const blank = Object.values(item).every(
                (value) =>
                  value === null || value === undefined || value === "",
              );
              if (blank) remove(collection, index);
              else setEditing(null);
            }}
          >
            {t("common_cancel")}
          </Button>
        </div>
      </div>
    );
  };
  const languageEditor = (index: number) => {
    if (!draft) return null;
    const item = draft.languages[index];
    const set = (patch: Partial<typeof item>) =>
      update({
        languages: draft.languages.map((row, i) =>
          i === index ? { ...row, ...patch } : row,
        ),
      });
    return (
      <div className="space-y-3 rounded-lg border border-app-brand bg-app-raised p-4">
        <h4 className="text-xs font-medium text-app-primary">
          {t("consultant_edit_language")}
        </h4>
        <div className="grid gap-3 md:grid-cols-2">
          {field(
            t("consultant_language"),
            <Input
              autoFocus
              value={item.name}
              onChange={(e) => set({ name: e.target.value })}
            />,
          )}
          {field(
            t("upload_language_proficiency"),
            <select
              value={item.proficiency}
              onChange={(e) =>
                set({ proficiency: e.target.value as typeof item.proficiency })
              }
              className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"
            >
              <option value="Not specified">{t("common_not_specified")}</option>
              <option value="Low">{t("proficiency_low")}</option>
              <option value="Medium">{t("proficiency_medium")}</option>
              <option value="High">{t("proficiency_high")}</option>
              <option value="Native">{t("proficiency_native")}</option>
            </select>,
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditing(null)}>
            {t("consultant_save_changes")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (!item.name.trim()) remove("languages", index);
              else setEditing(null);
            }}
          >
            {t("common_cancel")}
          </Button>
        </div>
      </div>
    );
  };
  const industryEditor = (index: number) => {
    if (!draft) return null;
    return (
      <div className="space-y-3 rounded-lg border border-app-brand bg-app-raised p-4">
        <h4 className="text-xs font-medium text-app-primary">
          {t("consultant_edit_industry")}
        </h4>
        {field(
          t("consultant_industry_label"),
          <Input
            autoFocus
            value={draft.industries[index]}
            onChange={(e) =>
              update({
                industries: draft.industries.map((row, i) =>
                  i === index ? e.target.value : row,
                ),
              })
            }
          />,
        )}
        <div className="flex gap-2">
          <Button onClick={() => setEditing(null)}>
            {t("consultant_save_changes")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (!draft.industries[index].trim()) remove("industries", index);
              else setEditing(null);
            }}
          >
            {t("common_cancel")}
          </Button>
        </div>
      </div>
    );
  };
  const steps = [
    t("consultant_basic_info"),
    t("consultant_skills"),
    t("consultant_experience"),
    t("assignment_edit_step_review"),
  ];
  if (empty)
    return (
      <div className="p-6 text-sm text-app-secondary">
        {error || t("upload_load_error")}
      </div>
    );
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <PageHeader
          title={t("upload_review_title")}
          description={t("upload_review_description")}
          backTo="/cv-upload"
          actions={
            <Button variant="ghost" onClick={() => navigate("/cv-upload")}>
              {t("common_cancel")}
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((label, index) => (
            <button
              type="button"
              key={label}
              onClick={() => setStep(index)}
              className={`rounded-lg border px-3 py-2 text-left text-xs ${step === index ? "border-app-brand bg-app-brand-soft text-app-primary" : "border-app text-app-muted"}`}
            >
              <span className="font-semibold">{index + 1}</span>
              <span className="ml-2">{label}</span>
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
          {step === 0 && (
            <>
              <h2 className="text-sm font-medium text-app-primary">
                {t("consultant_basic_info")}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {field(
                  t("upload_first_name"),
                  <Input
                    value={draft.firstName}
                    onChange={(e) => update({ firstName: e.target.value })}
                  />,
                )}
                {field(
                  t("upload_last_name"),
                  <Input
                    value={draft.lastName}
                    onChange={(e) => update({ lastName: e.target.value })}
                  />,
                )}
                {field(
                  t("upload_job_title"),
                  <Input
                    value={draft.title ?? ""}
                    onChange={(e) => update({ title: e.target.value || null })}
                  />,
                )}
                {field(
                  t("consultant_seniority_label"),
                  <select
                    value={draft.seniority ?? ""}
                    onChange={(e) =>
                      update({ seniority: e.target.value || null })
                    }
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
                  t("consultant_total_experience"),
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={draft.yearsOfExperience ?? ""}
                      onChange={(e) =>
                        update({
                          yearsOfExperience: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    />
                    <span className="text-xs text-app-muted">
                      {t("consultant_year_count")}
                    </span>
                  </div>,
                )}
                {field(
                  t("upload_email"),
                  <Input
                    type="email"
                    value={draft.email ?? ""}
                    onChange={(e) => update({ email: e.target.value || null })}
                  />,
                )}
                {field(
                  t("consultant_office"),
                  <Input
                    value={draft.office ?? ""}
                    onChange={(e) => update({ office: e.target.value || null })}
                  />,
                )}
              </div>
              {field(
                t("consultant_summary"),
                <Textarea
                  rows={5}
                  value={draft.summary ?? ""}
                  onChange={(e) => update({ summary: e.target.value || null })}
                />,
              )}
            </>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-sm font-medium text-app-primary">
                {t("consultant_skills")}
              </h2>
              <section className="space-y-2">
                <div className="hidden grid-cols-[1fr_110px_150px_auto] gap-2 px-3 text-[10px] text-app-muted md:grid">
                  <span>{t("consultant_skill")}</span>
                  <span>{t("consultant_skill_experience")}</span>
                  <span>{t("consultant_skill_level")}</span>
                  <span>{t("common_actions")}</span>
                </div>
                {draft.skills.map((item, index) => {
                  const key = `skill-${index}`;
                  return editing === key ? (
                    <div
                      key={key}
                      className="space-y-3 rounded-lg border border-app-brand bg-app-raised p-4"
                    >
                      <h3 className="text-xs font-medium text-app-primary">
                        {t("consultant_edit_skill")}
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {field(
                          t("consultant_skill"),
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              update({
                                skills: draft.skills.map((x, i) =>
                                  i === index
                                    ? { ...x, name: e.target.value }
                                    : x,
                                ),
                              })
                            }
                          />,
                        )}
                        {field(
                          t("consultant_skill_experience"),
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={item.years}
                              onChange={(e) =>
                                update({
                                  skills: draft.skills.map((x, i) =>
                                    i === index
                                      ? {
                                          ...x,
                                          years: Number(e.target.value) || 0,
                                        }
                                      : x,
                                  ),
                                })
                              }
                            />
                            <span className="self-center text-xs text-app-muted">
                              {t("consultant_year_count")}
                            </span>
                          </div>,
                        )}
                        {field(
                          t("consultant_skill_level"),
                          <select
                            value={item.level}
                            onChange={(e) =>
                              update({
                                skills: draft.skills.map((x, i) =>
                                  i === index
                                    ? { ...x, level: Number(e.target.value) }
                                    : x,
                                ),
                              })
                            }
                            className="w-full rounded border border-app bg-app px-3 py-2 text-xs text-app-primary"
                          >
                            {[0, 1, 2, 3, 4, 5].map((value) => (
                              <option key={value} value={value}>
                                {value === 0
                                  ? t("common_not_specified")
                                  : `${level(value)} (${value}/5)`}
                              </option>
                            ))}
                          </select>,
                        )}
                        {field(
                          t("consultant_evidence_label"),
                          <Textarea
                            rows={3}
                            value={item.evidence ?? ""}
                            onChange={(e) =>
                              update({
                                skills: draft.skills.map((x, i) =>
                                  i === index
                                    ? { ...x, evidence: e.target.value || null }
                                    : x,
                                ),
                              })
                            }
                          />,
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setEditing(null)}>
                          {t("consultant_save_changes")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditing(null)}
                        >
                          {t("common_cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={key}
                      className="grid gap-2 rounded-lg border border-app bg-app-raised p-3 md:grid-cols-[1fr_110px_150px_auto]"
                    >
                      <span className="text-sm text-app-primary">
                        {item.name || t("common_not_specified")}
                      </span>
                      <span className="text-xs text-app-muted">
                        {item.years} {t("consultant_year_count")}
                      </span>
                      <span className="text-xs text-app-muted">
                        {level(item.level)} ({item.level}/5)
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-app-brand"
                          onClick={() => setEditing(key)}
                        >
                          {t("consultant_edit")}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-app-danger"
                          onClick={() => remove("skills", index)}
                        >
                          {t("common_remove")}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-app-brand"
                  onClick={() => {
                    update({
                      skills: [
                        ...draft.skills,
                        { name: "", level: 0, years: 0, evidence: null },
                      ],
                    });
                    setEditing(`skill-${draft.skills.length}`);
                  }}
                >
                  <Plus size={13} />
                  {t("consultant_add_skill")}
                </button>
              </section>
              <section className="space-y-2">
                <h3 className="text-xs font-medium text-app-primary">
                  {t("consultant_languages")}
                </h3>
                {draft.languages.map((item, index) =>
                  editing === `language-${index}` ? (
                    <div key={index}>{languageEditor(index)}</div>
                  ) : (
                    <div
                      key={index}
                      className="grid gap-2 rounded-lg border border-app bg-app-raised p-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <span className="text-sm text-app-primary">
                        {item.name}
                      </span>
                      <span className="text-xs text-app-muted">
                        {item.proficiency === "Not specified"
                          ? t("common_not_specified")
                          : t(
                              `proficiency_${item.proficiency.toLowerCase()}` as never,
                            )}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-app-brand"
                          onClick={() => setEditing(`language-${index}`)}
                        >
                          {t("consultant_edit")}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-app-danger"
                          onClick={() => remove("languages", index)}
                        >
                          {t("common_remove")}
                        </button>
                      </div>
                    </div>
                  ),
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-app-brand"
                  onClick={() => {
                    update({
                      languages: [
                        ...draft.languages,
                        { name: "", proficiency: "Not specified" },
                      ],
                    });
                    setEditing(`language-${draft.languages.length}`);
                  }}
                >
                  <Plus size={13} />
                  {t("consultant_add_language")}
                </button>
              </section>
              <section className="space-y-2">
                <h3 className="text-xs font-medium text-app-primary">
                  {t("upload_industries")}
                </h3>
                <div className="space-y-2">
                  {draft.industries.map((item, index) =>
                    editing === `industry-${index}` ? (
                      <div key={index}>{industryEditor(index)}</div>
                    ) : item.trim() ? (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-app bg-app-raised px-3 py-2"
                      >
                        <span className="text-xs text-app-secondary">
                          {item}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-app-brand"
                            onClick={() => setEditing(`industry-${index}`)}
                          >
                            {t("consultant_edit")}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-app-danger"
                            onClick={() => remove("industries", index)}
                          >
                            {t("common_remove")}
                          </button>
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-app-brand"
                  onClick={() => {
                    update({ industries: [...draft.industries, ""] });
                    setEditing(`industry-${draft.industries.length}`);
                  }}
                >
                  <Plus size={13} />
                  {t("consultant_add_industry")}
                </button>
              </section>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-sm font-medium text-app-primary">
                {t("consultant_experience")}
              </h2>
              {(
                [
                  "experiences",
                  "projects",
                  "education",
                  "certifications",
                ] as const
              ).map((key) => (
                <section key={key} className="space-y-2">
                  <h3 className="text-xs font-medium text-app-primary">
                    {key === "experiences"
                      ? t("consultant_experience")
                      : key === "projects"
                        ? t("consultant_projects")
                        : key === "education"
                          ? t("upload_education")
                          : t("upload_certifications")}
                  </h3>
                  {draft[key].map((item, index) => {
                    const editKey = `${key}-${index}`;
                    if (editing === editKey) {
                      return <div key={index}>{profileEditor(key, index)}</div>;
                    }
                    return (
                      <div
                        key={index}
                        className="rounded-lg border border-app bg-app-raised p-3"
                      >
                        <p className="text-sm text-app-primary">
                          {"company" in item
                            ? `${item.role} · ${item.company}`
                            : "degree" in item
                              ? `${item.degree}${item.school ? ` · ${item.school}` : ""}`
                              : item.name}
                        </p>
                        {"description" in item && item.description && (
                          <p className="mt-1 text-xs text-app-secondary">
                            {item.description}
                          </p>
                        )}
                        {"technologies" in item && item.technologies && (
                          <p className="mt-1 text-xs text-app-muted">
                            {item.technologies}
                          </p>
                        )}
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-app-brand"
                            onClick={() => setEditing(editKey)}
                          >
                            {t("consultant_edit")}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-app-danger"
                            onClick={() => remove(key, index)}
                          >
                            {t("common_remove")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-app-brand"
                    onClick={() => {
                      const empty =
                        key === "experiences"
                          ? {
                              company: "",
                              role: "",
                              description: null,
                              startDate: null,
                              endDate: null,
                            }
                          : key === "projects"
                            ? {
                                name: "",
                                description: null,
                                technologies: null,
                              }
                            : key === "education"
                              ? { degree: "", school: null, year: null }
                              : { name: "", issuer: null, issuedDate: null };
                      update({
                        [key]: [...draft[key], empty],
                      } as Partial<ConsultantDraft>);
                      setEditing(`${key}-${draft[key].length}`);
                    }}
                  >
                    <Plus size={13} />
                    {t("common_add")}{" "}
                    {key === "experiences"
                      ? t("upload_add_experience")
                      : key === "projects"
                        ? t("upload_projects")
                        : key === "education"
                          ? t("upload_education")
                          : t("upload_certification")}
                  </button>
                </section>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-sm font-medium text-app-primary">
                {t("assignment_edit_step_review")}
              </h2>
              <section className="space-y-3 border-b border-app pb-4">
                <h3 className="text-xs font-medium text-app-primary">
                  {t("consultant_review_basic")}
                </h3>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-[10px] text-app-muted">
                      {t("consultant_full_name")}
                    </p>
                    <p>
                      {draft.firstName} {draft.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-app-muted">
                      {t("consultant_role")}
                    </p>
                    <p>{draft.title || t("common_not_specified")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-app-muted">
                      {t("consultant_seniority")}
                    </p>
                    <p>{draft.seniority || t("common_not_specified")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-app-muted">
                      {t("consultant_total_experience")}
                    </p>
                    <p>
                      {draft.yearsOfExperience == null
                        ? t("common_not_specified")
                        : `${draft.yearsOfExperience} ${t("consultant_year_count")}`}
                    </p>
                  </div>
                </div>
              </section>
              {draft.summary?.trim() && (
                <section className="space-y-2 border-b border-app pb-4">
                  <h3 className="text-xs font-medium text-app-primary">
                    {t("consultant_review_summary")}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-app-secondary">
                    {draft.summary}
                  </p>
                </section>
              )}
              {draft.skills.length > 0 && (
                <section className="space-y-2 border-b border-app pb-4">
                  <h3 className="text-xs font-medium text-app-primary">
                    {t("consultant_skills")}
                  </h3>
                  {draft.skills
                    .filter((x) => x.name.trim())
                    .map((x, index) => (
                      <div
                        key={index}
                        className="grid gap-2 border-b border-app py-2 text-xs md:grid-cols-[1fr_110px_150px]"
                      >
                        <span>{x.name}</span>
                        <span>
                          {x.years} {t("consultant_year_count")}
                        </span>
                        <span>
                          {level(x.level)} ({x.level}/5)
                        </span>
                      </div>
                    ))}
                </section>
              )}
              {draft.languages.length > 0 && (
                <section className="space-y-2 border-b border-app pb-4">
                  <h3 className="text-xs font-medium text-app-primary">
                    {t("consultant_languages")}
                  </h3>
                  {draft.languages
                    .filter((x) => x.name.trim())
                    .map((x, index) => (
                      <div
                        key={index}
                        className="flex justify-between border-b border-app py-2 text-xs"
                      >
                        <span>{x.name}</span>
                        <span>
                          {x.proficiency === "Not specified"
                            ? t("common_not_specified")
                            : t(
                                `proficiency_${x.proficiency.toLowerCase()}` as never,
                              )}
                        </span>
                      </div>
                    ))}
                </section>
              )}
            </div>
          )}
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() =>
                step > 0 ? setStep(step - 1) : navigate("/cv-upload")
              }
            >
              {step > 0 ? t("common_back") : t("common_cancel")}
            </Button>
            {step < 3 ? (
              <Button variant="primary" onClick={() => setStep(step + 1)}>
                {t("common_next")}
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? t("common_saving") : t("upload_approve_save")}
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
