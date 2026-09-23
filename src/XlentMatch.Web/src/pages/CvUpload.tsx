import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader, Plus, X, Eye } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { aiApi, type ConsultantDraft } from "../services/aiApi";
import { consultantsApi } from "../services/consultantsApi";
import { cvUploadsApi, type CvUploadStatus, type CvUploadView } from "../services/cvUploadsApi";
import type { Consultant } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dateOnly(value: string | null) {
  if (!value) return null;
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
}

function toConsultant(draft: ConsultantDraft): Consultant {
  return {
    id: 0,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email?.trim() || null,
    title: draft.title?.trim() || null,
    summary: draft.summary?.trim() || null,
    seniority: draft.seniority?.trim() || null,
    yearsOfExperience: draft.yearsOfExperience,
    availability: draft.availability?.trim() || null,
    office: draft.office?.trim() || null,
    originalCvText: null,
    fullName: undefined,
    skills: draft.skills.filter((skill) => skill.name.trim()).map((skill) => ({
      id: 0,
      consultantId: 0,
      name: skill.name.trim(),
      category: null,
      years: skill.years,
      level: skill.level,
      evidence: skill.evidence?.trim() || null,
    })),
    experiences: draft.experiences.filter((item) => item.company.trim() || item.role.trim()).map((item) => ({
      id: 0,
      consultantId: 0,
      company: item.company.trim(),
      role: item.role.trim(),
      description: item.description?.trim() || null,
      startDate: dateOnly(item.startDate),
      endDate: dateOnly(item.endDate),
    })),
    projects: draft.projects.filter((item) => item.name.trim()).map((item) => ({
      id: 0,
      consultantId: 0,
      name: item.name.trim(),
      description: item.description?.trim() || null,
      technologies: item.technologies?.trim() || null,
    })),
    education: draft.education.filter((item) => item.degree.trim()).map((item) => ({
      id: 0,
      consultantId: 0,
      degree: item.degree.trim(),
      school: item.school?.trim() || null,
      year: item.year?.trim() || null,
    })),
    languages: draft.languages.filter((item) => item.name.trim()).map((item) => ({
      id: 0,
      consultantId: 0,
      name: item.name.trim(),
      level: item.level?.trim() || null,
    })),
    industries: draft.industries.filter((name) => name.trim()).map((name) => ({
      id: 0,
      consultantId: 0,
      name: name.trim(),
    })),
    certifications: draft.certifications.filter((item) => item.name.trim()).map((item) => ({
      id: 0,
      consultantId: 0,
      name: item.name.trim(),
      issuer: item.issuer?.trim() || null,
      issuedDate: dateOnly(item.issuedDate),
    })),
  };
}

function parseUpload(record: Awaited<ReturnType<typeof cvUploadsApi.getAll>>[number]): CvUploadView {
  if (!record.draftJson) return record;

  try {
    return { ...record, draft: JSON.parse(record.draftJson) as ConsultantDraft };
  } catch {
    return record;
  }
}

export default function CvUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<CvUploadView[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    cvUploadsApi
      .getAll()
      .then((records) => {
        if (!cancelled) setFiles(records.map(parseUpload));
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Could not load CV uploads.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeFile = files.find((file) => file.id === activeId) ?? null;
  const draft = activeFile?.draft ?? null;

  useEffect(() => {
    if (!activeFile || activeFile.status !== "Review" || !activeFile.draft) return;

    const timer = window.setTimeout(() => {
      void cvUploadsApi.update(activeFile.id, {
        status: "Review",
        consultantId: null,
        errorMessage: null,
        draftJson: JSON.stringify(activeFile.draft),
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [activeFile?.id, activeFile?.draft, activeFile?.status]);

  const updateLocal = (id: number, patch: Partial<CvUploadView>) => {
    setFiles((current) => current.map((file) => file.id === id ? { ...file, ...patch } : file));
  };

  const updateDraft = (next: ConsultantDraft) => {
    if (!activeFile) return;
    updateLocal(activeFile.id, { draft: next, draftJson: JSON.stringify(next) });
  };

  const handleFile = async (file?: File) => {
    if (!file) return;

    if (!/\.(pdf|txt)$/i.test(file.name)) {
      setError("Unsupported file type. Use PDF or TXT.");
      return;
    }

    if (file.size <= 0) {
      setError("The selected file is empty.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File is larger than 10 MB.");
      return;
    }

    setError("");

    let uploadId: number | null = null;

    try {
      const created = await cvUploadsApi.create(file.name, file.size, "Extracting");
      uploadId = created.id;
      setFiles((current) => [created, ...current]);

      const result = await aiApi.extractConsultantFromFile(file);
      const updated = await cvUploadsApi.update(created.id, {
        status: "Review",
        draftJson: JSON.stringify(result),
        consultantId: null,
        errorMessage: null,
      });

      updateLocal(created.id, { ...updated, draft: result });
      setActiveId(created.id);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Could not extract the CV.";
      setError(message);

      if (uploadId !== null) {
        try {
          const updated = await cvUploadsApi.update(uploadId, {
            status: "Error",
            errorMessage: message,
            consultantId: null,
            draftJson: null,
          });
          updateLocal(uploadId, updated);
        } catch {
          // Keep the original extraction error visible.
        }
      }
    }
  };

  const saveConsultant = async () => {
    if (!activeFile?.draft) return;

    if (!activeFile.draft.firstName.trim() || !activeFile.draft.lastName.trim()) {
      setError("First name and last name are required before saving.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await consultantsApi.create(toConsultant(activeFile.draft));

      const updatedUpload = await cvUploadsApi.update(activeFile.id, {
        status: "Indexed",
        consultantId: created.id,
        errorMessage: null,
        draftJson: null,
      });

      updateLocal(activeFile.id, { ...updatedUpload, draft: undefined });
      setActiveId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save consultant.");
    } finally {
      setSaving(false);
    }
  };

  const total = files.length;
  const processing = files.filter((file) => file.status === "Extracting" || file.status === "Review").length;
  const indexed = files.filter((file) => file.status === "Indexed").length;
  const errors = files.filter((file) => file.status === "Error").length;
  const canSave = Boolean(draft?.firstName.trim() && draft?.lastName.trim());

  const statusColor = (status: CvUploadStatus) =>
    status === "Indexed" ? "var(--color-success)" :
    status === "Error" ? "var(--color-danger)" :
    status === "Review" ? "var(--color-warning)" :
    "var(--color-brand)";

  const progress = (status: CvUploadStatus) =>
    status === "Extracting" ? 45 :
    status === "Review" ? 75 :
    100;

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="CV Upload"
        description="Upload consultant CVs, extract structured data with AI, review the result, and save approved consultants."
      />

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total CVs", value: total },
          { label: "Processing / Review", value: processing },
          { label: "Saved / Indexed", value: indexed },
          { label: "Errors", value: errors },
        ].map((item) => (
          <div key={item.label} className="bg-app-surface border border-app rounded-lg px-4 py-3 shadow-app-surface">
            <p className="text-xl font-semibold font-mono text-app-primary">{item.value}</p>
            <p className="text-[10px] text-app-faint mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div
        className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragging ? "var(--color-brand)" : "var(--color-border)",
          background: dragging ? "var(--color-brand-subtle)" : "transparent",
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <UploadIcon size={28} className="mx-auto mb-3 text-app-faint" />
        <p className="text-sm text-app-secondary">Drop a PDF/TXT here or click to choose a CV</p>
        <p className="text-xs text-app-faint mt-1">Upload → AI extraction → review → save to Consultants.</p>
      </div>

      <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-[11px] text-app-muted">
        Upload history is stored in the database and remains after navigation, refresh, and restart. The original PDF file itself is not stored in the MVP.
      </div>

      {error && (
        <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
          {error}
        </div>
      )}

      <div className="bg-app-surface border border-app rounded-lg overflow-hidden shadow-app-surface">
        <div className="px-4 py-2.5 border-b border-app flex items-center justify-between">
          <span className="text-xs font-medium text-app-primary">CV processing history</span>
          <span className="text-[10px] text-app-faint">{loading ? "Loading..." : `${files.length} files`}</span>
        </div>

        {!loading && files.length === 0 && (
          <p className="px-4 py-6 text-xs text-app-faint text-center">No CVs uploaded yet.</p>
        )}

        {files.map((file, index) => (
          <div
            key={file.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: index < files.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}
          >
            <FileText size={13} className="text-app-faint flex-none" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-app-primary font-mono truncate">{file.fileName}</span>
                <span className="text-[10px] text-app-faint">{formatBytes(file.fileSize)}</span>
              </div>

              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 rounded-full" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: progress(file.status) + "%", backgroundColor: statusColor(file.status) }}
                  />
                </div>

                <span className="text-[10px] min-w-24" style={{ color: statusColor(file.status) }}>
                  {file.status === "Extracting" && <Loader size={9} className="inline animate-spin mr-1" />}
                  {file.status === "Indexed" && <CheckCircle size={9} className="inline mr-1" />}
                  {file.status === "Error" && <AlertCircle size={9} className="inline mr-1" />}
                  {file.status === "Review" ? "Review needed" : file.status}
                </span>
              </div>

              <p className="text-[10px] text-app-faint mt-1">{new Date(file.uploadedAt).toLocaleString()}</p>
              {file.errorMessage && <p className="text-[10px] mt-1" style={{ color: "var(--color-danger)" }}>{file.errorMessage}</p>}
            </div>

            {file.status === "Review" && file.draft && (
              <button
                type="button"
                onClick={() => setActiveId(file.id)}
                className="inline-flex items-center gap-1 text-[11px] text-app-secondary border border-app rounded px-2.5 py-1.5"
              >
                <Eye size={11} /> Review
              </button>
            )}

            {file.status === "Indexed" && file.consultantId && (
              <Link
                to={"/consultants/" + file.consultantId}
                className="inline-flex items-center gap-1 text-[11px] text-app-secondary border border-app rounded px-2.5 py-1.5"
              >
                <Eye size={11} /> View Consultant
              </Link>
            )}

          </div>
        ))}
      </div>

      {draft && activeFile && (
        <Modal
          open
          title="Review extracted consultant"
          description="AI extracted this data from the CV. Correct anything that is wrong before saving."
          onClose={() => setActiveId(null)}
        >
          <div className="p-5 space-y-5 max-h-[75vh] overflow-auto">
            <div className="flex items-center gap-2 text-xs text-app-muted">
              <FileText size={12} /> {activeFile.fileName}
            </div>

            <section className="space-y-3">
              <p className="text-[10px] uppercase tracking-wide text-app-faint">Basic information</p>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">First name <span className="text-app-brand">*</span></span>
                  <Input value={draft.firstName} onChange={(event) => updateDraft({ ...draft, firstName: event.target.value })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Last name <span className="text-app-brand">*</span></span>
                  <Input value={draft.lastName} onChange={(event) => updateDraft({ ...draft, lastName: event.target.value })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Title</span>
                  <Input value={draft.title ?? ""} onChange={(event) => updateDraft({ ...draft, title: event.target.value || null })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Seniority</span>
                  <Input value={draft.seniority ?? ""} onChange={(event) => updateDraft({ ...draft, seniority: event.target.value || null })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Years of experience</span>
                  <Input type="number" min={0} value={draft.yearsOfExperience} onChange={(event) => updateDraft({ ...draft, yearsOfExperience: Number(event.target.value) || 0 })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Email</span>
                  <Input value={draft.email ?? ""} onChange={(event) => updateDraft({ ...draft, email: event.target.value || null })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Availability</span>
                  <Input value={draft.availability ?? ""} onChange={(event) => updateDraft({ ...draft, availability: event.target.value || null })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Office</span>
                  <Input value={draft.office ?? ""} onChange={(event) => updateDraft({ ...draft, office: event.target.value || null })} />
                </label>
              </div>

              <label className="block">
                <span className="text-[11px] text-app-muted block mb-1">Summary</span>
                <Textarea value={draft.summary ?? ""} onChange={(event) => updateDraft({ ...draft, summary: event.target.value || null })} rows={4} />
              </label>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wide text-app-faint">Skills ({draft.skills.length})</p>
                <Button
                  variant="ghost"
                  icon={<Plus size={11} />}
                  onClick={() => updateDraft({
                    ...draft,
                    skills: [...draft.skills, { name: "", level: 0, years: 0, evidence: null }],
                  })}
                >
                  Add skill
                </Button>
              </div>

              <div className="space-y-2">
                {draft.skills.map((skill, index) => (
                  <div key={index} className="grid grid-cols-[1fr_80px_80px_30px] gap-2 items-center">
                    <Input
                      value={skill.name}
                      placeholder="Skill"
                      onChange={(event) => updateDraft({
                        ...draft,
                        skills: draft.skills.map((item, currentIndex) => currentIndex === index ? { ...item, name: event.target.value } : item),
                      })}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={skill.years}
                      placeholder="Years"
                      onChange={(event) => updateDraft({
                        ...draft,
                        skills: draft.skills.map((item, currentIndex) => currentIndex === index ? { ...item, years: Number(event.target.value) || 0 } : item),
                      })}
                    />
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={skill.level}
                      placeholder="Level"
                      onChange={(event) => updateDraft({
                        ...draft,
                        skills: draft.skills.map((item, currentIndex) => currentIndex === index ? { ...item, level: Number(event.target.value) || 0 } : item),
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => updateDraft({ ...draft, skills: draft.skills.filter((_, currentIndex) => currentIndex !== index) })}
                      className="text-app-faint hover:text-app-secondary"
                      aria-label="Remove skill"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-app bg-app-raised p-3">
                <p className="text-[10px] uppercase tracking-wide text-app-faint mb-2">Experience ({draft.experiences.length})</p>
                {draft.experiences.slice(0, 5).map((item, index) => (
                  <div key={index} className="mb-2">
                    <p className="text-xs text-app-primary">{item.role || "Role"} · {item.company || "Company"}</p>
                    <p className="text-[10px] text-app-muted">{item.startDate || "?"} – {item.endDate || "Present"}</p>
                  </div>
                ))}
                {draft.experiences.length === 0 && <p className="text-xs text-app-faint">No experience extracted.</p>}
              </div>

              <div className="rounded-lg border border-app bg-app-raised p-3">
                <p className="text-[10px] uppercase tracking-wide text-app-faint mb-2">Projects ({draft.projects.length})</p>
                {draft.projects.slice(0, 5).map((item, index) => (
                  <div key={index} className="mb-2">
                    <p className="text-xs text-app-primary">{item.name}</p>
                    <p className="text-[10px] text-app-muted">{item.technologies || "No technologies listed"}</p>
                  </div>
                ))}
                {draft.projects.length === 0 && <p className="text-xs text-app-faint">No projects extracted.</p>}
              </div>

              <div className="rounded-lg border border-app bg-app-raised p-3">
                <p className="text-[10px] uppercase tracking-wide text-app-faint mb-2">Education & certifications</p>
                <p className="text-xs text-app-secondary">Education: {draft.education.length}</p>
                <p className="text-xs text-app-secondary mt-1">Certifications: {draft.certifications.length}</p>
              </div>

              <div className="rounded-lg border border-app bg-app-raised p-3">
                <p className="text-[10px] uppercase tracking-wide text-app-faint mb-2">Other extracted data</p>
                <p className="text-xs text-app-secondary">Languages: {draft.languages.map((item) => item.name).join(", ") || "—"}</p>
                <p className="text-xs text-app-secondary mt-1">Industries: {draft.industries.join(", ") || "—"}</p>
              </div>
            </section>

            {!canSave && <p className="text-[10px] text-app-faint">First name and last name must be filled in before saving.</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setActiveId(null)}>Close</Button>
              <Button variant="primary" onClick={saveConsultant} disabled={saving || !canSave}>
                {saving ? "Saving..." : "Approve and save consultant"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
