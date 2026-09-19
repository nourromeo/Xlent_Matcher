import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, GitMerge, Clock, CheckCircle, Zap, Eye, Archive, MoreHorizontal, ArrowLeft } from "lucide-react";
import { useI18n } from "../i18n";

export const ASSIGNMENTS = [
  { id: "a1", title: "Payments Platform Modernisation", client: "Nordic Financial Services", description: "Modernise an event-driven payments platform and strengthen its production reliability.", requiredSkills: ["Go", "PostgreSQL", "Kafka", "Kubernetes"], preferredSkills: ["Rust", "gRPC"], seniority: "Senior", status: "matching", created: "Sep 8", availability: "Immediate" },
  { id: "a2", title: "Applied AI Enablement", client: "Industrial Analytics Group", description: "Build and operationalise language-model services for internal knowledge workflows.", requiredSkills: ["Python", "PyTorch", "NLP", "Azure ML"], preferredSkills: ["FastAPI", "MLflow"], seniority: "Mid", status: "done", created: "Sep 6", availability: "Within 2 weeks" },
  { id: "a3", title: "Cloud Reliability Programme", client: "Public Services Organisation", description: "Improve platform reliability, observability, and infrastructure automation across Azure workloads.", requiredSkills: ["Kubernetes", "Terraform", "Prometheus"], preferredSkills: ["Go", "Datadog"], seniority: "Staff", status: "draft", created: "Sep 9", availability: "To be agreed" },
];

function NewAssignmentModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState<"input" | "review">("input");
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [brief, setBrief] = useState("");
  const parsed = { title: title || "Design System Delivery", client: client || "Client to be confirmed", seniority: "Mid", availability: "Immediate", requiredSkills: ["React", "TypeScript", "CSS"], preferredSkills: ["Figma", "Storybook"] };

  return <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
    <div className="bg-surface border border-base rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-base"><h2 className="text-sm font-semibold text-base">{t("job_modal_title")}</h2><button onClick={onClose} className="text-3 hover:text-2 text-xs">✕</button></div>
      {step === "input" ? <div className="p-5 space-y-4">
        <label className="block"><span className="text-[11px] text-muted mb-1.5 block">{t("job_modal_name")}</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Payments Platform Modernisation" className="w-full rounded text-xs text-base px-3 py-2 focus:outline-none" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }} /></label>
        <label className="block"><span className="text-[11px] text-muted mb-1.5 block">{t("job_modal_client")}</span><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Nordic Financial Services" className="w-full rounded text-xs text-base px-3 py-2 focus:outline-none" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }} /></label>
        <label className="block"><span className="text-[11px] text-muted mb-1.5 block">{t("job_modal_brief")} <span className="text-indigo ml-1">{t("job_modal_ai")}</span></span><textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={6} placeholder="Paste the client assignment brief here. AI will extract the requirements for your review." className="w-full rounded text-xs text-base px-3 py-2 focus:outline-none resize-none leading-relaxed" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }} /></label>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="text-xs text-muted px-3 py-1.5">{t("job_modal_cancel")}</button><button onClick={() => setStep("review")} className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--ats-indigo)" }}><Zap size={11} />{t("job_modal_extract")}</button></div>
      </div> : <div className="p-5 space-y-4">
        <div className="rounded px-3 py-2.5" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}><p className="text-[11px]" style={{ color: "var(--ats-green)" }}>{t("job_modal_review")}</p></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="text-[11px] text-muted block mb-1.5">Assignment Title</label><p className="text-xs text-base">{parsed.title}</p></div><div><label className="text-[11px] text-muted block mb-1.5">Client</label><p className="text-xs text-base">{parsed.client}</p></div><div><label className="text-[11px] text-muted block mb-1.5">Seniority</label><p className="text-xs text-base">{parsed.seniority}</p></div><div><label className="text-[11px] text-muted block mb-1.5">Availability</label><p className="text-xs text-base">{parsed.availability}</p></div></div>
        <div><label className="text-[11px] text-muted block mb-1.5">{t("job_modal_must")}</label><div className="flex flex-wrap gap-1.5">{parsed.requiredSkills.map((s) => <span key={s} className="text-[11px] font-mono px-2 py-0.5 rounded text-indigo bg-indigo-sub">{s}</span>)}</div></div>
        <div><label className="text-[11px] text-muted block mb-1.5">{t("job_modal_nice")}</label><div className="flex flex-wrap gap-1.5">{parsed.preferredSkills.map((s) => <span key={s} className="text-[11px] font-mono px-2 py-0.5 rounded text-2" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{s}</span>)}</div></div>
        <div className="flex justify-end gap-2"><button onClick={() => setStep("input")} className="text-xs text-muted px-3 py-1.5">{t("job_modal_back")}</button><button onClick={onClose} className="text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--ats-indigo)" }}>{t("job_modal_confirm")}</button></div>
      </div>}
    </div>
  </div>;
}

export default function ClientAssignments() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [archived, setArchived] = useState<string[]>([]);
  const STATUS_CFG = {
    matching: { label: t("status_matching"), color: "var(--ats-amber)", bg: "rgba(245,158,11,0.10)", icon: <Zap size={9} /> },
    done: { label: t("status_match_complete"), color: "var(--ats-green)", bg: "rgba(34,197,94,0.10)", icon: <CheckCircle size={9} /> },
    draft: { label: "Draft", color: "var(--ats-muted)", bg: "var(--ats-surface-r)", icon: <Clock size={9} /> },
  } as const;
  const active = ASSIGNMENTS.filter((a) => !archived.includes(a.id));

  return <div className="p-6 space-y-4">
    <div className="flex items-center justify-between"><div><h1 className="text-base font-semibold text-base">{t("jobs_title")}</h1><p className="text-xs text-muted mt-0.5">{active.length} {t("jobs_sub")}</p></div><button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--ats-indigo)" }}><Plus size={12} />{t("jobs_new")}</button></div>
    <div className="space-y-2">{active.map((assignment) => { const st = STATUS_CFG[assignment.status as keyof typeof STATUS_CFG]; return <div key={assignment.id} className="bg-surface border border-base rounded-lg px-5 py-4" style={{ boxShadow: "var(--ats-shadow)" }}>
      <div className="flex items-start gap-4"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h2 className="text-sm font-medium text-base">{assignment.title}</h2><span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.icon}{st.label}</span></div><p className="text-xs text-muted">{assignment.client} · {assignment.seniority} · {assignment.created}</p><p className="text-[11px] text-2 mt-1 mb-3 max-w-3xl">{assignment.description}</p><div className="flex flex-wrap gap-1.5">{assignment.requiredSkills.map((s) => <span key={s} className="text-[10px] font-mono text-indigo px-1.5 py-0.5 rounded bg-indigo-sub2" style={{ border: "1px solid var(--ats-indigo-sub)" }}>{s}</span>)}{assignment.preferredSkills.map((s) => <span key={s} className="text-[10px] font-mono text-2 px-1.5 py-0.5 rounded" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{s}</span>)}</div></div>
      <div className="flex items-center gap-2"><Link to={"/jobs/" + assignment.id} className="flex items-center gap-1.5 text-[11px] text-2 px-2.5 py-1.5 rounded border border-base"><Eye size={12} />View Assignment</Link><Link to={"/matching?assignment=" + assignment.id} className="flex items-center gap-1.5 text-[11px] text-white px-2.5 py-1.5 rounded" style={{ background: "var(--ats-indigo)" }}><GitMerge size={12} />Match Consultants</Link><button title="More actions" onClick={() => setArchived([...archived, assignment.id])} className="p-1.5 rounded text-muted hover:text-2"><Archive size={13} /></button></div>
      </div></div>; })}</div>
    {active.length === 0 && <div className="text-center text-xs text-muted py-12">No active client assignments.</div>}
    {showModal && <NewAssignmentModal onClose={() => setShowModal(false)} />}
  </div>;
}
