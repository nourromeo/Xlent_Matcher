import { useEffect, useState } from "react";
import { CheckCircle, Loader, Sparkles } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { consultantsApi } from "../services/consultantsApi";
import { assignmentsApi } from "../services/assignmentsApi";
import { aiApi, type AdaptedCvRecord, type CvAdaptationSuggestion } from "../services/aiApi";
import type { AssignmentApi, Consultant } from "../types";

export default function CvAdaptation() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [consultantId, setConsultantId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [result, setResult] = useState<CvAdaptationSuggestion | null>(null);
  const [adaptedText, setAdaptedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedVersions, setSavedVersions] = useState<AdaptedCvRecord[]>([]);
  const [error, setError] = useState("");

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

  useEffect(() => {
    const cId = Number(consultantId);

    if (!cId) {
      setSavedVersions([]);
      return;
    }

    let cancelled = false;

    aiApi
      .getAdaptedCvsForConsultant(cId)
      .then((records) => {
        if (!cancelled) setSavedVersions(records);
      })
      .catch(() => {
        if (!cancelled) setSavedVersions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [consultantId]);

  const analyse = async () => {
    const cId = Number(consultantId);
    const aId = Number(assignmentId);
    if (!cId || !aId) return;

    setAnalysing(true);
    setSaved(false);
    setError("");

    try {
      const response = await aiApi.suggestCvAdaptation(cId, aId);
      setResult(response);
      setAdaptedText(response.adaptedCvText);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI CV adaptation failed.");
    } finally {
      setAnalysing(false);
    }
  };

  const save = async () => {
    const cId = Number(consultantId);
    const aId = Number(assignmentId);
    if (!cId || !aId || !adaptedText.trim()) return;

    setSaving(true);
    setError("");

    try {
      const created = await aiApi.saveAdaptedCv(cId, aId, adaptedText);
      setSavedVersions((current) => [created, ...current]);
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save adapted CV.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-app-muted">Loading CV adaptation...</div>;
  }

  return (
    <div className="p-6 space-y-5 overflow-auto h-full">
      <PageHeader
        title="CV Adaptation"
        description="Use Azure OpenAI to adapt an existing consultant CV to a selected client assignment without inventing new experience."
      />

      <section className="bg-app-surface border border-app rounded-xl p-5 space-y-4 shadow-app-surface">
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="text-[11px] text-app-muted block mb-1.5">Consultant</span>
            <select
              value={consultantId}
              onChange={(event) => {
                setConsultantId(event.target.value);
                setResult(null);
                setSaved(false);
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
          </label>

          <label>
            <span className="text-[11px] text-app-muted block mb-1.5">Client assignment</span>
            <select
              value={assignmentId}
              onChange={(event) => {
                setAssignmentId(event.target.value);
                setResult(null);
                setSaved(false);
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
          </label>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-[10px] text-app-faint max-w-2xl">
            Only existing consultant data and assignment requirements are sent to the AI. Review the result before saving.
          </p>
          <Button
            variant="primary"
            onClick={analyse}
            disabled={!consultantId || !assignmentId || analysing}
            icon={analysing ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
          >
            {analysing ? "Generating..." : "Generate adapted CV"}
          </Button>
        </div>
      </section>

      {error && <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">{error}</div>}

      {consultantId && savedVersions.length > 0 && (
        <section className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-app-primary">Saved adapted CVs</p>
            <span className="text-[10px] text-app-faint">{savedVersions.length} saved</span>
          </div>
          <div className="space-y-2">
            {savedVersions.slice(0, 5).map((item) => {
              const assignment = assignments.find((assignmentItem) => assignmentItem.id === item.assignmentId);
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 text-xs border-t border-app-subtle pt-2 first:border-t-0 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-app-primary truncate">{assignment?.title || `Assignment #${item.assignmentId}`}</p>
                    <p className="text-[10px] text-app-faint">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="text-[10px] font-mono text-app-muted">#{item.id}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {result && (
        <div className="space-y-4">
          <section className="rounded-lg p-4" style={{ background: "var(--color-brand-soft)", border: "1px solid var(--color-brand-subtle)" }}>
            <p className="text-[10px] text-app-faint uppercase tracking-wide mb-2">AI summary</p>
            <p className="text-xs text-app-secondary leading-relaxed">{result.summary}</p>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
              <p className="text-xs font-medium text-app-primary mb-3">Highlighted experience</p>
              <div className="space-y-2">
                {result.highlightedExperiences.map((item, index) => (
                  <div key={index} className="flex gap-2 text-xs text-app-secondary">
                    <CheckCircle size={11} className="text-app-brand flex-none mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
              <p className="text-xs font-medium text-app-primary mb-3">AI notes</p>
              <div className="space-y-2">
                {result.notes.map((item, index) => (
                  <p key={index} className="text-xs text-app-secondary">• {item}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-app-surface border border-app rounded-lg p-4 shadow-app-surface">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-app-primary">Adapted CV text</p>
                <p className="text-[10px] text-app-muted mt-0.5">Edit anything before saving.</p>
              </div>
              {saved && <span className="text-[11px]" style={{ color: "var(--color-success)" }}>Saved</span>}
            </div>

            <Textarea value={adaptedText} onChange={(event) => setAdaptedText(event.target.value)} rows={18} />

            <div className="flex justify-end mt-3">
              <Button variant="primary" onClick={save} disabled={saving || !adaptedText.trim()}>
                {saving ? "Saving..." : "Save adapted CV"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
