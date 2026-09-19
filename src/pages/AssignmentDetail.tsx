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
  return <div className="p-6 space-y-5">
    <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-base"><ArrowLeft size={13} />Back to Client Assignments</Link>
    <div className="bg-surface border border-base rounded-lg p-5" style={{ boxShadow: "var(--ats-shadow)" }}>
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 mb-2"><h1 className="text-base font-semibold text-base">{assignment.title}</h1><span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "var(--ats-green)", background: "rgba(34,197,94,0.10)" }}><CheckCircle size={9} className="inline mr-1" />{assignment.status === "done" ? "Match complete" : assignment.status === "matching" ? "Matching consultants" : "Draft"}</span></div><p className="text-xs text-muted">{assignment.client} · {assignment.seniority} · Created {assignment.created}</p></div><div className="flex gap-2"><Link to={"/matching?assignment=" + assignment.id} className="inline-flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--ats-indigo)" }}><GitMerge size={12} />Match Consultants</Link><button onClick={() => { setDraft({ ...assignment, requiredSkillsText: assignment.requiredSkills.join("\n"), preferredSkillsText: assignment.preferredSkills.join("\n") }); setEditMode(true); }} className="inline-flex items-center gap-1.5 text-xs text-2 px-3 py-1.5 rounded border border-base"><Edit3 size={12} />Edit Assignment</button><button className="inline-flex items-center gap-1.5 text-xs text-muted px-3 py-1.5 rounded border border-base"><Archive size={12} />Archive</button></div></div>
      <p className="text-sm text-2 leading-relaxed mt-5 max-w-3xl">{assignment.description}</p>
    </div>
    <div className="grid grid-cols-2 gap-5">
      <section className="bg-surface border border-base rounded-lg p-5"><h2 className="text-xs font-medium text-base mb-3">Required Skills</h2><div className="flex flex-wrap gap-2">{assignment.requiredSkills.map((s) => <span key={s} className="text-xs text-indigo px-2 py-1 rounded bg-indigo-sub2">{s}</span>)}</div></section>
      <section className="bg-surface border border-base rounded-lg p-5"><h2 className="text-xs font-medium text-base mb-3">Preferred Skills</h2><div className="flex flex-wrap gap-2">{assignment.preferredSkills.map((s) => <span key={s} className="text-xs text-2 px-2 py-1 rounded" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{s}</span>)}</div></section>
      <section className="bg-surface border border-base rounded-lg p-5"><h2 className="text-xs font-medium text-base mb-3">Assignment Requirements</h2><div className="space-y-2 text-xs text-muted"><p><span className="text-3">Seniority:</span> {assignment.seniority}</p><p><span className="text-3">Availability:</span> {assignment.availability}</p><p><span className="text-3">Matching:</span> Human review required before final consultant selection.</p></div></section>
      <section className="bg-surface border border-base rounded-lg p-5"><h2 className="text-xs font-medium text-base mb-3">Matching Activity</h2><p className="text-xs text-muted">Open Matching to compare existing XLENT consultants for this assignment.</p><Link to={"/matching?assignment=" + assignment.id} className="inline-block text-xs text-indigo mt-3">Open Matching →</Link></section>
    </div>

    {editMode && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-surface border border-base rounded-xl p-5" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center justify-between mb-5"><div><h2 className="text-sm font-semibold text-base">Edit Client Assignment</h2><p className="text-[11px] text-muted mt-1">Update the assignment requirements before matching consultants.</p></div><button onClick={() => setEditMode(false)} className="text-xs text-muted">Close</button></div>
        <div className="grid grid-cols-2 gap-3">
          {[['Assignment Title','title'],['Client','client'],['Seniority','seniority'],['Availability','availability']].map(([label,key]) => <label key={key} className="space-y-1"><span className="text-[10px] text-muted">{label}</span><input value={draft[key as keyof typeof draft] as string} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none" /></label>)}
        </div>
        <label className="block mt-4 space-y-1"><span className="text-[10px] text-muted">Assignment Description</span><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none resize-none" /></label>
        <div className="grid grid-cols-2 gap-3 mt-4"><label className="space-y-1"><span className="text-[10px] text-muted">Required Skills</span><textarea value={draft.requiredSkillsText} onChange={(e) => setDraft({ ...draft, requiredSkillsText: e.target.value })} rows={5} placeholder="One skill per line" className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none resize-none" /></label><label className="space-y-1"><span className="text-[10px] text-muted">Preferred Skills</span><textarea value={draft.preferredSkillsText} onChange={(e) => setDraft({ ...draft, preferredSkillsText: e.target.value })} rows={5} placeholder="One skill per line" className="w-full bg-base border border-base rounded px-2.5 py-2 text-xs text-base outline-none resize-none" /></label></div>
        <div className="flex justify-end gap-2 mt-5"><button onClick={() => setEditMode(false)} className="text-xs text-muted px-3 py-1.5">Cancel</button><button onClick={() => { setAssignment({ ...draft, requiredSkills: draft.requiredSkillsText.split("\\n").map((s) => s.trim()).filter(Boolean), preferredSkills: draft.preferredSkillsText.split("\\n").map((s) => s.trim()).filter(Boolean) }); setEditMode(false); }} className="text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--ats-indigo)" }}>Save Changes</button></div>
      </div>
    </div>}
  </div>;
}
