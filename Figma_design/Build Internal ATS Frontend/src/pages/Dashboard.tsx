import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FileText, Briefcase, GitMerge, DollarSign, Clock, CheckCircle, AlertCircle, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

const costData = [
  { day: "Sep 1", cost: 1.2 },
  { day: "Sep 2", cost: 2.8 },
  { day: "Sep 3", cost: 1.9 },
  { day: "Sep 4", cost: 4.1 },
  { day: "Sep 5", cost: 3.3 },
  { day: "Sep 6", cost: 5.0 },
  { day: "Sep 7", cost: 4.6 },
  { day: "Sep 8", cost: 6.2 },
  { day: "Sep 9", cost: 5.8 },
];

const QUEUE = [
  { name: "aleksandra_kovacs_cv.pdf", status: "parsing", added: "2m ago" },
  { name: "marcus_lee_resume.docx", status: "extracting", added: "4m ago" },
  { name: "priya_sharma_cv.pdf", status: "embedding", added: "7m ago" },
  { name: "tobias_renz_cv.pdf", status: "done", added: "12m ago" },
  { name: "seo_yun_resume.pdf", status: "error", added: "15m ago" },
];

const RECENT_MATCHES = [
  { candidate: "A. Kovacs", job: "Senior Backend Engineer", score: 91, date: "Today" },
  { candidate: "M. Lee", job: "ML Engineer (NLP)", score: 84, date: "Today" },
  { candidate: "P. Sharma", job: "Staff SRE", score: 78, date: "Yesterday" },
  { candidate: "T. Renz", job: "Senior Backend Engineer", score: 73, date: "Yesterday" },
  { candidate: "S. Yun", job: "Frontend Engineer", score: 67, date: "Sep 7" },
];

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  parsing:   { color: "var(--ats-amber)",  background: "rgba(245,158,11,0.10)" },
  extracting:{ color: "var(--ats-indigo)", background: "var(--ats-indigo-sub)" },
  embedding: { color: "var(--ats-indigo)", background: "var(--ats-indigo-sub)" },
  done:      { color: "var(--ats-green)",  background: "rgba(34,197,94,0.10)"  },
  error:     { color: "var(--ats-red)",    background: "rgba(239,68,68,0.10)"  },
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
    <div className="bg-surface border border-base rounded-lg p-4" style={{ boxShadow: "var(--ats-shadow)" }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] text-muted uppercase tracking-wider font-medium">{label}</p>
        <div
          className="w-7 h-7 rounded flex items-center justify-center"
          style={accent
            ? { background: "var(--ats-indigo-sub)", color: "var(--ats-indigo)" }
            : { background: "var(--ats-surface-r)", color: "var(--ats-muted)" }}
        >
          <Icon size={14} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-base tracking-tight">{value}</p>
      <p className="text-[10px] text-3 mt-1">{sub}</p>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-base font-semibold text-base">{t("dash_title")}</h1>
        <p className="text-xs text-muted mt-0.5">Tuesday, September 9, 2026</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label={t("dash_queue")} value="18" sub={`5 ${t("dash_queue_sub")}`} icon={FileText} accent />
        <StatCard label={t("dash_active_jobs")} value="7" sub={`3 ${t("dash_active_jobs_sub")}`} icon={Briefcase} />
        <StatCard label={t("dash_matches")} value="34" sub={`+12 ${t("dash_matches_sub")}`} icon={GitMerge} />
        <StatCard label={t("dash_cost")} value="$38.40" sub={`↑ $6.20 ${t("dash_cost_sub")}`} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Queue */}
        <div className="col-span-1 bg-surface border border-base rounded-lg" style={{ boxShadow: "var(--ats-shadow)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-base">
            <span className="text-xs font-medium text-base">{t("dash_queue_panel")}</span>
            <Link to="/upload" className="text-[10px] text-indigo hover:opacity-70 flex items-center gap-1">
              {t("dash_view_all")} <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--ats-border-s)" }}>
            {QUEUE.map((item) => (
              <div key={item.name} className="flex items-center gap-3 px-4 py-2.5">
                <FileText size={12} className="text-3 flex-none" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-base truncate font-mono">{item.name}</p>
                  <p className="text-[10px] text-3">{item.added}</p>
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

        {/* AI Cost Chart */}
        <div className="col-span-2 bg-surface border border-base rounded-lg" style={{ boxShadow: "var(--ats-shadow)" }}>
          <div className="px-4 py-3 border-b border-base">
            <span className="text-xs font-medium text-base">{t("dash_cost_chart")}</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={costData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ats-indigo)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--ats-indigo)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "var(--ats-text-3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--ats-text-3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--ats-surface-r)", border: "1px solid var(--ats-border)", borderRadius: 6, fontSize: 11, color: "var(--ats-text)" }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Cost"]}
                />
                <Area type="monotone" dataKey="cost" stroke="var(--ats-indigo)" strokeWidth={1.5} fill="url(#costGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="bg-surface border border-base rounded-lg" style={{ boxShadow: "var(--ats-shadow)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-base">
          <span className="text-xs font-medium text-base">{t("dash_recent")}</span>
          <Link to="/matching" className="text-[10px] text-indigo hover:opacity-70 flex items-center gap-1">
            {t("dash_view_all")} <ArrowUpRight size={10} />
          </Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-sub">
              {[t("dash_candidate"), t("dash_job"), t("dash_score"), t("dash_date"), ""].map((h, i) => (
                <th key={i} className="text-[10px] font-medium text-3 uppercase tracking-wider text-left px-4 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_MATCHES.map((m) => (
              <tr key={m.candidate + m.job} className="border-b border-sub hover:bg-raised transition-colors">
                <td className="px-4 py-2.5 text-xs text-base font-medium">{m.candidate}</td>
                <td className="px-4 py-2.5 text-xs text-2">{m.job}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-raised">
                      <div className="h-full rounded-full" style={{ width: `${m.score}%`, backgroundColor: "var(--ats-indigo)" }} />
                    </div>
                    <span className="text-xs font-mono text-base">{m.score}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-3">{m.date}</td>
                <td className="px-4 py-2.5">
                  <Link to="/matching" className="text-[10px] text-indigo hover:opacity-70">{t("view")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
