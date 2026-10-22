import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { aiApi } from "../services/aiApi";
import { consultantsApi } from "../services/consultantsApi";
import { cvUploadsApi, type CvUploadRecord } from "../services/cvUploadsApi";
import { validateDocumentFile } from "../services/fileValidation";
import { useI18n } from "../i18n";

type Tab = "library" | "review";
const formatSize = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export default function CvUpload() {
  const { t, locale } = useI18n();
  const localizeStatus = (value: string) => value === "All" ? t("cv_all_statuses")
    : value === "Extracting" ? t("status_extracting")
    : value === "Review" ? t("cv_review")
    : value === "Indexed" ? t("dashboard_indexed")
    : value === "Error" ? t("status_error")
    : value === "Queued" ? t("status_queued") : value;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const replaceConsultantId = Number(params.get("replaceConsultantId")) || null;
  const input = useRef<HTMLInputElement>(null);
  const [existingCvForConsultant, setExistingCvForConsultant] = useState(false);
  const [records, setRecords] = useState<CvUploadRecord[]>([]);
  const [consultantNames, setConsultantNames] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<Tab>("library");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    consultantsApi.getAll().then((items) => setConsultantNames(Object.fromEntries(items.map((item) => [item.id, item.firstName + " " + item.lastName])))).catch(() => {});
  }, []);

  const refresh = async () => {
    const data = await cvUploadsApi.getAll();
    setRecords(data);
    setExistingCvForConsultant(Boolean(replaceConsultantId && data.some((item) => item.consultantId === replaceConsultantId && item.isActive && item.status === "Indexed")));
  };
  useEffect(() => {
    let cancelled = false;
    cvUploadsApi.getAll().then((data) => { if (!cancelled) { setRecords(data); setExistingCvForConsultant(Boolean(replaceConsultantId && data.some((item) => item.consultantId === replaceConsultantId && item.isActive && item.status === "Indexed"))); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : t("cv_load_failed")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const upload = async (file?: File) => {
    if (!file || busy) return;
    const problem = validateDocumentFile(file);
    if (problem) { setError(problem); return; }
    setError("");
    setBusy(true);
    let uploadId: number | null = null;
    try {
      const created = await cvUploadsApi.create(file.name, file.size);
      uploadId = created.id;
      await cvUploadsApi.uploadFile(created.id, file);
      const extracted = await aiApi.extractConsultantFromFile(file);
      await cvUploadsApi.update(created.id, {
        status: "Review", consultantId: replaceConsultantId,
        draftJson: JSON.stringify(extracted), errorMessage: null,
      });
      navigate(`/cv-upload/review?uploadId=${created.id}${replaceConsultantId ? `&replaceConsultantId=${replaceConsultantId}` : ""}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("cv_process_failed");
      setError(message);
      if (uploadId !== null) {
        try {
          if (message.includes("DUPLICATE_CV")) {
            await cvUploadsApi.remove(uploadId).catch(() => {});
            setError(t("cv_duplicate"));
          } else {
            await cvUploadsApi.update(uploadId, { status: "Error", errorMessage: message });
          }
        } catch { /* preserve initial error */ }
      }
      await refresh().catch(() => {});
    } finally { setBusy(false); }
  };

  const remove = async (record: CvUploadRecord) => {
    if (!window.confirm(`${t("cv_delete_confirm")} (${record.fileName})`)) return;
    try {
      await cvUploadsApi.remove(record.id);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : t("cv_delete_failed")); }
  };

  const list = records.filter((r) => {
    const belongs = tab === "review" ? r.status === "Review" :
      tab === "library" ? r.status === "Indexed" : false;
    return belongs && (status === "All" || r.status === status) &&
      r.fileName.toLowerCase().includes(search.toLowerCase());
  });
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleList = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstRow = list.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRow = Math.min(currentPage * pageSize, list.length);
  const tabClass = (value: Tab) => `rounded-md px-4 py-2 text-xs font-medium ${tab === value ? "bg-app-brand-subtle text-app-brand" : "text-app-secondary hover:bg-app-raised"}`;
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <PageHeader title={t("cv_manager_title")} description={t("cv_manager_desc")} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          [t("cv_total"), records.filter((r) => r.status === "Indexed" && r.storageKey != null).length],
          [t("cv_active"), records.filter((r) => r.isActive).length],
          [t("cv_pending"), records.filter((r) => r.status === "Review").length],
        ].map(([label, value]) => (
          <div key={label} className="bg-app-surface border border-app-border rounded-xl p-4">
            <div className="text-2xl font-semibold text-app-primary">{value}</div>
            <div className="text-xs text-app-muted mt-1">{label}</div>
          </div>
        ))}
      </div>
      {records.some((r) => !r.storageKey && !r.consultantId && !r.draftJson && !r.isActive &&
        (r.status === "Error" || r.status === "Extracting") &&
        Date.now() - new Date(r.uploadedAt).getTime() > 24 * 60 * 60 * 1000) && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-app-border p-3">
          <p className="text-xs text-app-muted">{t("cv_old_attempts")}</p>
          <button type="button" className="text-xs text-app-brand" onClick={async () => {
            try {
              const result = await cvUploadsApi.cleanupAbandoned();
              await refresh();
              setError(result.removed + " " + t("cv_cleanup_done"));
            } catch { setError(t("cv_cleanup_failed")); }
          }}>{t("cv_cleanup")}</button>
        </div>
      )}
      <section className="rounded-xl border border-app-border bg-app-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-app-primary">{replaceConsultantId && existingCvForConsultant ? t("cv_replace_for") + " " + (consultantNames[replaceConsultantId] || t("cv_consultant_number") + " " + replaceConsultantId) : replaceConsultantId ? t("cv_upload_for") + " " + (consultantNames[replaceConsultantId] || t("cv_consultant_number") + " " + replaceConsultantId) : t("cv_upload_title")}</h2>
            <p className="text-xs text-app-muted mt-1">{replaceConsultantId ? t("cv_replace_explain") : t("cv_upload_explain")}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {replaceConsultantId && <Link className="text-xs text-app-brand" to={`/consultants/${replaceConsultantId}`}>{t("cv_back_consultant")}</Link>}
            <input ref={input} type="file" accept=".pdf,.txt,application/pdf,text/plain" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            <button type="button" title={t("cv_upload_tooltip")} disabled={busy} onClick={() => input.current?.click()} dir="ltr" className="inline-flex w-fit items-center justify-center rounded-md bg-app-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {busy ? t("cv_uploading") : replaceConsultantId && existingCvForConsultant ? t("cv_choose_replacement") : replaceConsultantId ? t("cv_upload_new") : "+ " + t("cv_upload_title")}
            </button>
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="flex flex-wrap gap-2 items-center justify-between px-4 py-3 border-b border-app-border">
          <div className="flex flex-wrap gap-1">
            <button className={tabClass("library")} onClick={() => { setTab("library"); setPage(1); }}>{t("cv_library")}</button>
            <button className={tabClass("review")} onClick={() => { setTab("review"); setPage(1); }}>{t("cv_review_queue")} ({records.filter((r) => r.status === "Review").length})</button>
          </div>
          <div className="flex gap-2">
            <input aria-label={t("cv_search_label")} className="rounded-md border border-app-border bg-app px-3 py-2 text-xs text-app-primary" placeholder={t("cv_search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            <select aria-label={t("cv_status_filter")} className="rounded-md border border-app-border bg-app px-3 py-2 text-xs text-app-primary" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {["All", "Extracting", "Review", "Indexed", "Error"].map((x) => <option key={x} value={x}>{localizeStatus(x)}</option>)}
            </select>
          </div>
        </div>
        {error && <p role="alert" className="mx-4 mt-3 text-xs text-red-500">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-app-raised text-app-muted"><tr><th title={t("cv_file_hint")} className="px-4 py-3">{t("cv_file")} ⓘ</th><th title={t("cv_consultant_hint")} className="px-4 py-3">{t("cv_consultant")} ⓘ</th><th title={t("cv_date_hint")} className="px-4 py-3">{t("cv_uploaded")} ⓘ</th><th title={t("cv_size_hint")} className="px-4 py-3">{t("cv_size")} ⓘ</th><th title={t("cv_status_hint")} className="px-4 py-3">{t("cv_status")} ⓘ</th><th title={t("cv_actions_hint")} className="px-4 py-3 text-right">{t("cv_actions")} ⓘ</th></tr></thead>
            <tbody>
              {visibleList.map((r) => (
                <tr key={r.id} className="border-t border-app-border text-app-secondary">
                  <td className="px-4 py-3 font-medium text-app-primary">{r.fileName}</td>
                  <td className="px-4 py-3">{r.consultantId ? <Link className="text-app-brand" to={`/consultants/${r.consultantId}`}>{consultantNames[r.consultantId] || t("cv_consultant_number") + " " + r.consultantId}</Link> : <span className="text-app-muted">{t("cv_unassigned")}</span>}</td>
                  <td className="px-4 py-3">{new Date(r.uploadedAt).toLocaleDateString(locale === "sv" ? "sv-SE" : locale === "es" ? "es-ES" : "en-US")}</td>
                  <td className="px-4 py-3">{formatSize(r.fileSize)}</td>
                  <td className="px-4 py-3">{r.isActive ? t("cv_active_status") : localizeStatus(r.status)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end flex-wrap gap-3">
                    {tab === "library" && r.storageKey && <><a href={`${cvUploadsApi.fileUrl(r.id)}?inline=true`} target="_blank" rel="noreferrer" className="text-app-brand">{t("cv_view")}</a><a href={cvUploadsApi.fileUrl(r.id)} className="text-app-brand">{t("cv_download")}</a></>}
                    {tab === "review" && <Link className="text-app-brand" to={`/cv-upload/review?uploadId=${r.id}${r.consultantId ? `&replaceConsultantId=${r.consultantId}` : ""}`}>{t("cv_review")}</Link>}
                    {tab === "library" && r.consultantId && <Link className="text-app-brand" to={`/cv-upload?replaceConsultantId=${r.consultantId}`}>{t("cv_replace")}</Link>}
                    <button type="button" className="text-app-muted hover:text-red-500" onClick={() => void remove(r)}>{t("cv_delete")}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && list.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-app-border bg-app-surface px-4 py-2.5 text-[10px] text-app-muted">
              <span>{firstRow}–{lastRow} {t("cv_of")} {list.length} CVs</span>
              <div className="flex items-center gap-3">
                <span>{t("cv_rows")}</span>
                <button type="button" aria-label={t("cv_previous")} disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded px-2 py-1 hover:bg-app-raised disabled:opacity-35">‹</button>
                <span>{t("cv_page")} {currentPage} {t("cv_of")} {pageCount}</span>
                <button type="button" aria-label={t("cv_next")} disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded px-2 py-1 hover:bg-app-raised disabled:opacity-35">›</button>
              </div>
            </div>
          )}
          {!loading && list.length === 0 && <p className="p-8 text-center text-xs text-app-muted">{t("cv_no_results")}</p>}
          {loading && <p className="p-8 text-center text-xs text-app-muted">{t("cv_loading")}</p>}
        </div>
      </section>
      <p className="text-xs text-app-muted">{t("cv_storage_note")}</p>
    </div>
  );
}
