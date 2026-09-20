import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Briefcase,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Sparkles,
  Tag,
  TrendingUp,
  Upload as UploadIcon,
  Users,
  X,
  Zap,
} from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/Button";
import { ASSIGNMENTS } from "../features/assignments";
import { CONSULTANTS, PROFILE } from "../features/consultants";
import { MOCK_RESULT } from "../features/cvAdaptation";
import type {
  CvAnalysisResult as AnalysisResult,
  CvSeverity as Severity,
  CvSuggestion as Suggestion,
} from "../features/cvAdaptation";

type InputMode = "select" | "upload" | "paste";
type InputKind = "cv" | "assignment";

type SourceState = {
  mode: InputMode;
  text: string;
  selectedId: string;
  fileName: string;
  fileSize: number;
  extractionNote: string;
};

const CATEGORY_CFG = {
  keyword: { labelKey: "cv_category_keyword", icon: Tag, color: "var(--color-brand)" },
  credential: { labelKey: "cv_category_credential", icon: BookOpen, color: "var(--color-warning)" },
  clarity: { labelKey: "cv_category_clarity", icon: Info, color: "var(--color-text-secondary)" },
  structure: { labelKey: "cv_category_structure", icon: FileText, color: "var(--color-text-muted)" },
  evidence: { labelKey: "cv_category_evidence", icon: TrendingUp, color: "var(--color-success)" },
} as const;

const SEVERITY_CFG: Record<Severity, { labelKey: string; color: string; bg: string }> = {
  high: { labelKey: "cv_severity_high", color: "var(--color-danger)", bg: "var(--color-danger-subtle)" },
  medium: { labelKey: "cv_severity_medium", color: "var(--color-warning)", bg: "var(--color-warning-subtle)" },
  low: { labelKey: "cv_severity_low", color: "var(--color-text-muted)", bg: "var(--color-surface-raised)" },
};

const EMPTY_SOURCE: SourceState = {
  mode: "select",
  text: "",
  selectedId: "",
  fileName: "",
  fileSize: 0,
  extractionNote: "",
};

function formatBytes(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function consultantToText(id: string) {
  const consultant = CONSULTANTS.find((item) => item.id === id);
  if (!consultant) return "";

  if (consultant.id === PROFILE.id) {
    return [
      PROFILE.name,
      PROFILE.role,
      `Experience: ${PROFILE.totalYearsExperience} years`,
      `Availability: ${PROFILE.availability}`,
      "",
      "Skills:",
      ...PROFILE.skills.map((skill) => `- ${skill.name}: ${skill.yearsUsed} years, ${skill.level}. ${skill.evidence}`),
      "",
      "Previous projects:",
      ...PROFILE.experience.map(
        (item) =>
          `- ${item.role} at ${item.company} (${item.start}–${item.end}). Stack: ${item.stack.join(", ")}. ${item.achievements.join(" ")}`,
      ),
      "",
      `Certifications: ${PROFILE.certifications.join(", ")}`,
      `Industries: ${PROFILE.industries.join(", ")}`,
    ].join("\n");
  }

  return [
    consultant.name,
    consultant.headline,
    `Seniority: ${consultant.seniority}`,
    `Experience: ${consultant.experience}`,
    `Availability: ${consultant.availability}`,
    `Skills: ${consultant.skills.join(", ")}`,
  ].join("\n");
}

function assignmentToText(id: string) {
  const assignment = ASSIGNMENTS.find((item) => item.id === id);
  if (!assignment) return "";

  return [
    assignment.title,
    assignment.client,
    assignment.description,
    "",
    `Seniority: ${assignment.seniority}`,
    `Availability: ${assignment.availability}`,
    "",
    "Required skills:",
    ...assignment.requiredSkills.map((skill) => `- ${skill}`),
    "",
    "Preferred skills:",
    ...assignment.preferredSkills.map((skill) => `- ${skill}`),
  ].join("\n");
}

function prototypeExtraction(kind: InputKind) {
  return kind === "cv"
    ? consultantToText("1")
    : assignmentToText("a1");
}

function SourceCard({
  kind,
  source,
  onChange,
}: {
  kind: InputKind;
  source: SourceState;
  onChange: (next: SourceState) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const isCv = kind === "cv";
  const title = isCv ? t("cv_label") : t("assignment_label");
  const description = isCv ? t("cv_source_help") : t("assignment_source_help");
  const Icon = isCv ? Users : Briefcase;

  const changeMode = (mode: InputMode) => {
    onChange({
      ...EMPTY_SOURCE,
      mode,
    });
  };

  const handleSelect = (id: string) => {
    onChange({
      ...source,
      selectedId: id,
      text: isCv ? consultantToText(id) : assignmentToText(id),
      fileName: "",
      fileSize: 0,
      extractionNote: "",
    });
  };

  const handleFile = async (file?: File) => {
    if (!file) return;

    const isTextFile = file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");
    let text = "";
    let extractionNote = "";

    if (isTextFile) {
      text = await file.text();
      extractionNote = t("source_text_extracted");
    } else {
      text = prototypeExtraction(kind);
      extractionNote = t("source_prototype_extract");
    }

    onChange({
      ...source,
      selectedId: "",
      fileName: file.name,
      fileSize: file.size,
      text,
      extractionNote,
    });
  };

  return (
    <section
      className="bg-app-surface border border-app rounded-xl p-4"
      style={{ boxShadow: "var(--shadow-surface)" }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-app-brand-subtle text-app-brand flex items-center justify-center flex-none">
          <Icon size={14} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-app-primary">{title}</h2>
          <p className="text-[11px] text-app-muted mt-0.5">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-app-raised mb-4">
        {(["select", "upload", "paste"] as InputMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => changeMode(mode)}
            className="text-[11px] px-3 py-1.5 rounded-md transition-colors"
            style={
              source.mode === mode
                ? {
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                    boxShadow: "var(--shadow-surface)",
                  }
                : { color: "var(--color-text-muted)" }
            }
          >
            {mode === "select" ? t("source_select") : mode === "upload" ? t("source_upload") : t("source_paste")}
          </button>
        ))}
      </div>

      {source.mode === "select" && (
        <div className="space-y-3">
          <select
            value={source.selectedId}
            onChange={(event) => handleSelect(event.target.value)}
            className="w-full text-xs rounded-md px-3 py-2.5 focus:outline-none"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            <option value="">{isCv ? t("source_select_consultant") : t("source_select_assignment")}</option>
            {(isCv ? CONSULTANTS : ASSIGNMENTS).map((item) => (
              <option key={item.id} value={item.id}>
                {"name" in item ? `${item.name} · ${item.headline}` : `${item.title} · ${item.client}`}
              </option>
            ))}
          </select>

          {source.selectedId && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--color-success)" }}>
              <CheckCircle size={11} />
              {t("source_loaded")}
            </div>
          )}
        </div>
      )}

      {source.mode === "upload" && (
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />

          {!source.fileName ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full min-h-32 border border-dashed border-app rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-app-raised transition-colors"
            >
              <UploadIcon size={18} className="text-app-faint" />
              <span className="text-xs text-app-secondary">
                {isCv ? t("source_upload_cv") : t("source_upload_assignment")}
              </span>
              <span className="text-[10px] text-app-faint">{t("source_file_types")}</span>
            </button>
          ) : (
            <div className="border border-app rounded-lg p-3 bg-app-raised">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-app-brand-subtle text-app-brand flex items-center justify-center">
                  <FileText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-app-primary truncate">{source.fileName}</p>
                  <p className="text-[10px] text-app-muted">{formatBytes(source.fileSize)} · {t("source_ready_review")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-[11px] text-app-secondary hover:text-app-primary"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...EMPTY_SOURCE, mode: "upload" })}
                  className="text-app-faint hover:text-app-secondary"
                  aria-label={t("common_remove")}
                >
                  <X size={13} />
                </button>
              </div>
              {source.extractionNote && (
                <p className="text-[10px] text-app-muted mt-2">{source.extractionNote}</p>
              )}
            </div>
          )}
        </div>
      )}

      {source.mode === "paste" && (
        <textarea
          value={source.text}
          onChange={(event) => onChange({ ...source, text: event.target.value })}
          placeholder={isCv ? t("source_paste_cv") : t("source_paste_assignment")}
          rows={10}
          className="w-full rounded-lg text-xs text-app-primary px-3 py-2.5 focus:outline-none resize-none font-mono leading-relaxed"
          style={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            caretColor: "var(--color-brand)",
          }}
        />
      )}

      {source.mode !== "paste" && source.text && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-[11px] text-app-secondary hover:text-app-primary">
            {t("source_review")}
          </summary>
          <textarea
            value={source.text}
            onChange={(event) => onChange({ ...source, text: event.target.value })}
            rows={9}
            className="mt-3 w-full rounded-lg text-xs text-app-primary px-3 py-2.5 focus:outline-none resize-none font-mono leading-relaxed"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              caretColor: "var(--color-brand)",
            }}
          />
        </details>
      )}
    </section>
  );
}

function SourceSummary({
  label,
  source,
  selectedLabel,
  onChange,
}: {
  label: string;
  source: SourceState;
  selectedLabel: string;
  onChange: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-app bg-app-surface px-4 py-3">
      <CheckCircle size={13} style={{ color: "var(--color-success)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-app-faint">{label}</p>
        <p className="text-xs text-app-primary truncate">{selectedLabel}</p>
      </div>
      <Button variant="ghost" onClick={onChange}>{t("common_change")}</Button>
    </div>
  );
}

function ScoreGauge({ before, after }: { before: number; after: number }) {
  const { t } = useI18n();
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
        <path d="M 10 54 A 40 40 0 0 1 90 54" fill="none" stroke="var(--color-border)" strokeWidth={5} strokeLinecap="round" />
        {arc(before, 40, "var(--color-text-muted)")}
        {arc(after, 40, "var(--color-brand)")}
      </svg>
      <div className="flex items-center gap-6 -mt-1">
        <div className="text-center">
          <p className="text-lg font-semibold font-mono" style={{ color: "var(--color-text-muted)" }}>{before}</p>
          <p className="text-[10px] text-app-faint">{t("cv_current")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold font-mono text-app-brand">~{after}</p>
          <p className="text-[10px] text-app-faint">{t("cv_projected")}</p>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ s }: { s: Suggestion }) {
  const { t } = useI18n();
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
        onClick={() => setOpen((value) => !value)}
      >
        <CatIcon size={13} style={{ color: cat.color, flexShrink: 0 }} />
        <span className="flex-1 text-xs font-medium text-app-primary">{s.title}</span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-none"
          style={{ color: sev.color, background: sev.bg }}
        >
          {t(sev.labelKey as any)}
        </span>
        <span
          className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded flex-none"
          style={{ color: "var(--color-success)", background: "var(--color-success-subtle)" }}
        >
          +{s.scoreDelta} pts
        </span>
        {open ? <ChevronUp size={12} className="text-app-faint" /> : <ChevronDown size={12} className="text-app-faint" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-app">
          <p className="text-[11px] text-app-secondary leading-relaxed pt-3">{s.detail}</p>
          {s.example && (
            <div className="rounded p-3 bg-app-raised border border-app">
              <p className="text-[10px] text-app-muted uppercase tracking-wider font-medium mb-1.5">{t("cv_suggested_wording")}</p>
              <p className="text-[11px] text-app-primary font-mono leading-relaxed italic">{s.example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CvAdaptation() {
  const { t, locale } = useI18n();
  const [cvSource, setCvSource] = useState<SourceState>({ ...EMPTY_SOURCE });
  const [assignmentSource, setAssignmentSource] = useState<SourceState>({ ...EMPTY_SOURCE });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingInputs, setEditingInputs] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Suggestion["category"] | "all">("all");

  const canAnalyse = cvSource.text.trim().length > 40 && assignmentSource.text.trim().length > 40;

  const localizedMockResult = (): AnalysisResult => ({
    ...(MOCK_RESULT as AnalysisResult),
    summary: t("cv_result_summary"),
    suggestions: (MOCK_RESULT as AnalysisResult).suggestions.map((suggestion) => ({
      ...suggestion,
      title: t((`cv_${suggestion.id}_title`) as any),
      detail: t((`cv_${suggestion.id}_detail`) as any),
    })),
  });

  useEffect(() => {
    if (result) setResult(localizedMockResult());
  }, [locale]);


  const cvLabel =
    cvSource.mode === "select"
      ? CONSULTANTS.find((item) => item.id === cvSource.selectedId)?.name ?? t("source_selected_consultant")
      : cvSource.mode === "upload"
        ? cvSource.fileName
         : t("source_pasted_cv");

  const assignmentLabel =
    assignmentSource.mode === "select"
      ? ASSIGNMENTS.find((item) => item.id === assignmentSource.selectedId)?.title ?? t("source_selected_assignment")
      : assignmentSource.mode === "upload"
        ? assignmentSource.fileName
         : t("source_pasted_assignment");

  function analyse() {
    setLoading(true);
    setResult(null);

    setTimeout(() => {
      setResult(localizedMockResult());
      setLoading(false);
      setEditingInputs(false);
    }, 1200);
  }

  const categories = Object.keys(CATEGORY_CFG) as Suggestion["category"][];
  const filtered = result?.suggestions.filter((item) => activeFilter === "all" || item.category === activeFilter) ?? [];
  const highCount = result?.suggestions.filter((item) => item.severity === "high").length ?? 0;
  const mediumCount = result?.suggestions.filter((item) => item.severity === "medium").length ?? 0;
  const lowCount = result?.suggestions.filter((item) => item.severity === "low").length ?? 0;

  return (
    <div className="p-6 space-y-5 overflow-auto h-full">
      <PageHeader
        title={t("cv_adapt_title")}
        description={t("cv_adapt_sub")}
      />

      {editingInputs || !result ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SourceCard kind="cv" source={cvSource} onChange={setCvSource} />
            <SourceCard kind="assignment" source={assignmentSource} onChange={setAssignmentSource} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-app-faint max-w-2xl">
              {t("cv_privacy_note")}
            </p>
            <button
              onClick={analyse}
              disabled={!canAnalyse || loading}
              className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
              style={{ background: "var(--color-brand)" }}
            >
              {loading ? (
                <>
                  <Zap size={13} className="animate-pulse" />
                  {t("cv_analysing")}
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  {t("cv_analyse")}
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-start">
            <Button variant="secondary" onClick={() => setEditingInputs(true)}>
              {t("cv_change_inputs")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SourceSummary label={t("cv_label")} source={cvSource} selectedLabel={cvLabel} onChange={() => setEditingInputs(true)} />
            <SourceSummary label={t("assignment_label")} source={assignmentSource} selectedLabel={assignmentLabel} onChange={() => setEditingInputs(true)} />
          </div>
        </div>
      )}

      {result && !editingInputs && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <div
              className="bg-app-surface border border-app rounded-lg p-4 flex flex-col items-center justify-center"
              style={{ boxShadow: "var(--shadow-surface)" }}
            >
              <p className="text-[10px] text-app-faint uppercase tracking-wider font-medium mb-3">{t("cv_match_estimate")}</p>
              <ScoreGauge before={result.estimatedScore} after={result.projectedScore} />
            </div>

            <div
              className="bg-app-surface border border-app rounded-lg p-4 flex flex-col justify-center gap-3"
              style={{ boxShadow: "var(--shadow-surface)" }}
            >
              <p className="text-[10px] text-app-faint uppercase tracking-wider font-medium">{t("cv_issues")}</p>
              {[
                { label: t("cv_high"), count: highCount, color: "var(--color-danger)" },
                { label: t("cv_medium"), count: mediumCount, color: "var(--color-warning)" },
                { label: t("cv_low"), count: lowCount, color: "var(--color-text-muted)" },
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

            <div
              className="col-span-2 bg-app-surface border border-app rounded-lg p-4"
              style={{ boxShadow: "var(--shadow-surface)" }}
            >
              <div className="flex items-start gap-2.5">
                <Info size={13} className="text-app-brand flex-none mt-0.5" />
                <div>
                  <p className="text-[11px] text-app-faint font-mono uppercase tracking-wider mb-2">{t("cv_ai_summary")}</p>
                  <p className="text-xs text-app-secondary leading-relaxed">{result.summary}</p>
                </div>
              </div>
            </div>
          </div>

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
              {t("cv_all")} ({result.suggestions.length})
            </button>
            {categories.map((category) => {
              const config = CATEGORY_CFG[category];
              const CategoryIcon = config.icon;
              const count = result.suggestions.filter((item) => item.category === category).length;
              if (count === 0) return null;

              return (
                <button
                  key={category}
                  onClick={() => setActiveFilter(category)}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded transition-colors"
                  style={
                    activeFilter === category
                      ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)", fontWeight: 500 }
                      : { color: "var(--color-text-muted)" }
                  }
                >
                  <CategoryIcon size={10} />
                  {config.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {[...filtered]
              .sort((a, b) => b.scoreDelta - a.scoreDelta)
              .map((suggestion) => (
                <SuggestionCard key={suggestion.id} s={suggestion} />
              ))}
          </div>

          <div
            className="rounded-lg px-4 py-3 flex items-center gap-3"
            style={{ background: "var(--color-brand-subtle)", border: "1px solid var(--color-brand-subtle)" }}
          >
            <CheckCircle size={14} className="text-app-brand flex-none" />
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

      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Sparkles size={28} className="text-app-faint mb-3" />
          <p className="text-sm text-app-faint">{t("cv_empty_title")}</p>
          <p className="text-xs text-app-faint mt-1">
            {t("cv_empty_sub")}
          </p>
        </div>
      )}
    </div>
  );
}
