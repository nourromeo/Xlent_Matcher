import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { PageHeader } from "../components/ui/PageHeader";
import { assignmentsApi } from "../services/assignmentsApi";
import type { AssignmentApi } from "../types";

export default function MatchingSelection() {
  const { t } = useI18n();
  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [visibleCount, setVisibleCount] = useState(10);
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

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return assignments
      .filter((item) => !term || (item.title + " " + item.customerName).toLocaleLowerCase().includes(term))
      .sort((a, b) => sortBy === "name"
        ? a.title.localeCompare(b.title)
        : sortBy === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt));
  }, [assignments, search, sortBy]);

  const shown = filtered.slice(0, visibleCount);

  return (
    <div className="flex h-full flex-col bg-app">
      <div className="flex-none bg-app-surface px-6 py-4">
        <PageHeader title={t("matching_title")} description={t("matching_choose_title")} />
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="rounded-xl border border-app-border bg-app-surface p-5">
            <label htmlFor="matching-assignment-search" className="mb-2 block text-xs font-medium text-app-primary">
              {t("matching_client_assignment")}
            </label>
            <input
              id="matching-assignment-search"
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setVisibleCount(10); }}
              placeholder={t("matching_search_placeholder")}
              className="w-full rounded-md border border-app-border bg-app px-3 py-2.5 text-sm text-app-primary outline-none focus:border-app-brand"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-app-muted">{t("matching_showing_count").replace("{shown}", String(Math.min(visibleCount, filtered.length))).replace("{total}", String(filtered.length))}</span>
            <select aria-label={t("matching_sort_label")} value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setVisibleCount(10); }} className="rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-primary">
              <option value="newest">{t("matching_sort_newest")}</option>
              <option value="oldest">{t("matching_sort_oldest")}</option>
              <option value="name">{t("matching_sort_name")}</option>
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-app-muted">{t("matching_loading")}</p>
          ) : error ? (
            <p role="alert" className="text-sm text-app-warning">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-app-border bg-app-surface p-5 text-sm text-app-muted">
              {t("matching_no_assignments")}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface">
              {shown.map((item) => (
                <Link
                  key={item.id}
                  to={`/matching/${item.id}`}
                  state={{ fromAssignment: false }}
                  className="flex items-center justify-between gap-4 border-b border-app-border-subtle px-5 py-4 transition-colors last:border-b-0 hover:bg-app-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-brand"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-app-primary">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-app-muted">{item.customerName} · #{item.id}</p>
                  </div>
                  <span aria-hidden="true" className="shrink-0 text-app-muted">→</span>
                </Link>
              ))}
              </div>
              {visibleCount < filtered.length && (
                <button type="button" onClick={() => setVisibleCount((count) => count + 10)} className="w-full rounded-lg border border-app-border bg-app-surface px-4 py-2.5 text-sm font-medium text-app-primary hover:bg-app-raised">{t("matching_show_more")}</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
