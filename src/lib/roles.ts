export type Role = "ADMIN" | "MANAGER" | "VIEWER";

export function canEdit(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}

export function isAdmin(role?: string | null) {
  return role === "ADMIN";
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  VIEWER: "Наблюдатель",
};
