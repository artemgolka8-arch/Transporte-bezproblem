"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { Role } from "@/lib/roles";
import { Sidebar } from "./Sidebar";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 16l4-4-4-4M19 12H8" />
    </svg>
  );
}

function breadcrumbFor(pathname: string | null) {
  if (!pathname) return "nav_fleet" as const;
  if (pathname === "/") return "nav_fleet" as const;
  if (pathname.startsWith("/clients")) return "nav_clients" as const;
  if (pathname.startsWith("/referred-clients")) return "referred_eyebrow" as const;
  if (pathname.startsWith("/debtors")) return "nav_debtors" as const;
  if (pathname.startsWith("/tasks")) return "nav_tasks" as const;
  if (pathname.startsWith("/admin")) return "nav_users" as const;
  if (pathname.startsWith("/profile")) return "nav_profile" as const;
  if (pathname.startsWith("/vehicle")) return "nav_fleet" as const;
  return "nav_fleet" as const;
}

function capitalize(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

export function AppShell({
  counts,
  userName,
  role,
  children,
}: {
  counts: { AVAILABLE: number; WORKSHOP: number; RENTED: number };
  userName: string;
  role: Role;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t, lang, setLang } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const isDark = theme === "dark";
  const title = capitalize(t(breadcrumbFor(pathname)));

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar counts={counts} userName={userName} role={role} />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full animate-rise">
            <Sidebar counts={counts} userName={userName} role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-bg2/90 backdrop-blur-md">
          <div className="flex items-center gap-3 px-5 py-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/70 text-muted lg:hidden"
              aria-label="Menu"
            >
              <MenuIcon />
            </button>

            <div className="text-sm font-medium text-muted">{title}</div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-bg2 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-violet/40"
                >
                  <GlobeIcon />
                  {lang.toUpperCase()}
                  <ChevronDownIcon />
                </button>
                {langOpen && (
                  <div className="panel absolute right-0 top-full z-40 mt-2 w-32 overflow-hidden p-1">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                          lang === l.code ? "bg-violetDim/70 text-violet" : "text-muted hover:bg-panel2/70 hover:text-ink"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? t("theme_light") : t("theme_dark")}
                aria-label={isDark ? t("theme_light") : t("theme_dark")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line/70 text-muted transition-colors hover:border-violet/40 hover:text-ink"
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line/70 bg-bg2 px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-danger/40 hover:text-danger"
              >
                <LogoutIcon />
                {t("sign_out")}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
