export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Защищаем все маршруты, кроме:
     * - /login
     * - /api/auth (обработка NextAuth)
     * - статики Next.js
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
