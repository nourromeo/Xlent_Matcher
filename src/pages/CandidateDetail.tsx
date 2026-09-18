import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FileText, Code, Briefcase, GraduationCap, Globe, Edit3, Save, RefreshCw } from "lucide-react";
import { useI18n } from "../i18n";

const PROFILE = {
  id: "1", initials: "AK", name: "Anna Kovacs", role: "Senior Backend Consultant", office: "XLENT Stockholm", headline: "Backend architecture and distributed systems",
  totalYearsExperience: 8, seniority: "Senior", availability: "Immediate",
  skills: [
    { name: "Go", category: "Language", yearsUsed: 5, level: "Expert", evidence: "Led rewrite of order-processing microservices in Go at Zalando (2021–2023)." },
    { name: "Rust", category: "Language", yearsUsed: 2, level: "Proficient", evidence: "Built low-latency serialization layer for trading system at FinCo (2023–2024)." },
    { name: "PostgreSQL", category: "Database", yearsUsed: 7, level: "Expert", evidence: "Designed sharding strategy for 2TB dataset; tuned indexes at Schibsted (2019–2021)." },
    { name: "Kafka", category: "Messaging", yearsUsed: 4, level: "Proficient", evidence: "Architected event streaming backbone handling 200k msg/s at Zalando." },
    { name: "Kubernetes", category: "Infrastructure", yearsUsed: 4, level: "Proficient", evidence: "Managed production clusters across 3 regions; introduced HPA policies." },
    { name: "gRPC", category: "Protocol", yearsUsed: 3, level: "Proficient", evidence: "Defined service contracts for 12 microservices, generated clients in 3 languages." },
  ],
  experience: [
    { company: "Nordic Financial Services", role: "Payments Platform Modernisation", start: "2023", end: "Present", stack: ["Rust", "PostgreSQL", "Kafka"], achievements: ["Built a low-latency serialization layer reducing P99 from 18ms → 4ms.", "Introduced end-to-end tracing with OpenTelemetry; cut MTTR by 40%."] },
    { company: "European Commerce Group", role: "Order Platform Renewal", start: "2021", end: "2023", stack: ["Go", "Kafka", "Kubernetes", "PostgreSQL"], achievements: ["Led migration of order processing to Go microservices.", "Achieved 99.99% uptime across peak seasonal load."] },
    { company: "Nordic Media Group", role: "Marketplace Data Platform", start: "2019", end: "2021", stack: ["Java", "PostgreSQL", "Redis"], achievements: ["Designed a sharding strategy for a 2TB marketplace dataset.", "Improved search latency by 60% through index tuning."] },
  ],
  education: [{ degree: "M.Sc. Computer Science", school: "TU Berlin", year: "2019" }],
  languages: ["English (C2)", "German (B2)", "Hungarian (Native)"],
  industries: ["Financial Services", "E-commerce", "Media"],
  certifications: ["CKA — Certified Kubernetes Administrator", "Microsoft Azure Fundamentals"],
};

const LEVEL_BG: Record<string, React.CSSProperties> = {
  Expert:    { color: "var(--ats-green)",  background: "rgba(34,197,94,0.10)"  },
  Proficient:{ color: "var(--ats-indigo)", background: "var(--ats-indigo-sub)" },
  Familiar:  { color: "var(--ats-muted)",  background: "var(--ats-surface-r)"  },
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
      <div className="px-6 py-4 border-b border-base bg-surface flex items-start gap-4 flex-none">
        <Link to="/talent" className="text-3 hover:text-base transition-colors mt-0.5"><ChevronLeft size={16} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-sub flex items-center justify-center text-sm font-semibold text-indigo">{profile.initials}</div>
            <div>
              <h1 className="text-sm font-semibold text-base">
                {profile.name} — {t("cand_blind")}
              </h1>
              <p className="text-xs text-muted">{profile.role} · {profile.office} · {profile.totalYearsExperience} {t("cand_exp")}</p>
            </div>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: "var(--ats-green)", background: "rgba(34,197,94,0.10)" }}>{profile.availability === "Immediate" ? t("immediate") : profile.availability}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: reviewStatus === "Verified" ? "var(--ats-green)" : "var(--ats-amber, #f59e0b)", background: reviewStatus === "Verified" ? "rgba(34,197,94,0.10)" : "rgba(245,158,11,0.10)" }}>{reviewStatus}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setDraft(profile); setDraftLists({ skills: profile.skills.map((s) => [s.name, s.category, s.yearsUsed, s.level, s.evidence].join(" | ")).join("\\n"), experience: profile.experience.map((e) => [e.role, e.company, e.start, e.end, e.stack.join(", "), e.achievements.join("; ")].join(" | ")).join("\\n"), education: profile.education.map((e) => [e.degree, e.school, e.year].join(" | ")).join("\\n"), languages: profile.languages.join("\\n"), industries: profile.industries.join("\\n"), certifications: profile.certifications.join("\\n") }); setEditMode(true); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors"
            style={editMode ? { border: "1px solid var(--ats-indigo)", color: "var(--ats-indigo)", background: "var(--ats-indigo-sub)" } : { border: "1px solid var(--ats-border)", color: "var(--ats-text-2)" }}>
            <Edit3 size={12} /> {t("cand_edit")}
          </button>
          {false && (
            <button className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded hover:opacity-80 transition-opacity" style={{ background: "var(--ats-indigo)" }}>
              <Save size={12} /> {t("cand_save")} <RefreshCw size={10} className="ml-0.5 opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-base px-6 bg-surface flex-none">
        {(["profile", "original"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex items-center gap-1.5 text-xs px-1 py-2.5 mr-5 border-b-2 transition-colors"
            style={activeTab === tab ? { borderColor: "var(--ats-indigo)", color: "var(--ats-text)", fontWeight: 500 } : { borderColor: "transparent", color: "var(--ats-muted)" }}>
            {tab === "profile" ? <Code size={12} /> : <FileText size={12} />}
            {tab === "profile" ? t("cand_parsed") : t("cand_original")}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-base">
        {activeTab === "profile" ? (
          <div className="p-6 grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-semibold text-base">Consultant CV Extraction</p><p className="text-[11px] text-muted mt-1">Structured information extracted from the consultant CV for XLENT review.</p></div>
                <span className="text-[10px] text-3">Human review required</span>
              </div>

              {/* Skills */}
              <div className="bg-surface border border-base rounded-lg overflow-hidden" style={{ boxShadow: "var(--ats-shadow)" }}>
                <div className="px-4 py-3 border-b border-base flex items-center gap-2">
                  <Code size={12} className="text-3" />
                  <span className="text-xs font-medium text-base">{t("cand_skills")}</span>
                </div>
                <div>
                  {profile.skills.map((s, i) => (
                    <div key={s.name} className="px-4 py-3" style={{ borderBottom: i < profile.skills.length - 1 ? "1px solid var(--ats-border-s)" : "none" }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-none w-28">
                          <p className="text-xs font-medium text-base font-mono">{s.name}</p>
                          <p className="text-[10px] text-3 mt-0.5">{s.category}</p>
                        </div>
                        <div className="flex-none flex items-center gap-3">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={LEVEL_BG[s.level] ?? LEVEL_BG.Familiar}>{s.level}</span>
                          <span className="text-[10px] font-mono text-muted">{s.yearsUsed}y</span>
                        </div>
                        <p className="flex-1 text-[11px] text-muted italic leading-relaxed">"{s.evidence}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="bg-surface border border-base rounded-lg overflow-hidden" style={{ boxShadow: "var(--ats-shadow)" }}>
                <div className="px-4 py-3 border-b border-base flex items-center gap-2">
                  <Briefcase size={12} className="text-3" />
                  <span className="text-xs font-medium text-base">{t("cand_experience")}</span>
                </div>
                {profile.experience.map((e, i) => (
                  <div key={i} className="px-4 py-3 space-y-2" style={{ borderBottom: i < profile.experience.length - 1 ? "1px solid var(--ats-border-s)" : "none" }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-base">{e.role}</p>
                        <p className="text-[11px] text-muted">{e.company}</p>
                      </div>
                      <span className="text-[10px] font-mono text-3">{e.start} – {e.end}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {e.stack.map((s) => (
                        <span key={s} className="text-[10px] text-2 px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{s}</span>
                      ))}
                    </div>
                    <ul className="space-y-0.5">
                      {e.achievements.map((a, j) => (
                        <li key={j} className="text-[11px] text-muted flex gap-2">
                          <span className="text-3 flex-none">–</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-surface border border-base rounded-lg p-4 space-y-3" style={{ boxShadow: "var(--ats-shadow)" }}>
                <div className="flex items-center gap-2 mb-1"><GraduationCap size={12} className="text-3" /><span className="text-xs font-medium text-base">{t("cand_education")}</span></div>
                {profile.education.map((e, i) => (
                  <div key={i}><p className="text-xs text-base">{e.degree}</p><p className="text-[11px] text-muted">{e.school} · {e.year}</p></div>
                ))}
              </div>
              <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
                <div className="flex items-center gap-2 mb-3"><Globe size={12} className="text-3" /><span className="text-xs font-medium text-base">{t("cand_languages")}</span></div>
                <div className="space-y-1.5">{profile.languages.map((l) => <p key={l} className="text-[11px] text-2">{l}</p>)}</div>
              </div>
              <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
                <p className="text-xs font-medium text-base mb-3">{t("cand_industries")}</p>
                <div className="flex flex-wrap gap-1.5">{profile.industries.map((industry) => <span key={industry} className="text-[10px] text-2 px-1.5 py-0.5 rounded" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{industry}</span>)}</div>
              </div>
              <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
                <p className="text-xs font-medium text-base mb-3">{t("cand_certifications")}</p>
                <div className="space-y-1.5">{profile.certifications.map((certification) => <p key={certification} className="text-[11px] text-2">{certification}</p>)}</div>
              </div>
              <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
                <details className="group"><summary className="cursor-pointer list-none text-[10px] text-3 uppercase tracking-wider font-medium flex items-center justify-between"><span>Extraction Details</span><span className="text-[10px] text-muted group-open:rotate-180 transition-transform">⌄</span></summary><div className="space-y-2 text-[11px] mt-3">
                  {[["Parser model", "gpt-4o"], ["Prompt version", "v2.3"], ["Embedding", "text-embedding-3-large"], ["Parse cost", "$0.032"], ["Tokens", "4,821"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-muted">{k}</span><span className="font-mono text-2">{v}</span></div>
                  ))}
                </div></details>
              </div>
              <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
                <p className="text-xs font-medium text-base mb-2">Extraction Review</p>
                <p className="text-[11px] text-muted mb-3">Review extracted fields before using this consultant in matching.</p>
                <div className="flex items-center justify-between text-[11px] mb-3"><span className="text-muted">Status</span><span className="text-2">{reviewStatus}</span></div>
                <button onClick={() => setReviewStatus("Verified")} className="w-full text-xs px-3 py-1.5 rounded border transition-colors" style={{ borderColor: "var(--ats-border)", color: "var(--ats-text-2)" }}>{reviewStatus === "Verified" ? "Verified" : "Mark as Reviewed"}</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 h-full">
            <div className="bg-surface border border-base rounded-lg h-[600px] flex items-center justify-center" style={{ boxShadow: "var(--ats-shadow)" }}>
              <div className="text-center">
                <FileText size={32} className="text-3 mx-auto mb-3" />
                <p className="text-sm text-3">Original consultant CV</p>
                <p className="text-xs text-3 mt-1">PDF/DOCX preview for the XLENT consultant profile</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div className="w-full max-w-4xl max-h-[92vh] overflow-auto bg-surface border border-base rounded-lg p-5" style={{ boxShadow: "var(--ats-shadow)" }}>
            <div className="flex items-center justify-between mb-5">
              <div><h2 className="text-sm font-semibold text-base">Edit Extracted Consultant Profile</h2><p className="text-[11px] text-muted mt-1">Correct the structured information extracted from the consultant CV.</p></div>
              <button onClick={() => setEditMode(false)} className="text-xs text-muted">Close</button>
            </div>
            <div className="space-y-5">
              <section><h3 className="text-xs font-medium text-base mb-3">Basic Information</h3><div className="grid grid-cols-2 gap-3">
                {[["Full name","name"],["Headline","headline"],["Role","role"],["Seniority","seniority"],["Availability","availability"],["Office / Location","office"]].map(([label,key]) => <label key={key} className="space-y-1"><span className="text-[10px] text-muted">{label}</span><input value={draft[key as keyof typeof draft] as string} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none" /></label>)}
                <label className="space-y-1"><span className="text-[10px] text-muted">Years of experience</span><input type="number" value={draft.totalYearsExperience} onChange={(e) => setDraft({ ...draft, totalYearsExperience: Number(e.target.value) })} className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none" /></label>
              </div></section>
              <section><h3 className="text-xs font-medium text-base mb-1">Skills & Evidence</h3><p className="text-[10px] text-muted mb-2">One skill per line: Name | Category | Years | Level | Evidence</p><textarea value={draftLists.skills} onChange={(e) => setDraftLists({ ...draftLists, skills: e.target.value })} rows={6} className="w-full bg-base border border-base rounded px-2.5 py-2 text-[11px] text-base font-mono outline-none" /></section>
              <section><h3 className="text-xs font-medium text-base mb-1">Previous Projects</h3><p className="text-[10px] text-muted mb-2">One project per line: Role | Company | Start | End | Technologies | Achievement</p><textarea value={draftLists.experience} onChange={(e) => setDraftLists({ ...draftLists, experience: e.target.value })} rows={5} className="w-full bg-base border border-base rounded px-2.5 py-2 text-[11px] text-base font-mono outline-none" /></section>
              <div className="grid grid-cols-2 gap-4">
                <section><h3 className="text-xs font-medium text-base mb-1">Education</h3><p className="text-[10px] text-muted mb-2">Degree | Institution | Year</p><textarea value={draftLists.education} onChange={(e) => setDraftLists({ ...draftLists, education: e.target.value })} rows={3} className="w-full bg-base border border-base rounded px-2.5 py-2 text-[11px] text-base font-mono outline-none" /></section>
                <section><h3 className="text-xs font-medium text-base mb-1">Languages</h3><p className="text-[10px] text-muted mb-2">One language per line</p><textarea value={draftLists.languages} onChange={(e) => setDraftLists({ ...draftLists, languages: e.target.value })} rows={3} className="w-full bg-base border border-base rounded px-2.5 py-2 text-[11px] text-base outline-none" /></section>
                <section><h3 className="text-xs font-medium text-base mb-1">Industries</h3><p className="text-[10px] text-muted mb-2">One industry per line</p><textarea value={draftLists.industries} onChange={(e) => setDraftLists({ ...draftLists, industries: e.target.value })} rows={3} className="w-full bg-base border border-base rounded px-2.5 py-2 text-[11px] text-base outline-none" /></section>
                <section><h3 className="text-xs font-medium text-base mb-1">Certifications</h3><p className="text-[10px] text-muted mb-2">One certification per line</p><textarea value={draftLists.certifications} onChange={(e) => setDraftLists({ ...draftLists, certifications: e.target.value })} rows={3} className="w-full bg-base border border-base rounded px-2.5 py-2 text-[11px] text-base outline-none" /></section>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6"><button onClick={() => setEditMode(false)} className="text-xs px-3 py-1.5 rounded border border-base text-muted">Cancel</button><button onClick={() => { setProfile({ ...draft, skills: parseSkills(draftLists.skills), experience: parseExperience(draftLists.experience), education: parseEducation(draftLists.education), languages: lines(draftLists.languages), industries: lines(draftLists.industries), certifications: lines(draftLists.certifications) }); setEditMode(false); }} className="text-xs px-3 py-1.5 rounded text-white" style={{ background: "var(--ats-indigo)" }}>Save Changes</button></div>
          </div>
        </div>
      )}

    </div>
  );
}
