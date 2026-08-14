"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/translations";

export default function Providers({
  children,
  initialLang,
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  return (
    <SessionProvider>
      <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
    </SessionProvider>
  );
}
