import Link from "next/link";
import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, translations } from "@/lib/i18n/translations";

// Страница «не найдено» (серверная — язык берём из cookie)
export default function NotFound() {
  const cookieLang = cookies().get("fleet_lang")?.value;
  const lang = isLang(cookieLang) ? cookieLang : DEFAULT_LANG;
  const t = translations[lang];

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="panel-elevated w-full max-w-md p-8 text-center">
        <div className="font-display text-4xl font-semibold text-cyan">404</div>
        <h1 className="mt-3 font-display text-lg font-semibold text-ink">{t.not_found_title}</h1>
        <p className="mt-2 text-sm text-muted">{t.not_found_text}</p>
        <Link href="/" className="btn-primary mt-6 px-5 py-2.5 text-sm">
          {t.error_home}
        </Link>
      </div>
    </div>
  );
}
