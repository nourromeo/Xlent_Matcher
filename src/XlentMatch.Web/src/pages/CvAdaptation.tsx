import { useEffect, useState } from "react";
import { Loader, Sparkles } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { consultantsApi } from "../services/consultantsApi";
import { assignmentsApi } from "../services/assignmentsApi";
import { validateDocumentFile } from "../services/fileValidation";
import {
  aiApi,
  assignmentToTemporary,
  consultantToDraft,
  type ConsultantDraft,
  type CvAdaptationSuggestion,
  type TemporaryAssignmentDraft,
} from "../services/aiApi";
import type { AssignmentApi, Consultant } from "../types";
import { useI18n } from "../i18n";

type SourceMode = "existing" | "upload" | "paste";

function SourceTabs({
  value,
  onChange,
}: {
  value: SourceMode;
  onChange: (value: SourceMode) => void;
}) {
  const { t } = useI18n();
  const sourceTabs: Array<{ value: SourceMode; label: string }> = [
    { value: "existing", label: t("adaptation_existing") },
    { value: "upload", label: t("adaptation_upload") },
    { value: "paste", label: t("adaptation_paste") },
  ];
  return (
    <div className="inline-flex rounded-lg border border-app-border bg-app p-1">
      {sourceTabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          aria-pressed={value === tab.value}
          className={`rounded-md px-3 py-1.5 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand ${value === tab.value ? "bg-app-surface font-semibold text-app-primary" : "text-app-muted hover:bg-app-raised hover:text-app-primary"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function CvAdaptation() {
  const { t, locale } = useI18n();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");

  const [consultantMode, setConsultantMode] = useState<SourceMode>("existing");
  const [assignmentMode, setAssignmentMode] = useState<SourceMode>("existing");

  const [consultantId, setConsultantId] = useState("");
  const [consultantFile, setConsultantFile] = useState<File | null>(null);
  const [consultantText, setConsultantText] = useState("");

  const [assignmentId, setAssignmentId] = useState("");
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentText, setAssignmentText] = useState("");

  // Keep only the temporary report and the minimal labels needed for printing.
  // sessionStorage is scoped to this browser tab and is cleared when the tab session ends.
  const storageKey = "xlent-cv-adaptation-report";
  const [savedReport] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        result: CvAdaptationSuggestion;
        consultant: ConsultantDraft;
        assignment: TemporaryAssignmentDraft;
      };
      return parsed?.result && parsed?.consultant && parsed?.assignment ? parsed : null;
    } catch {
      return null;
    }
  });
  const [result, setResult] = useState<CvAdaptationSuggestion | null>(savedReport?.result ?? null);
  const [usedConsultant, setUsedConsultant] = useState<ConsultantDraft | null>(savedReport?.consultant ?? null);
  const [usedAssignment, setUsedAssignment] = useState<TemporaryAssignmentDraft | null>(savedReport?.assignment ?? null);

  useEffect(() => {
    try {
      if (result && usedConsultant && usedAssignment) {
        sessionStorage.setItem(storageKey, JSON.stringify({
          result,
          consultant: {
            firstName: usedConsultant.firstName,
            lastName: usedConsultant.lastName,
            seniority: usedConsultant.seniority,
          },
          assignment: {
            title: usedAssignment.title,
            customerName: usedAssignment.customerName,
          },
        }));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      // Storage may be disabled or full; the report still works in React state.
    }
  }, [result, usedConsultant, usedAssignment]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([consultantsApi.getAll(), assignmentsApi.getAll()])
      .then(([consultantData, assignmentData]) => {
        if (cancelled) return;
        setConsultants(consultantData);
        setAssignments(assignmentData);
      })
      .catch((requestError: unknown) => {
        if (!cancelled)
          setError(
            requestError instanceof Error
              ? requestError.message
              : t("consultant_load_error"),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const clearResult = () => {
    setResult(null);
    setUsedConsultant(null);
    setUsedAssignment(null);
    setError("");
  };

  const resetAll = () => {
    clearResult();
    setConsultantMode("existing");
    setAssignmentMode("existing");
    setConsultantId("");
    setConsultantFile(null);
    setConsultantText("");
    setAssignmentId("");
    setAssignmentFile(null);
    setAssignmentText("");
  };

  const resolveConsultant = async (): Promise<ConsultantDraft> => {
    if (consultantMode === "existing") {
      const id = Number(consultantId);
      if (!id) throw new Error(t("adaptation_select_consultant"));
      return consultantToDraft(await consultantsApi.getById(id));
    }

    if (consultantMode === "upload") {
      if (!consultantFile) throw new Error(t("adaptation_choose_cv_file"));
      return aiApi.extractConsultantFromFile(consultantFile);
    }

    if (!consultantText.trim()) throw new Error(t("adaptation_paste_cv"));
    return aiApi.extractConsultantFromText(consultantText.trim());
  };

  const resolveAssignment = async (): Promise<TemporaryAssignmentDraft> => {
    if (assignmentMode === "existing") {
      const id = Number(assignmentId);
      if (!id) throw new Error(t("adaptation_select_assignment"));
      return assignmentToTemporary(await assignmentsApi.getById(id));
    }

    const extracted =
      assignmentMode === "upload"
        ? assignmentFile
          ? await aiApi.extractRequirementsFromFile(assignmentFile)
          : (() => {
              throw new Error(t("adaptation_choose_requirements_file"));
            })()
        : assignmentText.trim()
          ? await aiApi.extractRequirementsFromText(assignmentText.trim())
          : (() => {
              throw new Error(t("adaptation_paste_assignment"));
            })();

    return {
      customerName: "",
      title:
        assignmentMode === "upload"
          ? assignmentFile?.name.replace(/\.[^.]+$/, "") ||
            t("adaptation_assignment")
          : t("adaptation_assignment"),
      description: extracted.sourceText,
      seniority: extracted.seniority,
      minYearsExperience: extracted.minYearsExperience ?? 0,
      availability: extracted.availability,
      requiredStartDate: extracted.requiredStartDate,
      location: extracted.location,
      requirements: extracted.requirements,
    };
  };

  const consultantReady =
    consultantMode === "existing"
      ? Boolean(consultantId)
      : consultantMode === "upload"
        ? Boolean(consultantFile)
        : Boolean(consultantText.trim());

  const assignmentReady =
    assignmentMode === "existing"
      ? Boolean(assignmentId)
      : assignmentMode === "upload"
        ? Boolean(assignmentFile)
        : Boolean(assignmentText.trim());

  const generate = async () => {
    if (!consultantReady || !assignmentReady) {
      setError(
        `${t("adaptation_choose_cv")} ${t("adaptation_choose_assignment")}`,
      );
      return;
    }

    setAnalysing(true);
    setError("");

    try {
      const [consultant, assignment] = await Promise.all([
        resolveConsultant(),
        resolveAssignment(),
      ]);

      const response = await aiApi.suggestTemporaryCvAdaptation(
        consultant,
        assignment,
        locale,
      );
      setUsedConsultant(consultant);
      setUsedAssignment(assignment);
      setResult(response);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("adaptation_generate"),
      );
    } finally {
      setAnalysing(false);
    }
  };

  const printResult = () => {
    if (!result) return;
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-app-muted">
        {t("adaptation_loading")}
      </div>
    );
  }

  return (
    <>
      <style>{`
        .cv-adaptation-print { display: none; }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html, body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .cv-adaptation-print,
          .cv-adaptation-print * {
            visibility: visible !important;
          }

          .cv-adaptation-print {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            background: #ffffff;
            color: #172033;
            font-family: Inter, "Segoe UI", Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .cv-print-accent {
            height: 8mm;
            background: linear-gradient(90deg, #4636d9 0%, #6758ee 58%, #8578ff 100%);
          }

          .cv-print-page {
            padding: 15mm 17mm 16mm;
          }

          .cv-print-brand-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12mm;
            margin-bottom: 8mm;
          }

          .cv-print-brand {
            display: flex;
            align-items: center;
            gap: 3mm;
            color: #4636d9;
            font-size: 9pt;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
          }

          .cv-print-brand-mark {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 7mm;
            height: 7mm;
            border-radius: 2mm;
            background: #4636d9;
            color: #ffffff;
            font-size: 8pt;
            letter-spacing: 0;
          }

          .cv-print-document-label {
            color: #7b8496;
            font-size: 7.5pt;
            font-weight: 600;
            letter-spacing: .08em;
            text-transform: uppercase;
          }

          .cv-print-header {
            padding-bottom: 7mm;
            margin-bottom: 7mm;
            border-bottom: 1px solid #dfe3ec;
          }

          .cv-print-name {
            margin: 0;
            color: #111827;
            font-size: 26pt;
            font-weight: 750;
            line-height: 1.08;
            letter-spacing: -.025em;
          }

          .cv-print-title {
            margin-top: 2.5mm;
            color: #596277;
            font-size: 11pt;
            font-weight: 500;
          }

          .cv-print-target {
            margin-top: 5mm;
            padding: 3.2mm 4mm;
            border: 1px solid #d9d5ff;
            border-left: 3px solid #5848e5;
            border-radius: 2mm;
            background: #f6f5ff;
            color: #424b60;
            font-size: 8.5pt;
            line-height: 1.4;
          }

          .cv-print-target strong {
            color: #4636d9;
            font-weight: 700;
          }

          .cv-print-content {
            font-size: 9.5pt;
            line-height: 1.5;
          }

          .cv-print-section-title {
            break-after: avoid;
            page-break-after: avoid;
            margin: 6mm 0 2.5mm;
            padding-bottom: 1.5mm;
            border-bottom: 1px solid #e5e7ef;
            color: #4636d9;
            font-size: 9.5pt;
            font-weight: 800;
            letter-spacing: .075em;
            text-transform: uppercase;
          }

          .cv-print-paragraph {
            margin: 0 0 2.5mm;
            color: #333c50;
            orphans: 3;
            widows: 3;
          }

          .cv-print-field {
            display: grid;
            grid-template-columns: 35mm 1fr;
            gap: 3mm;
            margin: 0 0 1.6mm;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .cv-print-field > span {
            color: #687187;
            font-size: 8.5pt;
            font-weight: 700;
          }

          .cv-print-field > p {
            margin: 0;
            color: #273044;
          }

          .cv-print-bullet {
            display: grid;
            grid-template-columns: 4mm 1fr;
            gap: 1.5mm;
            margin: 0 0 1.5mm;
            break-inside: avoid;
            page-break-inside: avoid;
            color: #333c50;
          }

          .cv-print-bullet > span {
            color: #5848e5;
            font-size: 10pt;
            font-weight: 800;
          }

          .cv-print-bullet > p {
            margin: 0;
          }

          .cv-print-spacer {
            height: 1.8mm;
          }

          .cv-print-footer {
            margin-top: 9mm;
            padding-top: 3mm;
            border-top: 1px solid #e2e5ec;
            color: #8a92a3;
            font-size: 7.5pt;
            line-height: 1.4;
          }
        }
      `}</style>

      <div className="cv-adaptation-screen p-6 space-y-5 overflow-auto h-full">
        <PageHeader
          title={t("adaptation_title")}
          description={t("adaptation_description")}
        />

        <div className="grid xl:grid-cols-2 gap-5">
          <section className="bg-app-surface border border-app-border rounded-xl p-5 space-y-4 shadow-app-surface">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-app-primary">
                  {t("adaptation_consultant_cv")}
                </h2>
                <p className="text-[10px] text-app-muted mt-1">
                  {t("adaptation_choose_cv")}
                </p>
              </div>
              <SourceTabs
                value={consultantMode}
                onChange={(mode) => {
                  setConsultantMode(mode);
                  clearResult();
                }}
              />
            </div>

            {consultantMode === "existing" && (
              <label className="block space-y-1">
                <span className="text-[11px] text-app-muted">
                  {t("adaptation_consultant_cv")}
                </span>
                <select
                  value={consultantId}
                  onChange={(event) => {
                    setConsultantId(event.target.value);
                    clearResult();
                  }}
                  className="w-full text-xs rounded px-3 py-2.5 bg-app-surface border border-app-border text-app-primary"
                >
                  <option value="">{t("adaptation_select_consultant")}</option>
                  {consultants.map((consultant) => (
                    <option key={consultant.id} value={consultant.id}>
                      {consultant.fullName ||
                        `${consultant.firstName} ${consultant.lastName}`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {consultantMode === "upload" && (
              <p className="text-[11px] text-app-muted">Upload a CV directly for this adaptation only. The document is sent for AI extraction; it is not added to CV Library or linked to a consultant profile. PDF or TXT, max 10 MB.</p>
            )}
            {consultantMode === "upload" && (
              <label className="block space-y-2 rounded-lg border border-dashed border-app-border p-5 text-center cursor-pointer">
                <span className="block text-left text-[11px] text-app-muted">
                  {t("adaptation_consultant_cv")}
                </span>
                <span className="text-xs text-app-secondary">
                  {consultantFile
                    ? consultantFile.name
                    : t("adaptation_choose_cv_file")}
                </span>
                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      const validationError = validateDocumentFile(file);
                      if (validationError) {
                        setConsultantFile(null);
                        setError(validationError);
                        event.currentTarget.value = "";
                        return;
                      }
                    }
                    setConsultantFile(file);
                    clearResult();
                  }}
                />
              </label>
            )}

            {consultantMode === "paste" && (
              <label className="block space-y-1">
                <span className="text-[11px] text-app-muted">
                  {t("adaptation_paste_cv")}
                </span>
                <Textarea
                  value={consultantText}
                  onChange={(event) => {
                    setConsultantText(event.target.value);
                    clearResult();
                  }}
                  rows={9}
                  placeholder={t("adaptation_paste_cv")}
                />
              </label>
            )}
          </section>

          <section className="bg-app-surface border border-app-border rounded-xl p-5 space-y-4 shadow-app-surface">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-app-primary">
                  {t("adaptation_assignment")}
                </h2>
                <p className="text-[10px] text-app-muted mt-1">
                  {t("adaptation_choose_assignment")}
                </p>
              </div>
              <SourceTabs
                value={assignmentMode}
                onChange={(mode) => {
                  setAssignmentMode(mode);
                  clearResult();
                }}
              />
            </div>

            {assignmentMode === "existing" && (
              <label className="block space-y-1">
                <span className="text-[11px] text-app-muted">
                  {t("adaptation_assignment")}
                </span>
                <select
                  value={assignmentId}
                  onChange={(event) => {
                    setAssignmentId(event.target.value);
                    clearResult();
                  }}
                  className="w-full text-xs rounded px-3 py-2.5 bg-app-surface border border-app-border text-app-primary"
                >
                  <option value="">{t("adaptation_select_assignment")}</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.title} · {assignment.customerName}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {assignmentMode === "upload" && (
              <p className="text-[11px] text-app-muted">Upload the customer's requirements for this adaptation. No client assignment is created in the database.</p>
            )}
            {assignmentMode === "upload" && (
              <label className="block space-y-2 rounded-lg border border-dashed border-app-border p-5 text-center cursor-pointer">
                <span className="block text-left text-[11px] text-app-muted">
                  {t("adaptation_assignment")}
                </span>
                <span className="text-xs text-app-secondary">
                  {assignmentFile
                    ? assignmentFile.name
                    : t("adaptation_choose_requirements_file")}
                </span>
                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      const validationError = validateDocumentFile(file);
                      if (validationError) {
                        setAssignmentFile(null);
                        setError(validationError);
                        event.currentTarget.value = "";
                        return;
                      }
                    }
                    setAssignmentFile(file);
                    clearResult();
                  }}
                />
              </label>
            )}

            {assignmentMode === "paste" && (
              <label className="block space-y-1">
                <span className="text-[11px] text-app-muted">
                  {t("adaptation_paste_assignment")}
                </span>
                <Textarea
                  value={assignmentText}
                  onChange={(event) => {
                    setAssignmentText(event.target.value);
                    clearResult();
                  }}
                  rows={9}
                  placeholder={t("adaptation_paste_assignment")}
                />
              </label>
            )}
          </section>
        </div>

        <section className="bg-app-surface border border-app-border rounded-xl p-4 shadow-app-surface">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-xs text-app-primary font-medium">
                {t("adaptation_temporary")}
              </p>
              <p className="text-[10px] text-app-muted mt-1 max-w-3xl">
                {t("adaptation_analysis_note")}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={generate}
              disabled={analysing || !consultantReady || !assignmentReady}
              icon={
                analysing ? (
                  <Loader size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )
              }
            >
              {analysing ? t("adaptation_analysing") : t("adaptation_generate")}
            </Button>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-secondary">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-app-faint">
                  {t("adaptation_result")}
                </p>
                <h2 className="mt-1 text-base font-semibold text-app-primary">
                  CV Analysis Report
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={printResult}>
                  {t("adapt_print")}
                </Button>
                <Button variant="ghost" onClick={clearResult}>
                  {t("adaptation_close")}
                </Button>
              </div>
            </div>

            <section className="rounded-xl border border-app-border bg-app-surface p-5 shadow-app-surface">
              <p className="mb-3 text-sm font-medium text-app-primary">
                {t("adapt_overall")}
              </p>
              <p className="max-w-5xl text-sm leading-7 text-app-secondary">
                {result.overallAssessment}
              </p>
            </section>

            <section className="grid lg:grid-cols-2 gap-4">
              {[
                [t("adapt_strengths"), result.strengths],
                [t("adapt_experience"), result.relevantExperience],
                [t("adapt_weak"), result.missingOrWeakAreas],
                [t("adapt_improve"), result.suggestedImprovements],
              ].map(([title, items]) => (
                <div
                  key={title as string}
                  className="rounded-xl border border-app-border bg-app-surface p-5 shadow-app-surface"
                >
                  <p className="mb-3 text-sm font-medium text-app-primary">
                    {title as string}
                  </p>
                  <div className="space-y-2">
                    {(items as string[]).length === 0 ? (
                      <p className="text-xs text-app-faint">{t("adapt_empty")}</p>
                    ) : (
                      (items as string[]).map((item, index) => (
                        <p key={index} className="text-sm leading-6 text-app-secondary">
                          • {item}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-app-border bg-app-surface p-5 shadow-app-surface">
              <p className="mb-3 text-sm font-medium text-app-primary">
                {t("adapt_evidence")}
              </p>
              <div className="space-y-2">
                {result.evidence.length === 0 ? (
                  <p className="text-xs text-app-faint">{t("adapt_no_evidence")}</p>
                ) : (
                  result.evidence.map((item, index) => (
                    <p key={index} className="text-sm leading-6 text-app-secondary">
                      • {item}
                    </p>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {result && usedConsultant && usedAssignment && (
        <article className="cv-adaptation-print">
          <div className="cv-print-accent" />
          <div className="cv-print-page">
            <div className="cv-print-brand-row">
              <div className="cv-print-brand">
                <span className="cv-print-brand-mark">X</span>
                XLENT Match
              </div>
              <div className="cv-print-document-label">CV analysis report</div>
            </div>

            <header className="cv-print-header">
              <h1 className="cv-print-name">
                {[usedConsultant.firstName, usedConsultant.lastName]
                  .filter(Boolean)
                  .join(" ") || t("adaptation_consultant_cv")}
              </h1>
              {usedConsultant.seniority && <div className="cv-print-title">{usedConsultant.seniority}</div>}
              <div className="cv-print-target">
                <strong>{t("adaptation_adapted_for")}</strong>{" "}
                {usedAssignment.title || t("adaptation_client_assignment")}
                {usedAssignment.customerName
                  ? ` · ${usedAssignment.customerName}`
                  : ""}
              </div>
            </header>

            <section>
              <h2 className="cv-print-section-title">{t("adapt_overall")}</h2>
              <p className="cv-print-paragraph">{result.overallAssessment}</p>
            </section>

            {[
              [t("adapt_strengths"), result.strengths],
              [t("adapt_experience"), result.relevantExperience],
              [t("adapt_weak"), result.missingOrWeakAreas],
              [t("adapt_improve"), result.suggestedImprovements],
              [t("adapt_evidence"), result.evidence],
            ].map(([title, items]) => (
              <section key={title as string}>
                <h2 className="cv-print-section-title">{title as string}</h2>
                {(items as string[]).map((item, index) => (
                  <div key={index} className="cv-print-bullet">
                    <span aria-hidden="true">•</span>
                    <p>{item}</p>
                  </div>
                ))}
              </section>
            ))}

            <footer className="cv-print-footer">
              {t("adaptation_print_footer")}
            </footer>
          </div>
        </article>
      )}
    </>
  );
}
