"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
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
      setError("Неверная почта или пароль");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-scanline animate-scan" />

      <form
        onSubmit={handleSubmit}
        className="panel relative w-full max-w-sm p-7 animate-rise"
      >
        <div className="mb-6 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg border border-cyan/40 bg-cyanDim/40 shadow-glowCyan flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-cyan animate-pulseBeacon" />
          </div>
          <div>
            <div className="font-display text-base font-semibold text-ink">
              FLEET<span className="text-cyan">/OS</span>
            </div>
            <div className="label-eyebrow -mt-0.5">вход в систему</div>
          </div>
        </div>

        <label className="mb-1 block label-eyebrow">Почта</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
          placeholder="you@fleet.local"
        />

        <label className="mb-1 block label-eyebrow">Пароль</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-5 w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
          placeholder="••••••••"
        />

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg border border-cyan/40 bg-cyanDim/40 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Проверка…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
