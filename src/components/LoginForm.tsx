"use client";

import { useState } from "react";
import { LogoStacked } from "@/components/Logo";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { HeaderControls } from "./HeaderControls";

export function LoginForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(t("wrong_credentials"));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="absolute top-4 right-4 z-10">
        <HeaderControls />
      </div>

      <form
        onSubmit={handleSubmit}
        className="panel-elevated relative z-10 w-full max-w-sm p-8 animate-rise"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <LogoStacked className="mb-4" />
          <div className="text-xs text-muted">{t("login_tagline")}</div>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_email")}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          placeholder="you@fleet.local"
        />

        <label className="mb-1 block label-eyebrow">{t("field_password_simple")}</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-5 w-full rounded-lg border border-line bg-bg2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          placeholder="••••••••"
        />

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? t("checking") : t("sign_in")}
        </button>
      </form>
    </div>
  );
}
