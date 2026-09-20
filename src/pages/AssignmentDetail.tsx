import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Archive, CheckCircle, Edit3, GitMerge, MoreHorizontal, Plus, X } from "lucide-react";
import { ASSIGNMENTS } from "./Jobs";

type Assignment = (typeof ASSIGNMENTS)[number];

type DraftAssignment = Assignment & {
  requiredSkills: string[];
  preferredSkills: string[];
};

function SkillEditor({ label, hint, skills, onChange, accent }: { label: string; hint: string; skills: string[]; onChange: (skills: string[]) => void; accent: "indigo" | "neutral" }) {
  const [value, setValue] = useState("");

  const addSkill = () => {
    const skill = value.trim();
    if (!skill || skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    onChange([...skills, skill]);
    setValue("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-medium text-app-primary">{label}</label>
        <span className="text-[10px] text-app-muted">{skills.length} skills</span>
      </div>
      <p className="text-[10px] text-app-muted mb-2">{hint}</p>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-7">
        {skills.map((skill) => (
          <span key={skill} className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded ${accent === "indigo" ? "text-app-brand bg-app-brand-soft" : "text-app-secondary"}`} style={accent === "neutral" ? { background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" } : { border: "1px solid var(--color-brand-subtle)" }}>
            {skill}
            <button type="button" onClick={() => onChange(skills.filter((item) => item !== skill))} className="opacity-60 hover:opacity-100" aria-label={`Remove ${skill}`}><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }} placeholder="Add a skill" className="flex-1 bg-app border border-app rounded px-2.5 py-2 text-xs text-app-primary outline-none" />
        <button type="button" onClick={addSkill} className="inline-flex items-center gap-1 text-xs text-app-secondary border border-app rounded px-2.5 py-2 hover:text-app-secondary"><Plus size={12} />Add</button>
      </div>
    </div>
  );
}

export default function AssignmentDetail() {
  const { id } = useParams();
  const baseAssignment = ASSIGNMENTS.find((item) => item.id === id) ?? ASSIGNMENTS[0];
  const [assignment, setAssignment] = useState<Assignment>(baseAssignment);
  const [editMode, setEditMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState<DraftAssignment>({ ...baseAssignment });

  const openEdit = () => {
    setDraft({ ...assignment });
    setEditMode(true);
    setMenuOpen(false);
  };

  const saveEdit = () => {
    setAssignment(draft);
    setEditMode(false);
  };

  const statusLabel = assignment.status === "done" ? "Match complete" : assignment.status === "matching" ? "Matching in progress" : "Draft";
  const setDraftField = <K extends keyof DraftAssignment>(key: K, value: DraftAssignment[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs text-app-muted hover:text-app-secondary"><ArrowLeft size={13} />Back to Client Assignments</Link>

      <header className="bg-app-surface border border-app rounded-xl p-5" style={{ boxShadow: "var(--shadow-surface)" }}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold text-app-brand bg-app-brand-subtle">{assignment.client.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-app-muted">Client Assignment</span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ color: "var(--color-success)", background: "rgba(34,197,94,0.10)" }}><CheckCircle size={9} />{statusLabel}</span>
              </div>
              <h1 className="text-lg font-semibold text-app-primary">{assignment.title}</h1>
              <p className="text-xs text-app-muted mt-1">{assignment.client} · Created {assignment.created}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={"/matching?assignment=" + assignment.id} className="inline-flex items-center gap-1.5 text-xs text-white px-3 py-2 rounded" style={{ background: "var(--color-brand)" }}><GitMerge size={12} />Match Consultants</Link>
            <button onClick={openEdit} className="inline-flex items-center gap-1.5 text-xs text-app-secondary px-3 py-2 rounded border border-app hover:text-app-secondary"><Edit3 size={12} />Edit Assignment</button>
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded border border-app text-app-muted hover:text-app-secondary" aria-label="More actions"><MoreHorizontal size={14} /></button>
              {menuOpen && <div className="absolute right-0 top-10 z-10 w-44 bg-app-surface border border-app rounded-lg p-1 shadow-lg"><button className="w-full flex items-center gap-2 text-xs text-app-muted px-2.5 py-2 rounded hover:bg-app-raised hover:text-app-secondary"><Archive size={13} />Archive Assignment</button></div>}
            </div>
          </div>
        </div>
      </header>

      <section className="bg-app-surface border border-app rounded-xl p-5" style={{ boxShadow: "var(--shadow-surface)" }}>
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-medium text-app-primary">Assignment Overview</h2><span className="text-[10px] text-app-muted">Client brief</span></div>
        <p className="text-sm text-app-secondary leading-7 max-w-4xl">{assignment.description}</p>
      </section>

      <section className="bg-app-surface border border-app rounded-xl p-5" style={{ boxShadow: "var(--shadow-surface)" }}>
        <h2 className="text-sm font-medium text-app-primary mb-4">Key Requirements</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["Seniority", assignment.seniority], ["Availability", assignment.availability], ["Created", assignment.created], ["Status", statusLabel]].map(([label, value]) => <div key={label}><p className="text-[10px] uppercase tracking-wide text-app-muted mb-1">{label}</p><p className="text-xs font-medium text-app-primary">{value}</p></div>)}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-5">
        <div className="bg-app-surface border border-app rounded-xl p-5" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-center justify-between mb-1"><h2 className="text-sm font-medium text-app-primary">Required Skills</h2><span className="text-[10px] text-app-muted">Must-have</span></div>
          <p className="text-[11px] text-app-muted mb-3">Essential skills used to calculate the match score.</p>
          <div className="flex flex-wrap gap-2">{assignment.requiredSkills.map((skill) => <span key={skill} className="text-xs text-app-brand px-2.5 py-1.5 rounded bg-app-brand-soft" style={{ border: "1px solid var(--color-brand-subtle)" }}>{skill}</span>)}</div>
        </div>
        <div className="bg-app-surface border border-app rounded-xl p-5" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-center justify-between mb-1"><h2 className="text-sm font-medium text-app-primary">Preferred Skills</h2><span className="text-[10px] text-app-muted">Nice-to-have</span></div>
          <p className="text-[11px] text-app-muted mb-3">Additional skills that can improve the ranking.</p>
          <div className="flex flex-wrap gap-2">{assignment.preferredSkills.map((skill) => <span key={skill} className="text-xs text-app-secondary px-2.5 py-1.5 rounded" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>{skill}</span>)}</div>
        </div>
      </section>

      {editMode && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
        <div className="w-full max-w-3xl max-h-[92vh] overflow-auto bg-app-surface border border-app rounded-xl" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
          <div className="sticky top-0 z-10 bg-app-surface flex items-center justify-between px-6 py-5 border-b border-app"><div><h2 className="text-app-primary font-semibold text-app-primary">Edit Client Assignment</h2><p className="text-xs text-app-muted mt-1">Update the assignment details and matching criteria.</p></div><button onClick={() => setEditMode(false)} className="p-1 text-app-muted hover:text-app-secondary" aria-label="Close"><X size={16} /></button></div>
          <div className="p-6 space-y-7">
            <section><h3 className="text-xs font-semibold uppercase tracking-wide text-app-primary mb-3">1. Basic Information</h3><div className="grid md:grid-cols-2 gap-4">{[["Assignment Title", "title"], ["Client", "client"], ["Seniority", "seniority"], ["Availability", "availability"]].map(([label, key]) => <label key={key} className="space-y-1.5"><span className="text-[11px] text-app-muted">{label}</span><input value={String(draft[key as keyof DraftAssignment])} onChange={(event) => setDraftField(key as keyof DraftAssignment, event.target.value as never)} className="w-full bg-app border border-app rounded-lg px-3 py-2.5 text-xs text-app-primary outline-none" /></label>)}</div></section>
            <section><h3 className="text-xs font-semibold uppercase tracking-wide text-app-primary mb-3">2. Assignment Description</h3><textarea value={draft.description} onChange={(event) => setDraftField("description", event.target.value)} rows={6} className="w-full bg-app border border-app rounded-lg px-3 py-2.5 text-xs text-app-primary outline-none resize-none" placeholder="Describe the client assignment..." /></section>
            <section><h3 className="text-xs font-semibold uppercase tracking-wide text-app-primary mb-1">3. Matching Requirements</h3><p className="text-[11px] text-app-muted mb-4">Use required skills for essential criteria and preferred skills for criteria that improve the ranking.</p><div className="grid md:grid-cols-2 gap-5"><SkillEditor label="Required Skills" hint="Must-have skills" skills={draft.requiredSkills} onChange={(skills) => setDraftField("requiredSkills", skills)} accent="indigo" /><SkillEditor label="Preferred Skills" hint="Nice-to-have skills" skills={draft.preferredSkills} onChange={(skills) => setDraftField("preferredSkills", skills)} accent="neutral" /></div></section>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-app"><button onClick={() => setEditMode(false)} className="text-xs text-app-muted px-3 py-2">Cancel</button><button onClick={saveEdit} className="text-xs text-white px-3 py-2 rounded" style={{ background: "var(--color-brand)" }}>Save Changes</button></div>
        </div>
      </div>}
    </div>
  );
}
