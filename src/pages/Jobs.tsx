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

  return <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "var(--color-overlay-soft)", backdropFilter: "blur(4px)" }}>
    <div className="bg-app-surface border border-app rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto" style={{ boxShadow: "var(--shadow-modal)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-app"><h2 className="text-sm font-semibold text-app-primary">{t("job_modal_title")}</h2><button onClick={onClose} className="text-app-faint hover:text-app-secondary text-xs">✕</button></div>
      {step === "input" ? <div className="p-5 space-y-4">
        <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("job_modal_name")}</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Payments Platform Modernisation" className="w-full rounded text-xs text-app-primary px-3 py-2 focus:outline-none" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }} /></label>
        <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("job_modal_client")}</span><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Nordic Financial Services" className="w-full rounded text-xs text-app-primary px-3 py-2 focus:outline-none" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }} /></label>
        <label className="block"><span className="text-[11px] text-app-muted mb-1.5 block">{t("job_modal_brief")} <span className="text-app-brand ml-1">{t("job_modal_ai")}</span></span><textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={6} placeholder="Paste the client assignment brief here. AI will extract the requirements for your review." className="w-full rounded text-xs text-app-primary px-3 py-2 focus:outline-none resize-none leading-relaxed" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }} /></label>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="text-xs text-app-muted px-3 py-1.5">{t("job_modal_cancel")}</button><button onClick={() => setStep("review")} className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--color-brand)" }}><Zap size={11} />{t("job_modal_extract")}</button></div>
      </div> : <div className="p-5 space-y-4">
        <div className="rounded px-3 py-2.5" style={{ background: "var(--color-success-soft)", border: "1px solid var(--color-success-border)" }}><p className="text-[11px]" style={{ color: "var(--color-success)" }}>{t("job_modal_review")}</p></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="text-[11px] text-app-muted block mb-1.5">Assignment Title</label><p className="text-xs text-app-primary">{parsed.title}</p></div><div><label className="text-[11px] text-app-muted block mb-1.5">Client</label><p className="text-xs text-app-primary">{parsed.client}</p></div><div><label className="text-[11px] text-app-muted block mb-1.5">Seniority</label><p className="text-xs text-app-primary">{parsed.seniority}</p></div><div><label className="text-[11px] text-app-muted block mb-1.5">Availability</label><p className="text-xs text-app-primary">{parsed.availability}</p></div></div>
        <div><label className="text-[11px] text-app-muted block mb-1.5">{t("job_modal_must")}</label><div className="flex flex-wrap gap-1.5">{parsed.requiredSkills.map((s) => <span key={s} className="text-[11px] font-mono px-2 py-0.5 rounded text-app-brand bg-app-brand-subtle">{s}</span>)}</div></div>
        <div><label className="text-[11px] text-app-muted block mb-1.5">{t("job_modal_nice")}</label><div className="flex flex-wrap gap-1.5">{parsed.preferredSkills.map((s) => <span key={s} className="text-[11px] font-mono px-2 py-0.5 rounded text-app-secondary" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>{s}</span>)}</div></div>
        <div className="flex justify-end gap-2"><button onClick={() => setStep("input")} className="text-xs text-app-muted px-3 py-1.5">{t("job_modal_back")}</button><button onClick={onClose} className="text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--color-brand)" }}>{t("job_modal_confirm")}</button></div>
      </div>}
    </div>
  </div>;
}

export default function ClientAssignments() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [archived, setArchived] = useState<string[]>([]);
  const STATUS_CFG = {
    matching: { label: t("status_matching"), color: "var(--color-warning)", bg: "var(--color-warning-subtle)", icon: <Zap size={9} /> },
    done: { label: t("status_match_complete"), color: "var(--color-success)", bg: "var(--color-success-subtle)", icon: <CheckCircle size={9} /> },
    draft: { label: "Draft", color: "var(--color-text-muted)", bg: "var(--color-surface-raised)", icon: <Clock size={9} /> },
  } as const;
  const active = ASSIGNMENTS.filter((a) => !archived.includes(a.id));

  return <div className="p-6 space-y-4">
    <div className="flex items-center justify-between"><div><h1 className="text-app-primary font-semibold text-app-primary">{t("jobs_title")}</h1><p className="text-xs text-app-muted mt-0.5">{active.length} {t("jobs_sub")}</p></div><button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded" style={{ background: "var(--color-brand)" }}><Plus size={12} />{t("jobs_new")}</button></div>
    <div className="space-y-2">{active.map((assignment) => { const st = STATUS_CFG[assignment.status as keyof typeof STATUS_CFG]; return <div key={assignment.id} className="bg-app-surface border border-app rounded-lg px-5 py-4" style={{ boxShadow: "var(--shadow-surface)" }}>
      <div className="flex items-start gap-4"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h2 className="text-sm font-medium text-app-primary">{assignment.title}</h2><span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.icon}{st.label}</span></div><p className="text-xs text-app-muted">{assignment.client} · {assignment.seniority} · {assignment.created}</p><p className="text-[11px] text-app-secondary mt-1 mb-3 max-w-3xl">{assignment.description}</p><div className="flex flex-wrap gap-1.5">{assignment.requiredSkills.map((s) => <span key={s} className="text-[10px] font-mono text-app-brand px-1.5 py-0.5 rounded bg-app-brand-soft" style={{ border: "1px solid var(--color-brand-subtle)" }}>{s}</span>)}{assignment.preferredSkills.map((s) => <span key={s} className="text-[10px] font-mono text-app-secondary px-1.5 py-0.5 rounded" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>{s}</span>)}</div></div>
      <div className="flex items-center gap-2"><Link to={"/jobs/" + assignment.id} className="flex items-center gap-1.5 text-[11px] text-app-secondary px-2.5 py-1.5 rounded border border-app"><Eye size={12} />View Assignment</Link><Link to={"/matching?assignment=" + assignment.id} className="flex items-center gap-1.5 text-[11px] text-white px-2.5 py-1.5 rounded" style={{ background: "var(--color-brand)" }}><GitMerge size={12} />Match Consultants</Link><button title="More actions" onClick={() => setArchived([...archived, assignment.id])} className="p-1.5 rounded text-app-muted hover:text-app-secondary"><Archive size={13} /></button></div>
      </div></div>; })}</div>
    {active.length === 0 && <div className="text-center text-xs text-app-muted py-12">No active client assignments.</div>}
    {showModal && <NewAssignmentModal onClose={() => setShowModal(false)} />}
  </div>;
}
