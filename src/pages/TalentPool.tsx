import { useState } from "react";
import { Search, Filter, ChevronDown, ArrowUpRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

const CONSULTANTS = [
  { id: "1", initials: "AK", name: "Anna Kovacs", headline: "Senior Backend Consultant · Go, Rust, PostgreSQL", seniority: "Senior", experience: "8 yrs", skills: ["Go", "Rust", "PostgreSQL", "Kafka", "Kubernetes"], availability: "Immediate", starred: true },
  { id: "2", initials: "ML", name: "Marcus Lee", headline: "AI Consultant · PyTorch, Transformers, NLP", seniority: "Mid", experience: "5 yrs", skills: ["Python", "PyTorch", "NLP", "Azure ML", "FastAPI"], availability: "2 weeks", starred: false },
  { id: "3", initials: "PS", name: "Priya Sharma", headline: "Platform Consultant · Observability, Terraform", seniority: "Staff", experience: "11 yrs", skills: ["Terraform", "Kubernetes", "Prometheus", "Go", "Python"], availability: "1 month", starred: false },
  { id: "4", initials: "TR", name: "Tobias Renz", headline: "Full-Stack Consultant · .NET, React, Azure", seniority: "Mid", experience: "6 yrs", skills: ["C#", ".NET", "React", "TypeScript", "Azure"], availability: "Immediate", starred: false },
  { id: "5", initials: "SY", name: "Sofia Yun", headline: "Frontend Consultant · React, Design Systems", seniority: "Mid", experience: "4 yrs", skills: ["React", "TypeScript", "CSS", "Figma", "Storybook"], availability: "3 months", starred: false },
  { id: "6", initials: "RO", name: "Ravi Okonkwo", headline: "Data Consultant · Spark, dbt, Snowflake", seniority: "Senior", experience: "7 yrs", skills: ["Python", "Spark", "dbt", "Snowflake", "Airflow"], availability: "Immediate", starred: false },
  { id: "7", initials: "FM", name: "Fatima Martinez", headline: "Cloud Consultant · CI/CD, Docker, AWS", seniority: "Junior", experience: "2 yrs", skills: ["Docker", "GitHub Actions", "AWS", "Python", "Bash"], availability: "2 weeks", starred: false },
];

const SENIORITY_OPTIONS = ["All", "Junior", "Mid", "Senior", "Staff"];
const AVAIL_OPTIONS = ["All", "Immediate", "2 weeks", "1 month", "3 months"];

export default function ConsultantPool() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState("All");
  const [avail, setAvail] = useState("All");
  const [starred, setStarred] = useState<Record<string, boolean>>(
    Object.fromEntries(CONSULTANTS.map((c) => [c.id, c.starred]))
  );

  const filtered = CONSULTANTS.filter((c) => {
    if (seniority !== "All" && c.seniority !== seniority) return false;
    if (avail !== "All" && c.availability !== avail) return false;
    if (query && !c.name.toLowerCase().includes(query.toLowerCase()) && !c.headline.toLowerCase().includes(query.toLowerCase()) && !c.skills.some((s) => s.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-app-primary font-semibold text-app-primary">{t("talent_title")}</h1>
          <p className="text-xs text-app-muted mt-0.5">{CONSULTANTS.length} {t("talent_sub")}</p>
        </div>
        <Link to="/upload" className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded transition-opacity hover:opacity-80" style={{ backgroundColor: "var(--color-brand)" }}>
          {t("talent_upload")}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 relative max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
          <input
            type="text"
            placeholder={t("talent_search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-app-surface border border-app rounded text-xs text-app-primary placeholder-text-app-faint pl-8 pr-3 py-1.5 focus:outline-none transition-colors"
            style={{ caretColor: "var(--color-brand)" }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-app-faint">
          <Filter size={10} />
          <span>{t("talent_seniority")}</span>
        </div>
        {SENIORITY_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSeniority(s)}
            className="text-[11px] px-2.5 py-1 rounded transition-colors"
            style={seniority === s ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)", fontWeight: 500 } : { color: "var(--color-text-app-muted)" }}
          >
            {s === "All" ? t("talent_all") : s}
          </button>
        ))}
        <div className="h-3 w-px bg-border-app" />
        <span className="text-[10px] text-app-faint">{t("talent_avail")}</span>
        <select
          value={avail}
          onChange={(e) => setAvail(e.target.value)}
          className="text-[11px] rounded px-2 py-1 focus:outline-none"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          {AVAIL_OPTIONS.map((o) => <option key={o} value={o}>{o === "All" ? t("talent_all") : o}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-app-surface border border-app rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-app">
              {[t("col_candidate"), t("col_seniority"), t("col_experience"), t("col_skills"), t("col_avail"), "Actions"].map((h, i) => (
                <th key={i} className="text-[10px] font-medium text-app-faint uppercase tracking-wider text-left px-3 py-2.5">
                  <div className="flex items-center gap-1">{h}{["Consultant", "Experience", t("col_candidate"), t("col_experience")].includes(h) && <ChevronDown size={9} className="text-app-faint" />}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="group border-b border-app-subtle hover:bg-app-raised transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-app-brand-subtle flex items-center justify-center text-[10px] font-semibold text-app-brand flex-none">{c.initials}</div>
                    <div>
                      <p className="text-xs font-medium text-app-primary">{c.name}</p>
                      <p className="text-[10px] text-app-muted max-w-xs truncate">{c.headline}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-app-secondary">{c.seniority}</td>
                <td className="px-3 py-2.5 text-[11px] font-mono text-app-secondary">{c.experience}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {c.skills.slice(0, 4).map((s) => (
                      <span key={s} className="text-[10px] text-app-secondary px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>{s}</span>
                    ))}
                    {c.skills.length > 4 && <span className="text-[10px] text-app-faint">+{c.skills.length - 4}</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[11px]" style={{ color: c.availability === "Immediate" ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                  {c.availability === "Immediate" ? t("immediate") : c.availability}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStarred((s) => ({ ...s, [c.id]: !s[c.id] }))} aria-label={`Star ${c.name}`} style={{ color: starred[c.id] ? "var(--color-warning)" : "var(--color-border)" }}>
                      <Star size={12} fill={starred[c.id] ? "currentColor" : "none"} />
                    </button>
                    <Link to={`/talent/${c.id}`} className="flex items-center gap-1 text-[10px] text-app-brand transition-opacity hover:opacity-70">
                      {t("view")} <ArrowUpRight size={10} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-app px-4 py-2.5 flex items-center justify-between bg-app-surface">
          <span className="text-[10px] text-app-faint">{t("talent_showing")} {filtered.length} {t("talent_of")} {CONSULTANTS.length} {t("talent_candidates")}</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((p) => (
              <button key={p} className="text-[10px] w-6 h-6 rounded flex items-center justify-center"
                style={p === 1 ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)" } : { color: "var(--color-text-faint)" }}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
