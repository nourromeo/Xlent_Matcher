import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, RefreshCw, Save, Search, Trash2 } from "../design-system/icons";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { DataTable } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SkillEditModal } from "../components/SkillEditModal";
import { adminApi, type AdminOverview, type AdminSkill, type AdminSuggestion } from "../services/adminApi";

const ADMIN_TABS = ["taxonomy", "weights", "flags"] as const;

export default function Admin() {
  const { t } = useI18n();
  const TABS = ADMIN_TABS.map((id) => ({ id, label: t(`tab_${id}` as any) }));

  const [tab, setTab] = useState("taxonomy");
  const [taxonomyTab, setTaxonomyTab] = useState<"catalog" | "suggestions">("catalog");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skillPage, setSkillPage] = useState(1);
  const [editingSkill, setEditingSkill] = useState<AdminSkill | null>(null);
  const [reviewingSuggestion, setReviewingSuggestion] = useState<{ id: number; name: string; category: string; occurrences: number } | null>(null);
  const [suggestionCanonical, setSuggestionCanonical] = useState("");
  const [suggestionCategory, setSuggestionCategory] = useState("");
  const [suggestionAliases, setSuggestionAliases] = useState("");
  const [skillModalMode, setSkillModalMode] = useState<"add" | "edit">("edit");
  const [editCanonical, setEditCanonical] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAliases, setEditAliases] = useState("");
  const [savingSkill, setSavingSkill] = useState(false);
  const [weightValues, setWeightValues] = useState<Record<string, number>>({});
  const [missingPenalty, setMissingPenalty] = useState(10);
  const [savingWeights, setSavingWeights] = useState(false);
  const skillsPerPage = 10;

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getOverview()
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
          setWeightValues(Object.fromEntries(data.matchingFactors.map((factor) => [factor.key, factor.value])));
          setMissingPenalty(data.missingMandatoryPenalty);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Could not load admin data.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const skills = overview?.skills ?? [];
  const factors = overview?.matchingFactors ?? [];
  const capabilities = overview?.capabilities ?? [];
  const suggestions = overview?.suggestions ?? [];

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(skills.map((skill) => skill.category))).sort()],
    [skills],
  );

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();

    return skills.filter((skill) => {
      const matchesCategory = category === "All" || skill.category === category;
      const matchesSearch =
        !query ||
        skill.canonical.toLowerCase().includes(query) ||
        skill.category.toLowerCase().includes(query) ||
        skill.aliases.some((alias) => alias.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [skills, search, category]);

  useEffect(() => {
    setSkillPage(1);
  }, [search, category]);

  const skillPageCount = Math.max(1, Math.ceil(filteredSkills.length / skillsPerPage));
  const currentSkillPage = Math.min(skillPage, skillPageCount);
  const pagedSkills = filteredSkills.slice(
    (currentSkillPage - 1) * skillsPerPage,
    currentSkillPage * skillsPerPage,
  );

  const openAddSkill = () => {
    setSkillModalMode("add");
    setEditingSkill({ id: "", canonical: "", category: "", aliases: [], consultantCount: 0 });
    setEditCanonical("");
    setEditCategory("");
    setEditAliases("");
    setError("");
  };

  const openSkillEditor = (skill: AdminSkill) => {
    setSkillModalMode("edit");
    setEditingSkill(skill);
    setEditCanonical(skill.canonical);
    setEditCategory(skill.category);
    setEditAliases(skill.aliases.join(", "));
    setError("");
  };

  const reviewSuggestion = async (approve: boolean) => {
    if (!reviewingSuggestion) return;
    setError("");
    try {
      if (approve) await adminApi.approveSuggestion(reviewingSuggestion.id, { canonicalName: suggestionCanonical, category: suggestionCategory, aliases: suggestionAliases.split(",").map((item) => item.trim()).filter(Boolean) });
      else await adminApi.dismissSuggestion(reviewingSuggestion.id);
      setOverview(await adminApi.getOverview());
      setReviewingSuggestion(null);
    } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Could not review suggestion.");
    }
  };

  const saveSkill = async () => {
    if (!editingSkill) return;

    const canonicalName = editCanonical.trim();
    const categoryName = editCategory.trim();

    if (!canonicalName || !categoryName) {
      setError("Canonical name and category are required.");
      return;
    }

    setSavingSkill(true);
    setError("");

    try {
      const payload = {
        canonicalName,
        category: categoryName,
        aliases: editAliases.split(",").map((alias) => alias.trim()).filter(Boolean),
      };

      const updated =
        skillModalMode === "add"
          ? await adminApi.createSkill(payload)
          : await adminApi.updateSkill(editingSkill.id, payload);

      setOverview((current) =>
        current
          ? {
              ...current,
              skills:
                skillModalMode === "add"
                  ? [...current.skills, updated].sort((a, b) => a.canonical.localeCompare(b.canonical))
                  : current.skills
                      .map((skill) => (skill.id === updated.id ? updated : skill))
                      .sort((a, b) => a.canonical.localeCompare(b.canonical)),
            }
          : current,
      );
      setEditingSkill(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update skill.");
    } finally {
      setSavingSkill(false);
    }
  };

  const deleteSkill = async (skill: AdminSkill) => {
    if (!window.confirm(`Delete taxonomy entry '${skill.canonical}'?`)) return;
    setError("");
    try {
      await adminApi.deleteSkill(skill.id);
      setOverview((current) => current ? { ...current, skills: current.skills.filter((item) => item.id !== skill.id) } : current);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete taxonomy entry.");
    }
  };

  const editableFactors = factors.map((factor) => ({
    ...factor,
    value: weightValues[factor.key] ?? factor.value,
  }));
  const total = editableFactors.reduce((sum, factor) => sum + factor.value, 0);
  const ok = total === 100;

  const saveWeights = async () => {
    if (!ok) {
      setError("Matching weights must total 100%.");
      return;
    }

    setSavingWeights(true);
    setError("");

    try {
      const updated = await adminApi.updateMatchingWeights({
        mandatoryWeight: weightValues.mandatory ?? 0,
        desiredWeight: weightValues.desired ?? 0,
        experienceWeight: weightValues.experience ?? 0,
        missingMandatoryPenalty: missingPenalty,
      });
      setOverview(updated);
      setWeightValues(Object.fromEntries(updated.matchingFactors.map((factor) => [factor.key, factor.value])));
      setMissingPenalty(updated.missingMandatoryPenalty);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save matching weights.");
    } finally {
      setSavingWeights(false);
    }
  };

  const resetWeights = async () => {
    setSavingWeights(true);
    setError("");

    try {
      const updated = await adminApi.resetMatchingWeights();
      setOverview(updated);
      setWeightValues(Object.fromEntries(updated.matchingFactors.map((factor) => [factor.key, factor.value])));
      setMissingPenalty(updated.missingMandatoryPenalty);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not reset matching weights.");
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-5 max-w-6xl mx-auto">
        <PageHeader title={t("admin_title")} description={t("admin_description")} />

        {error && (
          <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("admin_skills_count"), value: loading ? "—" : skills.length },
            { label: t("admin_matching_factors"), value: loading ? "—" : factors.length },
            { label: t("admin_feature_flags"), value: loading ? "—" : capabilities.length },
          ].map((item) => (
            <div key={item.label} className="bg-app-surface border border-app rounded-lg px-4 py-3" style={{ boxShadow: "var(--shadow-surface)" }}>
              <p className="text-[10px] uppercase tracking-wide text-app-faint">{item.label}</p>
              <p className="text-lg font-semibold font-mono text-app-primary mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

        {tab === "taxonomy" && (
          <div className="flex gap-2 border-b border-app">
            <button type="button" onClick={() => setTaxonomyTab("catalog")} className={`px-3 py-2 text-xs ${taxonomyTab === "catalog" ? "text-app-primary border-b-2 border-app-brand" : "text-app-muted"}`}>Catalog ({skills.length})</button>
            <button type="button" onClick={() => setTaxonomyTab("suggestions")} className={`px-3 py-2 text-xs ${taxonomyTab === "suggestions" ? "text-app-primary border-b-2 border-app-brand" : "text-app-muted"}`}>Suggestions ({suggestions.length})</button>
          </div>
        )}

                {tab === "taxonomy" && taxonomyTab === "suggestions" && (
          <section className="bg-app-surface border border-app rounded-lg p-4 space-y-3" style={{ boxShadow: "var(--shadow-surface)" }}>
            <div>
              <h2 className="text-xs font-semibold text-app-primary">Taxonomy suggestions ({suggestions.length})</h2>
              <p className="text-[11px] text-app-muted mt-1">Unrecognized extracted terms remain outside the approved catalog until reviewed.</p>
            </div>
            <DataTable<AdminSuggestion>
              columns={[
                { key: "name", header: "Suggestion", render: (item) => <span className="font-mono font-medium text-app-primary">{item.name}</span> },
                { key: "category", header: "Suggested category", render: (item) => <span className="text-app-secondary">{item.category}</span> },
                { key: "occurrences", header: "Seen", render: (item) => <span className="font-mono">{item.occurrences}</span> },
                { key: "action", header: "Action", render: (item) => <Button variant="primary" onClick={() => { setReviewingSuggestion(item); setSuggestionCanonical(item.name); setSuggestionCategory(item.category); setSuggestionAliases(""); }}>Review</Button> },
              ]}
              rows={suggestions}
              rowKey={(item) => String(item.id)}
              emptyMessage="No taxonomy suggestions to review."
            />
          </section>
        )}

        {reviewingSuggestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-lg border border-app bg-app-surface p-5 space-y-4">
              <h2 className="text-sm font-semibold text-app-primary">Review taxonomy suggestion</h2>
              <p className="text-[11px] text-app-muted">Found {reviewingSuggestion.occurrences} times</p>
              <input value={suggestionCanonical} onChange={(event) => setSuggestionCanonical(event.target.value)} placeholder="Canonical name" className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary" />
              <select value={suggestionCategory} onChange={(event) => setSuggestionCategory(event.target.value)} className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary"><option>Unclassified</option><option>Human language</option><option>Language</option><option>Framework</option><option>Database</option><option>Messaging</option><option>Cloud</option><option>AI/ML</option><option>Backend</option></select>
              <input value={suggestionAliases} onChange={(event) => setSuggestionAliases(event.target.value)} placeholder="Aliases, comma separated" className="w-full bg-app border border-app rounded px-3 py-2 text-xs text-app-primary" />
              <div className="flex justify-between gap-2"><Button variant="ghost" onClick={() => void reviewSuggestion(false)}>Dismiss suggestion</Button><div className="flex gap-2"><Button variant="ghost" onClick={() => setReviewingSuggestion(null)}>Cancel</Button><Button variant="primary" onClick={() => void reviewSuggestion(true)}>Approve</Button></div></div>
            </div>
          </div>
        )}

{tab === "taxonomy" && taxonomyTab === "catalog" && (
          <div className="bg-app-surface border border-app rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
            <div className="flex items-end justify-between gap-4 px-4 py-3 border-b border-app">
              <div className="flex items-end gap-2 flex-1">
                <div className="relative w-full max-w-sm">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("admin_search_skills")}
                    className="w-full bg-app border border-app rounded-md pl-8 pr-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand"
                  />
                </div>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="bg-app border border-app rounded-md px-3 py-2 text-xs text-app-secondary outline-none"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === "All" ? t("common_all") : item}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="primary"
                icon={<Plus size={12} />}
                onClick={openAddSkill}
              >
                {t("admin_add_skill_title")}
              </Button>
            </div>

            <DataTable
              columns={[
                {
                  key: "canonical",
                  header: t("admin_canonical"),
                  sortable: true,
                  sortValue: (skill: AdminSkill) => skill.canonical,
                  render: (skill: AdminSkill) => (
                    <span className="font-mono font-medium text-app-primary">{skill.canonical}</span>
                  ),
                },
                {
                  key: "category",
                  header: t("admin_category"),
                  sortable: true,
                  sortValue: (skill: AdminSkill) => skill.category,
                  render: (skill: AdminSkill) => (
                    <span className="text-[11px] text-app-secondary px-2 py-1 rounded bg-app-raised">
                      {skill.category}
                    </span>
                  ),
                },
                {
                  key: "aliases",
                  header: t("admin_aliases"),
                  render: (skill: AdminSkill) => (
                    <div className="flex flex-wrap gap-1">
                      {skill.aliases.length > 0
                        ? skill.aliases.map((alias) => (
                            <span key={alias} className="text-[10px] font-mono text-app-secondary px-1.5 py-0.5 rounded bg-app-raised border border-app">
                              {alias}
                            </span>
                          ))
                        : <span className="text-[10px] text-app-faint">—</span>}
                    </div>
                  ),
                },
                {
                  key: "actions",
                  header: t("admin_actions"),
                  render: (skill: AdminSkill) => (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-app-muted mr-2">{skill.consultantCount} consultants</span>
                      <Button variant="ghost" icon={<Edit3 size={11} />} onClick={() => openSkillEditor(skill)}>
                        {t("admin_edit")}
                      </Button>
                      <button
                        onClick={() => void deleteSkill(skill)}
                        className="p-2 text-app-faint hover:text-app-secondary"
                        aria-label={t("common_delete") + " " + skill.canonical}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={pagedSkills}
              rowKey={(skill: AdminSkill) => skill.id}
              emptyMessage={loading ? "Loading skills..." : t("admin_empty_skills")}
            />

            {!loading && filteredSkills.length > skillsPerPage && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-app">
                <p className="text-[10px] text-app-muted">
                  Showing {(currentSkillPage - 1) * skillsPerPage + 1}–{Math.min(currentSkillPage * skillsPerPage, filteredSkills.length)} of {filteredSkills.length} skills
                </p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: skillPageCount }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setSkillPage(page)}
                      className={
                        "min-w-7 h-7 px-2 rounded text-[11px] border " +
                        (page === currentSkillPage
                          ? "bg-app-brand text-app-on-brand border-transparent"
                          : "bg-app-surface text-app-secondary border-app")
                      }
                      aria-current={page === currentSkillPage ? "page" : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "weights" && (
          <div className="space-y-3">
            <div
              className="text-xs px-4 py-3 rounded-lg flex items-center justify-between gap-3"
              style={{
                background: ok ? "var(--color-success-soft)" : "var(--color-warning-soft)",
                border: "1px solid " + (ok ? "var(--color-success-border)" : "var(--color-warning-border)"),
                color: ok ? "var(--color-success)" : "var(--color-warning)",
              }}
            >
              <span>{t("admin_total_label")} <strong>{total}%</strong> {ok ? t("admin_ready_save") : t("admin_must_eq")}</span>
              <span className="text-app-muted">Backend configuration</span>
            </div>

            <div className="bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
              {editableFactors.map((factor, index) => (
                <div
                  key={factor.key}
                  className="px-5 py-4"
                  style={{ borderBottom: index < factors.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}
                >
                  <div className="flex items-center gap-5">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-xs font-medium text-app-primary">{factor.label}</p>
                        <span className="text-xs font-mono font-semibold text-app-brand">{factor.value}%</span>
                      </div>
                      <p className="text-xs text-app-muted mt-1">{factor.description}</p>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={factor.value}
                      onChange={(event) =>
                        setWeightValues((current) => ({
                          ...current,
                          [factor.key]: Number(event.target.value),
                        }))
                      }
                      disabled={savingWeights}
                      className="w-40 accent-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary flex items-center justify-between gap-4">
              <span>
                Missing mandatory penalty: <strong>{missingPenalty} points</strong> per missing mandatory requirement.
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={missingPenalty}
                onChange={(event) => setMissingPenalty(Math.max(0, Math.min(100, Number(event.target.value))))}
                disabled={savingWeights}
                className="w-20 bg-app border border-app rounded-md px-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" icon={<RefreshCw size={11} />} onClick={() => void resetWeights()} disabled={savingWeights}>
                {t("admin_reset")}
              </Button>
              <Button variant="primary" icon={<Save size={11} />} onClick={() => void saveWeights()} disabled={savingWeights || !ok}>
                {savingWeights ? "Saving..." : t("admin_save_w")}
              </Button>
            </div>
          </div>
        )}

        {tab === "flags" && (
          <div className="bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
            <div className="px-5 py-3 border-b border-app">
              <p className="text-xs font-medium text-app-primary">{t("tab_flags")}</p>
              <p className="text-[11px] text-app-muted mt-0.5">
                Live system capabilities reported by the backend. These are status values, not mock toggles.
              </p>
            </div>

            {capabilities.map((capability, index) => (
              <div
                key={capability.key}
                className="flex items-center justify-between gap-5 px-5 py-4"
                style={{ borderBottom: index < capabilities.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-app-primary">{capability.label}</p>
                    <StatusBadge tone={capability.enabled ? "success" : "neutral"}>
                      {capability.enabled ? t("common_enabled") : t("common_disabled")}
                    </StatusBadge>
                  </div>
                  <p className="text-[11px] text-app-muted mt-1">{capability.description}</p>
                  <p className="text-[10px] text-app-faint font-mono mt-1">{capability.key}</p>
                </div>

                <button
                  disabled
                  className="relative w-10 h-5 rounded-full flex-none cursor-not-allowed opacity-80"
                  style={{ background: capability.enabled ? "var(--color-brand)" : "var(--color-border)" }}
                  aria-label={capability.label}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white"
                    style={{ transform: capability.enabled ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <SkillEditModal
        open={editingSkill !== null}
        mode={skillModalMode}
        canonical={editCanonical}
        category={editCategory}
        aliases={editAliases}
        saving={savingSkill}
        onCanonicalChange={setEditCanonical}
        onCategoryChange={setEditCategory}
        onAliasesChange={setEditAliases}
        onClose={() => !savingSkill && setEditingSkill(null)}
        onSave={() => void saveSkill()}
      />
    </div>
  );
}
