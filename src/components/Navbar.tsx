"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { STATUS_CONFIG } from "./status";
import { ROLE_LABEL_KEYS } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Navbar({
  counts,
  userName,
  role,
}: {
  counts: { AVAILABLE: number; WORKSHOP: number; RENTED: number };
  userName: string;
  role: "ADMIN" | "MANAGER" | "VIEWER";
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="BezProblem"
            className="h-9 w-9 rounded-full border border-cyan/40 shadow-glowCyan object-cover"
          />
          <div className="leading-tight">
            <div className="font-display text-base font-semibold tracking-wide text-ink">
              Bez<span className="text-cyan">Problem</span>
            </div>
            <div className="font-display text-[11px] tracking-wide text-muted -mt-0.5">{t("tagline")}</div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-2 ml-2">
          {(["AVAILABLE", "WORKSHOP", "RENTED"] as const).map((s) => {
            const c = STATUS_CONFIG[s];
            return (
              <div
                key={s}
                className={`flex items-center gap-2 rounded-lg border ${c.border} ${c.bg} px-3 py-1.5`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                <span className="font-mono text-sm font-medium text-ink">{counts[s]}</span>
                <span className={`text-[11px] uppercase tracking-wide ${c.text}`}>{t(c.labelKey)}</span>
              </div>
            );
          })}
        </div>

        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname === "/" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t("nav_fleet")}
          </Link>
          {role === "ADMIN" && (
            <Link
              href="/admin/users"
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                pathname?.startsWith("/admin") ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t("nav_users")}
            </Link>
          )}
          <Link
            href="/profile"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname === "/profile" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t("nav_profile")}
          </Link>
        </nav>

        <LanguageSwitcher />

        <div className="flex items-center gap-3 border-l border-line pl-4">
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-sm text-ink">{userName}</div>
            <div className="label-eyebrow">{t(ROLE_LABEL_KEYS[role])}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-danger/40 hover:text-danger"
          >
            {t("sign_out")}
          </button>
        </div>
      </div>
    </header>
  );
}
