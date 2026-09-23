import { useEffect, useState } from "react";
import { Loader, Sparkles } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { consultantsApi } from "../services/consultantsApi";
import { assignmentsApi } from "../services/assignmentsApi";
import {
  aiApi,
  assignmentToTemporary,
  consultantToDraft,
  type ConsultantDraft,
  type CvAdaptationSuggestion,
  type TemporaryAssignmentDraft,
} from "../services/aiApi";
import type { AssignmentApi, Consultant } from "../types";

type SourceMode = "existing" | "upload" | "paste";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validateInputFile(file: File): string | null {
  if (!/\.(pdf|txt)$/i.test(file.name)) return "Unsupported file type. Use PDF or TXT.";
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_FILE_SIZE) return "File is larger than 10 MB.";
  return null;
}

const sourceTabs: Array<{ value: SourceMode; label: string }> = [
  { value: "existing", label: "Existing" },
  { value: "upload", label: "Upload" },
  { value: "paste", label: "Paste" },
];

function SourceTabs({
  value,
  onChange,
}: {
  value: SourceMode;
  onChange: (value: SourceMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-app bg-app p-1">
      {sourceTabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className="text-[11px] px-3 py-1.5 rounded-md"
          style={value === tab.value
            ? { background: "var(--color-surface)", color: "var(--color-text-primary)", fontWeight: 600 }
            : { color: "var(--color-text-muted)" }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function CvAdaptation() {
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

  const [result, setResult] = useState<CvAdaptationSuggestion | null>(null);
  const [adaptedText, setAdaptedText] = useState("");
  const [usedConsultant, setUsedConsultant] = useState<ConsultantDraft | null>(null);
  const [usedAssignment, setUsedAssignment] = useState<TemporaryAssignmentDraft | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([consultantsApi.getAll(), assignmentsApi.getAll()])
      .then(([consultantData, assignmentData]) => {
        if (cancelled) return;
        setConsultants(consultantData);
        setAssignments(assignmentData);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Could not load data.");
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
    setAdaptedText("");
    setUsedConsultant(null);
    setUsedAssignment(null);
    setCopied(false);
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
      if (!id) throw new Error("Select an existing consultant.");
      return consultantToDraft(await consultantsApi.getById(id));
    }

    if (consultantMode === "upload") {
      if (!consultantFile) throw new Error("Upload a consultant CV.");
      return aiApi.extractConsultantFromFile(consultantFile);
    }

    if (!consultantText.trim()) throw new Error("Paste the consultant CV text.");
    return aiApi.extractConsultantFromText(consultantText.trim());
  };

  const resolveAssignment = async (): Promise<TemporaryAssignmentDraft> => {
    if (assignmentMode === "existing") {
      const id = Number(assignmentId);
      if (!id) throw new Error("Select an existing client assignment.");
      return assignmentToTemporary(await assignmentsApi.getById(id));
    }

    const extracted = assignmentMode === "upload"
      ? assignmentFile
        ? await aiApi.extractRequirementsFromFile(assignmentFile)
        : (() => { throw new Error("Upload an assignment requirements file."); })()
      : assignmentText.trim()
        ? await aiApi.extractRequirementsFromText(assignmentText.trim())
        : (() => { throw new Error("Paste the assignment requirements."); })();

    return {
      customerName: "",
      title: assignmentMode === "upload"
        ? assignmentFile?.name.replace(/\.[^.]+$/, "") || "Uploaded assignment"
        : "Pasted assignment",
      description: extracted.sourceText,
      seniority: extracted.seniority,
      minYearsExperience: extracted.minYearsExperience ?? 0,
      availability: extracted.availability,
      requirements: extracted.requirements,
    };
  };

  const consultantReady =
    consultantMode === "existing" ? Boolean(consultantId) :
    consultantMode === "upload" ? Boolean(consultantFile) :
    Boolean(consultantText.trim());

  const assignmentReady =
    assignmentMode === "existing" ? Boolean(assignmentId) :
    assignmentMode === "upload" ? Boolean(assignmentFile) :
    Boolean(assignmentText.trim());

  const generate = async () => {
    if (!consultantReady || !assignmentReady) {
      setError("Provide both a consultant CV and client assignment before generating suggestions.");
      return;
    }

    setAnalysing(true);
    setError("");
    setCopied(false);

    try {
      const [consultant, assignment] = await Promise.all([
        resolveConsultant(),
        resolveAssignment(),
      ]);

      const response = await aiApi.suggestTemporaryCvAdaptation(consultant, assignment);
      setUsedConsultant(consultant);
      setUsedAssignment(assignment);
      setResult(response);
      setAdaptedText(response.adaptedCvText);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate CV suggestions.");
    } finally {
      setAnalysing(false);
    }
  };

  const copyText = async () => {
    if (!adaptedText.trim()) return;

    try {
      await navigator.clipboard.writeText(adaptedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the text. Select the text and copy it manually.");
    }
  };

  const printResult = () => {
    if (!adaptedText.trim()) return;
    window.print();
  };

  if (loading) {
    return <div className="p-6 text-sm text-app-muted">Loading CV adaptation...</div>;
  }

  return (
    <>
      <style>{`
        .cv-adaptation-print { display: none; }

        @media print {
          @page {
            size: A4;
            margin: 16mm 17mm 18mm;
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
            width: 100%;
            background: white;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
          }

          .cv-print-header {
            border-bottom: 2px solid #111827;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }

          .cv-print-name {
            font-size: 24px;
            font-weight: 700;
            line-height: 1.2;
            margin: 0;
          }

          .cv-print-title {
            font-size: 12px;
            color: #4b5563;
            margin-top: 5px;
          }

          .cv-print-target {
            margin-top: 12px;
            padding: 8px 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 10px;
            color: #374151;
          }

          .cv-print-body {
            white-space: pre-wrap;
            font-size: 10.5pt;
            line-height: 1.55;
            overflow-wrap: anywhere;
          }

          .cv-print-footer {
            margin-top: 22px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            font-size: 8.5px;
            color: #6b7280;
          }
        }
      `}</style>

      <div className="cv-adaptation-screen p-6 space-y-5 overflow-auto h-full">
        <PageHeader
          title="CV Adaptation"
          description="Choose, upload or paste a CV and assignment. AI suggests improvements temporarily; nothing from this page is saved to the database."
        />

        <div className="grid xl:grid-cols-2 gap-5">
          <section className="bg-app-surface border border-app rounded-xl p-5 space-y-4 shadow-app-surface">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-app-primary">Consultant CV</h2>
                <p className="text-[10px] text-app-muted mt-1">Choose how you want to provide the consultant CV.</p>
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
              <select
                value={consultantId}
                onChange={(event) => {
                  setConsultantId(event.target.value);
                  clearResult();
                }}
                className="w-full text-xs rounded px-3 py-2.5 bg-app-surface border border-app text-app-primary"
              >
                <option value="">Select consultant</option>
                {consultants.map((consultant) => (
                  <option key={consultant.id} value={consultant.id}>
                    {consultant.fullName || `${consultant.firstName} ${consultant.lastName}`} · {consultant.title || "Consultant"}
                  </option>
                ))}
              </select>
            )}

            {consultantMode === "upload" && (
              <label className="block rounded-lg border border-dashed border-app p-5 text-center cursor-pointer">
                <span className="text-xs text-app-secondary">
                  {consultantFile ? consultantFile.name : "Choose consultant CV (PDF or TXT)"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      const validationError = validateInputFile(file);
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
              <Textarea
                value={consultantText}
                onChange={(event) => {
                  setConsultantText(event.target.value);
                  clearResult();
                }}
                rows={9}
                placeholder="Paste the consultant CV text here..."
              />
            )}
          </section>

          <section className="bg-app-surface border border-app rounded-xl p-5 space-y-4 shadow-app-surface">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-app-primary">Client Assignment</h2>
                <p className="text-[10px] text-app-muted mt-1">Choose how you want to provide the assignment requirements.</p>
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
              <select
                value={assignmentId}
                onChange={(event) => {
                  setAssignmentId(event.target.value);
                  clearResult();
                }}
                className="w-full text-xs rounded px-3 py-2.5 bg-app-surface border border-app text-app-primary"
              >
                <option value="">Select assignment</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.title} · {assignment.customerName}
                  </option>
                ))}
              </select>
            )}

            {assignmentMode === "upload" && (
              <label className="block rounded-lg border border-dashed border-app p-5 text-center cursor-pointer">
                <span className="text-xs text-app-secondary">
                  {assignmentFile ? assignmentFile.name : "Choose requirements file (PDF or TXT)"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      const validationError = validateInputFile(file);
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
              <Textarea
                value={assignmentText}
                onChange={(event) => {
                  setAssignmentText(event.target.value);
                  clearResult();
                }}
                rows={9}
                placeholder="Paste the customer assignment or requirement specification here..."
              />
            )}
          </section>
        </div>

        <section className="bg-app-surface border border-app rounded-xl p-4 shadow-app-surface">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-xs text-app-primary font-medium">Temporary analysis only</p>
              <p className="text-[10px] text-app-muted mt-1 max-w-3xl">
                This page does not update consultants, assignments or CV records. AI may only rephrase, reorder and emphasize information already present in the CV.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={generate}
              disabled={analysing || !consultantReady || !assignmentReady}
              icon={analysing ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
            >
              {analysing ? "Analysing..." : "Generate suggestions"}
            </Button>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <section className="rounded-lg p-4" style={{ background: "var(--color-brand-soft)", border: "1px solid var(--color-brand-subtle)" }}>
              <p className="text-[10px] text-app-faint uppercase tracking-wide mb-2">AI summary</p>
              <p className="text-xs text-app-secondary leading-relaxed">{result.summary}</p>
            </section>

            <section className="grid md:grid-cols-2 gap-4">
              <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                <p className="text-xs font-medium text-app-primary mb-3">What to emphasize</p>
                <div className="space-y-2">
                  {result.highlightedExperiences.length === 0
                    ? <p className="text-xs text-app-faint">No specific highlights returned.</p>
                    : result.highlightedExperiences.map((item, index) => (
                      <p key={index} className="text-xs text-app-secondary">• {item}</p>
                    ))}
                </div>
              </div>

              <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
                <p className="text-xs font-medium text-app-primary mb-3">Suggestions / gaps</p>
                <div className="space-y-2">
                  {result.notes.length === 0
                    ? <p className="text-xs text-app-faint">No additional notes.</p>
                    : result.notes.map((item, index) => (
                      <p key={index} className="text-xs text-app-secondary">• {item}</p>
                    ))}
                </div>
              </div>
            </section>

            <section className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs font-medium text-app-primary">Adapted CV draft</p>
                  <p className="text-[10px] text-app-muted mt-0.5">Edit the temporary result before copying or printing it.</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={copyText}>{copied ? "Copied" : "Copy text"}</Button>
                  <Button variant="secondary" onClick={printResult}>Print</Button>
                  <Button variant="ghost" onClick={clearResult}>Close result</Button>
                  <Button variant="ghost" onClick={resetAll}>Start over</Button>
                </div>
              </div>

              <Textarea
                value={adaptedText}
                onChange={(event) => setAdaptedText(event.target.value)}
                rows={20}
              />
            </section>
          </div>
        )}
      </div>

      {result && usedConsultant && usedAssignment && (
        <article className="cv-adaptation-print">
          <header className="cv-print-header">
            <h1 className="cv-print-name">
              {[usedConsultant.firstName, usedConsultant.lastName].filter(Boolean).join(" ") || "Consultant CV"}
            </h1>
            <div className="cv-print-title">
              {[usedConsultant.title, usedConsultant.seniority].filter(Boolean).join(" · ")}
            </div>
            <div className="cv-print-target">
              <strong>Adapted for:</strong> {usedAssignment.title || "Client assignment"}
              {usedAssignment.customerName ? ` · ${usedAssignment.customerName}` : ""}
            </div>
          </header>

          <div className="cv-print-body">{adaptedText}</div>

          <footer className="cv-print-footer">
            CV adaptation draft generated from the consultant information provided for this assignment. Review before use.
          </footer>
        </article>
      )}
    </>
  );
}
