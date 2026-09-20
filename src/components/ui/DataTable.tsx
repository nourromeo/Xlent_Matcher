import type { ReactNode } from "react";
import { useI18n } from "../../i18n";

type Column<T> = { key: string; header: string; render?: (row: T) => ReactNode };

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
};

export function DataTable<T>({ columns, rows, rowKey, emptyMessage }: DataTableProps<T>) {
  const { t } = useI18n();
  const resolvedEmptyMessage = emptyMessage ?? t("common_no_data");
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-app">
            {columns.map((column) => <th key={column.key} className="text-[10px] font-medium text-app-faint uppercase tracking-wider text-left px-4 py-2">{column.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-xs text-app-muted">{resolvedEmptyMessage}</td></tr> : rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-app-subtle hover:bg-app-raised transition-colors">
              {columns.map((column) => <td key={column.key} className="px-4 py-2.5 text-xs text-app-secondary">{column.render ? column.render(row) : String((row as any)[column.key] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
