import type { TranslationKey } from "@/lib/i18n/translations";

export type Role = "ADMIN" | "MANAGER" | "VIEWER" | "AMBASSADOR";

export function canEdit(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}

export function isAdmin(role?: string | null) {
  return role === "ADMIN";
}

export function isAmbassador(role?: string | null) {
  return role === "AMBASSADOR";
}

// Ключ перевода для каждой роли — используйте t(ROLE_LABEL_KEYS[role])
export const ROLE_LABEL_KEYS: Record<Role, TranslationKey> = {
  ADMIN: "role_admin",
  MANAGER: "role_manager",
  VIEWER: "role_viewer",
  AMBASSADOR: "role_ambassador",
};

// ── Роль AMBASSADOR ────────────────────────────────────────────────────────
// Единственный раздел, доступный амбассадору, — «Приглашённые клиенты».
export const AMBASSADOR_HOME = "/referred-clients";

// Надпись (вместо «Transport Control»), которая показывается на странице
// «Приглашённые клиенты». Поменять текст можно здесь, в одном месте.
export const AMBASSADOR_BRAND = "BezProblem Ambassador";

const STATIC_FILE = /\.(png|jpe?g|gif|svg|webp|ico|woff2?)$/i;

// Какие пути разрешены амбассадору. Всё остальное middleware отрезает:
// страницы → редирект на «Приглашённые клиенты», API → 403.
// Опасные действия (создать/изменить/удалить) внутри разрешённых API
// по-прежнему закрыты проверками canEdit / isAdmin в самих обработчиках.
export function isAmbassadorPathAllowed(pathname: string) {
  if (pathname === AMBASSADOR_HOME || pathname.startsWith(AMBASSADOR_HOME + "/")) return true;
  if (pathname === "/api/referred-clients" || pathname.startsWith("/api/referred-clients/")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (STATIC_FILE.test(pathname)) return true;
  if (pathname === "/icon" || pathname === "/apple-icon") return true;
  return false;
}
