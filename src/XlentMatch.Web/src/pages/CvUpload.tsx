import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { aiApi } from "../services/aiApi";
import { consultantsApi } from "../services/consultantsApi";
import { cvUploadsApi, type CvUploadRecord } from "../services/cvUploadsApi";
import { validateDocumentFile } from "../services/fileValidation";

type Tab = "library" | "review";
const formatSize = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export default function CvUpload() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const replaceConsultantId = Number(params.get("replaceConsultantId")) || null;
  const input = useRef<HTMLInputElement>(null);
  const [existingCvForConsultant, setExistingCvForConsultant] = useState(false);
  const [records, setRecords] = useState<CvUploadRecord[]>([]);
  const [consultantNames, setConsultantNames] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<Tab>("library");
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
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load CVs"); })
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
      const message = e instanceof Error ? e.message : "CV processing failed";
      setError(message);
      if (uploadId !== null) {
        try {
          if (message.includes("DUPLICATE_CV")) {
            await cvUploadsApi.remove(uploadId);
            setError("This CV already exists in the library. Upload cancelled; AI extraction was not started.");
          } else {
            await cvUploadsApi.update(uploadId, { status: "Error", errorMessage: message });
          }
        } catch { /* preserve initial error */ }
      }
      await refresh().catch(() => {});
    } finally { setBusy(false); }
  };

  const remove = async (record: CvUploadRecord) => {
    if (!window.confirm(`Delete ${record.fileName}? The consultant profile will be kept.`)) return;
    try {
      await cvUploadsApi.remove(record.id);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete CV"); }
  };

  const list = records.filter((r) => {
    const belongs = tab === "review" ? r.status === "Review" :
      tab === "library" ? r.status === "Indexed" : false;
    return belongs && (status === "All" || r.status === status) &&
      r.fileName.toLowerCase().includes(search.toLowerCase());
  });
  const tabClass = (value: Tab) => `rounded-md px-4 py-2 text-xs font-medium ${tab === value ? "bg-app-brand-subtle text-app-brand" : "text-app-secondary hover:bg-app-raised"}`;
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <PageHeader title="CV Management" description="Manage consultant CVs, review AI extraction and keep profiles up to date." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          ["Total CVs", records.filter((r) => r.status === "Indexed" && r.storageKey != null).length],
          ["Active CVs", records.filter((r) => r.isActive).length],
          ["Pending Review", records.filter((r) => r.status === "Review").length],
        ].map(([label, value]) => (
          <div key={label} className="bg-app-surface border border-app-border rounded-xl p-4">
            <div className="text-2xl font-semibold text-app-primary">{value}</div>
            <div className="text-xs text-app-muted mt-1">{label}</div>
          </div>
        ))}
      </div>
      <section className="rounded-xl border border-app-border bg-app-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-app-primary">{replaceConsultantId && existingCvForConsultant ? "Replace CV for " + (consultantNames[replaceConsultantId] || "Consultant #" + replaceConsultantId) : replaceConsultantId ? "Upload CV for " + (consultantNames[replaceConsultantId] || "Consultant #" + replaceConsultantId) : "Upload CV"}</h2>
            <p className="text-xs text-app-muted mt-1">{replaceConsultantId ? "The current CV and consultant profile remain unchanged until you review and approve the replacement." : "PDF or TXT, maximum 10 MB. AI extraction requires review before saving."}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {replaceConsultantId && <Link className="text-xs text-app-brand" to={`/consultants/${replaceConsultantId}`}>Back to consultant</Link>}
            <input ref={input} type="file" accept=".pdf,.txt,application/pdf,text/plain" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            <button type="button" disabled={busy} onClick={() => input.current?.click()} dir="ltr" className="inline-flex w-fit items-center justify-center rounded-md bg-app-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {busy ? "Uploading and extracting..." : replaceConsultantId && existingCvForConsultant ? "Choose replacement CV" : replaceConsultantId ? "Upload New CV" : "+ Upload CV"}
            </button>
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="flex flex-wrap gap-2 items-center justify-between px-4 py-3 border-b border-app-border">
          <div className="flex flex-wrap gap-1">
            <button className={tabClass("library")} onClick={() => setTab("library")}>CV Library</button>
            <button className={tabClass("review")} onClick={() => setTab("review")}>Review Queue ({records.filter((r) => r.status === "Review").length})</button>
          </div>
          <div className="flex gap-2">
            <input aria-label="Search CV library" className="rounded-md border border-app-border bg-app px-3 py-2 text-xs text-app-primary" placeholder="Search by file name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select aria-label="Filter by status" className="rounded-md border border-app-border bg-app px-3 py-2 text-xs text-app-primary" value={status} onChange={(e) => setStatus(e.target.value)}>
              {["All", "Extracting", "Review", "Indexed", "Error"].map((x) => <option key={x} value={x}>{x === "All" ? "All statuses" : x}</option>)}
            </select>
          </div>
        </div>
        {error && <p role="alert" className="mx-4 mt-3 text-xs text-red-500">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-app-raised text-app-muted"><tr><th className="px-4 py-3">CV file</th><th className="px-4 py-3">Uploaded</th><th className="px-4 py-3">Size</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-app-border text-app-secondary">
                  <td className="px-4 py-3 font-medium text-app-primary">{r.fileName}{r.consultantId && <Link className="block text-app-brand font-normal mt-1" to={`/consultants/${r.consultantId}`}>View Consultant</Link>}</td>
                  <td className="px-4 py-3">{new Date(r.uploadedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{formatSize(r.fileSize)}</td>
                  <td className="px-4 py-3">{r.isActive ? "Active" : r.status}</td>
                  <td className="px-4 py-3"><div className="flex justify-end flex-wrap gap-3">
                    {tab === "library" && r.storageKey && <><a href={`${cvUploadsApi.fileUrl(r.id)}?inline=true`} target="_blank" rel="noreferrer" className="text-app-brand">View</a><a href={cvUploadsApi.fileUrl(r.id)} className="text-app-brand">Download</a></>}
                    {tab === "review" && <Link className="text-app-brand" to={`/cv-upload/review?uploadId=${r.id}${r.consultantId ? `&replaceConsultantId=${r.consultantId}` : ""}`}>Review</Link>}
                    {tab === "library" && r.consultantId && <Link className="text-app-brand" to={`/cv-upload?replaceConsultantId=${r.consultantId}`}>Replace</Link>}
                    <button type="button" className="text-app-muted hover:text-red-500" onClick={() => void remove(r)}>Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && list.length === 0 && <p className="p-8 text-center text-xs text-app-muted">No CVs found for this view.</p>}
          {loading && <p className="p-8 text-center text-xs text-app-muted">Loading CVs...</p>}
        </div>
      </section>
      <p className="text-xs text-app-muted">Original files are stored by the API for new uploads. Older records may not have a downloadable file.</p>
    </div>
  );
}
