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
} from "lucide-react";
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
    <div className="flex h-full bg-base">
      {/* Sidebar */}
      <aside
        className="w-56 flex-none flex flex-col border-r border-base bg-surface"
        style={{ boxShadow: "var(--ats-shadow)" }}
      >
        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-base">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "var(--ats-indigo)" }}>
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-base">Recruit OS</span>
          </div>
          <span className="ml-auto text-[10px] font-mono text-3 bg-raised px-1.5 py-0.5 rounded">
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
                    ? "bg-indigo-sub text-indigo font-medium"
                    : "text-2 hover:text-base hover:bg-raised"
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-base p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-sub flex items-center justify-center text-[10px] font-semibold text-indigo">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-base truncate">Jane Doe</p>
              <p className="text-[10px] text-muted">Recruiter</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-base">
        {/* Topbar */}
        <header className="h-12 flex items-center px-5 border-b border-base bg-surface flex-none">
          <div className="flex items-center gap-1.5 text-sm text-3">
            <span>Recruit OS</span>
            {crumb && crumb.to !== "/" && (
              <>
                <ChevronRight size={12} />
                <span className="text-2">{crumb.label}</span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* AI status */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {t("ai_online")}
            </div>

            {/* Language switcher */}
            <div className="flex items-center rounded overflow-hidden border border-base">
              {LOCALES.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className={`text-[10px] font-mono px-2 py-1 transition-colors ${
                    locale === loc
                      ? "bg-indigo-sub text-indigo font-semibold"
                      : "text-3 hover:text-base hover:bg-raised"
                  }`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="w-7 h-7 rounded flex items-center justify-center text-muted hover:text-base hover:bg-raised border border-base transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-base">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
