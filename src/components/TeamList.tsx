"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL_KEYS, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  position?: string | null;
  city?: string | null;
  avatarV?: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  { bg: "bg-mintDim/70", text: "text-mint" },
  { bg: "bg-cyanDim/70", text: "text-cyan" },
  { bg: "bg-violetDim/70", text: "text-violet" },
  { bg: "bg-amberDim/70", text: "text-amber" },
  { bg: "bg-coralDim/70", text: "text-coral" },
];

function avatarStyle(seed: string) {
  const code = seed.charCodeAt(0) || 0;
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

const ROLE_STYLE: Partial<Record<Role, string>> = {
  ADMIN: "border border-violet/40 bg-violetDim/50 text-violet",
  DIRECTOR: "border border-amber/40 bg-amberDim/50 text-amber",
  MANAGER: "border border-cyan/40 bg-cyanDim/50 text-cyan",
  PR_MANAGER: "border border-coral/40 bg-coralDim/50 text-coral",
  VIEWER: "border border-line bg-panel2/70 text-muted",
  AMBASSADOR: "border border-mint/40 bg-mintDim/50 text-mint",
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 4.5c.3 3.9 1.9 7.5 4.7 10.3 2.8 2.8 6.4 4.4 10.3 4.7l.6-3.4-4-1.6-1.6 1.8a13 13 0 0 1-6.4-6.4l1.8-1.6-1.6-4Z" />
    </svg>
  );
}

function ManagersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="8.5" r="2.4" />
      <path d="M15.5 14.3c2.6.4 4.5 2.6 4.5 5.7" />
    </svg>
  );
}

export function TeamList({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      `${m.name} ${m.email} ${m.city ?? ""} ${m.position ?? ""}`.toLowerCase().includes(q)
    );
  }, [members, query]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <span className="icon-tile mt-0.5 h-12 w-12 text-lg">
            <ManagersIcon />
          </span>
          <div>
            <h1 className="font-display text-[26px] font-semibold text-ink">{t("team_title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("team_page_subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("team_search_placeholder")}
            className="w-full rounded-xl border border-line bg-bg2 py-3 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("team_empty_title")}</div>
          <div className="text-xs text-muted">{t("team_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_team_name")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_email")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_client_phone")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_city")}</th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("col_role")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const avatar = avatarStyle(m.name);
                  const isSelf = m.id === currentUserId;

                  return (
                    <tr
                      key={m.id}
                      onClick={() => router.push(isSelf ? "/profile" : `/team/${m.id}`)}
                      className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/40"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${avatar.bg} ${avatar.text}`}>
                            {m.avatarV ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/team/${m.id}/avatar?v=${m.avatarV}`}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials(m.name)
                            )}
                          </span>
                          <span className={`font-medium hover:underline ${isSelf ? "text-cyan" : "text-ink"}`}>
                            {m.name}
                          </span>
                          {m.position && <span className="hidden text-xs text-faint sm:inline">· {m.position}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted">{m.email}</td>
                      <td className="px-5 py-3.5">
                        {m.phone ? (
                          <a
                            href={`tel:${m.phone.replace(/\s+/g, "")}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-ink transition-colors hover:text-cyan"
                          >
                            {m.phone}
                            <span className="text-faint"><PhoneIcon /></span>
                          </a>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-muted">{m.city || "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${ROLE_STYLE[m.role] ?? "border border-line bg-panel2/70 text-muted"}`}>
                          {t(ROLE_LABEL_KEYS[m.role])}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
            <div className="text-xs text-muted">
              {t("total_team_label")}: {filtered.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
