import { NavLink, Outlet, useLocation } from "react-router-dom";
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
    { to: "/talent", icon: Users, label: t("nav_talent") },
    { to: "/jobs", icon: Briefcase, label: t("nav_jobs") },
    { to: "/matching", icon: GitMerge, label: t("nav_matching") },
    { to: "/upload", icon: Upload, label: t("nav_upload") },
    { to: "/coach", icon: Sparkles, label: t("nav_coach") },
    { to: "/admin", icon: Settings, label: t("nav_admin") },
  ];

  const crumb = NAV.find((n) =>
    n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to)
  );

  return (
    <div className="flex h-full bg-app">
      {/* Sidebar */}
      <aside
        className="w-56 flex-none flex flex-col border-r border-app bg-app-surface"
        style={{ boxShadow: "var(--shadow-surface)" }}
      >
        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-app">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "var(--color-brand)" }}>
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-app-primary">XLENT Match</span>
          </div>
          <span className="ml-auto text-[10px] font-mono text-app-faint bg-app-raised px-1.5 py-0.5 rounded">
            v1.0
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
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

        {/* Footer */}
        <div className="border-t border-app p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-app-brand-subtle flex items-center justify-center text-[10px] font-semibold text-app-brand">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-app-primary truncate">Johan Lind</p>
              <p className="text-[10px] text-app-muted">Consultant Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-app">
        {/* Topbar */}
        <header className="h-12 flex items-center px-5 border-b border-app bg-app-surface flex-none">
          <div className="flex items-center gap-1.5 text-sm text-app-faint">
            <span>XLENT Match</span>
            {crumb && crumb.to !== "/" && (
              <>
                <ChevronRight size={12} />
                <span className="text-app-secondary">{crumb.label}</span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* AI status */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-app-faint">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {t("ai_online")}
            </div>

            {/* Language switcher */}
            <div className="flex items-center rounded overflow-hidden border border-app">
              {LOCALES.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocale(loc)}
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

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="w-7 h-7 rounded flex items-center justify-center text-app-muted hover:text-app-secondary hover:bg-app-raised border border-app transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-app">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
