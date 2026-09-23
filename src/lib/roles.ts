import type { TranslationKey } from "@/lib/i18n/translations";

export type Role = "ADMIN" | "MANAGER" | "VIEWER" | "DIRECTOR" | "AMBASSADOR" | "PR_MANAGER";

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

export function isPrManager(role?: string | null) {
  return role === "PR_MANAGER";
}

// PR_MANAGER получает полный доступ (просмотр + управление + удаление) только
// к четырём разделам: «Задачи», «Моя команда», «Приглашённые клиенты», «Отчёты».
// На остальные разделы (Флот, Клиенты, Должники и т.д.) это не распространяется —
// там по-прежнему используется canEdit / isAdmin как раньше.
export function canManageReferredClients(role?: string | null) {
  return canEdit(role) || isPrManager(role);
}

export function canDeleteReferredClient(role?: string | null) {
  return isAdmin(role) || isPrManager(role);
}

export function canDeleteAnyReport(role?: string | null) {
  return isAdmin(role) || isPrManager(role);
}

// Кто может создавать задачи и назначать их другим (вкладка «Задачи»):
// ADMIN и MANAGER — как раньше, плюс PR_MANAGER, который умеет ставить
// задачи амбассадорам, другим PR-менеджерам, администраторам и директору.
// Сама возможность редактировать остальные разделы (флот, клиенты и т.д.)
// у PR_MANAGER не расширяется — для этого по-прежнему используется canEdit.
export function canCreateTasks(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER" || role === "PR_MANAGER";
}

// Роли, у которых есть доступ только к разделу «Приглашённые клиенты»
export function isRestrictedRole(role?: string | null) {
  return role === "AMBASSADOR" || role === "DIRECTOR";
}

// PR_MANAGER видит (и вообще имеет доступ) только к четырём разделам:
// «Задачи», «Моя команда», «Приглашённые клиенты», «Отчёты» + свой профиль.
// Все остальные разделы (Флот, Клиенты, Техника, Должники, Управление
// пользователями) для него закрыты полностью — даже на просмотр: и в меню
// не показываются, и напрямую по ссылке недоступны (см. middleware.ts).
// Список разрешённых путей тот же, что и для AMBASSADOR/DIRECTOR —
// isRestrictedPathAllowed ниже.
export function isViewRestrictedRole(role?: string | null) {
  return isRestrictedRole(role) || isPrManager(role);
}

// Кто отображается в разделе «Моя команда». Список один для всех ролей:
// администратор, менеджер, PR-менеджер, директор и амбассадор видят друг друга.
// (VIEWER — «Наблюдатель» — в команду не входит.)
export const TEAM_ROLES: Role[] = ["ADMIN", "MANAGER", "PR_MANAGER", "DIRECTOR", "AMBASSADOR"];

// Ключ перевода для каждой роли — используйте t(ROLE_LABEL_KEYS[role])
export const ROLE_LABEL_KEYS: Record<Role, TranslationKey> = {
  ADMIN: "role_admin",
  MANAGER: "role_manager",
  VIEWER: "role_viewer",
  DIRECTOR: "role_director",
  AMBASSADOR: "role_ambassador",
  PR_MANAGER: "role_pr_manager",
};

// ── Роли AMBASSADOR и DIRECTOR ─────────────────────────────────────────────
// Единственный раздел, доступный им, — «Приглашённые клиенты».
// Амбассадор видит там только своих клиентов, директор — любого амбассадора.
export const AMBASSADOR_HOME = "/referred-clients";

// Надпись (вместо «Transport Control»), которая показывается на странице
// «Приглашённые клиенты». Поменять текст можно здесь, в одном месте.
export const AMBASSADOR_BRAND = "BezProblem Ambassador";

const STATIC_FILE = /\.(png|jpe?g|gif|svg|webp|ico|woff2?)$/i;

// Какие пути разрешены ограниченным ролям (AMBASSADOR, DIRECTOR, PR_MANAGER).
// Всё остальное middleware отрезает: страницы → редирект на «Приглашённые
// клиенты», API → 403.
// Опасные действия (создать/изменить/удалить) внутри разрешённых API
// по-прежнему закрыты проверками canEdit / isAdmin / canManageReferredClients и т.д.
// в самих обработчиках.
export function isRestrictedPathAllowed(pathname: string) {
  if (pathname === AMBASSADOR_HOME || pathname.startsWith(AMBASSADOR_HOME + "/")) return true;
  if (pathname === "/api/referred-clients" || pathname.startsWith("/api/referred-clients/")) return true;
  // «Отчёты» — амбассадор пишет туда ежедневный отчёт о проделанной работе
  if (pathname === "/reports" || pathname.startsWith("/reports/")) return true;
  if (pathname === "/api/reports" || pathname.startsWith("/api/reports/")) return true;
  // «Моя команда» — список менеджеров с аккаунтами, доступен и амбассадору/директору
  if (pathname === "/team" || pathname.startsWith("/team/")) return true;
  if (pathname === "/api/team" || pathname.startsWith("/api/team/")) return true;
  // Свой профиль — доступен всем ролям, включая амбассадора/директора
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname === "/api/profile" || pathname.startsWith("/api/profile/")) return true;
  // «Задачи» — амбассадор и директор получают задачи от PR Manager и должны их видеть
  // (создавать задачи им по-прежнему нельзя — это проверяется отдельно, см. canCreateTasks)
  if (pathname === "/tasks" || pathname.startsWith("/tasks/")) return true;
  if (pathname === "/api/tasks" || pathname.startsWith("/api/tasks/")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (STATIC_FILE.test(pathname)) return true;
  if (pathname === "/icon" || pathname === "/apple-icon") return true;
  return false;
}
