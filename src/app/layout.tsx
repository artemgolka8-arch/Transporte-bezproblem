import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { isLang, DEFAULT_LANG } from "@/lib/i18n/translations";
import type { Theme } from "@/lib/theme/ThemeProvider";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

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
  title: "BezProblem — Transport Control",
  description: "Панель учёта велосипедов и самокатов: статусы, ремонт, ключи",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLang = cookies().get("fleet_lang")?.value;
  const initialLang = isLang(cookieLang) ? cookieLang : DEFAULT_LANG;

  const cookieTheme = cookies().get("fleet_theme")?.value;
  const initialTheme: Theme = cookieTheme === "dark" ? "dark" : "light";

  return (
    <html
      lang={initialLang}
      className={`${display.variable} ${body.variable} ${mono.variable} ${initialTheme === "dark" ? "dark" : ""}`}
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
