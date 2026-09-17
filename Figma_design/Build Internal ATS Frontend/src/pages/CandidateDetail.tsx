import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, FileText, Code, Briefcase, GraduationCap, Globe, Edit3, Save, RefreshCw } from "lucide-react";
import { useI18n } from "../i18n";

const PROFILE = {
  id: "1", initials: "AK", headline: "Senior Backend Engineer",
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
    { company: "FinCo GmbH", role: "Senior Software Engineer", start: "2023", end: "Present", stack: ["Rust", "PostgreSQL", "Kafka"], achievements: ["Built low-latency serialization layer reducing P99 from 18ms → 4ms.", "Introduced E2E tracing with OpenTelemetry; cut MTTR by 40%."] },
    { company: "Zalando SE", role: "Backend Engineer", start: "2021", end: "2023", stack: ["Go", "Kafka", "Kubernetes", "PostgreSQL"], achievements: ["Led migration of monolith order-processing to Go microservices.", "Achieved 99.99% uptime across Black Friday peak load."] },
    { company: "Schibsted", role: "Software Engineer", start: "2019", end: "2021", stack: ["Java", "PostgreSQL", "Redis"], achievements: ["Designed sharding strategy for 2TB marketplace dataset.", "Improved search latency by 60% via Elasticsearch index tuning."] },
  ],
  education: [{ degree: "M.Sc. Computer Science", school: "TU Berlin", year: "2019" }],
  languages: ["English (C2)", "German (B2)", "Hungarian (Native)"],
};

const LEVEL_BG: Record<string, React.CSSProperties> = {
  Expert:    { color: "var(--ats-green)",  background: "rgba(34,197,94,0.10)"  },
  Proficient:{ color: "var(--ats-indigo)", background: "var(--ats-indigo-sub)" },
  Familiar:  { color: "var(--ats-muted)",  background: "var(--ats-surface-r)"  },
};

export default function CandidateDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"profile" | "original">("profile");
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-base bg-surface flex items-start gap-4 flex-none">
        <Link to="/talent" className="text-3 hover:text-base transition-colors mt-0.5"><ChevronLeft size={16} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-sub flex items-center justify-center text-sm font-semibold text-indigo">{PROFILE.initials}</div>
            <div>
              <h1 className="text-sm font-semibold text-base">
                {t("dash_candidate")} #{id} — {t("cand_blind")}
              </h1>
              <p className="text-xs text-muted">{PROFILE.headline} · {PROFILE.seniority} · {PROFILE.totalYearsExperience} {t("cand_exp")}</p>
            </div>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: "var(--ats-green)", background: "rgba(34,197,94,0.10)" }}>{PROFILE.availability === "Immediate" ? t("immediate") : PROFILE.availability}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditMode((e) => !e)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors"
            style={editMode ? { border: "1px solid var(--ats-indigo)", color: "var(--ats-indigo)", background: "var(--ats-indigo-sub)" } : { border: "1px solid var(--ats-border)", color: "var(--ats-text-2)" }}>
            <Edit3 size={12} /> {editMode ? t("cand_editing") : t("cand_edit")}
          </button>
          {editMode && (
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
              {/* Skills */}
              <div className="bg-surface border border-base rounded-lg overflow-hidden" style={{ boxShadow: "var(--ats-shadow)" }}>
                <div className="px-4 py-3 border-b border-base flex items-center gap-2">
                  <Code size={12} className="text-3" />
                  <span className="text-xs font-medium text-base">{t("cand_skills")}</span>
                </div>
                <div>
                  {PROFILE.skills.map((s, i) => (
                    <div key={s.name} className="px-4 py-3" style={{ borderBottom: i < PROFILE.skills.length - 1 ? "1px solid var(--ats-border-s)" : "none" }}>
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
                {PROFILE.experience.map((e, i) => (
                  <div key={i} className="px-4 py-3 space-y-2" style={{ borderBottom: i < PROFILE.experience.length - 1 ? "1px solid var(--ats-border-s)" : "none" }}>
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
                {PROFILE.education.map((e, i) => (
                  <div key={i}><p className="text-xs text-base">{e.degree}</p><p className="text-[11px] text-muted">{e.school} · {e.year}</p></div>
                ))}
              </div>
              <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
                <div className="flex items-center gap-2 mb-3"><Globe size={12} className="text-3" /><span className="text-xs font-medium text-base">{t("cand_languages")}</span></div>
                <div className="space-y-1.5">{PROFILE.languages.map((l) => <p key={l} className="text-[11px] text-2">{l}</p>)}</div>
              </div>
              <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
                <p className="text-[10px] text-3 uppercase tracking-wider mb-3 font-medium">{t("cand_ai")}</p>
                <div className="space-y-2 text-[11px]">
                  {[["Parser model", "gpt-4o"], ["Prompt version", "v2.3"], ["Embedding", "text-embedding-3-large"], ["Parse cost", "$0.032"], ["Tokens", "4,821"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-muted">{k}</span><span className="font-mono text-2">{v}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 h-full">
            <div className="bg-surface border border-base rounded-lg h-[600px] flex items-center justify-center" style={{ boxShadow: "var(--ats-shadow)" }}>
              <div className="text-center">
                <FileText size={32} className="text-3 mx-auto mb-3" />
                <p className="text-sm text-3">CV viewer</p>
                <p className="text-xs text-3 mt-1">PDF/DOCX rendered from Blob storage</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
