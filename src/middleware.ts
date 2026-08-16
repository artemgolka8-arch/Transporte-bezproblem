export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Защищаем все маршруты, кроме:
     * - /login
     * - /api/auth (обработка NextAuth)
     * - /api/tasks/reminders/run (дёргается внешним планировщиком, у него свой секрет)
     * - статики Next.js
     */
    "/((?!login|api/auth|api/tasks/reminders/run|_next/static|_next/image|favicon.ico).*)",
  ],
};
