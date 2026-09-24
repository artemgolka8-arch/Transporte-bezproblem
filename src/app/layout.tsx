import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { isLang, DEFAULT_LANG } from "@/lib/i18n/translations";
import type { Theme } from "@/lib/theme/ThemeProvider";

const body = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "BezProblem Sharks — Transport Control",
  description: "Панель учёта велосипедов и самокатов: статусы, ремонт, ключи",
};

// Явный viewport: корректный масштаб на телефоне, поддержка safe-area (чёлка/шторка iOS),
// разрешаем пользователю зумить руками (доступность), но убираем случайный «прыжок» масштаба.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1016" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLang = cookies().get("fleet_lang")?.value;
  const initialLang = isLang(cookieLang) ? cookieLang : DEFAULT_LANG;

  const cookieTheme = cookies().get("fleet_theme")?.value;
  const initialTheme: Theme = cookieTheme === "dark" ? "dark" : "light";

  return (
    <html
      lang={initialLang}
      className={`${body.variable} ${mono.variable} ${initialTheme === "dark" ? "dark" : ""}`}
      style={{ colorScheme: initialTheme }}
    >
      <body>
        <Providers initialLang={initialLang} initialTheme={initialTheme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
