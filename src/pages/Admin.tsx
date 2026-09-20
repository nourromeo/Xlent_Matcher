import { useState } from "react";
import { Save, Plus, Trash2, RefreshCw } from "lucide-react";
import { useI18n } from "../i18n";

const SKILLS = [
  { id: "s1", canonical: "Go", aliases: ["Golang", "Go lang"], category: "Language" },
  { id: "s2", canonical: "TypeScript", aliases: ["TS", "TSX"], category: "Language" },
  { id: "s3", canonical: "PostgreSQL", aliases: ["Postgres", "pg"], category: "Database" },
  { id: "s4", canonical: "Kubernetes", aliases: ["k8s", "K8S"], category: "Infrastructure" },
  { id: "s5", canonical: "PyTorch", aliases: ["torch", "pytorch"], category: "ML Framework" },
];

const PROMPTS = [
  { id: "p1", name: "CV Parser", model: "gpt-4o", version: "v2.3", tokens: "~4.8k", cost: "$0.032", active: true },
  { id: "p2", name: "Assignment Requirements Extractor", model: "gpt-4o", version: "v1.1", tokens: "~1.2k", cost: "$0.008", active: true },
  { id: "p3", name: "Match Explanation", model: "gpt-4o", version: "v1.4", tokens: "~2.1k", cost: "$0.014", active: true },
  { id: "p4", name: "CV Parser", model: "gpt-4o-mini", version: "v2.2", tokens: "~4.6k", cost: "$0.006", active: false },
];

const AI_COSTS = [
  { date: "Sep 9", model: "gpt-4o", operation: "cv_parse", runs: 5, cost: 0.16 },
  { date: "Sep 9", model: "text-embedding-3-large", operation: "embed_cv", runs: 12, cost: 0.04 },
  { date: "Sep 9", model: "gpt-4o", operation: "match_explanation", runs: 3, cost: 0.042 },
  { date: "Sep 8", model: "gpt-4o", operation: "cv_parse", runs: 18, cost: 0.576 },
  { date: "Sep 8", model: "cohere-rerank-v3", operation: "rerank", runs: 8, cost: 0.016 },
];

const FLAGS_DATA = [
  { key: "SkillsFirstAnalysis", desc: "Base matching on assignment evidence and exclude personal attributes from scoring", enabled: true },
  { key: "UseReranker", desc: "Enable Cohere reranking pass before hybrid scoring", enabled: true },
  { key: "UseCloudOcr", desc: "Use Azure Document Intelligence for scanned PDFs", enabled: false },
  { key: "UseStubAi", desc: "Use fake AI responses (no API keys required)", enabled: false },
];

export default function Admin() {
  const { t } = useI18n();

  const TABS = [t("tab_taxonomy"), t("tab_weights"), t("tab_prompts"), t("tab_costs"), t("tab_flags")] as const;

  const WEIGHTS_DEF = [
    { key: "mustHaveCoverage", label: t("score_mustHave"), value: 40, desc: "Strong penalty if a required skill is missing" },
    { key: "semanticSimilarity", label: t("score_semantic"), value: 20, desc: "Post-rerank cosine similarity score" },
    { key: "experienceRecency", label: t("score_experience"), value: 15, desc: "Weighted by 0.85^(yearNow - lastUsedYear)" },
    { key: "seniority", label: t("score_seniority"), value: 10, desc: "How well consultant seniority matches the assignment level" },
    { key: "niceToHave", label: t("score_niceToHave"), value: 5, desc: "Optional skills coverage" },
    { key: "availability", label: t("score_availability"), value: 10, desc: "Practical fit factors" },
  ];

  const [tab, setTab] = useState(0);
  const [weights, setWeights] = useState<Record<string, number>>(Object.fromEntries(WEIGHTS_DEF.map((w) => [w.key, w.value])));
  const [flags, setFlags] = useState<Record<string, boolean>>(Object.fromEntries(FLAGS_DATA.map((f) => [f.key, f.enabled])));

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const ok = total === 100;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-app-primary font-semibold text-app-primary">{t("admin_title")}</h1>
        <p className="text-xs text-app-muted mt-0.5">{t("admin_sub")}</p>
      </div>

      <div className="flex border-b border-app gap-0">
        {TABS.map((tb, index) => (
          <button key={tb} onClick={() => setTab(index)}
            className="text-xs px-4 py-2 border-b-2 transition-colors"
            style={tab === index ? { borderColor: "var(--color-brand)", color: "var(--color-text-primary)", fontWeight: 500 } : { borderColor: "transparent", color: "var(--color-text-app-muted)" }}>
            {tb}
          </button>
        ))}
      </div>

      {/* Taxonomy */}
      {tab === 0 && (
        <div className="bg-app-surface border border-app rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <span className="text-xs font-medium text-app-primary">{t("tab_taxonomy")}</span>
            <button className="flex items-center gap-1.5 text-[11px] text-app-brand hover:opacity-70"><Plus size={11} />{t("admin_add_skill")}</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-app">
                {[t("admin_canonical"), t("admin_category"), t("admin_aliases"), ""].map((h) => (
                  <th key={h} className="text-[10px] font-medium text-app-faint uppercase tracking-wider text-left px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKILLS.map((s, i) => (
                <tr key={s.id} className="group border-b border-app-subtle hover:bg-app-raised transition-colors">
                  <td className="px-4 py-2.5"><span className="text-xs font-mono font-medium text-app-primary">{s.canonical}</span></td>
                  <td className="px-4 py-2.5"><span className="text-[11px] text-app-secondary px-2 py-0.5 rounded" style={{ background: "var(--color-surface-raised)" }}>{s.category}</span></td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {s.aliases.map((a) => <span key={a} className="text-[10px] font-mono text-app-secondary px-1.5 py-0.5 rounded" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>{a}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <button className="opacity-0 group-hover:opacity-100 text-app-faint hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Weights */}
      {tab === 1 && (
        <div className="space-y-3">
          <div className="text-xs px-3 py-2 rounded flex items-center gap-2"
            style={{ background: ok ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${ok ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`, color: ok ? "var(--color-success)" : "var(--color-warning)" }}>
            {t("admin_total_w")} {total}% {!ok && t("admin_must_eq")} {ok && "✓"}
          </div>
          <div className="bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
            {WEIGHTS_DEF.map((w, i) => (
              <div key={w.key} className="px-4 py-3" style={{ borderBottom: i < WEIGHTS_DEF.length - 1 ? "1px solid var(--color-border-app-subtletle)" : "none" }}>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-app-primary">{w.label}</p>
                    <p className="text-[11px] text-app-faint mt-0.5">{w.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={60} value={weights[w.key]} onChange={(e) => setWeights((p) => ({ ...p, [w.key]: Number(e.target.value) }))} className="w-24 accent-indigo-500" />
                    <span className="text-sm font-mono text-app-primary w-10 text-right">{weights[w.key]}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded hover:opacity-80 transition-opacity" style={{ background: "var(--color-brand)" }}>
              <Save size={11} />{t("admin_save_w")}
            </button>
          </div>
        </div>
      )}

      {/* Prompts */}
      {tab === 2 && (
        <div className="bg-app-surface border border-app rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-app">
                {["Prompt", "Model", "Version", "Avg Tokens", "Avg Cost", "Status", ""].map((h) => (
                  <th key={h} className="text-[10px] font-medium text-app-faint uppercase tracking-wider text-left px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROMPTS.map((p, i) => (
                <tr key={p.id} className="border-b border-app-subtle hover:bg-app-raised transition-colors">
                  <td className="px-4 py-2.5 text-xs text-app-primary font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-app-secondary">{p.model}</td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-app-brand">{p.version}</td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-app-muted">{p.tokens}</td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-app-muted">{p.cost}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={p.active ? { color: "var(--color-success)", background: "rgba(34,197,94,0.10)" } : { color: "var(--color-text-app-muted)", background: "var(--color-surface-raised)" }}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><button className="text-app-brand hover:opacity-70"><RefreshCw size={11} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Costs */}
      {tab === 3 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[{ label: "Sep total", value: "$38.40" }, { label: "Avg per CV", value: "$0.048" }, { label: "Avg per match", value: "$0.022" }].map((s) => (
              <div key={s.label} className="bg-app-surface border border-app rounded-lg px-4 py-3" style={{ boxShadow: "var(--shadow-surface)" }}>
                <p className="text-xl font-semibold font-mono text-app-primary">{s.value}</p>
                <p className="text-[10px] text-app-faint mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-app-surface border border-app rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-app">
                  {["Date", "Model", "Operation", "Runs", "Total Cost"].map((h) => (
                    <th key={h} className="text-[10px] font-medium text-app-faint uppercase tracking-wider text-left px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AI_COSTS.map((row, i) => (
                  <tr key={i} className="border-b border-app-subtle hover:bg-app-raised transition-colors">
                    <td className="px-4 py-2.5 text-[11px] text-app-muted">{row.date}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-app-secondary">{row.model}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-app-brand">{row.operation}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-app-muted">{row.runs}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-app-primary">${row.cost.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Flags */}
      {tab === 4 && (
        <div className="bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
          {FLAGS_DATA.map((f, i) => (
            <div key={f.key} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: i < FLAGS_DATA.length - 1 ? "1px solid var(--color-border-app-subtletle)" : "none" }}>
              <div>
                <p className="text-xs font-medium text-app-primary font-mono">{f.key}</p>
                <p className="text-[11px] text-app-muted mt-0.5">{f.desc}</p>
              </div>
              <button onClick={() => setFlags((p) => ({ ...p, [f.key]: !p[f.key] }))}
                className="relative w-9 h-5 rounded-full transition-colors flex-none"
                style={{ background: flags[f.key] ? "var(--color-brand)" : "var(--color-border)" }}>
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: flags[f.key] ? "translateX(16px)" : "translateX(0)" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
