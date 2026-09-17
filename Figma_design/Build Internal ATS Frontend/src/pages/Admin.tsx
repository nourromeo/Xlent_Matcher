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
  { id: "p2", name: "Job Extractor", model: "gpt-4o", version: "v1.1", tokens: "~1.2k", cost: "$0.008", active: true },
  { id: "p3", name: "Match Judge", model: "gpt-4o", version: "v1.4", tokens: "~2.1k", cost: "$0.014", active: true },
  { id: "p4", name: "CV Parser", model: "gpt-4o-mini", version: "v2.2", tokens: "~4.6k", cost: "$0.006", active: false },
];

const AI_COSTS = [
  { date: "Sep 9", model: "gpt-4o", operation: "cv_parse", runs: 5, cost: 0.16 },
  { date: "Sep 9", model: "text-embedding-3-large", operation: "embed_cv", runs: 12, cost: 0.04 },
  { date: "Sep 9", model: "gpt-4o", operation: "match_judge", runs: 3, cost: 0.042 },
  { date: "Sep 8", model: "gpt-4o", operation: "cv_parse", runs: 18, cost: 0.576 },
  { date: "Sep 8", model: "cohere-rerank-v3", operation: "rerank", runs: 8, cost: 0.016 },
];

const FLAGS_DATA = [
  { key: "BlindMode", desc: "Exclude name, photo, age, gender, nationality from scoring", enabled: true },
  { key: "UseReranker", desc: "Enable Cohere reranking pass before hybrid scoring", enabled: true },
  { key: "UseCloudOcr", desc: "Use Azure Document Intelligence for scanned PDFs", enabled: false },
  { key: "UseStubAi", desc: "Use fake AI responses (no API keys required)", enabled: false },
];

export default function Admin() {
  const { t } = useI18n();

  const TABS = [t("tab_taxonomy"), t("tab_weights"), t("tab_prompts"), t("tab_costs"), t("tab_flags")] as const;
  type TabT = (typeof TABS)[number];

  const WEIGHTS_DEF = [
    { key: "mustHaveCoverage", label: t("score_mustHave"), value: 40, desc: "Strong penalty if a required skill is missing" },
    { key: "semanticSimilarity", label: t("score_semantic"), value: 20, desc: "Post-rerank cosine similarity score" },
    { key: "experienceRecency", label: t("score_experience"), value: 15, desc: "Weighted by 0.85^(yearNow - lastUsedYear)" },
    { key: "seniority", label: t("score_seniority"), value: 10, desc: "How well candidate seniority matches job level" },
    { key: "niceToHave", label: t("score_niceToHave"), value: 5, desc: "Optional skills coverage" },
    { key: "availability", label: t("score_availability"), value: 10, desc: "Practical fit factors" },
  ];

  const [tab, setTab] = useState<TabT>(TABS[0]);
  const [weights, setWeights] = useState<Record<string, number>>(Object.fromEntries(WEIGHTS_DEF.map((w) => [w.key, w.value])));
  const [flags, setFlags] = useState<Record<string, boolean>>(Object.fromEntries(FLAGS_DATA.map((f) => [f.key, f.enabled])));

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const ok = total === 100;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-base font-semibold text-base">{t("admin_title")}</h1>
        <p className="text-xs text-muted mt-0.5">{t("admin_sub")}</p>
      </div>

      <div className="flex border-b border-base gap-0">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className="text-xs px-4 py-2 border-b-2 transition-colors"
            style={tab === tb ? { borderColor: "var(--ats-indigo)", color: "var(--ats-text)", fontWeight: 500 } : { borderColor: "transparent", color: "var(--ats-muted)" }}>
            {tb}
          </button>
        ))}
      </div>

      {/* Taxonomy */}
      {tab === TABS[0] && (
        <div className="bg-surface border border-base rounded-lg overflow-hidden" style={{ boxShadow: "var(--ats-shadow)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-base">
            <span className="text-xs font-medium text-base">{t("tab_taxonomy")}</span>
            <button className="flex items-center gap-1.5 text-[11px] text-indigo hover:opacity-70"><Plus size={11} />{t("admin_add_skill")}</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-base">
                {[t("admin_canonical"), t("admin_category"), t("admin_aliases"), ""].map((h) => (
                  <th key={h} className="text-[10px] font-medium text-3 uppercase tracking-wider text-left px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKILLS.map((s, i) => (
                <tr key={s.id} className="group border-b border-sub hover:bg-raised transition-colors">
                  <td className="px-4 py-2.5"><span className="text-xs font-mono font-medium text-base">{s.canonical}</span></td>
                  <td className="px-4 py-2.5"><span className="text-[11px] text-2 px-2 py-0.5 rounded" style={{ background: "var(--ats-surface-r)" }}>{s.category}</span></td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {s.aliases.map((a) => <span key={a} className="text-[10px] font-mono text-2 px-1.5 py-0.5 rounded" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{a}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <button className="opacity-0 group-hover:opacity-100 text-3 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Weights */}
      {tab === TABS[1] && (
        <div className="space-y-3">
          <div className="text-xs px-3 py-2 rounded flex items-center gap-2"
            style={{ background: ok ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${ok ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`, color: ok ? "var(--ats-green)" : "var(--ats-amber)" }}>
            {t("admin_total_w")} {total}% {!ok && t("admin_must_eq")} {ok && "✓"}
          </div>
          <div className="bg-surface border border-base rounded-lg" style={{ boxShadow: "var(--ats-shadow)" }}>
            {WEIGHTS_DEF.map((w, i) => (
              <div key={w.key} className="px-4 py-3" style={{ borderBottom: i < WEIGHTS_DEF.length - 1 ? "1px solid var(--ats-border-s)" : "none" }}>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-base">{w.label}</p>
                    <p className="text-[11px] text-3 mt-0.5">{w.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={60} value={weights[w.key]} onChange={(e) => setWeights((p) => ({ ...p, [w.key]: Number(e.target.value) }))} className="w-24 accent-indigo-500" />
                    <span className="text-sm font-mono text-base w-10 text-right">{weights[w.key]}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded hover:opacity-80 transition-opacity" style={{ background: "var(--ats-indigo)" }}>
              <Save size={11} />{t("admin_save_w")}
            </button>
          </div>
        </div>
      )}

      {/* Prompts */}
      {tab === TABS[2] && (
        <div className="bg-surface border border-base rounded-lg overflow-hidden" style={{ boxShadow: "var(--ats-shadow)" }}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-base">
                {["Prompt", "Model", "Version", "Avg Tokens", "Avg Cost", "Status", ""].map((h) => (
                  <th key={h} className="text-[10px] font-medium text-3 uppercase tracking-wider text-left px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROMPTS.map((p, i) => (
                <tr key={p.id} className="border-b border-sub hover:bg-raised transition-colors">
                  <td className="px-4 py-2.5 text-xs text-base font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-2">{p.model}</td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-indigo">{p.version}</td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-muted">{p.tokens}</td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-muted">{p.cost}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={p.active ? { color: "var(--ats-green)", background: "rgba(34,197,94,0.10)" } : { color: "var(--ats-muted)", background: "var(--ats-surface-r)" }}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><button className="text-indigo hover:opacity-70"><RefreshCw size={11} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Costs */}
      {tab === TABS[3] && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[{ label: "Sep total", value: "$38.40" }, { label: "Avg per CV", value: "$0.048" }, { label: "Avg per match", value: "$0.022" }].map((s) => (
              <div key={s.label} className="bg-surface border border-base rounded-lg px-4 py-3" style={{ boxShadow: "var(--ats-shadow)" }}>
                <p className="text-xl font-semibold font-mono text-base">{s.value}</p>
                <p className="text-[10px] text-3 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-surface border border-base rounded-lg overflow-hidden" style={{ boxShadow: "var(--ats-shadow)" }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-base">
                  {["Date", "Model", "Operation", "Runs", "Total Cost"].map((h) => (
                    <th key={h} className="text-[10px] font-medium text-3 uppercase tracking-wider text-left px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AI_COSTS.map((row, i) => (
                  <tr key={i} className="border-b border-sub hover:bg-raised transition-colors">
                    <td className="px-4 py-2.5 text-[11px] text-muted">{row.date}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-2">{row.model}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-indigo">{row.operation}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-muted">{row.runs}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-base">${row.cost.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Flags */}
      {tab === TABS[4] && (
        <div className="bg-surface border border-base rounded-lg" style={{ boxShadow: "var(--ats-shadow)" }}>
          {FLAGS_DATA.map((f, i) => (
            <div key={f.key} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: i < FLAGS_DATA.length - 1 ? "1px solid var(--ats-border-s)" : "none" }}>
              <div>
                <p className="text-xs font-medium text-base font-mono">{f.key}</p>
                <p className="text-[11px] text-muted mt-0.5">{f.desc}</p>
              </div>
              <button onClick={() => setFlags((p) => ({ ...p, [f.key]: !p[f.key] }))}
                className="relative w-9 h-5 rounded-full transition-colors flex-none"
                style={{ background: flags[f.key] ? "var(--ats-indigo)" : "var(--ats-border)" }}>
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
