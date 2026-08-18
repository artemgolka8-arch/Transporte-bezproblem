"use client";

import { useState } from "react";
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Ambient brand background */}
      <div className="pointer-events-none absolute inset-0 bg-brandRadial" />
      <div className="pointer-events-none absolute inset-0 bg-grid bg-gridcell opacity-[0.5] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-cyan/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-violet/10 blur-[100px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-scanline animate-scan" />

      <div className="absolute top-4 right-4 z-10">
        <HeaderControls />
      </div>

      <form
        onSubmit={handleSubmit}
        className="panel-elevated relative z-10 w-full max-w-sm overflow-hidden p-8 animate-rise"
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brandGradient opacity-10 blur-2xl" />

        <div className="mb-7 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="BezProblem"
            className="mb-3 h-16 w-16 rounded-full object-cover shadow-brand ring-4 ring-cyan/15"
          />
          <div className="font-display text-xl font-semibold tracking-wide text-ink">
            Bez<span className="text-gradient-brand">Problem</span>
          </div>
          <div className="label-eyebrow mt-1">{t("login_tagline")}</div>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_email")}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-line bg-bg2 px-3.5 py-2.5 text-sm text-ink outline-none transition-all focus:border-cyan/60 focus:shadow-glowCyan"
          placeholder="you@fleet.local"
        />

        <label className="mb-1 block label-eyebrow">{t("field_password_simple")}</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-5 w-full rounded-xl border border-line bg-bg2 px-3.5 py-2.5 text-sm text-ink outline-none transition-all focus:border-cyan/60 focus:shadow-glowCyan"
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
