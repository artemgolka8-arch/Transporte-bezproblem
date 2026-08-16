"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ROLE_LABEL_KEYS } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { HeaderControls } from "./HeaderControls";
import { StatsPanel } from "./StatsPanel";

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
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-3">
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

        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/"
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname === "/" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t("nav_fleet")}
          </Link>
          <Link
            href="/clients"
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname?.startsWith("/clients") ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t("nav_clients")}
          </Link>
          <Link
            href="/referred-clients"
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname?.startsWith("/referred-clients") ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t("nav_referred_clients")}
          </Link>
          <Link
            href="/tasks"
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname?.startsWith("/tasks") ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t("nav_tasks")}
          </Link>
          {role === "ADMIN" && (
            <Link
              href="/admin/users"
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                pathname?.startsWith("/admin") ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t("nav_users")}
            </Link>
          )}
          <Link
            href="/profile"
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              pathname === "/profile" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t("nav_profile")}
          </Link>
          <StatsPanel counts={counts} />
        </nav>

        <HeaderControls className="shrink-0" />

        <div className="flex items-center gap-3 pl-1">
          <span className="hidden h-8 w-px shrink-0 bg-line/70 sm:block" />
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm text-ink">{userName}</div>
            <div className="label-eyebrow">{t(ROLE_LABEL_KEYS[role])}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="whitespace-nowrap rounded-lg border border-line/70 px-3 py-1.5 text-xs text-muted transition-colors hover:border-danger/40 hover:text-danger"
          >
            {t("sign_out")}
          </button>
        </div>
      </div>
    </header>
  );
}
