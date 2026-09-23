import { useRef, useState } from "react";
import { Upload as UploadIcon, FileText, CheckCircle, Loader, Plus, X } from "../design-system/icons";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { aiApi, type ConsultantDraft } from "../services/aiApi";
import { consultantsApi } from "../services/consultantsApi";
import type { Consultant } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
    originalCvText: draft.sourceText,
    fullName: undefined,
    skills: draft.skills
      .filter((skill) => skill.name.trim())
      .map((skill) => ({
        id: 0,
        consultantId: 0,
        name: skill.name.trim(),
        category: skill.category?.trim() || null,
        years: skill.years,
        level: skill.level,
        evidence: skill.evidence?.trim() || null,
      })),
    experiences: draft.experiences
      .filter((experience) => experience.company.trim() || experience.role.trim())
      .map((experience) => ({
        id: 0,
        consultantId: 0,
        company: experience.company.trim(),
        role: experience.role.trim(),
        description: experience.description?.trim() || null,
        startDate: dateOnly(experience.startDate),
        endDate: dateOnly(experience.endDate),
      })),
    projects: draft.projects
      .filter((project) => project.name.trim())
      .map((project) => ({
        id: 0,
        consultantId: 0,
        name: project.name.trim(),
        description: project.description?.trim() || null,
        technologies: project.technologies?.trim() || null,
      })),
    education: draft.education
      .filter((item) => item.degree.trim())
      .map((item) => ({
        id: 0,
        consultantId: 0,
        degree: item.degree.trim(),
        school: item.school?.trim() || null,
        year: item.year?.trim() || null,
      })),
    languages: draft.languages
      .filter((language) => language.name.trim())
      .map((language) => ({
        id: 0,
        consultantId: 0,
        name: language.name.trim(),
        level: language.level?.trim() || null,
      })),
    industries: draft.industries
      .filter((name) => name.trim())
      .map((name) => ({ id: 0, consultantId: 0, name: name.trim() })),
    certifications: draft.certifications
      .filter((certification) => certification.name.trim())
      .map((certification) => ({
        id: 0,
        consultantId: 0,
        name: certification.name.trim(),
        issuer: certification.issuer?.trim() || null,
        issuedDate: dateOnly(certification.issuedDate),
      })),
  };
}

export default function CvUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ConsultantDraft | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file?: File) => {
    if (!file) return;

    if (!/\.(pdf|txt)$/i.test(file.name)) {
      setError("Use a PDF or TXT file for AI extraction.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("The file is larger than 10 MB.");
      return;
    }

    setExtracting(true);
    setSaved(false);
    setError("");
    setFileName(file.name);

    try {
      const result = await aiApi.extractConsultantFromFile(file);
      setDraft(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not extract the CV.");
    } finally {
      setExtracting(false);
    }
  };

  const saveConsultant = async () => {
    if (!draft) return;

    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setError("First name and last name are required before saving.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await consultantsApi.create(toConsultant(draft));
      setSaved(true);
      setDraft(null);
      setFileName("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save consultant.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(draft?.firstName.trim() && draft?.lastName.trim());

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="CV Upload"
        description="Upload a consultant CV, let AI extract structured data, review it, then save the consultant."
      />

      {saved && (
        <div className="rounded-lg px-4 py-3 flex items-center gap-2" style={{ background: "var(--color-success-soft)", border: "1px solid var(--color-success-border)" }}>
          <CheckCircle size={13} style={{ color: "var(--color-success)" }} />
          <p className="text-xs text-app-secondary">Consultant saved to the database.</p>
        </div>
      )}

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
        onClick={() => !extracting && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          disabled={extracting}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        {extracting ? (
          <Loader size={28} className="animate-spin mx-auto mb-3 text-app-brand" />
        ) : (
          <UploadIcon size={28} className="mx-auto mb-3 text-app-faint" />
        )}
        <p className="text-sm text-app-secondary">
          {extracting ? "Azure OpenAI is extracting the CV..." : "Drop a PDF/TXT here or click to choose a CV"}
        </p>
        <p className="text-xs text-app-faint mt-1">Maximum 10 MB. Nothing is saved before your review and approval.</p>
      </div>

      {fileName && !draft && <p className="text-xs text-app-muted font-mono">{fileName}</p>}
      {error && <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">{error}</div>}

      {draft && (
        <Modal
          open
          title="Review extracted consultant"
          description="AI extracted this data from the CV. Correct anything that is wrong before saving."
          onClose={() => setDraft(null)}
        >
          <div className="p-5 space-y-5 max-h-[75vh] overflow-auto">
            <div className="flex items-center gap-2 text-xs text-app-muted">
              <FileText size={12} /> {fileName}
            </div>

            <section className="space-y-3">
              <p className="text-[10px] uppercase tracking-wide text-app-faint">Basic information</p>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">First name <span className="text-app-brand">*</span></span>
                  <Input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Last name <span className="text-app-brand">*</span></span>
                  <Input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Title</span>
                  <Input value={draft.title ?? ""} onChange={(event) => setDraft({ ...draft, title: event.target.value || null })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Seniority</span>
                  <Input value={draft.seniority ?? ""} onChange={(event) => setDraft({ ...draft, seniority: event.target.value || null })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Years of experience</span>
                  <Input type="number" min={0} value={draft.yearsOfExperience} onChange={(event) => setDraft({ ...draft, yearsOfExperience: Number(event.target.value) || 0 })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Email</span>
                  <Input value={draft.email ?? ""} onChange={(event) => setDraft({ ...draft, email: event.target.value || null })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Availability</span>
                  <Input value={draft.availability ?? ""} onChange={(event) => setDraft({ ...draft, availability: event.target.value || null })} />
                </label>
                <label>
                  <span className="text-[11px] text-app-muted block mb-1">Office</span>
                  <Input value={draft.office ?? ""} onChange={(event) => setDraft({ ...draft, office: event.target.value || null })} />
                </label>
              </div>

              <label className="block">
                <span className="text-[11px] text-app-muted block mb-1">Summary</span>
                <Textarea value={draft.summary ?? ""} onChange={(event) => setDraft({ ...draft, summary: event.target.value || null })} rows={4} />
              </label>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wide text-app-faint">Skills ({draft.skills.length})</p>
                <Button
                  variant="ghost"
                  icon={<Plus size={11} />}
                  onClick={() => setDraft({
                    ...draft,
                    skills: [...draft.skills, { name: "", category: null, level: 0, years: 0, evidence: null }],
                  })}
                >
                  Add skill
                </Button>
              </div>

              <div className="space-y-2">
                {draft.skills.map((skill, index) => (
                  <div key={index} className="grid grid-cols-[1fr_120px_80px_80px_30px] gap-2 items-center">
                    <Input
                      value={skill.name}
                      placeholder="Skill"
                      onChange={(event) => setDraft({
                        ...draft,
                        skills: draft.skills.map((item, currentIndex) => currentIndex === index ? { ...item, name: event.target.value } : item),
                      })}
                    />
                    <Input
                      value={skill.category ?? ""}
                      placeholder="Category"
                      onChange={(event) => setDraft({
                        ...draft,
                        skills: draft.skills.map((item, currentIndex) => currentIndex === index ? { ...item, category: event.target.value || null } : item),
                      })}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={skill.years}
                      placeholder="Years"
                      onChange={(event) => setDraft({
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
                      onChange={(event) => setDraft({
                        ...draft,
                        skills: draft.skills.map((item, currentIndex) => currentIndex === index ? { ...item, level: Number(event.target.value) || 0 } : item),
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, skills: draft.skills.filter((_, currentIndex) => currentIndex !== index) })}
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
                <div className="space-y-2">
                  {draft.experiences.slice(0, 5).map((item, index) => (
                    <div key={index}>
                      <p className="text-xs text-app-primary">{item.role || "Role"} · {item.company || "Company"}</p>
                      <p className="text-[10px] text-app-muted">{item.startDate || "?"} – {item.endDate || "Present"}</p>
                    </div>
                  ))}
                  {draft.experiences.length === 0 && <p className="text-xs text-app-faint">No experience extracted.</p>}
                </div>
              </div>

              <div className="rounded-lg border border-app bg-app-raised p-3">
                <p className="text-[10px] uppercase tracking-wide text-app-faint mb-2">Projects ({draft.projects.length})</p>
                <div className="space-y-2">
                  {draft.projects.slice(0, 5).map((item, index) => (
                    <div key={index}>
                      <p className="text-xs text-app-primary">{item.name}</p>
                      <p className="text-[10px] text-app-muted">{item.technologies || "No technologies listed"}</p>
                    </div>
                  ))}
                  {draft.projects.length === 0 && <p className="text-xs text-app-faint">No projects extracted.</p>}
                </div>
              </div>

              <div className="rounded-lg border border-app bg-app-raised p-3">
                <p className="text-[10px] uppercase tracking-wide text-app-faint mb-2">Education & certifications</p>
                <p className="text-xs text-app-secondary">Education: {draft.education.length}</p>
                <p className="text-xs text-app-secondary mt-1">Certifications: {draft.certifications.length}</p>
                {draft.certifications.slice(0, 4).map((item, index) => (
                  <p key={index} className="text-[10px] text-app-muted mt-1">{item.name}{item.issuer ? ` · ${item.issuer}` : ""}</p>
                ))}
              </div>

              <div className="rounded-lg border border-app bg-app-raised p-3">
                <p className="text-[10px] uppercase tracking-wide text-app-faint mb-2">Other extracted data</p>
                <p className="text-xs text-app-secondary">Languages: {draft.languages.map((item) => item.name).join(", ") || "—"}</p>
                <p className="text-xs text-app-secondary mt-1">Industries: {draft.industries.join(", ") || "—"}</p>
              </div>
            </section>

            {!canSave && (
              <p className="text-[10px] text-app-faint">First name and last name must be filled in before saving.</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
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
