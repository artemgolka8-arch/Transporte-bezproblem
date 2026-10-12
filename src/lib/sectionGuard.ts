import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { AMBASSADOR_HOME, isViewRestrictedRole } from "@/lib/roles";
import { hasSection, type SectionKey } from "@/lib/sections";

export function sectionAllowed(session: Session, key: SectionKey) {
  return hasSection(session.user.role, session.user.extraSections, key);
}

// Для API: вернуть 403, если у пользователя нет доступа к вкладке
export function denySection(session: Session, key: SectionKey) {
  if (sectionAllowed(session, key)) return null;
  return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
}

// Для страниц: куда отправить пользователя, если вкладка ему недоступна
export function sectionFallbackPath(session: Session) {
  return isViewRestrictedRole(session.user.role) ? AMBASSADOR_HOME : "/";
}
