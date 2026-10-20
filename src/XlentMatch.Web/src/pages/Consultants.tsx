import { useEffect, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Filter, Search } from "../design-system/icons";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { LinkButton } from "../components/ui/LinkButton";
import { Input } from "../components/ui/Input";
import { DataTable } from "../components/ui/DataTable";
import { SkillTag } from "../components/ui/SkillTag";
import { PageHeader } from "../components/ui/PageHeader";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { consultantsApi } from "../services/consultantsApi";
import type { Consultant } from "../types";
import { formatDate, formatDateShort } from "../services/localeFormat";

const SENIORITY_OPTIONS = ["All", "Junior", "Mid", "Senior", "Staff"];
const AVAIL_OPTIONS = ["All", "Available", "Unavailable"];

const consultantName = (consultant: Consultant) =>
  consultant.fullName?.trim() || `${consultant.firstName} ${consultant.lastName}`.trim();

const initials = (consultant: Consultant) =>
  [consultant.firstName, consultant.lastName]
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

function formatAvailableAgainDate(value: string | null, locale: "en" | "es" | "sv", fallback: string, compact = false) {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return fallback;
  if (compact) {
    return formatDateShort(new Date(year, month - 1, day), locale);
  }
  return formatDate(new Date(year, month - 1, day), locale);
}

function dateInputValue(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

function monthStart(value: string | null) {
  if (value) {
    const [year, month] = value.slice(0, 10).split("-").map(Number);
    if (year && month) return new Date(year, month - 1, 1);
  }
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function calendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Consultants() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [cvEligible, setCvEligible] = useState<Set<number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState("All");
  const [avail, setAvail] = useState("All");
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState<number | null>(null);
  const [availabilityConsultant, setAvailabilityConsultant] = useState<Consultant | null>(null);
  const [availabilityDraft, setAvailabilityDraft] = useState<Consultant["availability"]>("Available");
  const [availableAgainDraft, setAvailableAgainDraft] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => monthStart(null));

  useEffect(() => {
    let cancelled = false;

    consultantsApi.getCvEligibility().then(data => { if (!cancelled) setCvEligible(new Set(data.eligibleConsultantIds)); }).catch(() => { if (!cancelled) setCvEligible(null); });

    consultantsApi
      .getAll()
      .then((data) => {
        if (!cancelled) setConsultants(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(t("consultant_load_list_error"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateAvailability = async (consultant: Consultant, availability: Consultant["availability"], availableAgainDate: string | null) => {
    setUpdatingAvailabilityId(consultant.id);
    setError("");
    try {
      const updated = await consultantsApi.update(consultant.id, { ...consultant, availability, availableAgainDate: availability === "Available" ? null : availableAgainDate });
      setConsultants((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(t("consultant_availability_error"));
    } finally {
      setUpdatingAvailabilityId(null);
    }
  };

  const openAvailabilityEditor = (consultant: Consultant) => {
    setAvailabilityDraft(consultant.availability);
    setAvailableAgainDraft(consultant.availableAgainDate);
    setCalendarMonth(monthStart(consultant.availableAgainDate));
    setCalendarOpen(false);
    setAvailabilityConsultant(consultant);
  };

  const displaySeniority = (value: string) =>
    value === "Junior" ? t("seniority_junior") :
    value === "Mid" ? t("seniority_mid") :
    value === "Senior" ? t("seniority_senior") :
    value === "Staff" ? t("seniority_staff") : value;

  const seniorityRank: Record<string, number> = { Junior: 1, Mid: 2, Senior: 3, Staff: 4 };
  const availabilityRank: Record<string, number> = { Available: 0, Unavailable: 1 };

  const filtered = consultants.filter((consultant) => {
    const consultantSeniority = consultant.seniority ?? "";
    const consultantAvailability = consultant.availability;

    if (seniority !== "All" && consultantSeniority !== seniority) return false;
    if (avail !== "All" && consultantAvailability !== avail) return false;

    const search = query.trim().toLowerCase();
    if (!search) return true;

    return (
      consultantName(consultant).toLowerCase().includes(search) ||
      (consultant.title ?? "").toLowerCase().includes(search) ||
      (consultant.summary ?? "").toLowerCase().includes(search) ||
      consultant.skills.some((skill) => skill.name.toLowerCase().includes(search))
    );
  });

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={t("consultants_title")}
        meta={String(consultants.length) + " " + t("consultants_sub")}
        actions={<LinkButton to="/cv-upload" variant="primary">{t("consultants_upload")}</LinkButton>}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 relative max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
          <Input
            type="search"
            placeholder={t("consultants_search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8 py-1.5"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-app-faint">
          <Filter size={10} />
          <span>{t("consultants_seniority")}</span>
        </div>

        {SENIORITY_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => setSeniority(option)}
            className="text-[11px] px-2.5 py-1 rounded transition-colors"
            style={seniority === option
              ? { background: "var(--color-brand-subtle)", color: "var(--color-brand)", fontWeight: 500 }
              : { color: "var(--color-text-muted)" }}
          >
            {option === "All" ? t("consultants_all") : displaySeniority(option)}
          </button>
        ))}

        <span className="text-[10px] text-app-faint">{t("consultants_availability")}</span>
        <select
          value={avail}
          onChange={(event) => setAvail(event.target.value)}
          className="text-[11px] rounded px-2 py-1 focus:outline-none"
          className="bg-app-surface border border-app-border text-app-secondary"
        >
          {AVAIL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? t("consultants_all") : option === "Available" ? t("consultants_available") : t("consultants_unavailable")}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3 text-xs text-app-secondary">
          {t("client_backend_error")}: {error}
        </div>
      )}

      <div className="bg-app-surface border border-app-border rounded-lg overflow-visible shadow-app-surface">
        <DataTable
          columns={[
            {
              key: "consultant",
              width: "24%",
              header: t("col_consultant"),
              sortable: true,
              sortValue: (consultant) => consultantName(consultant),
              render: (consultant) => (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-app-brand-subtle flex items-center justify-center text-[10px] font-semibold text-app-brand flex-none">
                    {initials(consultant)}
                  </div>
                  <div>
                    <p className="font-medium text-app-primary">{consultantName(consultant)}</p>
                    <p className="text-[10px] text-app-muted max-w-xs truncate">
                      {consultant.title || consultant.summary || "—"}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: "seniority",
              width: "10%",
              header: t("col_seniority"),
              sortable: true,
              sortValue: (consultant) => seniorityRank[consultant.seniority ?? ""] ?? 99,
              render: (consultant) => <span>{consultant.seniority ? displaySeniority(consultant.seniority) : "—"}</span>,
            },
            {
              key: "experience",
              width: "12%",
              header: t("col_experience"),
              sortable: true,
              sortValue: (consultant) => consultant.yearsOfExperience,
              render: (consultant) => <span className="font-mono">{consultant.yearsOfExperience == null ? "—" : `${consultant.yearsOfExperience} ${t("consultant_year_count")}`}</span>,
            },
            {
              key: "skills",
              width: "21%",
              header: t("col_skills"),
              render: (consultant) => (
                <div className="flex max-h-7 flex-wrap gap-1 overflow-hidden">
                  {consultant.skills.slice(0, 3).map((skill) => <SkillTag key={skill.id || skill.name}>{skill.name}</SkillTag>)}
                  {consultant.skills.length > 3 && <span className="text-[10px] text-app-faint">+{consultant.skills.length - 3}</span>}
                </div>
              ),
            },
            {
              key: "cv",
              width: "9%",
              header: "CV",
              render: (consultant) => cvEligible === null ? <span className="text-app-muted">—</span> : <span className={`whitespace-nowrap text-[11px] ${cvEligible.has(consultant.id) ? "text-app-success" : "text-app-warning"}`}>{cvEligible.has(consultant.id) ? "✓ Finns" : "– Saknas"}</span>,
            },
            {
              key: "availability",
              width: "22%",
              header: t("col_avail"),
              sortable: true,
              sortValue: (consultant) => availabilityRank[consultant.availability] ?? 99,
              render: (consultant) => (
                <div className="relative min-h-10" onClick={(event) => event.stopPropagation()}>
                  <button type="button" title={consultant.availability === "Unavailable" && consultant.availableAgainDate ? `${t("consultant_available_again")} ${formatAvailableAgainDate(consultant.availableAgainDate, locale, "", true)}` : undefined} aria-haspopup="dialog" aria-expanded={availabilityConsultant?.id === consultant.id} aria-label={`${t("consultants_availability_for")} ${consultantName(consultant)}`} onClick={() => openAvailabilityEditor(consultant)} data-open={availabilityConsultant?.id === consultant.id} className={`group inline-flex h-7 w-full min-w-0 cursor-pointer items-center gap-1 rounded border border-transparent bg-app-raised px-2 py-1 text-[11px] text-app-primary transition-all duration-150 hover:border-app-brand hover:bg-app-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand ${availabilityConsultant?.id === consultant.id ? "border-app-brand bg-app-brand-soft ring-1 ring-app-brand" : ""}`}>
                    <span className={`flex-none text-[10px] ${consultant.availability === "Unavailable" ? "text-app-danger" : "text-app-success"}`} aria-hidden="true">●</span>
                    <span className={`flex-none ${consultant.availability === "Unavailable" ? "text-app-danger" : "text-app-success"}`}>{consultant.availability === "Unavailable" ? t("consultants_unavailable") : t("consultants_available")}</span>
                    {consultant.availability === "Unavailable" && consultant.availableAgainDate && <span className="truncate text-app-muted">{formatAvailableAgainDate(consultant.availableAgainDate, locale, "", false)}</span>}
                    <ChevronDown size={12} className="ml-auto flex-none text-app-faint transition-colors group-hover:text-app-brand-text" aria-hidden="true" />
                  </button>
                  {availabilityConsultant?.id === consultant.id && (
                    <Modal open title={t("consultants_availability")} description={consultantName(consultant)} onClose={() => setAvailabilityConsultant(null)}>
                    <div className="p-5">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-app-faint">{t("consultants_availability")}</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <button type="button" aria-pressed={availabilityDraft === "Available"} onClick={() => setAvailabilityDraft("Available")} className={`rounded border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand ${availabilityDraft === "Available" ? "border-app-success bg-app-success-subtle text-app-success" : "border-app-border text-app-secondary"}`}>
                          <span className="mr-1 text-[10px] text-app-success">●</span>{t("consultants_available")}
                        </button>
                        <button type="button" aria-pressed={availabilityDraft === "Unavailable"} onClick={() => setAvailabilityDraft("Unavailable")} className={`rounded border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand ${availabilityDraft === "Unavailable" ? "border-app-danger bg-app-danger-subtle text-app-danger" : "border-app-border text-app-secondary"}`}>
                          <span className="mr-1 text-[10px] text-app-danger">●</span>{t("consultants_unavailable")}
                        </button>
                      </div>
                      {availabilityDraft === "Unavailable" && (
                        <label className="relative mt-3 block text-[10px] text-app-muted">
                          <span className="mb-1 block">{t("consultant_available_again")}</span>
                          <span className="relative flex items-center gap-1 rounded border border-app-border bg-app px-2 py-1.5 text-app-secondary focus-within:border-app-brand focus-within:ring-1 focus-within:ring-app-brand">
                            <button type="button" aria-label={`${t("consultants_available_again_for")} ${consultantName(consultant)}`} onClick={() => setCalendarOpen(true)} className="min-w-0 flex-1 truncate bg-transparent text-left text-[11px] text-app-primary outline-none focus-visible:ring-2 focus-visible:ring-app-brand">{formatAvailableAgainDate(availableAgainDraft, locale, t("consultant_available_again"))}</button>
                            <button type="button" aria-label={t("consultant_available_again")} onClick={() => setCalendarOpen(true)} className="rounded p-0.5 text-app-muted hover:bg-app-raised hover:text-app-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand"><Calendar size={12} aria-hidden="true" /></button>
                          </span>
                          {calendarOpen && (
                            <div role="dialog" aria-label={t("consultant_available_again")} className="relative mt-2 w-full rounded border border-app-border bg-app-surface p-2 shadow-app-surface" onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center justify-between px-1 pb-2">
                                <button type="button" aria-label={t("common_previous")} onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="rounded p-1 text-app-muted hover:bg-app-raised hover:text-app-primary"><ChevronLeft size={13} /></button>
                                <span className="text-[11px] font-medium text-app-primary">{new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : locale === "es" ? "es-ES" : "en-US", { month: "long", year: "numeric" }).format(calendarMonth)}</span>
                                <button type="button" aria-label={t("common_next")} onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded p-1 text-app-muted hover:bg-app-raised hover:text-app-primary"><ChevronRight size={13} /></button>
                              </div>
                              <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-app-faint">
                                {(locale === "sv" ? ["Må", "Ti", "On", "To", "Fr", "Lö", "Sö"] : locale === "es" ? ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]).map((day) => <span key={day} className="py-1">{day}</span>)}
                                {calendarDays(calendarMonth).map((day) => {
                                  const value = dateValue(day);
                                  const selected = value === dateInputValue(availableAgainDraft);
                                  const inMonth = day.getMonth() === calendarMonth.getMonth();
                                  return <button key={value} type="button" onClick={() => { setAvailableAgainDraft(value); setCalendarOpen(false); }} className={`rounded py-1 text-[10px] ${selected ? "bg-app-brand text-white" : inMonth ? "text-app-secondary hover:bg-app-raised" : "text-app-faint/50"}`}>{day.getDate()}</button>;
                                })}
                              </div>
                            </div>
                          )}
                        </label>
                      )}
                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="ghost" className="px-2 py-1 text-[10px]" onClick={() => setAvailabilityConsultant(null)}>{t("common_cancel")}</Button>
                        <Button variant="primary" className="px-2 py-1 text-[10px] font-medium" disabled={updatingAvailabilityId === consultant.id} onClick={() => { setAvailabilityConsultant(null); void updateAvailability(consultant, availabilityDraft, availabilityDraft === "Available" ? null : availableAgainDraft); }}>{t("common_save")}</Button>
                      </div>
                    </div>
                    </Modal>
                  )}
                </div>
              ),
            },
            {
              key: "navigation",
              width: "4%",
              header: "",
              render: () => <ChevronRight size={15} className="text-app-faint" aria-hidden="true" />,
            },
          ]}
          rows={filtered}
          pagination
          pageSizeOptions={[25, 50, 100]}
          paginationLabel={t("consultants_label")}
          rowKey={(consultant) => String(consultant.id)}
          onRowClick={(consultant) => navigate(`/consultants/${consultant.id}`)}
          rowAriaLabel={(consultant) => `${t("consultants_view")} ${consultantName(consultant)}`}
          emptyMessage={loading ? t("consultants_loading") : t("consultants_empty")}
        />

        
      </div>
    </div>
  );
}
