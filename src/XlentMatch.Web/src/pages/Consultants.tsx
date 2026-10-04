import { useEffect, useState } from "react";
import { Search, Filter, Eye, Calendar } from "../design-system/icons";
import { useI18n } from "../i18n";
import { LinkButton } from "../components/ui/LinkButton";
import { Input } from "../components/ui/Input";
import { DataTable } from "../components/ui/DataTable";
import { SkillTag } from "../components/ui/SkillTag";
import { PageHeader } from "../components/ui/PageHeader";
import { consultantsApi } from "../services/consultantsApi";
import type { Consultant } from "../types";
import { formatDate } from "../services/localeFormat";

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

function formatAvailableAgainDate(value: string | null, locale: "en" | "es" | "sv") {
  if (!value) return "Available again";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "Available again";
  return formatDate(new Date(year, month - 1, day), locale);
}

export default function Consultants() {
  const { t, locale } = useI18n();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState("All");
  const [avail, setAvail] = useState("All");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    consultantsApi
      .getAll()
      .then((data) => {
        if (!cancelled) setConsultants(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Could not load consultants.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const deleteConsultant = async (consultant: Consultant) => {
    const name = consultantName(consultant);
    if (!window.confirm(`Delete ${name}? This will permanently remove the consultant from the database.`)) return;

    setDeletingId(consultant.id);
    setError("");

    try {
      await consultantsApi.remove(consultant.id);
      setConsultants((current) => current.filter((item) => item.id !== consultant.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete consultant.");
    } finally {
      setDeletingId(null);
    }
  };

  const updateAvailability = async (consultant: Consultant, availability: Consultant["availability"], availableAgainDate: string | null) => {
    setUpdatingAvailabilityId(consultant.id);
    setError("");
    try {
      const updated = await consultantsApi.update(consultant.id, { ...consultant, availability, availableAgainDate: availability === "Available" ? null : availableAgainDate });
      setConsultants((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update availability.");
    } finally {
      setUpdatingAvailabilityId(null);
    }
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
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          {AVAIL_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? t("consultants_all") : option}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-app bg-app-surface px-4 py-3 text-xs text-app-secondary">
          Backend connection failed: {error}
        </div>
      )}

      <div className="bg-app-surface border border-app rounded-lg overflow-hidden shadow-app-surface">
        <DataTable
          columns={[
            {
              key: "consultant",
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
              header: t("col_seniority"),
              sortable: true,
              sortValue: (consultant) => seniorityRank[consultant.seniority ?? ""] ?? 99,
              render: (consultant) => <span>{displaySeniority(consultant.seniority ?? "—")}</span>,
            },
            {
              key: "experience",
              header: t("col_experience"),
              sortable: true,
              sortValue: (consultant) => consultant.yearsOfExperience,
              render: (consultant) => <span className="font-mono">{consultant.yearsOfExperience == null ? "—" : `${consultant.yearsOfExperience} yrs`}</span>,
            },
            {
              key: "skills",
              header: t("col_skills"),
              render: (consultant) => (
                <div className="flex flex-wrap gap-1">
                  {consultant.skills.slice(0, 4).map((skill) => <SkillTag key={skill.id || skill.name}>{skill.name}</SkillTag>)}
                  {consultant.skills.length > 4 && <span className="text-[10px] text-app-faint">+{consultant.skills.length - 4}</span>}
                </div>
              ),
            },
            {
              key: "availability",
              header: t("col_avail"),
              sortable: true,
              sortValue: (consultant) => availabilityRank[consultant.availability] ?? 99,
              render: (consultant) => (
                <select aria-label={`Availability for ${consultantName(consultant)}`} value={consultant.availability} disabled={updatingAvailabilityId === consultant.id} onChange={(event) => void updateAvailability(consultant, event.target.value as Consultant["availability"], consultant.availableAgainDate)} className="bg-app border border-app rounded px-2 py-1 text-[11px] text-app-primary">
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              ),
            },
            {
              key: "availableAgain",
              header: "Available again",
              render: (consultant) => consultant.availability === "Unavailable" ? (
                <label className="relative inline-flex max-w-36 items-center gap-1.5 rounded border border-app bg-app px-2 py-1 text-[11px] text-app-secondary focus-within:border-app-brand focus-within:ring-1 focus-within:ring-app-brand">
                  <span className="truncate">{formatAvailableAgainDate(consultant.availableAgainDate, locale)}</span>
                  <Calendar size={12} className="flex-none text-app-muted" aria-hidden="true" />
                  <input
                    aria-label={`Available again date for ${consultantName(consultant)}`}
                    type="date"
                    value={consultant.availableAgainDate?.slice(0, 10) ?? ""}
                    disabled={updatingAvailabilityId === consultant.id}
                    onChange={(event) => void updateAvailability(consultant, "Unavailable", event.target.value || null)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              ) : <span className="text-app-faint">—</span>,
            },
            {
              key: "actions",
              header: t("common_actions"),
              render: (consultant) => (
                <div className="flex items-center gap-2">
                  <LinkButton to={`/consultants/${consultant.id}`} variant="secondary" icon={<Eye size={12} />}>
                    {t("consultants_view")}
                  </LinkButton>
                  <button
                    type="button"
                    onClick={() => void deleteConsultant(consultant)}
                    disabled={deletingId === consultant.id}
                    className="text-[11px] px-2.5 py-1.5 rounded border disabled:opacity-50"
                    style={{ color: "var(--color-danger)", borderColor: "var(--color-danger)", background: "transparent" }}
                  >
                    {deletingId === consultant.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              ),
            },
          ]}
          rows={filtered}
          rowKey={(consultant) => String(consultant.id)}
          emptyMessage={loading ? t("consultants_loading") : t("consultants_empty")}
        />

        <div className="border-t border-app px-4 py-2.5 bg-app-surface">
          <span className="text-[10px] text-app-faint">
            {loading ? t("consultants_loading_short") : `${t("consultants_showing")} ${filtered.length} ${t("consultants_of")} ${consultants.length} ${t("consultants_label")}`}
          </span>
        </div>
      </div>
    </div>
  );
}
