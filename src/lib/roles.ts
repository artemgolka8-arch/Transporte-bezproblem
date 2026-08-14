import type { TranslationKey } from "@/lib/i18n/translations";

export type Role = "ADMIN" | "MANAGER" | "VIEWER";

export function canEdit(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER";
}

export function isAdmin(role?: string | null) {
  return role === "ADMIN";
}

// Ключ перевода для каждой роли — используйте t(ROLE_LABEL_KEYS[role])
export const ROLE_LABEL_KEYS: Record<Role, TranslationKey> = {
  ADMIN: "role_admin",
  MANAGER: "role_manager",
  VIEWER: "role_viewer",
};
