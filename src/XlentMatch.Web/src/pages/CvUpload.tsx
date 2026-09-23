import { useRef, useState } from "react";
import { Upload as UploadIcon, FileText, CheckCircle, Loader } from "../design-system/icons";
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
    firstName: draft.firstName,
    lastName: draft.lastName,
    email: draft.email,
    title: draft.title,
    summary: draft.summary,
    seniority: draft.seniority,
    yearsOfExperience: draft.yearsOfExperience,
    availability: draft.availability,
    office: draft.office,
    originalCvText: draft.sourceText,
    fullName: undefined,
    skills: draft.skills.map((skill) => ({
      id: 0,
      consultantId: 0,
      name: skill.name,
      category: skill.category,
      years: skill.years,
      level: skill.level,
      evidence: skill.evidence,
    })),
    experiences: draft.experiences.map((experience) => ({
      id: 0,
      consultantId: 0,
      company: experience.company,
      role: experience.role,
      description: experience.description,
      startDate: dateOnly(experience.startDate),
      endDate: dateOnly(experience.endDate),
    })),
    projects: draft.projects.map((project) => ({
      id: 0,
      consultantId: 0,
      name: project.name,
      description: project.description,
      technologies: project.technologies,
    })),
    education: draft.education.map((item) => ({
      id: 0,
      consultantId: 0,
      degree: item.degree,
      school: item.school,
      year: item.year,
    })),
    languages: draft.languages.map((language) => ({
      id: 0,
      consultantId: 0,
      name: language.name,
      level: language.level,
    })),
    industries: draft.industries.map((name) => ({
      id: 0,
      consultantId: 0,
      name,
    })),
    certifications: draft.certifications.map((certification) => ({
      id: 0,
      consultantId: 0,
      name: certification.name,
      issuer: certification.issuer,
      issuedDate: dateOnly(certification.issuedDate),
    })),
  };
}

export default function CvUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ConsultantDraft | null>(null);
  const [fileName, setFileName] = useState("");
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
        className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer"
        style={{ borderColor: "var(--color-border)" }}
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
        {extracting ? (
          <Loader size={28} className="animate-spin mx-auto mb-3 text-app-brand" />
        ) : (
          <UploadIcon size={28} className="mx-auto mb-3 text-app-faint" />
        )}
        <p className="text-sm text-app-secondary">
          {extracting ? "Azure OpenAI is extracting the CV..." : "Drop or choose a PDF/TXT consultant CV"}
        </p>
        <p className="text-xs text-app-faint mt-1">The AI result is never saved before you review and confirm it.</p>
      </div>

      {fileName && !draft && <p className="text-xs text-app-muted font-mono">{fileName}</p>}
      {error && <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">{error}</div>}

      {draft && (
        <Modal open title="Review extracted consultant" onClose={() => setDraft(null)}>
          <div className="p-5 space-y-4 max-h-[75vh] overflow-auto">
            <div className="flex items-center gap-2 text-xs text-app-muted">
              <FileText size={12} /> {fileName}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-[11px] text-app-muted block mb-1">First name</span>
                <Input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} />
              </label>
              <label>
                <span className="text-[11px] text-app-muted block mb-1">Last name</span>
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
            </div>

            <label className="block">
              <span className="text-[11px] text-app-muted block mb-1">Summary</span>
              <Textarea value={draft.summary ?? ""} onChange={(event) => setDraft({ ...draft, summary: event.target.value || null })} rows={4} />
            </label>

            <div>
              <p className="text-[11px] text-app-muted mb-2">Skills extracted by AI</p>
              <div className="space-y-2">
                {draft.skills.map((skill, index) => (
                  <div key={index} className="grid grid-cols-[1fr_120px_80px_80px] gap-2">
                    <Input
                      value={skill.name}
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
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="primary" onClick={saveConsultant} disabled={saving}>
                {saving ? "Saving..." : "Approve and save consultant"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
