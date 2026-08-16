"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/translations";
import { ThemeProvider, type Theme } from "@/lib/theme/ThemeProvider";

export default function Providers({
  children,
  initialLang,
  initialTheme,
}: {
  children: React.ReactNode;
  initialLang?: Lang;
  initialTheme?: Theme;
}) {
  return (
    <SessionProvider>
      <ThemeProvider initialTheme={initialTheme}>
        <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
