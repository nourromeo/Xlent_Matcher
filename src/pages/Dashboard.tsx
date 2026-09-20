import { FileText, Briefcase, GitMerge, Users, Clock, CheckCircle, AlertCircle, ArrowUpRight } from "../design-system/icons";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { QUEUE, RECENT_MATCHES } from "../data/mock";
import { DataTable } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";

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
      <p className="text-xl font-semibold text-app-primary tracking-tight">{value}</p>
      <p className="text-[10px] text-app-faint mt-1">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={t("dash_title")} description="This internal tool helps XLENT compare client assignments with existing consultants and understand why a consultant matches or does not match." />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label={t("dash_consultants")} value="124" sub={`18 ${t("dash_consultants_sub")}`} icon={Users} accent />
        <StatCard label={t("dash_active_jobs")} value="7" sub={`3 ${t("dash_active_jobs_sub")}`} icon={Briefcase} />
        <StatCard label={t("dash_queue")} value="18" sub={`5 ${t("dash_queue_sub")}`} icon={FileText} />
        <StatCard label={t("dash_active_matching")} value="3" sub={t("dash_active_matching_sub")} icon={GitMerge} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* CV processing queue */}
        <div className="xl:col-span-1 bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <div>
              <p className="text-xs font-medium text-app-primary">{t("dash_queue_panel")}</p>
              <p className="text-[10px] text-app-muted mt-0.5">Latest consultant CV processing</p>
            </div>
            <Link to="/upload" className="text-[10px] text-app-brand hover:opacity-70 flex items-center gap-1">
              {t("dash_view_all")} <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {QUEUE.map((item) => (
              <div key={item.name} className="flex items-center gap-3 px-4 py-2.5">
                <FileText size={12} className="text-app-faint flex-none" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-app-primary truncate font-mono">{item.name}</p>
                  <p className="text-[10px] text-app-faint">{item.added}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={STATUS_STYLE[item.status]}>
                  {STATUS_ICON[item.status]}
                  {t(`status_${item.status}` as any)}
                </span>
              </div>
            ))}
          </div>
        <div className="xl:col-span-2 bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <div>
              <p className="text-xs font-medium text-app-primary">{t("dash_recent")}</p>
              <p className="text-[10px] text-app-muted mt-0.5">Latest consultant matches and ranking results</p>
            </div>
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
          />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={t("dash_title")} description="This internal tool helps XLENT compare client assignments with existing consultants and understand why a consultant matches or does not match." />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label={t("dash_consultants")} value="124" sub={`18 ${t("dash_consultants_sub")}`} icon={Users} accent />
        <StatCard label={t("dash_active_jobs")} value="7" sub={`3 ${t("dash_active_jobs_sub")}`} icon={Briefcase} />
        <StatCard label={t("dash_queue")} value="18" sub={`5 ${t("dash_queue_sub")}`} icon={FileText} />
        <StatCard label={t("dash_active_matching")} value="3" sub={t("dash_active_matching_sub")} icon={GitMerge} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* CV processing queue */}
        <div className="xl:col-span-1 bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <div>
              <p className="text-xs font-medium text-app-primary">{t("dash_queue_panel")}</p>
              <p className="text-[10px] text-app-muted mt-0.5">Latest consultant CV processing</p>
            </div>
            <Link to="/upload" className="text-[10px] text-app-brand hover:opacity-70 flex items-center gap-1">
              {t("dash_view_all")} <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {QUEUE.map((item) => (
              <div key={item.name} className="flex items-center gap-3 px-4 py-2.5">
                <FileText size={12} className="text-app-faint flex-none" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-app-primary truncate font-mono">{item.name}</p>
                  <p className="text-[10px] text-app-faint">{item.added}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={STATUS_STYLE[item.status]}>
                  {STATUS_ICON[item.status]}
                  {t(`status_${item.status}` as any)}
                </span>
              </div>
            ))}
          </div>
          {/* Operational overview */}
        <div className="xl:col-span-2 bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="px-4 py-3 border-b border-app">
            <p className="text-xs font-medium text-app-primary">Operational Overview</p>
            <p className="text-[10px] text-app-muted mt-0.5">Current platform activity and next actions</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3 p-4">
            <Link to="/upload" className="rounded-lg p-4 transition-colors hover:bg-app-raised" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-subtle)" }}>
              <FileText size={14} className="text-app-brand mb-3" />
              <p className="text-xs font-medium text-app-primary">Review CV queue</p>
              <p className="text-[10px] text-app-muted mt-1">Check parsing and extraction status</p>
              <span className="inline-flex items-center gap-1 text-[10px] text-app-brand mt-4">Open queue <ArrowUpRight size={10} /></span>
            </Link>
            <Link to="/jobs" className="rounded-lg p-4 transition-colors hover:bg-app-raised" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-subtle)" }}>
              <Briefcase size={14} className="text-app-brand mb-3" />
              <p className="text-xs font-medium text-app-primary">Manage assignments</p>
              <p className="text-[10px] text-app-muted mt-1">Create or review client requirements</p>
              <span className="inline-flex items-center gap-1 text-[10px] text-app-brand mt-4">Open assignments <ArrowUpRight size={10} /></span>
            </Link>
            <Link to="/matching" className="rounded-lg p-4 transition-colors hover:bg-app-raised" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-subtle)" }}>
              <GitMerge size={14} className="text-app-brand mb-3" />
              <p className="text-xs font-medium text-app-primary">Continue matching</p>
              <p className="text-[10px] text-app-muted mt-1">Review ranked consultant matches</p>
              <span className="inline-flex items-center gap-1 text-[10px] text-app-brand mt-4">Open matching <ArrowUpRight size={10} /></span>
            </Link>
          </div>
        </div>
      </div>

      <div className="xl:col-span-2 bg-app-surface border border-app rounded-lg" style={{ boxShadow: "var(--shadow-surface)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-app">
          <div>
            <p className="text-xs font-medium text-app-primary">{t("dash_recent")}</p>
            <p className="text-[10px] text-app-muted mt-0.5">Latest consultant matches and ranking results</p>
          </div>
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
        />
      </div>
    </div>
