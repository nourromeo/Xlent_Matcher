import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, GitMerge, Archive, CheckCircle, Edit3 } from "lucide-react";
import { ASSIGNMENTS } from "./Jobs";

export default function AssignmentDetail() {
  const { id } = useParams();
  const baseAssignment = ASSIGNMENTS.find((item) => item.id === id) ?? ASSIGNMENTS[0];
  const [assignment, setAssignment] = useState(baseAssignment);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState({ ...baseAssignment, requiredSkillsText: baseAssignment.requiredSkills.join("\n"), preferredSkillsText: baseAssignment.preferredSkills.join("\n") });

  const openEdit = () => {
    setDraft({ ...assignment, requiredSkillsText: assignment.requiredSkills.join("\n"), preferredSkillsText: assignment.preferredSkills.join("\n") });
    setEditMode(true);
  };

  const saveEdit = () => {
    setAssignment({
      ...draft,
      requiredSkills: draft.requiredSkillsText.split("\n").map((skill) => skill.trim()).filter(Boolean),
      preferredSkills: draft.preferredSkillsText.split("\n").map((skill) => skill.trim()).filter(Boolean),
    });
    setEditMode(false);
  };

  const statusLabel = assignment.status === "done" ? "Match complete" : assignment.status === "matching" ? "Matching consultants" : "Draft";

  return (
    <div className="p-6 space-y-5">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-base">
        <ArrowLeft size={13} /> Back to Client Assignments
      </Link>

      <div className="bg-surface border border-base rounded-lg p-5" style={{ boxShadow: "var(--ats-shadow)" }}>
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-base font-semibold text-base">{assignment.title}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ color: "var(--ats-green)", background: "rgba(34,197,94,0.10)" }}>
                <CheckCircle size={9} /> {statusLabel}
              </span>
            </div>
            <p className="text-xs text-muted">{assignment.client} · Created {assignment.created}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link to={"/matching?assignment=" + assignment.id} className="inline-flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--ats-indigo)" }}>
              <GitMerge size={12} /> Match Consultants
            </Link>
            <button onClick={openEdit} className="inline-flex items-center gap-1.5 text-xs text-2 px-3 py-1.5 rounded border border-base">
              <Edit3 size={12} /> Edit Assignment
            </button>
            <button className="inline-flex items-center gap-1.5 text-xs text-muted px-3 py-1.5 rounded border border-base">
              <Archive size={12} /> Archive
            </button>
          </div>
        </div>
      </div>

      <section className="bg-surface border border-base rounded-lg p-5" style={{ boxShadow: "var(--ats-shadow)" }}>
        <h2 className="text-xs font-medium text-base mb-2">Assignment Description</h2>
        <p className="text-xs text-2 leading-relaxed max-w-4xl">{assignment.description}</p>
      </section>

      <section className="bg-surface border border-base rounded-lg p-5" style={{ boxShadow: "var(--ats-shadow)" }}>
        <h2 className="text-xs font-medium text-base mb-4">Assignment Requirements</h2>
        <div className="grid grid-cols-3 gap-5">
          <div><p className="text-[10px] text-3 uppercase tracking-wide mb-1">Seniority</p><p className="text-xs text-base">{assignment.seniority}</p></div>
          <div><p className="text-[10px] text-3 uppercase tracking-wide mb-1">Availability</p><p className="text-xs text-base">{assignment.availability}</p></div>
          <div><p className="text-[10px] text-3 uppercase tracking-wide mb-1">Created</p><p className="text-xs text-base">{assignment.created}</p></div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-5">
        <section className="bg-surface border border-base rounded-lg p-5" style={{ boxShadow: "var(--ats-shadow)" }}>
          <h2 className="text-xs font-medium text-base mb-3">Required Skills</h2>
          <div className="flex flex-wrap gap-2">{assignment.requiredSkills.map((skill) => <span key={skill} className="text-xs text-indigo px-2 py-1 rounded bg-indigo-sub2">{skill}</span>)}</div>
        </section>
        <section className="bg-surface border border-base rounded-lg p-5" style={{ boxShadow: "var(--ats-shadow)" }}>
          <h2 className="text-xs font-medium text-base mb-3">Preferred Skills</h2>
          <div className="flex flex-wrap gap-2">{assignment.preferredSkills.map((skill) => <span key={skill} className="text-xs text-2 px-2 py-1 rounded" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{skill}</span>)}</div>
        </section>
      </div>

      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-surface border border-base rounded-xl p-5" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
            <div className="flex items-center justify-between mb-5">
              <div><h2 className="text-sm font-semibold text-base">Edit Client Assignment</h2><p className="text-[11px] text-muted mt-1">Update the assignment information and matching requirements.</p></div>
              <button onClick={() => setEditMode(false)} className="text-xs text-muted">Close</button>
            </div>

            <section className="mb-5">
              <h3 className="text-xs font-medium text-base mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-3">
                {[["Assignment Title", "title"], ["Client", "client"], ["Seniority", "seniority"], ["Availability", "availability"]].map(([label, key]) => (
                  <label key={key} className="space-y-1"><span className="text-[10px] text-muted">{label}</span><input value={draft[key as keyof typeof draft] as string} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none" /></label>
                ))}
              </div>
            </section>

            <section className="mb-5">
              <h3 className="text-xs font-medium text-base mb-3">Assignment Description</h3>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none resize-none" />
            </section>

            <section>
              <h3 className="text-xs font-medium text-base mb-1">Matching Requirements</h3>
              <p className="text-[10px] text-muted mb-3">Add one skill per line. Required skills are essential; preferred skills are beneficial.</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1"><span className="text-[10px] text-muted">Required Skills</span><textarea value={draft.requiredSkillsText} onChange={(e) => setDraft({ ...draft, requiredSkillsText: e.target.value })} rows={6} placeholder="Go\nPostgreSQL\nKafka" className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none resize-none" /></label>
                <label className="space-y-1"><span className="text-[10px] text-muted">Preferred Skills</span><textarea value={draft.preferredSkillsText} onChange={(e) => setDraft({ ...draft, preferredSkillsText: e.target.value })} rows={6} placeholder="Rust\ngRPC" className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none resize-none" /></label>
              </div>
            </section>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-base">
              <button onClick={() => setEditMode(false)} className="text-xs text-muted px-3 py-1.5">Cancel</button>
              <button onClick={saveEdit} className="text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--ats-indigo)" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
