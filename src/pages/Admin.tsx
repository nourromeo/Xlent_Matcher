import { useMemo, useState } from "react";
import { Edit3, Plus, RefreshCw, Save, Search, Trash2 } from "../design-system/icons";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { DataTable } from "../components/ui/DataTable";
import { EditFormModal } from "../components/ui/EditFormModal";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SKILLS, FLAGS_DATA, ADMIN_TABS, WEIGHTS_CONFIG } from "../features/admin";
import type { Skill } from "../features/admin";







const FLAG_LABEL_KEYS: Record<string, string> = {
  SkillsFirstAnalysis: "flag_skills_first",
  UseReranker: "flag_reranker",
  UseCloudOcr: "flag_cloud_ocr",
  UseStubAi: "flag_stub_ai",
};

type SkillDraft = { id?: string; canonical: string; category: string; aliases: string };
const EMPTY_SKILL: SkillDraft = { canonical: "", category: "", aliases: "" };

export default function Admin() {
  const { t } = useI18n();

  const TABS = ADMIN_TABS.map((id) => ({ id, label: t(`tab_${id}` as any) }));

  const WEIGHTS_DEF = WEIGHTS_CONFIG.map((weight) => ({ ...weight, label: t(`score_${weight.key === "mustHaveCoverage" ? "mustHave" : weight.key === "semanticSimilarity" ? "semantic" : weight.key === "experienceRecency" ? "experience" : weight.key === "niceToHave" ? "niceToHave" : weight.key}` as any) }));

  const defaultWeights = Object.fromEntries(WEIGHTS_DEF.map((w) => [w.key, w.value])) as Record<string, number>;

  const [tab, setTab] = useState("taxonomy");
  const [skills, setSkills] = useState<Skill[]>([...SKILLS]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [skillDraft, setSkillDraft] = useState<SkillDraft>(EMPTY_SKILL);
  const [weights, setWeights] = useState<Record<string, number>>(defaultWeights);
  const [savedWeights, setSavedWeights] = useState<Record<string, number>>(defaultWeights);
  const [flags, setFlags] = useState<Record<string, boolean>>(Object.fromEntries(FLAGS_DATA.map((f) => [f.key, f.enabled])));

  const categories = useMemo(() => ["All", ...Array.from(new Set(skills.map((skill) => skill.category))).sort()], [skills]);
  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();
    return skills.filter((skill) => {
      const matchesCategory = category === "All" || skill.category === category;
      const matchesSearch = !query || skill.canonical.toLowerCase().includes(query) || skill.category.toLowerCase().includes(query) || skill.aliases.some((alias) => alias.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [skills, search, category]);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const ok = total === 100;
  const weightsDirty = JSON.stringify(weights) !== JSON.stringify(savedWeights);

  const openAddSkill = () => {
    setSkillDraft(EMPTY_SKILL);
    setSkillModalOpen(true);
  };

  const openEditSkill = (skill: Skill) => {
    setSkillDraft({ id: skill.id, canonical: skill.canonical, category: skill.category, aliases: skill.aliases.join(", ") });
    setSkillModalOpen(true);
  };

  const saveSkill = () => {
    const canonical = skillDraft.canonical.trim();
    const skillCategory = skillDraft.category.trim();
    if (!canonical || !skillCategory) return;
    const aliases = skillDraft.aliases.split(",").map((alias) => alias.trim()).filter(Boolean);

    if (skillDraft.id) {
      setSkills((current) => current.map((skill) => skill.id === skillDraft.id ? { ...skill, canonical, category: skillCategory, aliases } : skill));
    } else {
      const nextId = Math.max(0, ...skills.map((skill) => Number(String(skill.id).replace(/\\D/g, "")) || 0)) + 1;
      setSkills((current) => [...current, { id: "s" + nextId, canonical, category: skillCategory, aliases }]);
    }

    setSkillModalOpen(false);
    setSkillDraft(EMPTY_SKILL);
  };

  const saveWeights = () => {
    if (ok) setSavedWeights({ ...weights });
  };

  const resetWeights = () => setWeights({ ...defaultWeights });

  const toggleFlag = (key: string) => {
    const sensitive = key === "UseReranker" || key === "UseCloudOcr";
    const label = FLAG_LABEL_KEYS[key] ? t(FLAG_LABEL_KEYS[key] as any) : key;
    if (sensitive && !window.confirm(label + ": " + t("admin_confirm_change"))) return;
    setFlags((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  return (
    <div className="h-full overflow-auto"><div className="p-6 space-y-5 max-w-6xl mx-auto">
      <PageHeader title={t("admin_title")} description={t("admin_description")} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("admin_skills_count"), value: skills.length },
          { label: t("admin_matching_factors"), value: WEIGHTS_DEF.length },
          { label: t("admin_feature_flags"), value: FLAGS_DATA.length },
        ].map((item) => (
          <div key={item.label} className="bg-app-surface border border-app rounded-lg px-4 py-3" style={{ boxShadow: "var(--shadow-surface)" }}>
            <p className="text-[10px] uppercase tracking-wide text-app-faint">{item.label}</p>
            <p className="text-lg font-semibold font-mono text-app-primary mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      {/* Taxonomy */}
      {tab === "taxonomy" && (
        <div className="bg-app-surface border border-app rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-end justify-between gap-4 px-4 py-3 border-b border-app">
            <div className="flex items-end gap-2 flex-1">
              <div className="relative w-full max-w-sm">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("admin_search_skills")} className="w-full bg-app border border-app rounded-md pl-8 pr-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand" />
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-app border border-app rounded-md px-3 py-2 text-xs text-app-secondary outline-none">
                {categories.map((item) => <option key={item} value={item}>{item === "All" ? t("common_all") : item}</option>)}
              </select>
            </div>
            <Button variant="primary" icon={<Plus size={12} />} onClick={openAddSkill}>{t("admin_add_skill_title")}</Button>
          </div>

          <DataTable
            columns={[
              { key: "canonical", header: t("admin_canonical"), render: (skill) => <span className="font-mono font-medium text-app-primary">{skill.canonical}</span> },
              { key: "category", header: t("admin_category"), render: (skill) => <span className="text-[11px] text-app-secondary px-2 py-1 rounded bg-app-raised">{skill.category}</span> },
              { key: "aliases", header: t("admin_aliases"), render: (skill) => <div className="flex flex-wrap gap-1">{skill.aliases.map((alias) => <span key={alias} className="text-[10px] font-mono text-app-secondary px-1.5 py-0.5 rounded bg-app-raised border border-app">{alias}</span>)}</div> },
              { key: "actions", header: t("admin_actions"), render: (skill) => <div className="flex items-center gap-1"><Button variant="ghost" icon={<Edit3 size={11} />} onClick={() => openEditSkill(skill)}>{t("admin_edit")}</Button><button onClick={() => setSkills((current) => current.filter((item) => item.id !== skill.id))} className="p-2 text-app-faint hover:text-red-500" aria-label={t("common_delete") + " " + skill.canonical}><Trash2 size={12} /></button></div> },
            ]}
            rows={filteredSkills}
            rowKey={(skill) => skill.id}
            emptyMessage={t("admin_empty_skills")}
          />
        </div>
      )}


      {/* Weights */}
      {tab === "weights" && (
        <div className="space-y-3">
          <div className="text-xs px-4 py-3 rounded-lg flex items-center justify-between gap-3"
            style={{ background: ok ? "var(--color-success-soft)" : "var(--color-warning-soft)", border: "1px solid " + (ok ? "var(--color-success-border)" : "var(--color-warning-border)"), color: ok ? "var(--color-success)" : "var(--color-warning)" }}>
            <span>{t("admin_total_label")} <strong>{total}%</strong> {ok ? t("admin_ready_save") : t("admin_must_eq")}</span>
            {weightsDirty && <span className="font-medium">{t("admin_unsaved")}</span>}
          </div>

          <div className="bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
            {WEIGHTS_DEF.map((w, i) => (
              <div key={w.key} className="px-5 py-4" style={{ borderBottom: i < WEIGHTS_DEF.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}>
                <div className="flex items-center gap-5">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-xs font-medium text-app-primary">{w.label}</p>
                      <span className="text-xs font-mono font-semibold text-app-brand">{weights[w.key]}%</span>
                    </div>
                    <p className="text-xs text-app-muted mt-1">{w.desc}</p>
                  </div>
                  <input type="range" min={0} max={60} value={weights[w.key]} onChange={(e) => setWeights((p) => ({ ...p, [w.key]: Number(e.target.value) }))} className="w-40 accent-indigo-500" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" icon={<RefreshCw size={11} />} onClick={resetWeights}>{t("admin_reset")}</Button>
            <Button variant="primary" icon={<Save size={11} />} onClick={saveWeights} disabled={!ok || !weightsDirty} className={!ok || !weightsDirty ? "opacity-40 cursor-not-allowed" : ""}>{t("admin_save_w")}</Button>
          </div>
        </div>
      )}



      {/* Feature Flags */}
      {tab === "flags" && (
        <div className="bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="px-5 py-3 border-b border-app">
            <p className="text-xs font-medium text-app-primary">{t("tab_flags")}</p>
            <p className="text-[11px] text-app-muted mt-0.5">{t("admin_feature_help")}</p>
          </div>
          {FLAGS_DATA.map((f, i) => (
            <div key={f.key} className="flex items-center justify-between gap-5 px-5 py-4" style={{ borderBottom: i < FLAGS_DATA.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-app-primary">{FLAG_LABEL_KEYS[f.key] ? t(FLAG_LABEL_KEYS[f.key] as any) : f.key}</p>
                  <StatusBadge tone={flags[f.key] ? "success" : "neutral"}>{flags[f.key] ? t("common_enabled") : t("common_disabled")}</StatusBadge>
                </div>
                <p className="text-[11px] text-app-muted mt-1">{f.desc}</p>
                <p className="text-[10px] text-app-faint font-mono mt-1">{f.key}</p>
              </div>
              <button onClick={() => toggleFlag(f.key)} className="relative w-10 h-5 rounded-full transition-colors flex-none" style={{ background: flags[f.key] ? "var(--color-brand)" : "var(--color-border)" }} aria-label={(flags[f.key] ? t("common_disabled") + " " : t("common_enabled") + " ") + (FLAG_LABEL_KEYS[f.key] ? t(FLAG_LABEL_KEYS[f.key] as any) : f.key)}>
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: flags[f.key] ? "translateX(20px)" : "translateX(0)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <EditFormModal
        open={skillModalOpen}
        title={skillDraft.id ? t("admin_edit_skill") : t("admin_add_skill_title")}
        description={t("admin_skill_help")}
        onClose={() => setSkillModalOpen(false)}
        onSubmit={saveSkill}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-[11px] text-app-muted uppercase tracking-wide">{t("admin_canonical_name")}</span>
            <input value={skillDraft.canonical} onChange={(e) => setSkillDraft((current) => ({ ...current, canonical: e.target.value }))} className="mt-1.5 w-full bg-app border border-app rounded-md px-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand" placeholder="e.g. PostgreSQL" />
          </label>
          <label className="block">
            <span className="text-[11px] text-app-muted uppercase tracking-wide">{t("admin_category")}</span>
            <input value={skillDraft.category} onChange={(e) => setSkillDraft((current) => ({ ...current, category: e.target.value }))} className="mt-1.5 w-full bg-app border border-app rounded-md px-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand" placeholder="e.g. Database" />
          </label>
          <label className="block">
            <span className="text-[11px] text-app-muted uppercase tracking-wide">{t("admin_aliases")}</span>
            <input value={skillDraft.aliases} onChange={(e) => setSkillDraft((current) => ({ ...current, aliases: e.target.value }))} className="mt-1.5 w-full bg-app border border-app rounded-md px-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand" placeholder="Postgres, pg" />
            <span className="text-[10px] text-app-faint mt-1 block">{t("admin_alias_help")}</span>
          </label>
        </div>
      </EditFormModal>
      </div>
    </div>
  );
}
