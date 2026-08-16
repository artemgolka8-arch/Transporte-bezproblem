"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { ROLE_LABEL_KEYS, Role } from "@/lib/roles";
import { AccessBadge, BadgeAccent } from "@/components/AccessBadge";

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

const ROLE_ACCENT: Record<Role, BadgeAccent> = {
  ADMIN: "violet",
  MANAGER: "cyan",
  VIEWER: "faint",
};

const ROLE_CLEARANCE: Record<Role, number> = {
  ADMIN: 3,
  MANAGER: 2,
  VIEWER: 1,
};

export function ProfileForm({
  user,
  fleetCounts,
}: {
  user: ProfileData;
  fleetCounts?: { AVAILABLE: number; WORKSHOP: number; RENTED: number };
}) {
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

  const accent = ROLE_ACCENT[user.role];
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name;
  const initials =
    (user.firstName?.[0] || user.name?.[0] || "?") + (user.lastName?.[0] || user.name?.[1] || "");

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6">
        <div className="label-eyebrow mb-1">{t("profile_eyebrow")}</div>
        <h1 className="font-display text-2xl font-semibold text-ink">{t("profile_title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("profile_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <AccessBadge
            eyebrow={t("badge_eyebrow_staff")}
            initials={initials.toUpperCase()}
            name={displayName}
            subtitle={user.email}
            accent={accent}
            ledLabel={t("badge_access_active")}
            ledPulse
            meta={[
              { label: t("field_position"), value: position || "—" },
              { label: t("field_city"), value: city || "—" },
            ]}
            clearance={{
              level: ROLE_CLEARANCE[user.role],
              max: 3,
              label: `${t("clearance_level")} · ${t(ROLE_LABEL_KEYS[user.role])}`,
            }}
            barcodeValue={user.id}
          />

          {fleetCounts && (
            <div className="panel p-4">
              <div className="label-eyebrow mb-3">{t("fleet_snapshot_title")}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="font-display text-lg font-semibold text-mint">
                    {fleetCounts.AVAILABLE}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase text-faint">
                    {t("status_available")}
                  </div>
                </div>
                <div>
                  <div className="font-display text-lg font-semibold text-amber">
                    {fleetCounts.WORKSHOP}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase text-faint">
                    {t("status_workshop")}
                  </div>
                </div>
                <div>
                  <div className="font-display text-lg font-semibold text-violet">
                    {fleetCounts.RENTED}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase text-faint">
                    {t("status_rented")}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      <form onSubmit={submit} className="panel h-fit p-6">
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
    </div>
  );
}
