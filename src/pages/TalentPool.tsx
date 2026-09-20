import { useState } from "react";
import { Search, Filter, ArrowUpRight, Star } from "../design-system/icons";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { LinkButton } from "../components/ui/LinkButton";
import { Input } from "../components/ui/Input";
import { DataTable } from "../components/ui/DataTable";
import { SkillTag } from "../components/ui/SkillTag";
import { CONSULTANTS } from "../features/consultants";

const SENIORITY_OPTIONS = ["All", "Junior", "Mid", "Senior", "Staff"];
const AVAIL_OPTIONS = ["All", "Immediate", "2 weeks", "1 month", "3 months"];

export default function ConsultantPool() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState("All");
  const [avail, setAvail] = useState("All");
  const [starred, setStarred] = useState<Record<string, boolean>>(Object.fromEntries(CONSULTANTS.map((consultant) => [consultant.id, consultant.starred ?? false])));

  const filtered = CONSULTANTS.filter((consultant) => {
    if (seniority !== "All" && consultant.seniority !== seniority) return false;
    if (avail !== "All" && consultant.availability !== avail) return false;
    const search = query.toLowerCase();
    return !search || consultant.name.toLowerCase().includes(search) || consultant.headline.toLowerCase().includes(search) || consultant.skills.some((skill) => skill.toLowerCase().includes(search));
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between"><div><h1 className="text-app-primary font-semibold">{t("talent_title")}</h1><p className="text-xs text-app-muted mt-0.5">{CONSULTANTS.length} {t("talent_sub")}</p></div><LinkButton to="/upload" variant="primary">{t("talent_upload")}</LinkButton></div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 relative max-w-xs"><Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" /><Input type="search" placeholder={t("talent_search")} value={query} onChange={(event) => setQuery(event.target.value)} className="pl-8 py-1.5" /></div>
        <div className="flex items-center gap-1.5 text-[10px] text-app-faint"><Filter size={10} /><span>{t("talent_seniority")}</span></div>
        {SENIORITY_OPTIONS.map((option) => <button key={option} onClick={() => setSeniority(option)} className="text-[11px] px-2.5 py-1 rounded transition-colors" style={seniority === option ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)", fontWeight: 500 } : { color: "var(--color-text-muted)" }}>{option === "All" ? t("talent_all") : option}</button>)}
        <span className="text-[10px] text-app-faint">{t("talent_avail")}</span>
        <select value={avail} onChange={(event) => setAvail(event.target.value)} className="text-[11px] rounded px-2 py-1 focus:outline-none" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>{AVAIL_OPTIONS.map((option) => <option key={option} value={option}>{option === "All" ? t("talent_all") : option}</option>)}</select>
      </div>
      <div className="bg-app-surface border border-app rounded-lg overflow-hidden shadow-app-surface">
        <DataTable
          columns={[
            { key: "consultant", header: t("col_candidate"), render: (consultant) => <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full bg-app-brand-subtle flex items-center justify-center text-[10px] font-semibold text-app-brand flex-none">{consultant.initials}</div><div><p className="font-medium text-app-primary">{consultant.name}</p><p className="text-[10px] text-app-muted max-w-xs truncate">{consultant.headline}</p></div></div> },
            { key: "seniority", header: t("col_seniority") },
            { key: "experience", header: t("col_experience"), render: (consultant) => <span className="font-mono">{consultant.experience}</span> },
            { key: "skills", header: t("col_skills"), render: (consultant) => <div className="flex flex-wrap gap-1">{consultant.skills.slice(0, 4).map((skill) => <SkillTag key={skill}>{skill}</SkillTag>)}{consultant.skills.length > 4 && <span className="text-[10px] text-app-faint">+{consultant.skills.length - 4}</span>}</div> },
            { key: "availability", header: t("col_avail"), render: (consultant) => <span style={{ color: consultant.availability === "Immediate" ? "var(--color-success)" : "var(--color-text-secondary)" }}>{consultant.availability === "Immediate" ? t("immediate") : consultant.availability}</span> },
            { key: "actions", header: "Actions", render: (consultant) => <div className="flex items-center gap-3"><button onClick={() => setStarred((current) => ({ ...current, [consultant.id]: !current[consultant.id] }))} aria-label={`Star ${consultant.name}`} style={{ color: starred[consultant.id] ? "var(--color-warning)" : "var(--color-border)" }}><Star size={12} fill={starred[consultant.id] ? "currentColor" : "none"} /></button><Link to={`/talent/${consultant.id}`} className="flex items-center gap-1 text-[10px] text-app-brand hover:opacity-70">{t("view")} <ArrowUpRight size={10} /></Link></div> },
          ]}
          rows={filtered}
          rowKey={(consultant) => consultant.id}
          emptyMessage="No consultants match the current filters."
        />
        <div className="border-t border-app px-4 py-2.5 flex items-center justify-between bg-app-surface"><span className="text-[10px] text-app-faint">{t("talent_showing")} {filtered.length} {t("talent_of")} {CONSULTANTS.length} {t("talent_candidates")}</span><div className="flex items-center gap-1">{[1, 2, 3].map((page) => <button key={page} className="text-[10px] w-6 h-6 rounded flex items-center justify-center" style={page === 1 ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)" } : { color: "var(--color-text-faint)" }}>{page}</button>)}</div></div>
      </div>
    </div>
  );
}
