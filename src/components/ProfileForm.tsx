"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { ROLE_LABEL_KEYS, Role } from "@/lib/roles";

type ProfileData = {
  id: string;
  email: string;
  name: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  position: string | null;
  city: string | null;
};

export function ProfileForm({ user }: { user: ProfileData }) {
  const router = useRouter();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [position, setPosition] = useState(user.position || "");
  const [city, setCity] = useState(user.city || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, position, city }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("save_failed"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="mb-6">
        <div className="label-eyebrow mb-1">{t("profile_eyebrow")}</div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t("profile_title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("profile_subtitle")}</p>
      </div>

      <form onSubmit={submit} className="panel p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-line pb-5">
          <div className="flex-1 min-w-[180px]">
            <div className="text-sm text-ink">{user.name}</div>
            <div className="font-mono text-xs text-muted">{user.email}</div>
          </div>
          <span className="rounded-full border border-cyan/40 bg-cyanDim/40 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-cyan">
            {t(ROLE_LABEL_KEYS[user.role])}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_first_name")}</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("first_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_last_name")}</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("last_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_phone")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phone_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_email")}</label>
            <input
              value={user.email}
              disabled
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-muted outline-none opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_position")}</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t("position_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_city")}</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("city_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
            />
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        {saved && !error && (
          <div className="mt-5 rounded-lg border border-mint/30 bg-mintDim/20 px-3 py-2 text-xs text-mint">
            {t("profile_updated")}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-lg border border-cyan/40 bg-cyanDim/40 px-5 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("saving") : t("save_changes")}
        </button>
      </form>
    </div>
  );
}
