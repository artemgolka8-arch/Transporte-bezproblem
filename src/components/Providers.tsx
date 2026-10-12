"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/translations";
import { ThemeProvider, type Theme } from "@/lib/theme/ThemeProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { NetworkGuard } from "@/components/NetworkGuard";

export default function Providers({
  children,
  initialLang,
  initialTheme,
  session,
}: {
  children: React.ReactNode;
  initialLang?: Lang;
  initialTheme?: Theme;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session ?? undefined}>
      <ThemeProvider initialTheme={initialTheme}>
        <LanguageProvider initialLang={initialLang}>
          <ConfirmProvider>
            <NetworkGuard />
            {children}
          </ConfirmProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
