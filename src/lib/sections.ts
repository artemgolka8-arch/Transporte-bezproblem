import type { TranslationKey } from "@/lib/i18n/translations";
import type { Role } from "@/lib/roles";

// Вкладки, доступом к которым управляет администратор (Управление пользователями → «Доступ»).
// «Профиль» доступен всем, «Менеджеры» (управление пользователями) — только ADMIN.
export const SECTION_KEYS = [
  "fleet",
  "clients",
  "referred",
  "reports",
  "team",
  "debtors",
  "tasks",
  "payroll",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABEL_KEYS: Record<SectionKey, TranslationKey> = {
  fleet: "nav_fleet",
  clients: "nav_clients",
  referred: "nav_referred_clients",
  reports: "nav_reports",
  team: "nav_team",
  debtors: "nav_debtors",
  tasks: "nav_tasks",
  payroll: "nav_payroll",
};

// Вкладки, которые роль получает сама, без выдачи доступа.
const ALL: SectionKey[] = [...SECTION_KEYS];
const NO_PAYROLL: SectionKey[] = SECTION_KEYS.filter((k) => k !== "payroll");
const RESTRICTED_BASE: SectionKey[] = ["referred", "reports", "team", "tasks"];

export const ROLE_BASE_SECTIONS: Record<Role, SectionKey[]> = {
  ADMIN: ALL,
  MANAGER: NO_PAYROLL,
  VIEWER: NO_PAYROLL,
  DIRECTOR: [...RESTRICTED_BASE, "payroll"],
  AMBASSADOR: RESTRICTED_BASE,
  PR_MANAGER: RESTRICTED_BASE,
};

export function isSectionKey(v: unknown): v is SectionKey {
  return typeof v === "string" && (SECTION_KEYS as readonly string[]).includes(v);
}

// Оставляет только известные ключи вкладок, без повторов
export function sanitizeSections(input: unknown): SectionKey[] {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.filter(isSectionKey)));
}

export function roleHasSection(role: string | null | undefined, key: SectionKey) {
  const base = ROLE_BASE_SECTIONS[role as Role];
  return !!base && base.includes(key);
}

// Итоговый доступ = то, что даёт роль + то, что выдал администратор
export function hasSection(
  role: string | null | undefined,
  extra: readonly string[] | null | undefined,
  key: SectionKey
) {
  return roleHasSection(role, key) || (Array.isArray(extra) && extra.includes(key));
}

// Вкладки, которые можно «выдать» сверх роли (те, где у роли нет доступа по умолчанию)
export function grantableSections(role: string | null | undefined) {
  return SECTION_KEYS.filter((k) => !roleHasSection(role, k));
}

// Пути (страницы и API) вкладок, которые ограниченным ролям могут быть выданы дополнительно.
// Middleware их пропускает, а окончательное решение принимают сами страницы и обработчики
// по свежим данным из базы (см. sectionGuard.ts) — так выдача и отзыв доступа
// действуют сразу, а не после обновления cookie-сессии.
const GRANTABLE_PREFIXES: Record<string, SectionKey> = {
  "/vehicle": "fleet",
  "/api/vehicles": "fleet",
  "/api/keys": "fleet",
  "/api/stats": "fleet",
  "/clients": "clients",
  "/api/clients": "clients",
  "/debtors": "debtors",
  "/api/debtors": "debtors",
  "/payroll": "payroll",
  "/api/payroll": "payroll",
};

export function grantableSectionForPath(pathname: string): SectionKey | null {
  if (pathname === "/") return "fleet";
  for (const prefix of Object.keys(GRANTABLE_PREFIXES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return GRANTABLE_PREFIXES[prefix];
  }
  return null;
}
