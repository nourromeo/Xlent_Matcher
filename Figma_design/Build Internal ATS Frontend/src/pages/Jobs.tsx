import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, GitMerge, Clock, CheckCircle, Zap, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n";

const JOBS = [
  { id: "j1", title: "Senior Backend Engineer", client: "FinStream GmbH", mustHave: ["Go", "PostgreSQL", "Kafka", "Kubernetes"], niceToHave: ["Rust", "gRPC"], seniority: "Senior", status: "matching", matchCount: 12, created: "Sep 8" },
  { id: "j2", title: "ML Engineer (NLP)", client: "DataLayer AG", mustHave: ["Python", "PyTorch", "NLP", "Azure ML"], niceToHave: ["FastAPI", "MLflow"], seniority: "Mid", status: "done", matchCount: 8, created: "Sep 6" },
  { id: "j3", title: "Staff SRE", client: "CloudCore Inc.", mustHave: ["Kubernetes", "Terraform", "Prometheus"], niceToHave: ["Go", "Datadog"], seniority: "Staff", status: "draft", matchCount: 0, created: "Sep 9" },
];

function NewJobModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [brief, setBrief] = useState("");
  const [step, setStep] = useState<"input" | "parsed">("input");
  const parsed = { title: "Frontend Engineer", seniority: "Mid", mustHave: ["React", "TypeScript", "CSS"], niceToHave: ["Figma", "Storybook"] };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="bg-surface border border-base rounded-xl w-full max-w-lg" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base">
          <h2 className="text-sm font-semibold text-base">{t("job_modal_title")}</h2>
          <button onClick={onClose} className="text-3 hover:text-base text-xs">✕</button>
        </div>
        {step === "input" ? (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[11px] text-muted mb-1.5 block">{t("job_modal_name")}</label>
              <input type="text" placeholder="e.g. Senior Backend Engineer" className="w-full rounded text-xs text-base placeholder-text-3 px-3 py-2 focus:outline-none" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }} />
            </div>
            <div>
              <label className="text-[11px] text-muted mb-1.5 block">{t("job_modal_client")}</label>
              <input type="text" placeholder="e.g. Acme Corp" className="w-full rounded text-xs text-base placeholder-text-3 px-3 py-2 focus:outline-none" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }} />
            </div>
            <div>
              <label className="text-[11px] text-muted mb-1.5 block">{t("job_modal_brief")} <span className="text-indigo ml-1">{t("job_modal_ai")}</span></label>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} placeholder="We are looking for a Frontend Engineer with 4+ years..." className="w-full rounded text-xs text-base placeholder-text-3 px-3 py-2 focus:outline-none resize-none font-mono leading-relaxed" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="text-xs text-muted hover:text-base px-3 py-1.5">{t("job_modal_cancel")}</button>
              <button onClick={() => setStep("parsed")} className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded hover:opacity-80" style={{ background: "var(--ats-indigo)" }}>
                <Zap size={11} /> {t("job_modal_extract")}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="rounded px-3 py-2.5" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-[11px]" style={{ color: "var(--ats-green)" }}>{t("job_modal_review")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] text-muted mb-1.5 block">Title</label><p className="text-xs text-base">{parsed.title}</p></div>
              <div><label className="text-[11px] text-muted mb-1.5 block">Seniority</label><p className="text-xs text-base">{parsed.seniority}</p></div>
            </div>
            <div>
              <label className="text-[11px] text-muted mb-1.5 block">{t("job_modal_must")}</label>
              <div className="flex flex-wrap gap-1.5">
                {parsed.mustHave.map((s) => <span key={s} className="text-[11px] font-mono px-2 py-0.5 rounded text-indigo bg-indigo-sub">{s}</span>)}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted mb-1.5 block">{t("job_modal_nice")}</label>
              <div className="flex flex-wrap gap-1.5">
                {parsed.niceToHave.map((s) => <span key={s} className="text-[11px] font-mono px-2 py-0.5 rounded text-2" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{s}</span>)}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setStep("input")} className="text-xs text-muted hover:text-base px-3 py-1.5">{t("job_modal_back")}</button>
              <button onClick={onClose} className="text-xs text-white px-3 py-1.5 rounded hover:opacity-80" style={{ background: "var(--ats-indigo)" }}>{t("job_modal_confirm")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Jobs() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);

  const STATUS_CFG = {
    matching: { label: t("status_parsing"), color: "var(--ats-amber)", bg: "rgba(245,158,11,0.10)", icon: <Zap size={9} /> },
    done:     { label: t("status_done"),    color: "var(--ats-green)", bg: "rgba(34,197,94,0.10)",   icon: <CheckCircle size={9} /> },
    draft:    { label: "Draft",             color: "var(--ats-muted)", bg: "var(--ats-surface-r)",   icon: <Clock size={9} /> },
  } as const;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-base">{t("jobs_title")}</h1>
          <p className="text-xs text-muted mt-0.5">{JOBS.length} {t("jobs_sub")}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded hover:opacity-80 transition-opacity" style={{ background: "var(--ats-indigo)" }}>
          <Plus size={12} /> {t("jobs_new")}
        </button>
      </div>

      <div className="space-y-2">
        {JOBS.map((job) => {
          const st = STATUS_CFG[job.status as keyof typeof STATUS_CFG];
          return (
            <div key={job.id} className="bg-surface border border-base rounded-lg px-5 py-4 group transition-colors hover:border-base" style={{ boxShadow: "var(--ats-shadow)" }}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-sm font-medium text-base">{job.title}</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>
                      {st.icon}{st.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted mb-3">{job.client} · {job.seniority} · {job.created}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.mustHave.map((s) => <span key={s} className="text-[10px] font-mono text-indigo px-1.5 py-0.5 rounded bg-indigo-sub2" style={{ border: "1px solid var(--ats-indigo-sub)" }}>{s}</span>)}
                    {job.niceToHave.map((s) => <span key={s} className="text-[10px] font-mono text-2 px-1.5 py-0.5 rounded" style={{ background: "var(--ats-surface-r)", border: "1px solid var(--ats-border)" }}>{s}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {job.matchCount > 0 && (
                    <div className="text-right">
                      <p className="text-lg font-semibold text-base font-mono">{job.matchCount}</p>
                      <p className="text-[10px] text-3">{t("jobs_matches")}</p>
                    </div>
                  )}
                  <Link to={`/matching?job=${job.id}`} className="flex items-center gap-1.5 text-[11px] text-indigo opacity-0 group-hover:opacity-100 transition-all hover:opacity-70">
                    <GitMerge size={12} />{t("jobs_view")}<ChevronRight size={10} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && <NewJobModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
