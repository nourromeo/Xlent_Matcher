import { useEffect, useState } from "react";
import { Search, Filter, Eye } from "../design-system/icons";
import { useI18n } from "../i18n";
import { LinkButton } from "../components/ui/LinkButton";
import { Input } from "../components/ui/Input";
import { DataTable } from "../components/ui/DataTable";
import { SkillTag } from "../components/ui/SkillTag";
import { PageHeader } from "../components/ui/PageHeader";
import { consultantsApi } from "../services/consultantsApi";
import type { Consultant } from "../types";

const SENIORITY_OPTIONS = ["All", "Junior", "Mid", "Senior", "Staff"];
const AVAIL_OPTIONS = ["All", "Immediate", "2 weeks", "1 month", "3 months"];

const consultantName = (consultant: Consultant) =>
  consultant.fullName?.trim() || `${consultant.firstName} ${consultant.lastName}`.trim();

const initials = (consultant: Consultant) =>
  [consultant.firstName, consultant.lastName]
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

export default function Consultants() {
  const { t } = useI18n();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [seniority, setSeniority] = useState("All");
  const [avail, setAvail] = useState("All");
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const displaySeniority = (value: string) =>
    value === "Junior" ? t("seniority_junior") :
    value === "Mid" ? t("seniority_mid") :
    value === "Senior" ? t("seniority_senior") :
    value === "Staff" ? t("seniority_staff") : value;

  const displayAvailability = (value: string) =>
    value === "Immediate" ? t("immediate") :
    value === "2 weeks" ? t("availability_2_weeks") :
    value === "1 month" ? t("availability_1_month") :
    value === "3 months" ? t("availability_3_months") : value;

  const seniorityRank: Record<string, number> = { Junior: 1, Mid: 2, Senior: 3, Staff: 4 };
  const availabilityRank: Record<string, number> = { Immediate: 0, "2 weeks": 1, "1 month": 2, "3 months": 3 };

  const filtered = consultants.filter((consultant) => {
    const consultantSeniority = consultant.seniority ?? "";
    const consultantAvailability = consultant.availability ?? "";

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
              {option === "All" ? t("consultants_all") : displayAvailability(option)}
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
              render: (consultant) => <span className="font-mono">{consultant.yearsOfExperience} yrs</span>,
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
              sortValue: (consultant) => availabilityRank[consultant.availability ?? ""] ?? 99,
              render: (consultant) => (
                <span style={{ color: consultant.availability === "Immediate" ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                  {displayAvailability(consultant.availability ?? "—")}
                </span>
              ),
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
          rowKey={(consultant) => consultant.id}
          emptyMessage={loading ? "Loading consultants..." : t("consultants_empty")}
        />

        <div className="border-t border-app px-4 py-2.5 bg-app-surface">
          <span className="text-[10px] text-app-faint">
            {loading ? "Loading..." : `${t("consultants_showing")} ${filtered.length} ${t("consultants_of")} ${consultants.length} ${t("consultants_label")}`}
          </span>
        </div>
      </div>
    </div>
  );
}
