import { Link, useParams } from "react-router-dom";
import { ArrowLeft, GitMerge, Archive, CheckCircle } from "lucide-react";
import { ASSIGNMENTS } from "./Jobs";

export default function AssignmentDetail() {
  const { id } = useParams();
  const assignment = ASSIGNMENTS.find((item) => item.id === id) ?? ASSIGNMENTS[0];
  return <div className="p-6 space-y-5">
    <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-base"><ArrowLeft size={13} />Back to Client Assignments</Link>
    <div className="bg-surface border border-base rounded-lg p-5" style={{ boxShadow: "var(--ats-shadow)" }}>
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 mb-2"><h1 className="text-base font-semibold text-base">{assignment.title}</h1><span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "var(--ats-green)", background: "rgba(34,197,94,0.10)" }}><CheckCircle size={9} className="inline mr-1" />{assignment.status === "done" ? "Match complete" : assignment.status === "matching" ? "Matching consultants" : "Draft"}</span></div><p className="text-xs text-muted">{assignment.client} · {assignment.seniority} · Created {assignment.created}</p></div><div className="flex gap-2"><Link to={"/matching?assignment=" + assignment.id} className="inline-flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--ats-indigo)" }}><GitMerge size={12} />Match Consultants</Link><button className="inline-flex items-center gap-1.5 text-xs text-muted px-3 py-1.5 rounded border border-base"><Archive size={12} />Archive</button></div></div>
      <p className="text-sm text-2 leading-relaxed mt-5 max-w-3xl">{assignment.description}</p>
    </div>
    <div className="grid grid-cols-2 gap-5">
      <section className="bg-surface border border-base rounded-lg p-5"><h2 className="text-xs font-medium text-base mb-3">Required Skills</h2><div className="flex flex-wrap gap-2">{assignment.requiredSkills.map((s) => <span key={s} className="text-xs text-indigo px-2 py-1 rounded bg-indigo-sub2">{s}</span>)}</div></section>
      <section className="bg-surface border border-base rounded-lg p-5"><h2 className="text-xs font-medium text-base mb-3">Preferred Skills</h2><div className="flex flex-wrap gap-2">{assignment.preferredSkills.map((s) => <span key={s} className="text-xs text-2 px-2 py-1 rounded" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{s}</span>)}</div></section>
      <section className="bg-surface border border-base rounded-lg p-5"><h2 className="text-xs font-medium text-base mb-3">Assignment Requirements</h2><div className="space-y-2 text-xs text-muted"><p><span className="text-3">Seniority:</span> {assignment.seniority}</p><p><span className="text-3">Availability:</span> {assignment.availability}</p><p><span className="text-3">Matching:</span> Human review required before final consultant selection.</p></div></section>
      <section className="bg-surface border border-base rounded-lg p-5"><h2 className="text-xs font-medium text-base mb-3">Matching Activity</h2><p className="text-xs text-muted">Open Matching to compare existing XLENT consultants for this assignment.</p><Link to={"/matching?assignment=" + assignment.id} className="inline-block text-xs text-indigo mt-3">Open Matching →</Link></section>
    </div>
  </div>;
}
