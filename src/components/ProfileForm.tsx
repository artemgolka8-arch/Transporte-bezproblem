"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { ROLE_LABEL_KEYS, Role } from "@/lib/roles";
import { ProfileHeader, ProfileAccent } from "@/components/ProfileHeader";

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

const ROLE_ACCENT: Record<Role, ProfileAccent> = {
  ADMIN: "violet",
  MANAGER: "cyan",
  VIEWER: "faint",
};

const ROLE_CLEARANCE: Record<Role, number> = {
  ADMIN: 3,
  MANAGER: 2,
  VIEWER: 1,
};

const FIELD_CLASS =
  "w-full border-b border-line bg-transparent px-0 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-cyan";

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

  const statCells = [
    { key: "AVAILABLE" as const, labelKey: "status_available" as const, color: "text-mint" },
    { key: "WORKSHOP" as const, labelKey: "status_workshop" as const, color: "text-amber" },
    { key: "RENTED" as const, labelKey: "status_rented" as const, color: "text-violet" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-10">
        <div className="label-eyebrow mb-1.5">{t("profile_eyebrow")}</div>
        <h1 className="font-display text-3xl font-semibold text-ink">{t("profile_title")}</h1>
        <p className="mt-1.5 text-sm text-muted">{t("profile_subtitle")}</p>
      </div>

      <ProfileHeader
        eyebrow={t("badge_eyebrow_staff")}
        initials={initials.toUpperCase()}
        name={displayName}
        subtitle={user.email}
        accent={accent}
        statusLabel={t("badge_access_active")}
        meta={[
          { label: t("field_position"), value: position || "—" },
          { label: t("field_city"), value: city || "—" },
        ]}
        clearance={{
          level: ROLE_CLEARANCE[user.role],
          max: 3,
          label: `${t("clearance_level")} · ${t(ROLE_LABEL_KEYS[user.role])}`,
        }}
      />

      {fleetCounts && (
        <div className="grid grid-cols-3 divide-x divide-line border-b border-line py-7">
          {statCells.map((s) => (
            <div key={s.key} className="px-6 text-center first:pl-0 last:pr-0">
              <div className={`font-display text-2xl font-semibold ${s.color}`}>
                {fleetCounts[s.key]}
              </div>
              <div className="mt-1 label-eyebrow">{t(s.labelKey)}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="pt-10">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_first_name")}</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("first_name_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_last_name")}</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("last_name_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_phone")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phone_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_email")}</label>
            <input value={user.email} disabled className={`${FIELD_CLASS} opacity-50`} />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_position")}</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t("position_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_city")}</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("city_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        {error && <div className="mt-6 text-xs text-danger">{error}</div>}
        {saved && !error && <div className="mt-6 text-xs text-mint">{t("profile_updated")}</div>}

        <div className="mt-9 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("saving") : t("save_changes")}
          </button>
        </div>
      </form>
    </div>
  );
}
