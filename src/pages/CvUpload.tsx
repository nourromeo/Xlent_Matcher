import { useState, useRef, useCallback } from "react";
import { Upload as UploadIcon, FileText, X, CheckCircle, AlertCircle, Loader } from "../design-system/icons";
import { useI18n } from "../i18n";
import { StatusBadge } from "../components/ui/StatusBadge";
import { DEMO_FILES, type FileStatus, type UploadFile } from "../features/uploads";
import { PageHeader } from "../components/ui/PageHeader";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isSupportedCv(file: File) {
  return /\.(pdf|docx)$/i.test(file.name) && file.size <= MAX_FILE_SIZE;
}

function fmt(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function CvUpload() {
  const { t } = useI18n();
  const [files, setFiles] = useState<UploadFile[]>(DEMO_FILES);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...incoming.filter(isSupportedCv).map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, status: "queued" as FileStatus, progress: 0 })),
    ]);
  }, []);

  const done = files.filter((f) => f.status === "done").length;
  const errors = files.filter((f) => f.status === "error").length;
  const inProg = files.filter((f) => ["extracting", "parsing", "embedding"].includes(f.status)).length;

  const statusColor = (s: FileStatus) => {
    if (s === "done") return "var(--color-success)";
    if (s === "error") return "var(--color-danger)";
    if (s === "queued") return "var(--color-text-muted)";
    return "var(--color-brand)";
  };

  const statusIcon = (s: FileStatus) => {
    if (s === "done") return <CheckCircle size={10} />;
    if (s === "error") return <AlertCircle size={10} />;
    if (s === "queued") return null;
    return <Loader size={10} className="animate-spin" />;
  };

  const statusLabel = (s: FileStatus) => t(`status_${s}` as any);

  const barColor = (s: FileStatus) => s === "done" ? "var(--color-success)" : s === "error" ? "var(--color-danger)" : "var(--color-brand)";

  return (
    <div className="p-6 space-y-5">
      <PageHeader title={t("upload_title")} description={t("upload_sub")} />

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: t("upload_total"),      value: files.length, color: "var(--color-text-primary)" },
          { label: t("upload_processing"), value: inProg,        color: "var(--color-brand)" },
          { label: t("upload_indexed"),    value: done,          color: "var(--color-success)" },
          { label: t("upload_errors"),     value: errors,        color: errors > 0 ? "var(--color-danger)" : "var(--color-text-faint)" },
        ].map((s) => (
          <div key={s.label} className="bg-app-surface border border-app rounded-lg px-4 py-3" style={{ boxShadow: "var(--shadow-surface)" }}>
            <p className="text-xl font-semibold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-app-faint mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer"
        style={{ borderColor: dragging ? "var(--color-brand)" : "var(--color-border)", background: dragging ? "var(--color-brand-subtle)" : "transparent" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={t("upload_title")}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.docx" className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.currentTarget.value = ""; }} />
        <UploadIcon size={28} className="mx-auto mb-3" style={{ color: dragging ? "var(--color-brand)" : "var(--color-text-muted)" }} />
        <p className="text-sm text-app-secondary">{t("upload_drop")} <span className="text-app-brand">{t("upload_browse")}</span></p>
        <p className="text-xs text-app-faint mt-1">{t("upload_types")}</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-app-surface border border-app rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-surface)" }}>
          <div className="px-4 py-2.5 border-b border-app flex items-center justify-between">
            <span className="text-xs font-medium text-app-primary">{t("upload_batch")}</span>
            <span className="text-[10px] text-app-faint font-mono">{t("upload_sse")}</span>
          </div>
          <div>
            {files.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 group" style={{ borderBottom: i < files.length - 1 ? "1px solid var(--color-border-subtle)" : "none" }}>
                <FileText size={13} className="text-app-faint flex-none" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-app-primary font-mono truncate">{f.name}</span>
                    <span className="text-[10px] text-app-faint flex-none">{fmt(f.size)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full" style={{ background: "var(--color-border)" }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${f.status === "done" || f.status === "error" ? 100 : f.progress}%`, backgroundColor: barColor(f.status) }} />
                    </div>
                    <StatusBadge tone={f.status === "done" ? "success" : f.status === "error" ? "danger" : f.status === "extracting" || f.status === "parsing" || f.status === "embedding" ? "brand" : "neutral"} icon={statusIcon(f.status)}>
                      {statusLabel(f.status)}
                    </StatusBadge>
                  </div>
                  {f.error && <p className="text-[10px] font-mono" style={{ color: "var(--color-danger)" }}>{f.error}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))}
                  className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-app-faint hover:text-app-secondary transition-all"
                  aria-label={`${t("upload_remove_file")}: ${f.name}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
