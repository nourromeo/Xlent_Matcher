import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FileText, Code, Briefcase, GraduationCap, Globe, Edit3, Save, RefreshCw } from "../design-system/icons";
import { useI18n } from "../i18n";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { EditFormModal } from "../components/ui/EditFormModal";
import { FormSection } from "../components/ui/FormSection";
import { FormField } from "../components/ui/FormField";
import { PROFILE } from "../features/consultants";



const LEVEL_BG: Record<string, React.CSSProperties> = {
  Expert:    { color: "var(--color-success)",  background: "var(--color-success-subtle)"  },
  Proficient:{ color: "var(--color-brand)", background: "var(--color-brand-subtle)" },
  Familiar:  { color: "var(--color-text-muted)",  background: "var(--color-surface-raised)"  },
};


const lines = (value: string) => value.split("\\n").map((line) => line.trim()).filter(Boolean);
const parseSkills = (value: string) => lines(value).map((line) => {
  const [name, category = "Skill", yearsUsed = "0", level = "Familiar", ...evidence] = line.split("|").map((part) => part.trim());
  return { name, category, yearsUsed: Number(yearsUsed) || 0, level, evidence: evidence.join(" | ") || "Evidence requires review." };
});
const parseEducation = (value: string) => lines(value).map((line) => {
  const [degree, school = "", year = ""] = line.split("|").map((part) => part.trim());
  return { degree, school, year };
});
const parseExperience = (value: string) => lines(value).map((line) => {
  const [role, company = "", start = "", end = "Present", stack = "", ...achievements] = line.split("|").map((part) => part.trim());
  return { role, company, start, end, stack: stack.split(",").map((item) => item.trim()).filter(Boolean), achievements: achievements.length ? achievements : ["Achievement requires review."] };
});

export default function ConsultantProfile() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"profile" | "original">("profile");
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState(PROFILE);
  const [draft, setDraft] = useState(PROFILE);
  const [draftLists, setDraftLists] = useState({ skills: "", experience: "", education: "", languages: "", industries: "", certifications: "" });
  const [reviewStatus, setReviewStatus] = useState<"Needs Review" | "Verified">("Needs Review");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-app bg-app-surface flex items-start gap-4 flex-none">
        <Link to="/talent" className="text-app-faint hover:text-app-secondary transition-colors mt-0.5"><ChevronLeft size={16} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-app-brand-subtle flex items-center justify-center text-sm font-semibold text-app-brand">{profile.initials}</div>
            <div>
              <h1 className="text-sm font-semibold text-app-primary">
                {profile.name} — {t("cand_blind")}
              </h1>
              <p className="text-xs text-app-muted">{profile.role} · {profile.office} · {profile.totalYearsExperience} {t("cand_exp")}</p>
            </div>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: "var(--color-success)", background: "var(--color-success-subtle)" }}>{profile.availability === "Immediate" ? t("immediate") : profile.availability}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: reviewStatus === "Verified" ? "var(--color-success)" : "var(--color-warning)", background: reviewStatus === "Verified" ? "var(--color-success-subtle)" : "var(--color-warning-subtle)" }}>{reviewStatus}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setDraft(profile); setDraftLists({ skills: profile.skills.map((s) => [s.name, s.category, s.yearsUsed, s.level, s.evidence].join(" | ")).join("\\n"), experience: profile.experience.map((e) => [e.role, e.company, e.start, e.end, e.stack.join(", "), e.achievements.join("; ")].join(" | ")).join("\\n"), education: profile.education.map((e) => [e.degree, e.school, e.year].join(" | ")).join("\\n"), languages: profile.languages.join("\\n"), industries: profile.industries.join("\\n"), certifications: profile.certifications.join("\\n") }); setEditMode(true); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors"
            style={editMode ? { border: "1px solid var(--color-brand)", color: "var(--color-brand)", background: "var(--color-brand-subtle)" } : { border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
            <Edit3 size={12} /> {t("cand_edit")}
          </button>
          {false && (
            <button className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded hover:opacity-80 transition-opacity" style={{ background: "var(--color-brand)" }}>
              <Save size={12} /> {t("cand_save")} <RefreshCw size={10} className="ml-0.5 opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-app px-6 bg-app-surface flex-none">
        {(["profile", "original"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex items-center gap-1.5 text-xs px-1 py-2.5 mr-5 border-b-2 transition-colors"
            style={activeTab === tab ? { borderColor: "var(--color-brand)", color: "var(--color-text-primary)", fontWeight: 500 } : { borderColor: "transparent", color: "var(--color-text-muted)" }}>
            {tab === "profile" ? <Code size={12} /> : <FileText size={12} />}
            {tab === "profile" ? t("cand_parsed") : t("cand_original")}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-app">
        {activeTab === "profile" ? (
          <div className="p-6 grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-semibold text-app-primary">Consultant CV Extraction</p><p className="text-[11px] text-app-muted mt-1">Structured information extracted from the consultant CV for XLENT review.</p></div>
                <span className="text-[10px] text-app-faint">Human review required</span>
              </div>

              {/* Skills */}
              <div className="bg-app-surface border border-app rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
                <div className="px-4 py-3 border-b border-app flex items-center gap-2">
                  <Code size={12} className="text-app-faint" />
                  <span className="text-xs font-medium text-app-primary">{t("cand_skills")}</span>
                </div>
                <div>
                  {profile.skills.map((s, i) => (
                    <div key={s.name} className="px-4 py-3" style={{ borderBottom: i < profile.skills.length - 1 ? "1px solid var(--color-border-app-subtletle)" : "none" }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-none w-28">
                          <p className="text-xs font-medium text-app-primary font-mono">{s.name}</p>
                          <p className="text-[10px] text-app-faint mt-0.5">{s.category}</p>
                        </div>
                        <div className="flex-none flex items-center gap-3">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={LEVEL_BG[s.level] ?? LEVEL_BG.Familiar}>{s.level}</span>
                          <span className="text-[10px] font-mono text-app-muted">{s.yearsUsed}y</span>
                        </div>
                        <p className="flex-1 text-[11px] text-app-muted italic leading-relaxed">"{s.evidence}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="bg-app-surface border border-app rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
                <div className="px-4 py-3 border-b border-app flex items-center gap-2">
                  <Briefcase size={12} className="text-app-faint" />
                  <span className="text-xs font-medium text-app-primary">{t("cand_experience")}</span>
                </div>
                {profile.experience.map((e, i) => (
                  <div key={i} className="px-4 py-3 space-y-2" style={{ borderBottom: i < profile.experience.length - 1 ? "1px solid var(--color-border-app-subtletle)" : "none" }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-app-primary">{e.role}</p>
                        <p className="text-[11px] text-app-muted">{e.company}</p>
                      </div>
                      <span className="text-[10px] font-mono text-app-faint">{e.start} – {e.end}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {e.stack.map((s) => (
                        <span key={s} className="text-[10px] text-app-secondary px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>{s}</span>
                      ))}
                    </div>
                    <ul className="space-y-0.5">
                      {e.achievements.map((a, j) => (
                        <li key={j} className="text-[11px] text-app-muted flex gap-2">
                          <span className="text-app-faint flex-none">–</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-app-surface border border-app rounded-lg p-4 space-y-3" style={{ boxShadow: "var(--shadow-surface)" }}>
                <div className="flex items-center gap-2 mb-1"><GraduationCap size={12} className="text-app-faint" /><span className="text-xs font-medium text-app-primary">{t("cand_education")}</span></div>
                {profile.education.map((e, i) => (
                  <div key={i}><p className="text-xs text-app-primary">{e.degree}</p><p className="text-[11px] text-app-muted">{e.school} · {e.year}</p></div>
                ))}
              </div>
              <div className="bg-app-surface border border-app rounded-lg p-4" style={{ boxShadow: "var(--shadow-surface)" }}>
                <div className="flex items-center gap-2 mb-3"><Globe size={12} className="text-app-faint" /><span className="text-xs font-medium text-app-primary">{t("cand_languages")}</span></div>
                <div className="space-y-1.5">{profile.languages.map((l) => <p key={l} className="text-[11px] text-app-secondary">{l}</p>)}</div>
              </div>
              <div className="bg-app-surface border border-app rounded-lg p-4" style={{ boxShadow: "var(--shadow-surface)" }}>
                <p className="text-xs font-medium text-app-primary mb-3">{t("cand_industries")}</p>
                <div className="flex flex-wrap gap-1.5">{profile.industries.map((industry) => <span key={industry} className="text-[10px] text-app-secondary px-1.5 py-0.5 rounded" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>{industry}</span>)}</div>
              </div>
              <div className="bg-app-surface border border-app rounded-lg p-4" style={{ boxShadow: "var(--shadow-surface)" }}>
                <p className="text-xs font-medium text-app-primary mb-3">{t("cand_certifications")}</p>
                <div className="space-y-1.5">{profile.certifications.map((certification) => <p key={certification} className="text-[11px] text-app-secondary">{certification}</p>)}</div>
              </div>
              <div className="bg-app-surface border border-app rounded-lg p-4" style={{ boxShadow: "var(--shadow-surface)" }}>
                <details className="group"><summary className="cursor-pointer list-none text-[10px] text-app-faint uppercase tracking-wider font-medium flex items-center justify-between"><span>Extraction Details</span><span className="text-[10px] text-app-muted group-open:rotate-180 transition-transform">⌄</span></summary><div className="space-y-2 text-[11px] mt-3">
                  {[["Parser model", "gpt-4o"], ["Prompt version", "v2.3"], ["Embedding", "text-embedding-3-large"], ["Parse cost", "$0.032"], ["Tokens", "4,821"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-app-muted">{k}</span><span className="font-mono text-app-secondary">{v}</span></div>
                  ))}
                </div></details>
              </div>
              <div className="bg-app-surface border border-app rounded-lg p-4" style={{ boxShadow: "var(--shadow-surface)" }}>
                <p className="text-xs font-medium text-app-primary mb-2">Extraction Review</p>
                <p className="text-[11px] text-app-muted mb-3">Review extracted fields before using this consultant in matching.</p>
                <div className="flex items-center justify-between text-[11px] mb-3"><span className="text-app-muted">Status</span><span className="text-app-secondary">{reviewStatus}</span></div>
                <button onClick={() => setReviewStatus("Verified")} className="w-full text-xs px-3 py-1.5 rounded border transition-colors" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>{reviewStatus === "Verified" ? "Verified" : "Mark as Reviewed"}</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 h-full">
            <div className="bg-app-surface border border-app rounded-lg h-[600px] flex items-center justify-center" style={{ boxShadow: "var(--shadow-surface)" }}>
              <div className="text-center">
                <FileText size={32} className="text-app-faint mx-auto mb-3" />
                <p className="text-sm text-app-faint">Original consultant CV</p>
                <p className="text-xs text-app-faint mt-1">PDF/DOCX preview for the XLENT consultant profile</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <EditFormModal
        open={editMode}
        title="Edit Extracted Consultant Profile"
        description="Correct the structured information extracted from the consultant CV."
        onClose={() => setEditMode(false)}
        onSubmit={() => { setProfile({ ...draft, skills: parseSkills(draftLists.skills), experience: parseExperience(draftLists.experience), education: parseEducation(draftLists.education), languages: lines(draftLists.languages), industries: lines(draftLists.industries), certifications: lines(draftLists.certifications) }); setEditMode(false); }}
      >
        <FormSection title="Basic Information">
          <div className="grid grid-cols-2 gap-3">
            {[["Full name", "name"], ["Headline", "headline"], ["Role", "role"], ["Seniority", "seniority"], ["Availability", "availability"], ["Office / Location", "office"]].map(([label, key]) => (
              <FormField key={key} label={label}><Input value={draft[key as keyof typeof draft] as string} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></FormField>
            ))}
            <FormField label="Years of experience"><Input type="number" value={draft.totalYearsExperience} onChange={(event) => setDraft({ ...draft, totalYearsExperience: Number(event.target.value) })} /></FormField>
          </div>
        </FormSection>
        <FormSection title="Skills & Evidence" description="One skill per line: Name | Category | Years | Level | Evidence">
          <Textarea value={draftLists.skills} onChange={(event) => setDraftLists({ ...draftLists, skills: event.target.value })} rows={6} className="font-mono" />
        </FormSection>
        <FormSection title="Previous Projects" description="One project per line: Role | Company | Start | End | Technologies | Achievement">
          <Textarea value={draftLists.experience} onChange={(event) => setDraftLists({ ...draftLists, experience: event.target.value })} rows={5} className="font-mono" />
        </FormSection>
        <div className="grid grid-cols-2 gap-4">
          <FormSection title="Education" description="Degree | Institution | Year"><Textarea value={draftLists.education} onChange={(event) => setDraftLists({ ...draftLists, education: event.target.value })} rows={3} className="font-mono" /></FormSection>
          <FormSection title="Languages" description="One language per line"><Textarea value={draftLists.languages} onChange={(event) => setDraftLists({ ...draftLists, languages: event.target.value })} rows={3} /></FormSection>
          <FormSection title="Industries" description="One industry per line"><Textarea value={draftLists.industries} onChange={(event) => setDraftLists({ ...draftLists, industries: event.target.value })} rows={3} /></FormSection>
          <FormSection title="Certifications" description="One certification per line"><Textarea value={draftLists.certifications} onChange={(event) => setDraftLists({ ...draftLists, certifications: event.target.value })} rows={3} /></FormSection>
        </div>
      </EditFormModal>

    </div>
  );
}
