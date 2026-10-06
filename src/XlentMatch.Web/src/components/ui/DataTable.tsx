import { useMemo, useState, type ReactNode } from "react";
import { useI18n } from "../../i18n";

type SortValue = string | number | boolean | Date | null | undefined;

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => SortValue;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  defaultSort?: { key: string; direction?: "asc" | "desc" };
  onRowClick?: (row: T) => void;
  rowAriaLabel?: (row: T) => string;
};

function normalizeSortValue(value: SortValue) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") return value.toLocaleLowerCase();
  return value ?? "";
}

export function DataTable<T>({ columns, rows, rowKey, emptyMessage, defaultSort, onRowClick, rowAriaLabel }: DataTableProps<T>) {
  const { t } = useI18n();
  const resolvedEmptyMessage = emptyMessage ?? t("common_no_data");
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    defaultSort ? { key: defaultSort.key, direction: defaultSort.direction ?? "asc" } : null,
  );

  const sortedRows = useMemo(() => {
    if (!sort) return [...rows];

    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortable || !column.sortValue) return [...rows];

    const getSortValue = column.sortValue;

    return [...rows].sort((a, b) => {
      const aValue = normalizeSortValue(getSortValue(a));
      const bValue = normalizeSortValue(getSortValue(b));

      let result = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" });
      }

      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, rows, sort]);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: "asc" };
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-app">
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const ariaSort = !column.sortable
                ? undefined
                : active
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";

              return (
                <th
                  key={column.key}
                  aria-sort={ariaSort}
                  className="text-[10px] font-medium text-app-faint uppercase tracking-wider text-left px-4 py-2"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-app-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand rounded-sm"
                      aria-label={`${t("common_sort_by")} ${column.header}`}
                    >
                      <span>{column.header}</span>
                      <span className="text-[9px] leading-none" aria-hidden="true">
                        {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-xs text-app-muted">
                {resolvedEmptyMessage}
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => (
              <tr
                key={rowKey(row)}
                className={`border-b border-app-subtle hover:bg-app-raised transition-colors${onRowClick ? " cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-brand" : ""}`}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => {
                  if (!onRowClick || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  onRowClick(row);
                }}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "link" : undefined}
                aria-label={onRowClick ? rowAriaLabel?.(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-2.5 text-xs text-app-secondary">
                    {column.render ? column.render(row) : String((row as unknown as Record<string, unknown>)[column.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
