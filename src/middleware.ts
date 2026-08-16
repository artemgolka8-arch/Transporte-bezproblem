export { default } from "next-auth/middleware";

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
