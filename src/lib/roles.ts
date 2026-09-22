import type { TranslationKey } from "@/lib/i18n/translations";

export type Role = "ADMIN" | "MANAGER" | "VIEWER" | "DIRECTOR" | "AMBASSADOR";

export function canEdit(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}

export function isAdmin(role?: string | null) {
  return role === "ADMIN";
}

export function isAmbassador(role?: string | null) {
  return role === "AMBASSADOR";
}

export function isDirector(role?: string | null) {
  return role === "DIRECTOR";
}

// Роли, у которых есть доступ только к разделу «Приглашённые клиенты»
export function isRestrictedRole(role?: string | null) {
  return role === "AMBASSADOR" || role === "DIRECTOR";
}

// Ключ перевода для каждой роли — используйте t(ROLE_LABEL_KEYS[role])
export const ROLE_LABEL_KEYS: Record<Role, TranslationKey> = {
  ADMIN: "role_admin",
  MANAGER: "role_manager",
  VIEWER: "role_viewer",
  DIRECTOR: "role_director",
  AMBASSADOR: "role_ambassador",
};

// ── Роли AMBASSADOR и DIRECTOR ─────────────────────────────────────────────
// Единственный раздел, доступный им, — «Приглашённые клиенты».
// Амбассадор видит там только своих клиентов, директор — любого амбассадора.
export const AMBASSADOR_HOME = "/referred-clients";

// Надпись (вместо «Transport Control»), которая показывается на странице
// «Приглашённые клиенты». Поменять текст можно здесь, в одном месте.
export const AMBASSADOR_BRAND = "BezProblem Ambassador";

const STATIC_FILE = /\.(png|jpe?g|gif|svg|webp|ico|woff2?)$/i;

// Какие пути разрешены ограниченным ролям (AMBASSADOR, DIRECTOR). Всё остальное middleware отрезает:
// страницы → редирект на «Приглашённые клиенты», API → 403.
// Опасные действия (создать/изменить/удалить) внутри разрешённых API
// по-прежнему закрыты проверками canEdit / isAdmin в самих обработчиках.
export function isRestrictedPathAllowed(pathname: string) {
  if (pathname === AMBASSADOR_HOME || pathname.startsWith(AMBASSADOR_HOME + "/")) return true;
  if (pathname === "/api/referred-clients" || pathname.startsWith("/api/referred-clients/")) return true;
  // «Моя команда» — список менеджеров с аккаунтами, доступен и амбассадору/директору
  if (pathname === "/team" || pathname.startsWith("/team/")) return true;
  if (pathname === "/api/team" || pathname.startsWith("/api/team/")) return true;
  // Свой профиль — доступен всем ролям, включая амбассадора/директора
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname === "/api/profile" || pathname.startsWith("/api/profile/")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (STATIC_FILE.test(pathname)) return true;
  if (pathname === "/icon" || pathname === "/apple-icon") return true;
  return false;
}
