import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "../design-system/icons";
import { useI18n } from "../i18n";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { DataTable } from "../components/ui/DataTable";
import { assignmentsApi } from "../services/assignmentsApi";
import { formatDate } from "../services/localeFormat";
import type { AssignmentApi, AssignmentStatusApi } from "../types";

export default function MatchingSelection() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusApi | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    assignmentsApi.getAll()
      .then((data) => { if (!cancelled) setAssignments(data); })
      .catch(() => { if (!cancelled) setError(t("matching_load_data_error")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  const clients = useMemo(
    () => [...new Set(assignments.map((item) => item.customerName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [assignments],
  );
  const seniorities = useMemo(
    () => [...new Set(assignments.map((item) => item.seniority).filter((item): item is string => Boolean(item)))].sort(),
    [assignments],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return assignments.filter((item) => {
      const searchable = [
        item.title,
        item.customerName,
        item.referenceNumber,
        item.location ?? "",
        item.seniority ?? "",
        ...item.requirements.map((requirement) => requirement.name),
      ].join(" ").toLocaleLowerCase();
      return (!term || searchable.includes(term))
        && (!clientFilter || item.customerName === clientFilter)
        && (!seniorityFilter || item.seniority === seniorityFilter)
        && (!statusFilter || item.status === statusFilter);
    });
  }, [assignments, query, clientFilter, seniorityFilter, statusFilter]);

  const displaySeniority = (value: string) => value === "Junior"
    ? t("seniority_junior")
    : value === "Mid"
      ? t("seniority_mid")
      : value === "Senior"
        ? t("seniority_senior")
        : value === "Staff"
          ? t("seniority_staff")
          : value;

  const statusConfig = (status: AssignmentStatusApi) => {
    switch (status) {
      case "Draft":
        return { label: t("assignment_draft"), tone: "neutral" as const };
      case "Matching":
        return { label: t("assignment_matching"), tone: "neutral" as const };
      case "Closed":
        return { label: t("assignment_closed"), tone: "neutral" as const };
      default:
        return { label: t("assignment_done"), tone: "success" as const };
    }
  };

  const statusOptions: AssignmentStatusApi[] = ["Draft", "Matching", "Matched", "Done", "Closed"];

  return (
    <div className="flex h-full flex-col bg-app">
      <div className="flex-none border-b border-app-border bg-app-surface px-6 py-4">
        <PageHeader title={t("matching_title")} description={t("matching_choose_title")} />
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[240px] flex-1 space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-app-muted">{t("matching_search_assignments_label")}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("matching_search_placeholder")}
                className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs text-app-primary outline-none focus:border-app-brand"
              />
            </label>
            <label className="min-w-[150px] space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-app-muted">{t("matching_filter_client")}</span>
              <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs text-app-primary">
                <option value="">{t("matching_filter_all")}</option>
                {clients.map((client) => <option key={client} value={client}>{client}</option>)}
              </select>
            </label>
            <label className="min-w-[130px] space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-app-muted">{t("assignment_seniority")}</span>
              <select value={seniorityFilter} onChange={(event) => setSeniorityFilter(event.target.value)} className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs text-app-primary">
                <option value="">{t("matching_filter_all")}</option>
                {seniorities.map((seniority) => <option key={seniority} value={seniority}>{displaySeniority(seniority)}</option>)}
              </select>
            </label>
            <label className="min-w-[145px] space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-app-muted">{t("cv_status_column")}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AssignmentStatusApi | "")} className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs text-app-primary">
                <option value="">{t("matching_filter_all")}</option>
                {statusOptions.map((status) => <option key={status} value={status}>{statusConfig(status).label}</option>)}
              </select>
            </label>
          </div>

          {error && <div role="alert" className="rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-secondary">{error}</div>}

          <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-app-surface">
            <DataTable
              key={query + clientFilter + seniorityFilter + statusFilter}
              columns={[
                {
                  key: "assignment",
                  width: "42%",
                  header: t("assignment_title"),
                  sortable: true,
                  sortValue: (item) => item.title,
                  render: (item) => <div className="min-w-0"><p className="truncate font-medium text-app-primary">{item.title}</p><p className="truncate text-[10px] text-app-muted">{item.referenceNumber}</p></div>,
                },
                {
                  key: "client",
                  width: "25%",
                  header: t("assignment_client"),
                  sortable: true,
                  sortValue: (item) => item.customerName,
                  render: (item) => <span className="truncate">{item.customerName || "—"}</span>,
                },
                {
                  key: "updated",
                  width: "19%",
                  header: t("common_updated"),
                  sortable: true,
                  sortValue: (item) => new Date(item.updatedAt || item.createdAt),
                  render: (item) => formatDate(item.updatedAt || item.createdAt, locale),
                },
                {
                  key: "status",
                  width: "10%",
                  header: t("cv_status_column"),
                  sortable: true,
                  sortValue: (item) => item.status,
                  render: (item) => {
                    const status = statusConfig(item.status);
                    return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
                  },
                },
                { key: "navigation", width: "4%", header: "", render: () => <ChevronRight size={15} className="text-app-faint" aria-hidden="true" /> },
              ]}
              rows={filtered}
              pagination
              fixedPageSize={10}
              numberedPagination
              paginationLabel={t("assignments_sub")}
              rowKey={(item) => String(item.id)}
              onRowClick={(item) => navigate(`/matching/${item.id}`, { state: { fromAssignment: false } })}
              rowAriaLabel={(item) => `${t("assignment_view")} ${item.title}`}
              emptyMessage={loading ? t("assignments_loading") : query || clientFilter || seniorityFilter || statusFilter ? t("assignments_empty_search") : t("matching_no_assignments")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
