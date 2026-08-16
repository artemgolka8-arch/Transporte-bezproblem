"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_LABEL_KEYS, type Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/translations";
import { StatsPanel } from "./StatsPanel";

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7.5h11v9H2z" />
      <path d="M13 10.5h4.2L20 13.3v3.2h-7z" />
      <circle cx="6.5" cy="18.2" r="1.6" />
      <circle cx="16.5" cy="18.2" r="1.6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8.5" r="3" />
      <path d="M2.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
      <path d="M16.3 6.2a3 3 0 0 1 0 5.7" />
      <path d="M18.5 13.7c2.3.5 3.9 2.3 3.9 4.5" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8" r="3.2" />
      <path d="M2 19c0-3.3 2.9-5.5 6.5-5.5S15 15.7 15 19" />
      <path d="M18.5 8v5.5M15.8 10.75h5.4" />
    </svg>
  );
}

function DebtorsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v9M9.5 9.8c0-1.3 1.1-2.3 2.5-2.3s2.5.9 2.5 2.1c0 2.7-5 1.6-5 4.3 0 1.2 1.1 2.1 2.5 2.1s2.5-1 2.5-2.3" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <path d="M9 2.5h6v3H9z" />
      <path d="m8.3 12.5 1.8 1.8 3.6-3.8M8.3 17.2h7.4" />
    </svg>
  );
}

function ManagersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.7 4.5 5.7v5.4c0 4.8 3.2 7.8 7.5 9.9 4.3-2.1 7.5-5.1 7.5-9.9V5.7Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.8 19.5c0-3.7 3.2-6.2 7.2-6.2s7.2 2.5 7.2 6.2" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: () => JSX.Element;
  adminOnly?: boolean;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav_fleet", icon: TruckIcon, exact: true },
  { href: "/clients", labelKey: "nav_clients", icon: UsersIcon },
  { href: "/referred-clients", labelKey: "nav_referred_clients", icon: UserPlusIcon },
  { href: "/debtors", labelKey: "nav_debtors", icon: DebtorsIcon },
  { href: "/tasks", labelKey: "nav_tasks", icon: TasksIcon },
  { href: "/admin/users", labelKey: "nav_users", icon: ManagersIcon, adminOnly: true },
  { href: "/profile", labelKey: "nav_profile", icon: UserIcon },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Sidebar({
  counts,
  userName,
  role,
  onNavigate,
}: {
  counts: { AVAILABLE: number; WORKSHOP: number; RENTED: number };
  userName: string;
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname?.startsWith(item.href + "/");
  }

  return (
    <div className="flex h-full w-[272px] shrink-0 flex-col border-r border-line/70 bg-bg2">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyanDim/60 text-cyan">
          <TruckIcon />
        </span>
        <div className="leading-tight">
          <div className="font-display text-base font-semibold tracking-wide text-ink">
            Bez<span className="text-cyan">Problem</span>
          </div>
          <div className="text-[12px] text-muted -mt-0.5">{t("tagline")}</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 pb-4">
        {NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN").map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-violetDim/70 text-violet font-medium"
                  : "text-muted hover:bg-panel2/70 hover:text-ink"
              }`}
            >
              <Icon />
              {t(item.labelKey)}
            </Link>
          );
        })}

        <StatsPanel counts={counts} variant="sidebar" />
      </nav>

      <div className="mx-3 mb-3 rounded-2xl bg-violetDim/50 p-4">
        <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-bg2/70 text-violet">
          <SparkleIcon />
        </span>
        <div className="mb-1.5 text-[13px] font-medium leading-snug text-ink">
          {t("sidebar_promo_title")}
        </div>
        <Link href="/referred-clients" className="inline-flex items-center gap-1 text-[13px] text-violet hover:opacity-80">
          {t("sidebar_promo_link")}
          <ChevronRightIcon />
        </Link>
      </div>

      <Link
        href="/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 border-t border-line/70 px-4 py-3.5 transition-colors hover:bg-panel2/60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violetDim/70 text-xs font-semibold text-violet">
          {initials(userName)}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-medium text-ink">{userName}</div>
          <div className="truncate text-xs text-muted">{t(ROLE_LABEL_KEYS[role])}</div>
        </div>
        <ChevronRightIcon />
      </Link>
    </div>
  );
}
