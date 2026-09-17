import { useState } from "react";
import {
  Sparkles,
  FileText,
  Clipboard,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Tag,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "../i18n";

// ── Types ────────────────────────────────────────────────
type Severity = "high" | "medium" | "low";

interface Suggestion {
  id: string;
  category: "keyword" | "credential" | "clarity" | "structure" | "ats";
  severity: Severity;
  title: string;
  detail: string;
  example?: string;
  scoreDelta: number;
}

interface AnalysisResult {
  estimatedScore: number;
  projectedScore: number;
  summary: string;
  suggestions: Suggestion[];
}

// ── Mock AI result ───────────────────────────────────────
const MOCK_RESULT: AnalysisResult = {
  estimatedScore: 54,
  projectedScore: 82,
  summary:
    "Your CV demonstrates solid backend experience but misses several ATS-critical keywords and credential signals that appear explicitly in the spec. Addressing the high-priority items below is estimated to raise your match score by ~28 points.",
  suggestions: [
    {
      id: "s1",
      category: "keyword",
      severity: "high",
      title: 'Missing keyword: "event-driven architecture"',
      detail:
        'The spec explicitly lists "event-driven architecture" as a must-have. Your CV mentions Kafka and message queues but never uses this phrase — ATS parsers score on exact or near-exact matches.',
      example:
        'Add to your summary: "…designing event-driven architectures on top of Kafka and RabbitMQ…"',
      scoreDelta: 8,
    },
    {
      id: "s2",
      category: "credential",
      severity: "high",
      title: "Kubernetes experience lacks proof of scale",
      detail:
        'The spec requires production Kubernetes at ≥100 nodes. Your CV says "managed Kubernetes clusters" with no cluster size or workload details, which parsers treat as junior-level evidence.',
      example:
        'Clarify: "Managed 3 production Kubernetes clusters (80–120 nodes, ~400 pods) across EU regions at Zalando."',
      scoreDelta: 7,
    },
    {
      id: "s3",
      category: "keyword",
      severity: "high",
      title: 'Missing keyword: "observability"',
      detail:
        'The spec mentions OpenTelemetry and observability practices 3 times. You mention Prometheus but omit the word "observability" and never reference tracing or structured logging explicitly.',
      example:
        '"Introduced observability stack (OpenTelemetry traces, Prometheus metrics, structured JSON logging) reducing MTTR by 40%."',
      scoreDelta: 6,
    },
    {
      id: "s4",
      category: "clarity",
      severity: "medium",
      title: "Go experience period is ambiguous",
      detail:
        'Your CV lists Go as a skill but the dates are unclear — one role says 2021–2023, another implies Go was used before. ATS systems calculate lastUsedYear and yearsUsed; ambiguity defaults to the minimum.',
      example:
        "Add an explicit date range per role: \"Backend Engineer (Go, Kafka) · Zalando · Jan 2021 – Dec 2023\"",
      scoreDelta: 5,
    },
    {
      id: "s5",
      category: "ats",
      severity: "medium",
      title: "Achievement quantification is inconsistent",
      detail:
        'Roles at FinCo have strong quantified achievements ("P99 18ms → 4ms") but your Schibsted role uses vague language ("improved performance", "large datasets"). Inconsistent quantification lowers confidence scoring.',
      example:
        '"Reduced search latency from 820ms to 330ms (60%) for a 2TB PostgreSQL-backed marketplace via composite index redesign."',
      scoreDelta: 5,
    },
    {
      id: "s6",
      category: "structure",
      severity: "medium",
      title: "No explicit seniority signal in headline",
      detail:
        'The spec targets a Senior or Staff engineer. Your headline reads "Backend Engineer" — omitting the level means ATS seniority classifiers must infer from context, which introduces noise.',
      example: '"Senior Backend Engineer · Go · Distributed Systems · 8 yrs"',
      scoreDelta: 4,
    },
    {
      id: "s7",
      category: "keyword",
      severity: "low",
      title: 'Nice-to-have: "gRPC" not mentioned',
      detail:
        "The spec lists gRPC as a nice-to-have. If you have used it (even peripherally), adding it increases your nice-to-have coverage score.",
      example: '"Defined gRPC service contracts for 12 internal microservices."',
      scoreDelta: 3,
    },
    {
      id: "s8",
      category: "credential",
      severity: "low",
      title: "Availability not stated",
      detail:
        "The job has a 4-week start deadline. CVs that don't mention availability lose points on the practical-fit dimension of the hybrid score.",
      example: 'Add a footer line: "Available from: October 2026 · Open to remote-first roles in CET±2"',
      scoreDelta: 2,
    },
  ],
};

// ── Category config ──────────────────────────────────────
const CATEGORY_CFG = {
  keyword:    { label: "Missing keyword",   icon: Tag,       color: "var(--ats-indigo)" },
  credential: { label: "Credential gap",    icon: BookOpen,  color: "var(--ats-amber)"  },
  clarity:    { label: "Clarity",           icon: Info,      color: "var(--ats-text-2)" },
  structure:  { label: "Structure",         icon: FileText,  color: "var(--ats-muted)"  },
  ats:        { label: "ATS optimisation",  icon: TrendingUp,color: "var(--ats-green)"  },
} as const;

const SEVERITY_CFG: Record<Severity, { label: string; color: string; bg: string }> = {
  high:   { label: "High",   color: "var(--ats-red)",    bg: "rgba(239,68,68,0.10)"    },
  medium: { label: "Medium", color: "var(--ats-amber)",  bg: "rgba(245,158,11,0.10)"   },
  low:    { label: "Low",    color: "var(--ats-muted)",  bg: "var(--ats-surface-r)"    },
};

// ── Sub-components ───────────────────────────────────────
function TextArea({
  label, value, onChange, placeholder, rows = 8,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-muted uppercase tracking-wider">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg text-xs text-base placeholder-text-3 px-3 py-2.5 focus:outline-none resize-none font-mono leading-relaxed transition-colors"
        style={{
          background: "var(--ats-surface-r)",
          border: "1px solid var(--ats-border)",
          caretColor: "var(--ats-indigo)",
        }}
      />
    </div>
  );
}

function ScoreGauge({ before, after }: { before: number; after: number }) {
  const beforeAngle = (before / 100) * 180;
  const afterAngle  = (after  / 100) * 180;

  const polarX = (pct: number, r: number) =>
    50 + r * Math.cos(Math.PI - (pct / 100) * Math.PI);
  const polarY = (pct: number, r: number) =>
    54 - r * Math.sin((pct / 100) * Math.PI) * -1;

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
        <path d="M 10 54 A 40 40 0 0 1 90 54" fill="none" stroke="var(--ats-border)" strokeWidth={5} strokeLinecap="round" />
        {/* before */}
        {arc(before, 40, "var(--ats-muted)")}
        {/* after */}
        {arc(after, 40, "var(--ats-indigo)")}
      </svg>
      <div className="flex items-center gap-6 -mt-1">
        <div className="text-center">
          <p className="text-lg font-semibold font-mono" style={{ color: "var(--ats-muted)" }}>{before}</p>
          <p className="text-[10px] text-3">Current</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold font-mono text-indigo">~{after}</p>
          <p className="text-[10px] text-3">Projected</p>
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
      style={{ background: "var(--ats-surface)", border: "1px solid var(--ats-border)", boxShadow: "var(--ats-shadow)" }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-raised transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Category icon */}
        <CatIcon size={13} style={{ color: cat.color, flexShrink: 0 }} />

        {/* Title */}
        <span className="flex-1 text-xs font-medium text-base">{s.title}</span>

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
          style={{ color: "var(--ats-green)", background: "rgba(34,197,94,0.10)" }}
        >
          +{s.scoreDelta} pts
        </span>

        {open ? <ChevronUp size={12} className="text-3 flex-none" /> : <ChevronDown size={12} className="text-3 flex-none" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--ats-border-s)" }}>
          <p className="text-[11px] text-2 leading-relaxed pt-3">{s.detail}</p>
          {s.example && (
            <div
              className="rounded p-3"
              style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}
            >
              <p className="text-[10px] text-muted uppercase tracking-wider font-medium mb-1.5">
                Suggested wording
              </p>
              <p className="text-[11px] text-base font-mono leading-relaxed italic">
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
export default function CvCoach() {
  const { t } = useI18n();
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
      setResult(MOCK_RESULT);
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
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-base bg-surface flex-none">
        <div className="flex items-center gap-2.5">
          <Sparkles size={15} style={{ color: "var(--ats-indigo)" }} />
          <div>
            <h1 className="text-sm font-semibold text-base">CV Coach</h1>
            <p className="text-xs text-muted mt-0.5">
              Paste a CV and a job spec — AI identifies gaps, missing keywords, and ATS improvements
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-base">
        <div className="p-6">
          {/* Input grid */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <TextArea
              label="Candidate CV"
              value={cv}
              onChange={setCv}
              placeholder={"Paste the full CV text here...\n\nJane Doe\nSenior Backend Engineer\n\nExperience:\n- Zalando SE (2021–2023): Built Go microservices...\n\nSkills: Go, PostgreSQL, Kafka, Kubernetes..."}
              rows={12}
            />
            <TextArea
              label="Job / Recruitment Spec"
              value={spec}
              onChange={setSpec}
              placeholder={"Paste the full job description here...\n\nWe are looking for a Senior Backend Engineer with:\n- 5+ years of Go in production\n- Event-driven architecture (Kafka)\n- Kubernetes at scale (100+ nodes)\n- Observability (OpenTelemetry)\n..."}
              rows={12}
            />
          </div>

          {/* Analyse button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={analyse}
              disabled={!canAnalyse || loading}
              className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
              style={{ background: "var(--ats-indigo)" }}
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
                  className="bg-surface border border-base rounded-lg p-4 flex flex-col items-center justify-center"
                  style={{ boxShadow: "var(--ats-shadow)" }}
                >
                  <p className="text-[10px] text-3 uppercase tracking-wider font-medium mb-3">
                    ATS Score Estimate
                  </p>
                  <ScoreGauge before={result.estimatedScore} after={result.projectedScore} />
                </div>

                {/* Severity counts */}
                <div
                  className="bg-surface border border-base rounded-lg p-4 flex flex-col justify-center gap-3"
                  style={{ boxShadow: "var(--ats-shadow)" }}
                >
                  <p className="text-[10px] text-3 uppercase tracking-wider font-medium">Issues found</p>
                  {[
                    { label: "High priority",   count: highCount,   color: "var(--ats-red)"   },
                    { label: "Medium priority",  count: mediumCount, color: "var(--ats-amber)" },
                    { label: "Low priority",     count: lowCount,    color: "var(--ats-muted)" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--ats-border)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(row.count / result.suggestions.length) * 100}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-base w-4 text-right">{row.count}</span>
                      <span className="text-[10px] text-muted w-28">{row.label}</span>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div
                  className="col-span-2 bg-surface border border-base rounded-lg p-4"
                  style={{ boxShadow: "var(--ats-shadow)" }}
                >
                  <div className="flex items-start gap-2.5">
                    <Info size={13} style={{ color: "var(--ats-indigo)", flexShrink: 0 }} className="mt-0.5" />
                    <div>
                      <p className="text-[11px] text-3 font-mono uppercase tracking-wider mb-2">
                        AI Summary
                      </p>
                      <p className="text-xs text-2 leading-relaxed">{result.summary}</p>
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
                      ? { background: "var(--ats-indigo-sub)", color: "var(--ats-indigo)", fontWeight: 500 }
                      : { color: "var(--ats-muted)" }
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
                          ? { background: "var(--ats-indigo-sub)", color: "var(--ats-indigo)", fontWeight: 500 }
                          : { color: "var(--ats-muted)" }
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
                style={{ background: "var(--ats-indigo-sub)", border: "1px solid var(--ats-indigo-sub)" }}
              >
                <CheckCircle size={14} style={{ color: "var(--ats-indigo)", flexShrink: 0 }} />
                <p className="text-xs text-2">
                  Applying all suggestions adds an estimated{" "}
                  <span className="font-semibold text-indigo font-mono">
                    +{result.suggestions.reduce((a, s) => a + s.scoreDelta, 0)} points
                  </span>{" "}
                  — raising the estimated ATS score from{" "}
                  <span className="font-mono text-base">{result.estimatedScore}</span> to{" "}
                  <span className="font-mono text-indigo">{result.projectedScore}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Empty state before analysis */}
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles size={32} className="text-3 mb-4" />
              <p className="text-sm text-3">Paste a CV and job spec above, then click Analyse</p>
              <p className="text-xs text-3 mt-1">
                AI will identify keyword gaps, ATS optimisations, and credential clarifications
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
