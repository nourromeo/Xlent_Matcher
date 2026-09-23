import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, FileText, Code, Briefcase, GraduationCap, Globe, Edit3 } from "../design-system/icons";
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

const fullName = (consultant: Consultant) =>
  consultant.fullName?.trim() || `${consultant.firstName} ${consultant.lastName}`.trim();

const initials = (consultant: Consultant) =>
  [consultant.firstName, consultant.lastName]
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

const skillsToText = (skills: ConsultantSkill[]) =>
  skills
    .map((skill) => [skill.name, skill.category ?? "", skill.years, skill.level, skill.evidence ?? ""].join(" | "))
    .join("\n");

const parseSkills = (value: string, consultantId: number): ConsultantSkill[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, category = "", years = "0", level = "0", ...evidence] =
        line.split("|").map((part) => part.trim());

      return {
        id: 0,
        consultantId,
        name,
        category: category || null,
        years: Number(years) || 0,
        level: Number(level) || 0,
        evidence: evidence.join(" | ") || null,
      };
    });

export default function ConsultantDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const consultantId = Number(id);

  const [activeTab, setActiveTab] = useState<"profile" | "original">("profile");
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [draft, setDraft] = useState<Consultant | null>(null);
  const [skillsText, setSkillsText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isInteger(consultantId) || consultantId <= 0) {
      setError("Invalid consultant id.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    consultantsApi
      .getById(consultantId)
      .then((data) => {
        if (!cancelled) setConsultant(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Could not load consultant.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [consultantId]);

  const technologiesByExperience = useMemo(() => {
    if (!consultant) return new Map<string, string[]>();

    const technologies = consultant.projects
      .flatMap((project) => (project.technologies ?? "").split(","))
      .map((technology) => technology.trim())
      .filter(Boolean);

    return new Map(consultant.experiences.map((experience) => [experience.company + experience.role, technologies]));
  }, [consultant]);

  const openEdit = () => {
    if (!consultant) return;
    setDraft(structuredClone(consultant));
    setSkillsText(skillsToText(consultant.skills));
    setEditMode(true);
  };

  const save = async () => {
    if (!draft) return;

    setSaving(true);
    setError("");

    try {
      const payload: Consultant = {
        ...draft,
        skills: parseSkills(skillsText, draft.id),
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
    return <div className="p-6 text-sm text-app-muted">Loading consultant...</div>;
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
                {consultant.title || "Consultant"} · {consultant.office || "—"} · {consultant.yearsOfExperience} {t("consultant_years_experience")}
              </p>
            </div>

            {consultant.availability && (
              <span
                className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ color: "var(--color-success)", background: "var(--color-success-subtle)" }}
              >
                {consultant.availability === "Immediate" ? t("immediate") : consultant.availability}
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

      <div className="flex border-b border-app px-6 bg-app-surface flex-none">
        {(["profile", "original"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex items-center gap-1.5 text-xs px-1 py-2.5 mr-5 border-b-2 transition-colors"
            style={activeTab === tab
              ? { borderColor: "var(--color-brand)", color: "var(--color-text-primary)", fontWeight: 500 }
              : { borderColor: "transparent", color: "var(--color-text-muted)" }}
          >
            {tab === "profile" ? <Code size={12} /> : <FileText size={12} />}
            {tab === "profile" ? t("consultant_extracted_profile") : t("consultant_original_cv")}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-app">
        {activeTab === "profile" ? (
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
                  <span className="text-xs font-medium text-app-primary">{t("consultant_projects")}</span>
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

                    {(technologiesByExperience.get(experience.company + experience.role) ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(technologiesByExperience.get(experience.company + experience.role) ?? []).map((technology) => (
                          <span
                            key={technology}
                            className="text-[10px] text-app-secondary px-1.5 py-0.5 rounded font-mono"
                            style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                          >
                            {technology}
                          </span>
                        ))}
                      </div>
                    )}

                    {experience.description && (
                      <p className="text-[11px] text-app-muted leading-relaxed">{experience.description}</p>
                    )}
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
                        {language.name}{language.level ? ` (${language.level})` : ""}
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
        ) : (
          <div className="p-6 h-full">
            <div className="bg-app-surface border border-app rounded-lg min-h-[500px] p-5 shadow-app-surface">
              {consultant.originalCvText ? (
                <pre className="text-xs text-app-secondary whitespace-pre-wrap font-sans leading-relaxed">
                  {consultant.originalCvText}
                </pre>
              ) : (
                <div className="h-[450px] flex items-center justify-center text-center">
                  <div>
                    <FileText size={32} className="text-app-faint mx-auto mb-3" />
                    <p className="text-sm text-app-faint">{t("consultant_original_cv_title")}</p>
                    <p className="text-xs text-app-faint mt-1">{t("consultant_original_cv_sub")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {draft && (
        <EditFormModal
          open={editMode}
          title={t("consultant_edit_title")}
          description={t("consultant_edit_sub")}
          onClose={() => setEditMode(false)}
          onSubmit={save}
        >
          <FormSection title={t("consultant_basic_info")}>
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
                <Input value={draft.seniority ?? ""} onChange={(event) => setDraft({ ...draft, seniority: event.target.value || null })} />
              </FormField>
              <FormField label={t("consultant_availability")}>
                <Input value={draft.availability ?? ""} onChange={(event) => setDraft({ ...draft, availability: event.target.value || null })} />
              </FormField>
              <FormField label={t("consultant_office")}>
                <Input value={draft.office ?? ""} onChange={(event) => setDraft({ ...draft, office: event.target.value || null })} />
              </FormField>
              <FormField label={t("consultant_years")}>
                <Input
                  type="number"
                  value={draft.yearsOfExperience}
                  onChange={(event) => setDraft({ ...draft, yearsOfExperience: Number(event.target.value) || 0 })}
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

          <FormSection title={t("consultant_skills")} description="Name | Category | Years | Level 1-5 | Evidence">
            <Textarea
              value={skillsText}
              onChange={(event) => setSkillsText(event.target.value)}
              rows={7}
              className="font-mono"
            />
          </FormSection>

          {saving && <p className="text-xs text-app-muted">Saving...</p>}
        </EditFormModal>
      )}
    </div>
  );
}
