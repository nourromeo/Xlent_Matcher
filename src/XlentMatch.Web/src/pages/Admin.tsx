import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Edit3, Plus, RefreshCw, Save, Search, Trash2 } from "../design-system/icons";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { DataTable } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { SkillEditModal } from "../components/SkillEditModal";
import { adminApi, type AdminOverview, type AdminSkill, type AdminSuggestion, type PromptSummary, type PromptVersion, type PromptRuntimeContract } from "../services/adminApi";
import { formatDate, formatDateTime } from "../services/localeFormat";

const ADMIN_TABS = ["taxonomy", "weights", "flags", "prompts"] as const;

export default function Admin() {
  const { t, locale } = useI18n();
  const categoryLabel = (value: string) => ({
    All: t("common_all"),
    Unclassified: t("taxonomy_category_unclassified"),
    "Human language": t("taxonomy_category_human_language"),
    Language: t("taxonomy_category_language"),
    Framework: t("taxonomy_category_framework"),
    Database: t("taxonomy_category_database"),
    Messaging: t("taxonomy_category_messaging"),
    Cloud: t("taxonomy_category_cloud"),
    "AI/ML": t("taxonomy_category_ai_ml"),
    Backend: t("taxonomy_category_backend"),
  }[value] ?? value);
  const featureFlagCopy = (capability: { key: string; label: string; description: string }) => {
    const copy: Record<string, { label: string; description: string }> = {
      AzureOpenAiConfigured: { label: t("feature_azure_openai_label"), description: t("feature_azure_openai_description") },
      CanonicalSkillTaxonomy: { label: t("feature_taxonomy_label"), description: t("feature_taxonomy_description") },
      DeterministicMatching: { label: t("feature_matching_label"), description: t("feature_matching_description") },
      PdfTextExtraction: { label: t("feature_pdf_label"), description: t("feature_pdf_description") },
      OriginalPdfStorage: { label: t("feature_storage_label"), description: t("feature_storage_description") },
    };
    return copy[capability.key] ?? { label: capability.label, description: capability.description };
  };
  const TABS = ADMIN_TABS.map((id) => ({ id, label: id === "prompts" ? t("prompt_title") : t(`tab_${id}` as any) }));

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
  const [weightValues, setWeightValues] = useState<Record<string, string>>({});
  const [savingWeights, setSavingWeights] = useState(false);
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [promptKey, setPromptKey] = useState<string | null>(null);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [runtimeContract, setRuntimeContract] = useState<PromptRuntimeContract | null>(null);
  const [copiedItem, setCopiedItem] = useState<"prompt" | "contract" | null>(null);
  const copyText = async (value: string, item: "prompt" | "contract") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedItem(item);
    } catch {
      setError("Could not copy text. Check browser clipboard permissions.");
    }
  };
  const [runtimeContractError, setRuntimeContractError] = useState(false);
  const [runtimeExpanded, setRuntimeExpanded] = useState(false);
  const [runtimeShowFull, setRuntimeShowFull] = useState(false);
  const [selectedPromptVersion, setSelectedPromptVersion] = useState<PromptVersion | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptContent, setPromptContent] = useState("");
  const [promptChangeNote, setPromptChangeNote] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<{ title?: string; confirmLabel?: string; message: string; onConfirm: () => void | Promise<void> } | null>(null);
  const skillsPerPage = 10;

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getOverview()
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
          setWeightValues(Object.fromEntries(data.matchingFactors.map((factor) => [factor.key, String(factor.value)])));
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : t("admin_load_error"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "prompts") return;
    setPromptLoading(true);
    adminApi.getPrompts().then((items) => {
      setPrompts(items);
    }).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : t("admin_prompts_load_error"))).finally(() => setPromptLoading(false));
  }, [tab]);

  useEffect(() => {
    if (!promptKey) return;
    setRuntimeContract(null);
    setCopiedItem(null);
    setRuntimeContractError(false);
    setRuntimeExpanded(false);
    setRuntimeShowFull(false);
    adminApi.getPromptRuntimeContract(promptKey).then(setRuntimeContract).catch(() => setRuntimeContractError(true));
    setPromptLoading(true);
    adminApi.getPromptVersions(promptKey).then((items) => {
      setPromptVersions(items);
      setSelectedPromptVersion((current) => items.find((item) => item.version === current?.version) ?? items[0] ?? null);
    }).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : t("admin_prompt_versions_load_error"))).finally(() => setPromptLoading(false));
  }, [promptKey]);

  const savePromptVersion = async () => {
    if (!promptKey || !promptContent.trim()) return;
    try {
      const created = await adminApi.createPromptVersion(promptKey, { content: promptContent, changeNote: promptChangeNote });
      setPromptVersions((current) => [created, ...current]);
      setSelectedPromptVersion(created);
      setPrompts((current) => current.map((item) => item.promptKey === promptKey ? { ...item, activeVersion: created.version, versionCount: item.versionCount + 1, updatedAt: created.createdAt } : item));
      setEditingPrompt(false);
      setPromptChangeNote("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("admin_prompt_save_error")); }
  };

  const activatePromptVersion = async () => {
    if (!promptKey || !selectedPromptVersion || selectedPromptVersion.isActive) return;
    const key = promptKey;
    const version = selectedPromptVersion.version;
    setConfirmation({ title: t("prompt_set_active"), confirmLabel: t("prompt_set_active"), message: `${t("prompt_set_active")} v${version}?`, onConfirm: async () => {
      try {
        await adminApi.activatePromptVersion(key, version);
        const versions = await adminApi.getPromptVersions(key);
        setPromptVersions(versions);
        setSelectedPromptVersion(versions.find((item) => item.version === version) ?? null);
        setPrompts(await adminApi.getPrompts());
      } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("admin_prompt_activate_error")); }
    } });
  };

  const deletePromptVersion = () => {
    if (!promptKey || !selectedPromptVersion || selectedPromptVersion.isActive || promptVersions.length <= 1) return;
    const key = promptKey;
    const version = selectedPromptVersion.version;
    setConfirmation({ title: t("common_delete"), confirmLabel: t("common_delete"), message: `Delete v${version}? This cannot be undone.`, onConfirm: async () => {
      try {
        await adminApi.deletePromptVersion(key, version);
        const versions = await adminApi.getPromptVersions(key);
        setPromptVersions(versions);
        setSelectedPromptVersion(versions.find((item) => item.isActive) ?? versions[0] ?? null);
        setPrompts(await adminApi.getPrompts());
      } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not delete prompt version."); }
    } });
  };

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
          setError(requestError instanceof Error ? requestError.message : t("admin_suggestion_review_error"));
    }
  };

  const saveSkill = async () => {
    if (!editingSkill) return;

    const canonicalName = editCanonical.trim();
    const categoryName = editCategory.trim();

    if (!canonicalName || !categoryName) {
      setError(t("admin_skill_required"));
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
      setError(requestError instanceof Error ? requestError.message : t("admin_skill_update_error"));
    } finally {
      setSavingSkill(false);
    }
  };

  const deleteSkill = async (skill: AdminSkill) => {
    setConfirmation({ message: t("admin_skill_delete_confirm").replace("{name}", skill.canonical), onConfirm: async () => {
    setError("");
    try {
      await adminApi.deleteSkill(skill.id);
      setOverview((current) => current ? { ...current, skills: current.skills.filter((item) => item.id !== skill.id) } : current);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("admin_skill_delete_error"));
    }
    } });
  };

  const editableFactors = factors.map((factor) => ({
    ...factor,
    value: weightValues[factor.key] ?? String(factor.value),
  }));
  const numericWeights = editableFactors.map((factor) => Number(factor.value));
  const ok = editableFactors.every((factor, index) =>
    factor.value.length > 0 && /^\d+$/.test(factor.value) && Number.isInteger(numericWeights[index]) && numericWeights[index] > 0,
  );
  const mandatoryWeight = Number(weightValues.mandatory);
  const desiredWeight = Number(weightValues.desired);

  const saveWeights = async () => {
    if (!ok) {
      setError(t("admin_weight_invalid"));
      return;
    }

    setSavingWeights(true);
    setError("");

    try {
      const updated = await adminApi.updateMatchingWeights({
        mandatoryRequirementWeight: mandatoryWeight,
        desiredRequirementWeight: desiredWeight,
      });
      setOverview(updated);
      setWeightValues(Object.fromEntries(updated.matchingFactors.map((factor) => [factor.key, String(factor.value)])));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("admin_weight_save_error"));
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
      setWeightValues(Object.fromEntries(updated.matchingFactors.map((factor) => [factor.key, String(factor.value)])));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("admin_weight_reset_error"));
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-5">
        <ConfirmDialog open={confirmation !== null} title={confirmation?.title ?? t("common_delete")} confirmLabel={confirmation?.confirmLabel} confirmVariant={confirmation?.title === t("prompt_set_active") ? "primary" : "danger"} message={confirmation?.message ?? ""} onClose={() => setConfirmation(null)} onConfirm={async () => { if (confirmation) await confirmation.onConfirm(); setConfirmation(null); }} />
        <PageHeader title={t("admin_title")} description={t("admin_description")} />

        {error && (
          <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-secondary">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("admin_skills_count"), value: loading || error ? "—" : skills.length },
            { label: t("admin_matching_factors"), value: loading || error ? "—" : factors.length },
            { label: t("admin_feature_flags"), value: loading || error ? "—" : capabilities.length },
          ].map((item) => (
            <div key={item.label} className="bg-app-surface border border-app-border rounded-lg px-4 py-3" style={{ boxShadow: "var(--shadow-surface)" }}>
              <p className="text-[10px] uppercase tracking-wide text-app-faint">{item.label}</p>
              <p className="text-lg font-semibold font-mono text-app-primary mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

        {tab === "prompts" && !promptKey && promptLoading && prompts.length === 0 && (
          <section className="bg-app-surface border border-app-border rounded-lg p-4 text-xs text-app-muted">{t("prompt_loading")}</section>
        )}

        {tab === "prompts" && !promptKey && !promptLoading && prompts.length === 0 && (
          <section className="bg-app-surface border border-app-border rounded-lg p-4 text-xs text-app-muted">{t("prompt_empty")}</section>
        )}

        {tab === "prompts" && promptKey && (
          <section className="space-y-3">
            {!selectedPromptVersion ? (
              <div className="bg-app-surface border border-app-border rounded-lg p-4 text-xs text-app-muted">{t("prompt_loading")}</div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => { setPromptKey(null); setSelectedPromptVersion(null); }} className="inline-flex items-center gap-1 text-xs text-app-muted hover:text-app-primary"><ArrowLeft size={12} /> {t("prompt_back")}</button>
                  <h2 className="text-sm font-semibold text-app-primary">{selectedPromptVersion.displayName}</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3">
                    <p className="text-[11px] text-app-muted">Active version</p>
                    <p className="mt-1 text-xl font-semibold text-app-primary">v{promptVersions.find((version) => version.isActive)?.version ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3">
                    <p className="text-[11px] text-app-muted">Version history</p>
                    <p className="mt-1 text-xl font-semibold text-app-primary">{promptVersions.length}</p>
                  </div>
                </div>
                <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <aside className="rounded-lg border border-app-border bg-app-surface p-3 space-y-2">
                    <h3 className="text-xs font-semibold text-app-primary">{t("prompt_history")}</h3>
                    {promptVersions.map((version) => (
                      <button key={version.version} type="button" onClick={() => { setSelectedPromptVersion(version); setEditingPrompt(false); setCopiedItem(null); }}
                        aria-current={selectedPromptVersion.version === version.version ? "true" : undefined}
                        className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${selectedPromptVersion.version === version.version ? "border-app-brand bg-app-brand-soft" : "border-app-border hover:bg-app"}`}>
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-app-primary">v{version.version}</span>
                          {version.isActive && <StatusBadge tone="success">{t("prompt_active")}</StatusBadge>}
                        </span>
                        <span className="mt-1 block text-[11px] text-app-muted">{formatDate(version.createdAt, locale)}</span>
                      </button>
                    ))}
                  </aside>
                  <div className="min-w-0 space-y-4">
                    <section className="rounded-lg border border-app-border bg-app-surface p-5 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-app-primary">Prompt Content · v{selectedPromptVersion.version}</h3>
                          <p className="mt-1 text-xs text-app-muted">Editing creates a new active version; saved versions are not overwritten.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedPromptVersion.isActive && <StatusBadge tone="success">{t("prompt_active")}</StatusBadge>}
                          <Button variant="ghost" onClick={() => void copyText(selectedPromptVersion.content, "prompt")}>{copiedItem === "prompt" ? "✓ Copied" : "Copy prompt"}</Button>
                        </div>
                      </div>
                      <p className="text-xs text-app-muted">Created {formatDateTime(selectedPromptVersion.createdAt, locale)}{selectedPromptVersion.changeNote ? ` · ${selectedPromptVersion.changeNote}` : ""}</p>
                      {editingPrompt ? (
                        <div className="space-y-3">
                          <p className="text-xs text-app-brand">{t("prompt_editing_based")} v{selectedPromptVersion.version}</p>
                          <textarea value={promptContent} onChange={(event) => setPromptContent(event.target.value)} rows={18}
                            className="w-full rounded-md border border-app-border bg-app px-4 py-3 text-sm font-mono leading-7 text-app-primary outline-none focus:border-app-brand" />
                          <input value={promptChangeNote} onChange={(event) => setPromptChangeNote(event.target.value)}
                            placeholder={t("prompt_change_note")} className="w-full rounded-md border border-app-border bg-app px-3 py-2 text-sm text-app-primary outline-none focus:border-app-brand" />
                          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditingPrompt(false)}>{t("common_cancel")}</Button><Button variant="primary" onClick={() => void savePromptVersion()}>{t("prompt_save_version")}</Button></div>
                        </div>
                      ) : (
                        <>
                          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-app-border bg-app p-4 font-mono text-[13px] leading-7 text-app-secondary">{selectedPromptVersion.content}</pre>
                          <div className="flex flex-wrap justify-end gap-2">
                            {!selectedPromptVersion.isActive && promptVersions.length > 1 && <Button variant="danger" onClick={deletePromptVersion}>{t("common_delete")}</Button>}
                            {!selectedPromptVersion.isActive && <Button variant="primary" onClick={() => void activatePromptVersion()}>{t("prompt_set_active")}</Button>}
                            <Button variant="ghost" onClick={() => { setPromptContent(selectedPromptVersion.content); setPromptChangeNote(""); setEditingPrompt(true); }}>{t("common_edit")}</Button>
                          </div>
                        </>
                      )}
                    </section>
                    <section className="rounded-lg border border-app-border bg-app-surface overflow-hidden">
                      <button type="button" onClick={() => setRuntimeExpanded((value) => !value)}
                        aria-expanded={runtimeExpanded}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-app">
                        <span>
                          <span className="block text-sm font-semibold text-app-primary">Runtime Contract</span>
                          <span className="mt-1 block text-xs text-app-muted">Backend-enforced output rules and validation · Read-only</span>
                        </span>
                        <span className="flex items-center gap-2 text-xs text-app-muted"><span className="rounded border border-app-border px-2 py-1">Backend</span>{runtimeExpanded ? "−" : "+"}</span>
                      </button>
                      {runtimeExpanded && (
                        <div className="space-y-3 border-t border-app-border px-5 py-4">
                          <p className="text-xs leading-5 text-app-muted">These instructions are separate from the editable prompt. JSON Schema and validation are controlled by the API.</p>
                          {runtimeContract && (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-medium text-app-secondary">Output instructions · Full original text</span>
                                <div className="flex gap-2">
                                  <Button variant="ghost" onClick={() => void copyText(runtimeContract.content, "contract")}>{copiedItem === "contract" ? "✓ Copied" : "Copy contract"}</Button>
                                  <Button variant="ghost" onClick={() => setRuntimeShowFull((value) => !value)}>{runtimeShowFull ? "Collapse text" : "Show full text"}</Button>
                                </div>
                              </div>
                              <pre className={`overflow-auto whitespace-pre-wrap break-words rounded-lg border border-app-border bg-app p-4 font-mono text-[13px] leading-7 text-app-secondary ${runtimeShowFull ? "" : "max-h-80"}`}>{runtimeContract.content.replace(/\\n/g, "\n")}</pre>
                              <div className="rounded-md border border-app-border px-3 py-3">
                                <p className="text-xs font-semibold text-app-primary">JSON Schema &amp; Validation</p>
                                <p className="mt-1 text-xs leading-5 text-app-muted">{runtimeContract.note}</p>
                              </div>
                            </>
                          )}
                          {!runtimeContract && !runtimeContractError && <p className="text-xs text-app-muted">Loading runtime contract…</p>}
                          {runtimeContractError && <p className="text-xs text-app-muted">Runtime contract could not be loaded.</p>}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {tab === "prompts" && !selectedPromptVersion && promptKey === null && prompts.length > 0 && (
          <section className="bg-app-surface border border-app-border rounded-lg p-4"><DataTable<PromptSummary> columns={[{ key: "displayName", header: t("prompt_prompt"), render: (item) => <span className="font-medium text-app-primary">{item.displayName}</span> }, { key: "activeVersion", header: t("prompt_active_version"), render: (item) => <span className="text-app-brand">v{item.activeVersion}</span> }, { key: "versionCount", header: t("prompt_versions"), render: (item) => <span>{item.versionCount}</span> }, { key: "updatedAt", header: t("prompt_updated"), render: (item) => <span>{formatDate(item.updatedAt, locale)}</span> }, { key: "action", header: t("prompt_action"), render: (item) => <Button variant="primary" onClick={() => setPromptKey(item.promptKey)}>{t("prompt_view")}</Button> }]} rows={prompts} rowKey={(item) => item.promptKey} /></section>
        )}

        {tab === "taxonomy" && (
          <div className="flex gap-2 border-b border-app-border">
            <button type="button" onClick={() => setTaxonomyTab("catalog")} className={`px-3 py-2 text-xs ${taxonomyTab === "catalog" ? "text-app-primary border-b-2 border-app-brand" : "text-app-muted"}`}>{t("admin_catalog")} ({skills.length})</button>
            <button type="button" onClick={() => setTaxonomyTab("suggestions")} className={`px-3 py-2 text-xs ${taxonomyTab === "suggestions" ? "text-app-primary border-b-2 border-app-brand" : "text-app-muted"}`}>{t("admin_suggestions")} ({suggestions.length})</button>
          </div>
        )}

                {tab === "taxonomy" && taxonomyTab === "suggestions" && (
          <section className="bg-app-surface border border-app-border rounded-lg p-4 space-y-3" style={{ boxShadow: "var(--shadow-surface)" }}>
            <div>
              <h2 className="text-xs font-semibold text-app-primary">{t("admin_taxonomy_suggestions")} ({suggestions.length})</h2>
              <p className="text-[11px] text-app-muted mt-1">{t("admin_suggestions_help")}</p>
            </div>
            <DataTable<AdminSuggestion>
              columns={[
                { key: "name", header: t("admin_suggestion"), render: (item) => <span className="font-mono font-medium text-app-primary">{item.name}</span> },
                { key: "category", header: t("admin_suggested_category"), render: (item) => <span className="text-app-secondary">{categoryLabel(item.category)}</span> },
                { key: "occurrences", header: t("admin_seen"), render: (item) => <span className="font-mono">{item.occurrences}</span> },
                { key: "action", header: t("admin_actions"), render: (item) => <Button variant="primary" onClick={() => { setReviewingSuggestion(item); setSuggestionCanonical(item.name); setSuggestionCategory(item.category); setSuggestionAliases(""); }}>{t("admin_review")}</Button> },
              ]}
              rows={suggestions}
              rowKey={(item) => String(item.id)}
              emptyMessage={t("admin_no_suggestions")}
            />
          </section>
        )}

        <Modal open={reviewingSuggestion !== null} title={t("admin_review_suggestion")} onClose={() => setReviewingSuggestion(null)}>
          {reviewingSuggestion && (
            <div className="p-5 space-y-4">
              <p className="text-[11px] text-app-muted">{t("admin_found_times")} {reviewingSuggestion.occurrences} {t("admin_times")}</p>
              <Input value={suggestionCanonical} onChange={(event) => setSuggestionCanonical(event.target.value)} placeholder={t("admin_canonical_name")} />
              <Select value={suggestionCategory} onChange={(event) => setSuggestionCategory(event.target.value)}><option value="Unclassified">{t("taxonomy_category_unclassified")}</option><option value="Human language">{t("taxonomy_category_human_language")}</option><option value="Language">{t("taxonomy_category_language")}</option><option value="Framework">{t("taxonomy_category_framework")}</option><option value="Database">{t("taxonomy_category_database")}</option><option value="Messaging">{t("taxonomy_category_messaging")}</option><option value="Cloud">{t("taxonomy_category_cloud")}</option><option value="AI/ML">{t("taxonomy_category_ai_ml")}</option><option value="Backend">{t("taxonomy_category_backend")}</option></Select>
              <Input value={suggestionAliases} onChange={(event) => setSuggestionAliases(event.target.value)} placeholder={t("admin_aliases_placeholder")} />
              <div className="flex justify-between gap-2"><Button variant="ghost" onClick={() => void reviewSuggestion(false)}>{t("admin_dismiss_suggestion")}</Button><div className="flex gap-2"><Button variant="ghost" onClick={() => setReviewingSuggestion(null)}>{t("common_cancel")}</Button><Button variant="primary" onClick={() => void reviewSuggestion(true)}>{t("admin_approve")}</Button></div></div>
            </div>
          )}
        </Modal>

{tab === "taxonomy" && taxonomyTab === "catalog" && (
          <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
            <div className="flex items-end justify-between gap-4 px-4 py-3 border-b border-app-border">
              <div className="flex items-end gap-2 flex-1">
                <div className="relative w-full max-w-sm">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("admin_search_skills")}
                    className="w-full bg-app border border-app-border rounded-md pl-8 pr-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand"
                  />
                </div>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="bg-app border border-app-border rounded-md px-3 py-2 text-xs text-app-secondary outline-none"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {categoryLabel(item)}
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
                      {categoryLabel(skill.category)}
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
                            <span key={alias} className="text-[10px] font-mono text-app-secondary px-1.5 py-0.5 rounded bg-app-raised border border-app-border">
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
                      <span className="text-[10px] text-app-muted mr-2">{skill.consultantCount} {t("admin_consultants")}</span>
                      <Button variant="ghost" icon={<Edit3 size={11} />} onClick={() => openSkillEditor(skill)}>
                        {t("admin_edit")}
                      </Button>
                      <Button
                        variant="danger"
                        icon={<Trash2 size={12} />}
                        onClick={() => void deleteSkill(skill)}
                        aria-label={t("common_delete") + " " + skill.canonical}
                        title={t("common_delete") + " " + skill.canonical}
                        className="px-2"
                      >
                        <span className="sr-only">{t("common_delete")}</span>
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={pagedSkills}
              rowKey={(skill: AdminSkill) => skill.id}
              emptyMessage={loading ? t("admin_loading_skills") : t("admin_empty_skills")}
            />

            {!loading && filteredSkills.length > skillsPerPage && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-app-border">
                <p className="text-[10px] text-app-muted">
                  {t("admin_showing")} {(currentSkillPage - 1) * skillsPerPage + 1}–{Math.min(currentSkillPage * skillsPerPage, filteredSkills.length)} {t("admin_of")} {filteredSkills.length} {t("admin_skills")}
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
                          : "bg-app-surface text-app-secondary border-app-border")
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
              <span>{ok ? t("admin_weights_ready") : t("admin_weights_positive")}</span>
              <span className="text-app-muted">{t("admin_backend_configuration")}</span>
            </div>

            <div className="bg-app-surface border border-app-border rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
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
                      type="number"
                      min={1}
                      value={factor.value}
                      onChange={(event) =>
                        setWeightValues((current) => ({
                          ...current,
                          [factor.key]: event.target.value.replace(/^0+(?=\d)/, ""),
                        }))
                      }
                      disabled={savingWeights}
                      className="admin-weight-input w-20 rounded-md border border-app-border bg-app px-3 py-2 text-xs text-app-primary outline-none transition-colors focus:border-app-brand focus:ring-1 focus:ring-app-brand"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-secondary space-y-2">
              <p className="font-medium text-app-primary">{t("admin_score_calculated")}</p>
              <p>{t("admin_mandatory_weight_explanation")}</p>
              <p className="font-mono">{t("admin_score_formula")}</p>
              <p>{t("admin_score_scope")}</p>
              <p>{t("admin_score_example")}: 3 Mandatory + 2 Desired. Total = (3 × {weightValues.mandatory || 0}) + (2 × {weightValues.desired || 0}) = {mandatoryWeight * 3 + desiredWeight * 2}. Matching 2 Mandatory + 2 Desired gives {(mandatoryWeight * 2 + desiredWeight * 2)} / {(mandatoryWeight * 3 + desiredWeight * 2)} × 100 = {((mandatoryWeight * 2 + desiredWeight * 2) / Math.max(1, mandatoryWeight * 3 + desiredWeight * 2) * 100).toFixed(2)}%.</p>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" icon={<RefreshCw size={11} />} onClick={() => void resetWeights()} disabled={savingWeights}>
                {t("admin_reset")}
              </Button>
              <Button variant="primary" icon={<Save size={11} />} onClick={() => void saveWeights()} disabled={savingWeights || !ok}>
                {savingWeights ? t("common_saving") : t("admin_save_w")}
              </Button>
            </div>
          </div>
        )}

        {tab === "flags" && (
          <div className="bg-app-surface border border-app-border rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
            <div className="px-5 py-3 border-b border-app-border">
              <p className="text-xs font-medium text-app-primary">{t("tab_flags")}</p>
              <p className="text-[11px] text-app-muted mt-0.5">
                {t("admin_feature_flags_help")}
              </p>
            </div>

            {capabilities.map((capability, index) => (
              <div
                key={capability.key}
                className="flex items-center justify-between gap-5 px-5 py-4"
                style={{ borderBottom: index < capabilities.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}
              >
                {(() => {
                  const display = featureFlagCopy(capability);
                  return (
                    <>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-app-primary">{display.label}</p>
                    <StatusBadge tone={capability.enabled ? "success" : "neutral"}>
                      {capability.enabled ? t("common_enabled") : t("common_disabled")}
                    </StatusBadge>
                  </div>
                  <p className="text-[11px] text-app-muted mt-1">{display.description}</p>
                  <p className="text-[10px] text-app-faint font-mono mt-1">{capability.key}</p>
                </div>

                <button
                  disabled
                  className="relative w-10 h-5 rounded-full flex-none cursor-not-allowed opacity-80"
                  style={{ background: capability.enabled ? "var(--color-brand)" : "var(--color-border)" }}
                  aria-label={display.label}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white"
                    style={{ transform: capability.enabled ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
                    </>
                  );
                })()}
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
