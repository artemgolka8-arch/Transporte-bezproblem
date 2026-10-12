import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import {
  AMBASSADOR_HOME,
  isRestrictedPathAllowed,
  isViewRestrictedRole,
} from "@/lib/roles";
import { grantableSectionForPath } from "@/lib/sections";

export default withAuth(
  function middleware(req) {
    // Сюда попадаем только с валидной сессией (см. authorized ниже).
    // Амбассадора, директора и PR-менеджера пускаем только в разрешённые им разделы
    // (см. isRestrictedPathAllowed).
    const role = req.nextauth.token?.role;
    const { pathname } = req.nextUrl;

    // «Зарплаты и бонусы» и другие вкладки, которые администратор может выдать сверх роли:
    // кто именно имеет доступ, решают сами страницы и API по свежим данным из базы
    // (middleware видит только токен в cookie, а он может устареть).

    if (isViewRestrictedRole(role)) {
      if (!isRestrictedPathAllowed(pathname) && !grantableSectionForPath(pathname)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
        }
        return NextResponse.redirect(new URL(AMBASSADOR_HOME, req.url));
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Защищаем все маршруты, кроме:
     * - /login
     * - /api/auth (обработка NextAuth)
     * - /api/tasks/reminders/run (дёргается внешним планировщиком, у него свой секрет)
     * - /telegram и /api/telegram (Telegram Mini App — своя проверка через initData,
     *   у обычных браузерных cookie-сессий там взяться неоткуда)
     * - статики Next.js
     */
    "/((?!login|api/auth|api/tasks/reminders/run|telegram|api/telegram|_next/static|_next/image|favicon.ico).*)",
  ],
};
