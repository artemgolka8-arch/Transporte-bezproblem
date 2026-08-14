import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { isLang, DEFAULT_LANG } from "@/lib/i18n/translations";

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
  title: "FLEET/OS — учёт транспорта",
  description: "Панель учёта велосипедов и самокатов: статусы, ремонт, ключи",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLang = cookies().get("fleet_lang")?.value;
  const initialLang = isLang(cookieLang) ? cookieLang : DEFAULT_LANG;

  return (
    <html lang={initialLang} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <Providers initialLang={initialLang}>{children}</Providers>
      </body>
    </html>
  );
}
