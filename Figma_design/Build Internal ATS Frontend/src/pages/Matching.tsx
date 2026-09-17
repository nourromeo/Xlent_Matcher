import { useState } from "react";
import { CheckCircle, AlertTriangle, ChevronDown, Send, Info } from "lucide-react";
import { useI18n } from "../i18n";

const MATCHES = [
  { id: "m1", initials: "AK", name: "Candidate #1", headline: "Senior Backend Engineer · 8 yrs", score: 91,
    breakdown: { mustHave: 96, semantic: 88, experience: 92, seniority: 90, niceToHave: 70, availability: 100 },
    mustHaveCoverage: ["Go", "PostgreSQL", "Kafka", "Kubernetes"], gaps: [], niceToHave: ["Rust", "gRPC"],
    evidence: [
      { skill: "Go", cite: "Led rewrite of order-processing microservices in Go at Zalando (2021–2023), serving 50M+ daily transactions." },
      { skill: "Kafka", cite: "Architected event streaming backbone handling 200k msg/s at Zalando; zero data loss across 18 months." },
      { skill: "Kubernetes", cite: "Managed production clusters across 3 regions; introduced HPA policies reducing cloud spend by 22%." },
    ],
    llmVerdict: "Strong fit. Covers all must-have requirements with senior-level evidence. Kafka and Go expertise directly applicable to the event-driven order pipeline.",
  },
  { id: "m2", initials: "ML", name: "Candidate #2", headline: "ML Engineer · 5 yrs", score: 77,
    breakdown: { mustHave: 75, semantic: 82, experience: 74, seniority: 70, niceToHave: 50, availability: 90 },
    mustHaveCoverage: ["Go", "PostgreSQL", "Kafka"], gaps: ["Kubernetes"], niceToHave: ["gRPC"],
    evidence: [{ skill: "Go", cite: "Built internal CLI tooling and data-pipeline orchestrator in Go for DataLayer AG (2022–2023)." }],
    llmVerdict: "Partial fit. Go and PostgreSQL covered, but Kubernetes experience missing. Pipeline work in Go is relevant but less production-scale.",
  },
  { id: "m3", initials: "PS", name: "Candidate #3", headline: "Staff SRE · 11 yrs", score: 71,
    breakdown: { mustHave: 68, semantic: 75, experience: 80, seniority: 85, niceToHave: 30, availability: 60 },
    mustHaveCoverage: ["Kubernetes", "PostgreSQL"], gaps: ["Go", "Kafka"], niceToHave: [],
    evidence: [{ skill: "Kubernetes", cite: "Managed 40-node production cluster at CloudCore; implemented RBAC, PSPs, and network policies." }],
    llmVerdict: "Weak programming-language fit. Strong infra/Kubernetes coverage, but no Go or Kafka production exposure on record.",
  },
];

export default function Matching() {
  const { t } = useI18n();
  const [selected, setSelected] = useState(MATCHES[0]);
  const [expanded, setExpanded] = useState(false);

  const SCORE_LABELS: Record<string, string> = {
    mustHave: t("score_mustHave"), semantic: t("score_semantic"), experience: t("score_experience"),
    seniority: t("score_seniority"), niceToHave: t("score_niceToHave"), availability: t("score_availability"),
  };
  const WEIGHTS: Record<string, number> = { mustHave: 40, semantic: 20, experience: 15, seniority: 10, niceToHave: 5, availability: 10 };

  const barColor = (v: number) => v >= 85 ? "var(--ats-green)" : v >= 65 ? "var(--ats-indigo)" : "var(--ats-amber)";

  return (
    <div className="flex h-full">
      {/* Left */}
      <div className="w-72 flex-none border-r border-base bg-surface flex flex-col">
        <div className="px-4 py-3 border-b border-base">
          <p className="text-xs font-medium text-base">Senior Backend Engineer</p>
          <p className="text-[10px] text-muted mt-0.5">FinStream GmbH · {MATCHES.length} {t("match_matches")}</p>
        </div>
        <div className="flex-1 overflow-auto">
          {MATCHES.map((m, i) => (
            <button key={m.id} onClick={() => setSelected(m)}
              className="w-full text-left px-4 py-3 transition-colors border-b border-sub"
              style={selected.id === m.id ? { background: "var(--ats-indigo-sub)", borderLeft: "2px solid var(--ats-indigo)" } : { borderLeft: "2px solid transparent" }}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[10px] font-mono text-3 w-4">{i + 1}.</span>
                <div className="w-7 h-7 rounded-full bg-indigo-sub flex items-center justify-center text-[10px] font-semibold text-indigo">{m.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-base">{m.name}</p>
                  <p className="text-[10px] text-muted truncate">{m.headline}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--ats-border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${m.score}%`, backgroundColor: "var(--ats-indigo)" }} />
                </div>
                <span className="text-[11px] font-mono text-base w-6 text-right">{m.score}</span>
              </div>
              {m.gaps.length > 0 && (
                <div className="ml-6 mt-1.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--ats-amber)" }}>
                  <AlertTriangle size={9} />{m.gaps.join(", ")} {t("match_gap")}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 overflow-auto bg-base">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-sub flex items-center justify-center text-sm font-semibold text-indigo">{selected.initials}</div>
              <div>
                <h2 className="text-sm font-semibold text-base">{selected.name}</h2>
                <p className="text-xs text-muted">{selected.headline}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-semibold font-mono text-base">{selected.score}</p>
                <p className="text-[10px] text-3">{t("match_composite")}</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded hover:opacity-80 transition-opacity" style={{ background: "var(--ats-indigo)" }}>
                <Send size={11} />{t("match_propose")}
              </button>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="bg-surface border border-base rounded-lg p-4 space-y-3" style={{ boxShadow: "var(--ats-shadow)" }}>
            <p className="text-xs font-medium text-base mb-4">{t("match_breakdown")}</p>
            {Object.entries(selected.breakdown).map(([k, v]) => (
              <div key={k} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-2">{SCORE_LABELS[k] ?? k}</span>
                    <span className="text-[10px] text-3 font-mono">×{WEIGHTS[k] ?? 0}%</span>
                  </div>
                  <span className="text-[11px] font-mono text-base">{v}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--ats-border)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v}%`, backgroundColor: barColor(v) }} />
                </div>
              </div>
            ))}
          </div>

          {/* Coverage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
              <p className="text-xs font-medium text-base mb-3">{t("match_must")}</p>
              <div className="space-y-2">
                {selected.mustHaveCoverage.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <CheckCircle size={11} style={{ color: "var(--ats-green)" }} />
                    <span className="text-xs font-mono text-base">{s}</span>
                  </div>
                ))}
                {selected.gaps.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <AlertTriangle size={11} style={{ color: "var(--ats-amber)" }} />
                    <span className="text-xs font-mono" style={{ color: "var(--ats-amber)" }}>{s}</span>
                    <span className="text-[10px] text-3">{t("match_gap")}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
              <p className="text-xs font-medium text-base mb-3">{t("match_nice")}</p>
              {selected.niceToHave.length > 0
                ? <div className="space-y-2">{selected.niceToHave.map((s) => (<div key={s} className="flex items-center gap-2"><CheckCircle size={11} style={{ color: "var(--ats-indigo)" }} /><span className="text-xs font-mono text-2">{s}</span></div>))}</div>
                : <p className="text-xs text-3">None covered</p>}
            </div>
          </div>

          {/* LLM verdict */}
          <div className="rounded-lg p-4" style={{ background: "var(--ats-indigo-sub2)", border: "1px solid var(--ats-indigo-sub)" }}>
            <div className="flex items-start gap-2.5">
              <Info size={13} className="text-indigo flex-none mt-0.5" />
              <div>
                <p className="text-[11px] text-3 mb-1 font-mono uppercase tracking-wider">{t("match_judge")}</p>
                <p className="text-xs text-2 leading-relaxed">{selected.llmVerdict}</p>
              </div>
            </div>
          </div>

          {/* Evidence */}
          <div className="bg-surface border border-base rounded-lg" style={{ boxShadow: "var(--ats-shadow)" }}>
            <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-xs font-medium text-base">{t("match_evidence")}</span>
              <ChevronDown size={13} className="text-3 transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
            </button>
            {expanded && (
              <div className="border-t border-base">
                {selected.evidence.map((e) => (
                  <div key={e.skill} className="px-4 py-3 border-b border-sub">
                    <span className="text-[10px] font-mono font-medium text-indigo bg-indigo-sub px-1.5 py-0.5 rounded mb-2 inline-block">{e.skill}</span>
                    <p className="text-[11px] text-muted italic leading-relaxed">"{e.cite}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
