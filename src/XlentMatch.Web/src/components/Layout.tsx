import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  GitMerge,
  Upload,
  Settings,
  Zap,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Info,
} from "../design-system/icons";
import { useTheme } from "../theme";
import { useI18n, type Locale } from "../i18n";

const LOCALE_LABELS: Record<Locale, string> = { en: "EN", es: "ES", sv: "SV" };
const LOCALES: Locale[] = ["en", "es", "sv"];

export default function Layout() {
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const { locale, setLocale, t } = useI18n();

  const NAV = [
    { to: "/", icon: LayoutDashboard, label: t("nav_dashboard") },
    { to: "/consultants", icon: Users, label: t("nav_consultants") },
    { to: "/client-assignments", icon: Briefcase, label: t("nav_assignments") },
    { to: "/matching", icon: GitMerge, label: t("nav_matching") },
    { to: "/cv-upload", icon: Upload, label: t("nav_upload") },
    { to: "/cv-adaptation", icon: Sparkles, label: t("nav_coach") },
    { to: "/admin", icon: Settings, label: t("nav_admin") },
  ];

  const supportNav = { to: "/how-it-works", icon: Info, label: t("nav_how_it_works") };

  const section = [...NAV, supportNav].find((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  );

  const isConsultantDetail = /^\/consultants\/[^/]+$/.test(location.pathname);
  const isAssignmentDetail = /^\/client-assignments\/[^/]+$/.test(location.pathname);

  const breadcrumbs = location.pathname === "/"
    ? [{ label: "XLENT Match" }]
    : isConsultantDetail
      ? [
          { label: "XLENT Match", to: "/" },
          { label: t("nav_consultants"), to: "/consultants" },
          { label: t("breadcrumb_consultant") },
        ]
      : isAssignmentDetail
        ? [
            { label: "XLENT Match", to: "/" },
            { label: t("nav_assignments"), to: "/client-assignments" },
            { label: t("breadcrumb_assignment") },
          ]
        : [
            { label: "XLENT Match", to: "/" },
            { label: section?.label ?? location.pathname.replace(/^\//, "") },
          ];

  return (
    <div className="flex h-full bg-app">
      <aside
        className="w-56 flex-none flex flex-col border-r border-app-border bg-app-surface"
        style={{ boxShadow: "var(--shadow-surface)" }}
      >
        <div className="h-12 flex items-center px-4 border-b border-app-border">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand"
            aria-label={t("nav_dashboard")}
          >
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "var(--color-brand)" }}>
              <Zap size={12} className="text-app-on-brand" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-app-primary">XLENT Match</span>
          </Link>
          <span className="ml-auto text-[10px] font-mono text-app-faint bg-app-raised px-1.5 py-0.5 rounded">MVP</span>
        </div>

        <nav className="flex-1 min-h-0 py-2 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-app-brand-subtle text-app-brand font-medium"
                    : "text-app-secondary hover:text-app-secondary hover:bg-app-raised"
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 pb-2">
          <NavLink
            to={supportNav.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand ${
                isActive
                  ? "bg-app-brand-subtle text-app-brand font-medium"
                  : "text-app-muted hover:text-app-secondary hover:bg-app-raised"
              }`
            }
          >
            <supportNav.icon size={14} />
            {supportNav.label}
          </NavLink>
        </div>

        <div className="border-t border-app-border px-3 py-3">
          <p className="text-[10px] uppercase tracking-wide text-app-faint">{t("layout_internal_tool")}</p>
          <p className="text-[10px] text-app-muted mt-1">{t("layout_matching")}</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-app">
        <header className="h-12 flex items-center px-5 border-b border-app-border bg-app-surface flex-none">
          <nav aria-label={t("aria_breadcrumb")} className="flex items-center gap-1.5 text-sm text-app-faint min-w-0">
            {breadcrumbs.map((item, index) => (
              <div key={item.label + index} className="flex items-center gap-1.5 min-w-0">
                {index > 0 && <ChevronRight size={12} className="flex-none" />}
                {item.to ? (
                  <Link
                    to={item.to}
                    className="truncate hover:text-app-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-brand rounded-sm"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={index === breadcrumbs.length - 1 ? "text-app-secondary truncate" : "truncate"}>
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center rounded overflow-hidden border border-app-border">
              {LOCALES.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocale(loc)}
                  aria-pressed={locale === loc}
                  className={`text-[10px] font-mono px-2 py-1 transition-colors ${
                    locale === loc
                      ? "bg-app-brand-subtle text-app-brand font-semibold"
                      : "text-app-faint hover:text-app-secondary hover:bg-app-raised"
                  }`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "dark" ? t("theme_light") : t("theme_dark")}
              className="w-7 h-7 rounded flex items-center justify-center text-app-muted hover:text-app-secondary hover:bg-app-raised border border-app-border transition-colors"
              title={theme === "dark" ? t("theme_light") : t("theme_dark")}
            >
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-app">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
