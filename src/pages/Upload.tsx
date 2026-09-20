import { useState, useRef, useCallback } from "react";
import { Upload as UploadIcon, FileText, X, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { useI18n } from "../i18n";

type FileStatus = "queued" | "extracting" | "parsing" | "embedding" | "done" | "error";

interface UploadFile {
  id: string; name: string; size: number;
  status: FileStatus; progress: number; error?: string;
}

const DEMO_FILES: UploadFile[] = [
  { id: "f1", name: "anna_kovacs_consultant_cv.pdf", size: 182400, status: "done", progress: 100 },
  { id: "f2", name: "marcus_lee_consultant_cv.docx", size: 94208, status: "parsing", progress: 55 },
  { id: "f3", name: "priya_sharma_cv.pdf", size: 213504, status: "extracting", progress: 20 },
  { id: "f4", name: "tobias_renz_cv.pdf", size: 156672, status: "queued", progress: 0 },
  { id: "f5", name: "sofia_yun_consultant_cv.pdf", size: 128000, status: "error", progress: 0, error: "Text extraction failed: scanned image quality is too low" },
];

function fmt(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function Upload() {
  const { t } = useI18n();
  const [files, setFiles] = useState<UploadFile[]>(DEMO_FILES);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...incoming.map((f) => ({ id: Math.random().toString(36).slice(2), name: f.name, size: f.size, status: "queued" as FileStatus, progress: 0 })),
    ]);
  }, []);

  const done = files.filter((f) => f.status === "done").length;
  const errors = files.filter((f) => f.status === "error").length;
  const inProg = files.filter((f) => ["extracting", "parsing", "embedding"].includes(f.status)).length;

  const statusColor = (s: FileStatus) => {
    if (s === "done") return "var(--ats-green)";
    if (s === "error") return "var(--ats-red)";
    if (s === "queued") return "var(--ats-muted)";
    return "var(--ats-indigo)";
  };

  const statusIcon = (s: FileStatus) => {
    if (s === "done") return <CheckCircle size={10} />;
    if (s === "error") return <AlertCircle size={10} />;
    if (s === "queued") return null;
    return <Loader size={10} className="animate-spin" />;
  };

  const statusLabel = (s: FileStatus) => t(`status_${s}` as any);

  const barColor = (s: FileStatus) => s === "done" ? "var(--ats-green)" : s === "error" ? "var(--ats-red)" : "var(--ats-indigo)";

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-app-primary font-semibold text-app-primary">{t("upload_title")}</h1>
        <p className="text-xs text-muted mt-0.5">{t("upload_sub")}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: t("upload_total"),      value: files.length, color: "var(--ats-text)" },
          { label: t("upload_processing"), value: inProg,        color: "var(--ats-indigo)" },
          { label: t("upload_indexed"),    value: done,          color: "var(--ats-green)" },
          { label: t("upload_errors"),     value: errors,        color: errors > 0 ? "var(--ats-red)" : "var(--ats-text-3)" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-base rounded-lg px-4 py-3" style={{ boxShadow: "var(--ats-shadow)" }}>
            <p className="text-xl font-semibold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-3 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer"
        style={{ borderColor: dragging ? "var(--ats-indigo)" : "var(--ats-border)", background: dragging ? "var(--ats-indigo-sub)" : "transparent" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files).filter((f) => f.name.match(/\.(pdf|docx)$/))); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.docx" className="hidden" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
        <UploadIcon size={28} className="mx-auto mb-3" style={{ color: dragging ? "var(--ats-indigo)" : "var(--ats-muted)" }} />
        <p className="text-sm text-2">{t("upload_drop")} <span className="text-indigo">{t("upload_browse")}</span></p>
        <p className="text-xs text-3 mt-1">{t("upload_types")}</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-surface border border-base rounded-lg overflow-hidden" style={{ boxShadow: "var(--ats-shadow)" }}>
          <div className="px-4 py-2.5 border-b border-base flex items-center justify-between">
            <span className="text-xs font-medium text-app-primary">{t("upload_batch")}</span>
            <span className="text-[10px] text-3 font-mono">{t("upload_sse")}</span>
          </div>
          <div>
            {files.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 group" style={{ borderBottom: i < files.length - 1 ? "1px solid var(--ats-border-s)" : "none" }}>
                <FileText size={13} className="text-3 flex-none" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-app-primary font-mono truncate">{f.name}</span>
                    <span className="text-[10px] text-3 flex-none">{fmt(f.size)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full" style={{ background: "var(--ats-border)" }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${f.status === "done" || f.status === "error" ? 100 : f.progress}%`, backgroundColor: barColor(f.status) }} />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium flex-none" style={{ color: statusColor(f.status) }}>
                      {statusIcon(f.status)}{statusLabel(f.status)}
                    </div>
                  </div>
                  {f.error && <p className="text-[10px] font-mono" style={{ color: "var(--ats-red)" }}>{f.error}</p>}
                </div>
                <button onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))} className="opacity-0 group-hover:opacity-100 text-3 hover:text-2 transition-all">
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
