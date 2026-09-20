import { useState } from "react";
import {
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Info,
  Zap,
  Tag,
  BookOpen,
  TrendingUp,
} from "../design-system/icons";
import { MOCK_RESULT } from "../features/cvCoach";
import { PageHeader } from "../components/ui/PageHeader";

import type { CvSeverity as Severity, CvSuggestion as Suggestion, CvAnalysisResult as AnalysisResult } from "../features/cvCoach/types";

// ── Mock AI result ───────────────────────────────────────

// ── Category config ──────────────────────────────────────
const CATEGORY_CFG = {
  keyword:    { label: "Missing keyword",   icon: Tag,       color: "var(--color-brand)" },
  credential: { label: "Credential gap",    icon: BookOpen,  color: "var(--color-warning)"  },
  clarity:    { label: "Clarity",           icon: Info,      color: "var(--color-text-secondary)" },
  structure:  { label: "Structure",         icon: FileText,  color: "var(--color-text-muted)"  },
  evidence:   { label: "Experience evidence", icon: TrendingUp, color: "var(--color-success)" },
} as const;

const SEVERITY_CFG: Record<Severity, { label: string; color: string; bg: string }> = {
  high:   { label: "High",   color: "var(--color-danger)",    bg: "var(--color-danger-subtle)"    },
  medium: { label: "Medium", color: "var(--color-warning)",  bg: "var(--color-warning-subtle)"   },
  low:    { label: "Low",    color: "var(--color-text-muted)",  bg: "var(--color-surface-raised)"    },
};

// ── Sub-components ───────────────────────────────────────
function TextArea({
  label, value, onChange, placeholder, rows = 8,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-app-muted uppercase tracking-wider">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg text-xs text-app-primary placeholder-text-app-faint px-3 py-2.5 focus:outline-none resize-none font-mono leading-relaxed transition-colors"
        style={{
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          caretColor: "var(--color-brand)",
        }}
      />
    </div>
  );
}

function ScoreGauge({ before, after }: { before: number; after: number }) {
  // simple arc
  const arc = (pct: number, r: number, color: string) => {
    const x = 50 + r * Math.cos(Math.PI - (pct / 100) * Math.PI);
    const y = 54 + r * Math.sin(Math.PI - (pct / 100) * Math.PI);
    const large = pct > 50 ? 1 : 0;
    return (
      <path
        d={`M ${50 - r} 54 A ${r} ${r} 0 ${large} 1 ${x} ${y}`}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
      />
    );
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 58" className="w-40">
        {/* track */}
        <path d="M 10 54 A 40 40 0 0 1 90 54" fill="none" stroke="var(--color-border)" strokeWidth={5} strokeLinecap="round" />
        {/* before */}
        {arc(before, 40, "var(--color-text-muted)")}
        {/* after */}
        {arc(after, 40, "var(--color-brand)")}
      </svg>
      <div className="flex items-center gap-6 -mt-1">
        <div className="text-center">
          <p className="text-lg font-semibold font-mono" style={{ color: "var(--color-text-muted)" }}>{before}</p>
          <p className="text-[10px] text-app-faint">Current</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold font-mono text-app-brand">~{after}</p>
          <p className="text-[10px] text-app-faint">Projected</p>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ s }: { s: Suggestion }) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORY_CFG[s.category];
  const sev = SEVERITY_CFG[s.severity];
  const CatIcon = cat.icon;

  return (
    <div
      className="rounded-lg overflow-hidden transition-colors"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-surface)" }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-app-raised transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Category icon */}
        <CatIcon size={13} style={{ color: cat.color, flexShrink: 0 }} />

        {/* Title */}
        <span className="flex-1 text-xs font-medium text-app-primary">{s.title}</span>

        {/* Severity */}
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-none"
          style={{ color: sev.color, background: sev.bg }}
        >
          {sev.label}
        </span>

        {/* Score delta */}
        <span
          className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded flex-none"
          style={{ color: "var(--color-success)", background: "var(--color-success-subtle)" }}
        >
          +{s.scoreDelta} pts
        </span>

        {open ? <ChevronUp size={12} className="text-app-faint flex-none" /> : <ChevronDown size={12} className="text-app-faint flex-none" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--color-border-app-subtletle)" }}>
          <p className="text-[11px] text-app-secondary leading-relaxed pt-3">{s.detail}</p>
          {s.example && (
            <div
              className="rounded p-3"
              style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-[10px] text-app-muted uppercase tracking-wider font-medium mb-1.5">
                Suggested wording
              </p>
              <p className="text-[11px] text-app-primary font-mono leading-relaxed italic">
                {s.example}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────
export default function CvAdaptation() {
  const [cv, setCv] = useState("");
  const [spec, setSpec] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Suggestion["category"] | "all">("all");

  const canAnalyse = cv.trim().length > 40 && spec.trim().length > 40;

  function analyse() {
    setLoading(true);
    setResult(null);
    // Simulate async AI call
    setTimeout(() => {
      const mockResult = MOCK_RESULT as AnalysisResult;
      setResult(mockResult);
      setLoading(false);
    }, 1800);
  }

  const categories = Object.keys(CATEGORY_CFG) as Suggestion["category"][];

  const filtered =
    result?.suggestions.filter((s) => activeFilter === "all" || s.category === activeFilter) ?? [];

  const highCount   = result?.suggestions.filter((s) => s.severity === "high").length ?? 0;
  const mediumCount = result?.suggestions.filter((s) => s.severity === "medium").length ?? 0;
  const lowCount    = result?.suggestions.filter((s) => s.severity === "low").length ?? 0;

  return (
    <div className="p-6 space-y-5 overflow-auto h-full">
      <PageHeader
        title="CV Adaptation Assistant"
        description="Paste a consultant CV and assignment requirements to identify gaps and improve the CV for the assignment"
      />
      <div>
          {/* Input grid */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <TextArea
              label="Consultant CV"
              value={cv}
              onChange={setCv}
              placeholder={"Paste the consultant CV here...\n\nAnna Kovacs\nSenior Backend Consultant\n\nProjects:\n- Order platform renewal (2021–2023): Built Go microservices...\n\nSkills: Go, PostgreSQL, Kafka, Kubernetes..."}
              rows={12}
            />
            <TextArea
              label="Client Assignment Requirements"
              value={spec}
              onChange={setSpec}
              placeholder={"Paste the client assignment requirements here...\n\nThe client needs a Senior Backend Consultant with:\n- 5+ years of Go in production\n- Event-driven architecture (Kafka)\n- Kubernetes at scale (100+ nodes)\n- Observability (OpenTelemetry)\n..."}
              rows={12}
            />
          </div>

          {/* Analyse button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={analyse}
              disabled={!canAnalyse || loading}
              className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
              style={{ background: "var(--color-brand)" }}
            >
              {loading ? (
                <>
                  <Zap size={13} className="animate-pulse" />
                  Analysing…
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  Analyse with AI
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-5">
              {/* Overview row */}
              <div className="grid grid-cols-4 gap-3">
                {/* Gauge */}
                <div
                  className="bg-app-surface border border-app rounded-lg p-4 flex flex-col items-center justify-center"
                  style={{ boxShadow: "var(--shadow-surface)" }}
                >
                  <p className="text-[10px] text-app-faint uppercase tracking-wider font-medium mb-3">
                    Match Score Estimate
                  </p>
                  <ScoreGauge before={result.estimatedScore} after={result.projectedScore} />
                </div>

                {/* Severity counts */}
                <div
                  className="bg-app-surface border border-app rounded-lg p-4 flex flex-col justify-center gap-3"
                  style={{ boxShadow: "var(--shadow-surface)" }}
                >
                  <p className="text-[10px] text-app-faint uppercase tracking-wider font-medium">Issues found</p>
                  {[
                    { label: "High priority",   count: highCount,   color: "var(--color-danger)"   },
                    { label: "Medium priority",  count: mediumCount, color: "var(--color-warning)" },
                    { label: "Low priority",     count: lowCount,    color: "var(--color-text-muted)" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(row.count / result.suggestions.length) * 100}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-app-primary w-4 text-right">{row.count}</span>
                      <span className="text-[10px] text-app-muted w-28">{row.label}</span>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div
                  className="col-span-2 bg-app-surface border border-app rounded-lg p-4"
                  style={{ boxShadow: "var(--shadow-surface)" }}
                >
                  <div className="flex items-start gap-2.5">
                    <Info size={13} style={{ color: "var(--color-brand)", flexShrink: 0 }} className="mt-0.5" />
                    <div>
                      <p className="text-[11px] text-app-faint font-mono uppercase tracking-wider mb-2">
                        AI Summary
                      </p>
                      <p className="text-xs text-app-secondary leading-relaxed">{result.summary}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category filters */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveFilter("all")}
                  className="text-[11px] px-2.5 py-1 rounded transition-colors"
                  style={
                    activeFilter === "all"
                      ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)", fontWeight: 500 }
                      : { color: "var(--color-text-muted)" }
                  }
                >
                  All ({result.suggestions.length})
                </button>
                {categories.map((cat) => {
                  const cfg = CATEGORY_CFG[cat];
                  const CatIcon = cfg.icon;
                  const count = result.suggestions.filter((s) => s.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveFilter(cat)}
                      className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded transition-colors"
                      style={
                        activeFilter === cat
                          ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)", fontWeight: 500 }
                          : { color: "var(--color-text-muted)" }
                      }
                    >
                      <CatIcon size={10} />
                      {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Suggestion cards — sorted by score delta desc */}
              <div className="space-y-2">
                {[...filtered]
                  .sort((a, b) => b.scoreDelta - a.scoreDelta)
                  .map((s) => (
                    <SuggestionCard key={s.id} s={s} />
                  ))}
              </div>

              {/* Total potential */}
              <div
                className="rounded-lg px-4 py-3 flex items-center gap-3"
                style={{ background: "var(--color-brand-subtle)", border: "1px solid var(--color-brand-subtle)" }}
              >
                <CheckCircle size={14} style={{ color: "var(--color-brand)", flexShrink: 0 }} />
                <p className="text-xs text-app-secondary">
                  Applying the highest-impact suggestions adds an estimated{" "}
                  <span className="font-semibold text-app-brand font-mono">
                    +{result.projectedScore - result.estimatedScore} points
                  </span>{" "}
                  — improving the estimated assignment match from{" "}
                  <span className="font-mono text-app-primary">{result.estimatedScore}</span> to{" "}
                  <span className="font-mono text-app-brand">{result.projectedScore}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Empty state before analysis */}
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles size={32} className="text-app-faint mb-4" />
              <p className="text-sm text-app-faint">Paste a consultant CV and assignment requirements above, then click Analyse</p>
              <p className="text-xs text-app-faint mt-1">
                The assistant will identify missing requirements, unclear skills, project evidence, seniority signals, and availability information
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
