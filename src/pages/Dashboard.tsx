import { FileText, Briefcase, GitMerge, Users, Clock, CheckCircle, AlertCircle, ArrowUpRight } from "../design-system/icons";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { QUEUE, RECENT_MATCHES } from "../data/mock";
import { DataTable } from "../components/ui/DataTable";

const QUEUE = [
  { name: "anna_kovacs_consultant_cv.pdf", status: "parsing", added: "2m ago" },
  { name: "marcus_lee_consultant_cv.docx", status: "extracting", added: "4m ago" },
  { name: "priya_sharma_cv.pdf", status: "embedding", added: "7m ago" },
  { name: "tobias_renz_cv.pdf", status: "done", added: "12m ago" },
  { name: "seo_yun_resume.pdf", status: "error", added: "15m ago" },
];

const RECENT_MATCHES = [
  { consultant: "Anna Kovacs", assignment: "Payments Platform Modernisation", score: 91, date: "Today" },
  { consultant: "Marcus Lee", assignment: "Applied AI Enablement", score: 84, date: "Today" },
  { consultant: "Priya Sharma", assignment: "Cloud Reliability Programme", score: 78, date: "Yesterday" },
  { consultant: "Tobias Renz", assignment: "Azure Commerce Platform", score: 73, date: "Yesterday" },
  { consultant: "Sofia Yun", assignment: "Design System Delivery", score: 67, date: "Sep 7" },
];

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  parsing:   { color: "var(--color-warning)",  background: "var(--color-warning-subtle)" },
  extracting:{ color: "var(--color-brand)", background: "var(--color-brand-subtle)" },
  embedding: { color: "var(--color-brand)", background: "var(--color-brand-subtle)" },
  done:      { color: "var(--color-success)",  background: "var(--color-success-subtle)"  },
  error:     { color: "var(--color-danger)",    background: "var(--color-danger-subtle)"  },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  parsing: <Clock size={10} />, extracting: <Clock size={10} />,
  embedding: <Clock size={10} />, done: <CheckCircle size={10} />,
  error: <AlertCircle size={10} />,
};

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className="bg-app-surface border border-app rounded-lg p-4" style={{ boxShadow: "var(--shadow-surface)" }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] text-app-muted uppercase tracking-wider font-medium">{label}</p>
        <div
          className="w-7 h-7 rounded flex items-center justify-center"
          style={accent
            ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)" }
            : { background: "var(--color-surface-raised)", color: "var(--color-text-muted)" }}
        >
          <Icon size={14} />
        </div>
      </div>
      <p className="text-app-secondaryxl font-semibold text-app-primary tracking-tight">{value}</p>
      <p className="text-[10px] text-app-faint mt-1">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-app-primary font-semibold text-app-primary">{t("dash_title")}</h1>
        <p className="text-xs text-app-muted mt-0.5">This internal tool helps XLENT compare client assignments with existing consultants and understand why a consultant matches or does not match.</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label={t("dash_consultants")} value="124" sub={`18 ${t("dash_consultants_sub")}`} icon={Users} accent />
        <StatCard label={t("dash_active_jobs")} value="7" sub={`3 ${t("dash_active_jobs_sub")}`} icon={Briefcase} />
        <StatCard label={t("dash_queue")} value="18" sub={`5 ${t("dash_queue_sub")}`} icon={FileText} />
        <StatCard label={t("dash_active_matching")} value="3" sub={t("dash_active_matching_sub")} icon={GitMerge} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Queue */}
        <div className="col-span-1 bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <span className="text-xs font-medium text-app-primary">{t("dash_queue_panel")}</span>
            <Link to="/upload" className="text-[10px] text-app-brand hover:opacity-70 flex items-center gap-1">
              {t("dash_view_all")} <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border-app-subtletle)" }}>
            {QUEUE.map((item) => (
              <div key={item.name} className="flex items-center gap-3 px-4 py-2.5">
                <FileText size={12} className="text-app-faint flex-none" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-app-primary truncate font-mono">{item.name}</p>
                  <p className="text-[10px] text-app-faint">{item.added}</p>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={STATUS_STYLE[item.status]}
                >
                  {STATUS_ICON[item.status]}
                  {t(`status_${item.status}` as any)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Matches */}
      <div className="bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-app">
          <span className="text-xs font-medium text-app-primary">{t("dash_recent")}</span>
          <Link to="/matching" className="text-[10px] text-app-brand hover:opacity-70 flex items-center gap-1">
            {t("dash_view_all")} <ArrowUpRight size={10} />
          </Link>
        </div>
        <DataTable
          columns={[
            { key: "consultant", header: t("dash_candidate"), render: (match) => <span className="font-medium text-app-primary">{match.consultant}</span> },
            { key: "assignment", header: t("dash_job") },
            { key: "score", header: t("dash_score"), render: (match) => <div className="flex items-center gap-2"><div className="w-20 h-1.5 rounded-full bg-app-raised"><div className="h-full rounded-full" style={{ width: match.score + "%", backgroundColor: "var(--color-brand)" }} /></div><span className="font-mono text-app-primary">{match.score}</span></div> },
            { key: "date", header: t("dash_date"), render: (match) => <span className="text-app-faint">{match.date}</span> },
            { key: "view", header: "", render: () => <Link to="/matching" className="text-[10px] text-app-brand hover:opacity-70">{t("view")}</Link> },
          ]}
          rows={RECENT_MATCHES}
          rowKey={(match) => match.consultant + match.assignment}
        /></table>
      </div>
    </div>
  );
}
